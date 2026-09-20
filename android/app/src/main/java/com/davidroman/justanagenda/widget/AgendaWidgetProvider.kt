package com.davidroman.justanagenda.widget

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.text.format.DateFormat
import android.view.View
import android.widget.RemoteViews
import com.davidroman.justanagenda.MainActivity
import com.davidroman.justanagenda.R
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

class AgendaWidgetProvider : AppWidgetProvider() {

  override fun onUpdate(context: Context, manager: AppWidgetManager, appWidgetIds: IntArray) {
    appWidgetIds.forEach { render(context, manager, it) }
    scheduleMidnightRefresh(context)
  }

  override fun onEnabled(context: Context) {
    scheduleMidnightRefresh(context)
  }

  override fun onDisabled(context: Context) {
    cancelMidnightRefresh(context)
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    when (intent.action) {
      // Cambio de día (alarma de medianoche) o de hora, zona horaria o idioma, y arranque del móvil
      // (las alarmas no sobreviven a un reinicio): se repinta y se reprograma la siguiente medianoche
      ACTION_MIDNIGHT,
      Intent.ACTION_DATE_CHANGED,
      Intent.ACTION_TIME_CHANGED,
      Intent.ACTION_TIMEZONE_CHANGED,
      Intent.ACTION_LOCALE_CHANGED,
      Intent.ACTION_BOOT_COMPLETED -> {
        updateAll(context)
        scheduleMidnightRefresh(context)
      }
    }
  }

  companion object {
    const val PREFS_NAME = "agenda_widget"

    // Misma clave con la que escribe stores/widget-store.ts
    const val DATA_KEY = "widget-days-v2"

    private const val ACTION_MIDNIGHT = "com.davidroman.justanagenda.widget.MIDNIGHT"
    private const val MAX_ROWS = 4
    private val ROW_IDS =
        intArrayOf(R.id.widget_task1, R.id.widget_task2, R.id.widget_task3, R.id.widget_task4)

    fun updateAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, AgendaWidgetProvider::class.java))
      ids.forEach { render(context, manager, it) }
    }

    // Una fila del widget; si es una tarea, al tocarla se abre esa tarea en la app
    private class Row(val text: String, val taskId: String? = null)

    private class Content(val progress: String, val rows: List<Row>, val muted: Boolean, val date: String)

    private fun render(context: Context, manager: AppWidgetManager, appWidgetId: Int) {
      val locale = Locale.getDefault()
      val pattern = DateFormat.getBestDateTimePattern(locale, "EEEEdMMM")
      val title = SimpleDateFormat(pattern, locale).format(Date())
          .replaceFirstChar { it.titlecase(locale) }

      val content = readContent(context)
      val views = RemoteViews(context.packageName, R.layout.agenda_widget)
      views.setTextViewText(R.id.widget_date, title)
      views.setTextViewText(R.id.widget_progress, content.progress)
      views.setViewVisibility(
          R.id.widget_progress, if (content.progress.isEmpty()) View.GONE else View.VISIBLE)

      val color = context.getColor(if (content.muted) R.color.widget_muted else R.color.widget_text)
      ROW_IDS.forEachIndexed { index, id ->
        val row = content.rows.getOrNull(index)
        views.setViewVisibility(id, if (row == null) View.GONE else View.VISIBLE)
        if (row != null) {
          views.setTextViewText(id, row.text)
          views.setTextColor(id, color)
          // Las filas sin tarea no llevan acción propia: cuentan como el resto del widget
          if (row.taskId != null) {
            views.setOnClickPendingIntent(id, openTask(context, index + 1, content.date, row.taskId))
          }
        }
      }

      views.setOnClickPendingIntent(R.id.widget_container, openApp(context))
      manager.updateAppWidget(appWidgetId, views)
    }

    private fun openApp(context: Context): PendingIntent =
        PendingIntent.getActivity(
            context,
            0,
            Intent(context, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

    // justagenda://widget-task?date=…&id=… lo recoge app/widget-task.tsx, con la app cerrada o abierta
    private fun openTask(context: Context, requestCode: Int, date: String, taskId: String): PendingIntent {
      val uri = Uri.Builder()
          .scheme("justagenda")
          .authority("widget-task")
          .appendQueryParameter("date", date)
          .appendQueryParameter("id", taskId)
          .build()
      val intent = Intent(Intent.ACTION_VIEW, uri, context, MainActivity::class.java)
      return PendingIntent.getActivity(
          context,
          requestCode,
          intent,
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    // Traduce lo que dejó la app en SharedPreferences a lo que se pinta.
    // Formato: { days: { "yyyy-MM-dd": { total, completed, tasks: [{ id, text, repeating }] } } }
    // con `tasks` solo de las pendientes. La app manda hoy y los próximos días para que, al cambiar
    // de día, el widget muestre el nuevo aunque la app no se haya abierto.
    private fun readContent(context: Context): Content {
      val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
      val raw = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
          .getString(DATA_KEY, null)
      val days = raw?.let { runCatching { JSONObject(it) }.getOrNull() }?.optJSONObject("days")
          ?: return message(context, R.string.widget_open_app, today)

      // Sin datos de hoy, lo guardado es de días anteriores (la app lleva más de una semana sin abrirse)
      val day = days.optJSONObject(today) ?: return message(context, R.string.widget_stale, today)

      val total = day.optInt("total", 0)
      val completed = day.optInt("completed", 0)
      if (total == 0) return message(context, R.string.widget_no_tasks, today)

      val progress = context.getString(R.string.widget_progress, completed, total)
      val tasks = day.optJSONArray("tasks")
      val pending = List(tasks?.length() ?: 0) { tasks!!.optJSONObject(it) }
          .filter { it != null && it.optString("text").isNotBlank() }
      if (pending.isEmpty()) {
        return Content(progress, listOf(Row(context.getString(R.string.widget_all_done))), true, today)
      }

      // Con más de MAX_ROWS, la última fila resume las que faltan
      val shown = if (pending.size > MAX_ROWS) MAX_ROWS - 1 else pending.size
      val rows = pending.take(shown).map {
        val repeat = if (it!!.optBoolean("repeating")) "🔄 " else ""
        Row("☐ $repeat${it.optString("text")}", it.optString("id").ifEmpty { null })
      }.toMutableList()
      if (pending.size > shown) {
        rows.add(Row(context.getString(R.string.widget_more, pending.size - shown)))
      }
      return Content(progress, rows, false, today)
    }

    private fun message(context: Context, resId: Int, today: String) =
        Content("", listOf(Row(context.getString(resId))), true, today)

    private fun midnightIntent(context: Context): PendingIntent =
        PendingIntent.getBroadcast(
            context,
            0,
            Intent(context, AgendaWidgetProvider::class.java).setAction(ACTION_MIDNIGHT),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

    // Alarma inexacta (no necesita permisos): unos segundos después de las 00:00 se repinta el widget
    // con el día nuevo. Al dispararse se vuelve a programar la siguiente.
    private fun scheduleMidnightRefresh(context: Context) {
      val alarms = context.getSystemService(AlarmManager::class.java) ?: return
      val nextMidnight = Calendar.getInstance().apply {
        add(Calendar.DAY_OF_YEAR, 1)
        set(Calendar.HOUR_OF_DAY, 0)
        set(Calendar.MINUTE, 0)
        set(Calendar.SECOND, 5)
        set(Calendar.MILLISECOND, 0)
      }
      alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextMidnight.timeInMillis, midnightIntent(context))
    }

    private fun cancelMidnightRefresh(context: Context) {
      context.getSystemService(AlarmManager::class.java)?.cancel(midnightIntent(context))
    }
  }
}
