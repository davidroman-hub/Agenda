package com.davidroman.justanagenda.widget

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.net.Uri
import android.os.Bundle
import android.text.SpannableStringBuilder
import android.text.Spanned
import android.text.format.DateFormat
import android.text.style.ForegroundColorSpan
import android.text.style.RelativeSizeSpan
import android.text.style.StrikethroughSpan
import android.text.style.StyleSpan
import android.graphics.Typeface
import android.view.View
import android.widget.RemoteViews
import com.davidroman.justanagenda.R
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

// Widget de tareas: un post-it con el día (hoy, o el que se elija con las flechas), sus tareas con hora y
// color de tipo, las completadas tachadas, y un botón para añadir una tarea.
class AgendaWidgetProvider : AppWidgetProvider() {

  override fun onUpdate(context: Context, manager: AppWidgetManager, appWidgetIds: IntArray) {
    appWidgetIds.forEach { render(context, manager, it) }
    scheduleMidnightRefresh(context)
  }

  override fun onAppWidgetOptionsChanged(
      context: Context, manager: AppWidgetManager, appWidgetId: Int, newOptions: Bundle) {
    // Cambió el tamaño: hay que redibujar el papel y decidir cuántas tareas caben
    render(context, manager, appWidgetId)
  }

  override fun onDeleted(context: Context, appWidgetIds: IntArray) {
    val editor = state(context).edit()
    appWidgetIds.forEach { editor.remove(selectionKey(it)) }
    editor.apply()
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
      ACTION_SHIFT_DAY -> {
        val id = intent.getIntExtra(EXTRA_WIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
        if (id != AppWidgetManager.INVALID_APPWIDGET_ID) {
          shiftDay(context, id, intent.getIntExtra(EXTRA_DELTA, 0))
        }
      }
      ACTION_TODAY -> {
        val id = intent.getIntExtra(EXTRA_WIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
        if (id != AppWidgetManager.INVALID_APPWIDGET_ID) {
          state(context).edit().remove(selectionKey(id)).apply()
          render(context, AppWidgetManager.getInstance(context), id)
        }
      }
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
    private const val ACTION_MIDNIGHT = "com.davidroman.justanagenda.widget.MIDNIGHT"
    private const val ACTION_SHIFT_DAY = "com.davidroman.justanagenda.widget.SHIFT_DAY"
    private const val ACTION_TODAY = "com.davidroman.justanagenda.widget.TODAY"
    private const val EXTRA_WIDGET_ID = "widgetId"
    private const val EXTRA_DELTA = "delta"

    private const val STATE_PREFS = "agenda_widget_state"
    private const val DEFAULT_WIDTH_DP = 250f
    private const val DEFAULT_HEIGHT_DP = 180f

    // Alto (dp) que ocupa todo lo que no son filas de tareas, y lo que ocupa cada fila
    private const val CHROME_HEIGHT_DP = 96f
    private const val ROW_HEIGHT_DP = 31f
    private const val MAX_ROWS = 8

    private val ROW_IDS = intArrayOf(
        R.id.widget_task1, R.id.widget_task2, R.id.widget_task3, R.id.widget_task4,
        R.id.widget_task5, R.id.widget_task6, R.id.widget_task7, R.id.widget_task8)

    fun updateAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, AgendaWidgetProvider::class.java))
      ids.forEach { render(context, manager, it) }
    }

    private fun state(context: Context) = context.getSharedPreferences(STATE_PREFS, Context.MODE_PRIVATE)
    private fun selectionKey(appWidgetId: Int) = "selected_$appWidgetId"

    private val KEY_FORMAT get() = SimpleDateFormat("yyyy-MM-dd", Locale.US)

    private fun todayKey(): String = KEY_FORMAT.format(Date())

    private fun addDays(key: String, days: Int): String {
      val calendar = Calendar.getInstance().apply { time = KEY_FORMAT.parse(key) ?: Date() }
      calendar.add(Calendar.DAY_OF_YEAR, days)
      return KEY_FORMAT.format(calendar.time)
    }

    // El día elegido con las flechas se recuerda junto con el "hoy" en que se eligió: al cambiar de
    // día vuelve solo a hoy en vez de quedarse en un día que ya pasó
    private fun selectedDay(context: Context, appWidgetId: Int, today: String, available: Set<String>): String {
      val saved = state(context).getString(selectionKey(appWidgetId), null)?.split("|")
      val day = saved?.getOrNull(0)
      val chosenOn = saved?.getOrNull(1)
      return if (day != null && chosenOn == today && day in available) day else today
    }

    private fun shiftDay(context: Context, appWidgetId: Int, delta: Int) {
      val data = WidgetStorage.read(context) ?: return
      val today = todayKey()
      val days = data.days.keys.toList()
      val current = days.indexOf(selectedDay(context, appWidgetId, today, data.days.keys))
      val next = days.getOrNull(current + delta) ?: return

      state(context).edit().putString(selectionKey(appWidgetId), "$next|$today").apply()
      render(context, AppWidgetManager.getInstance(context), appWidgetId)
    }

    // Tamaño actual del widget en dp: en vertical el ancho es el mínimo y el alto el máximo; en horizontal, al revés.
    // Algunos launchers (p. ej. el de los emuladores) dan medidas mayores que la propia pantalla, lo que es imposible:
    // en ese caso se reducen en proporción, para que lo dibujado (textos, márgenes) no salga a media escala
    fun sizeDp(context: Context, manager: AppWidgetManager, appWidgetId: Int): Pair<Float, Float> {
      val options = manager.getAppWidgetOptions(appWidgetId)
      val portrait = context.resources.configuration.orientation != Configuration.ORIENTATION_LANDSCAPE
      val reportedWidth = options.getInt(
          if (portrait) AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH else AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH)
      val reportedHeight = options.getInt(
          if (portrait) AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT else AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT)
      val width = if (reportedWidth > 0) reportedWidth.toFloat() else DEFAULT_WIDTH_DP
      val height = if (reportedHeight > 0) reportedHeight.toFloat() else DEFAULT_HEIGHT_DP

      val metrics = context.resources.displayMetrics
      val fit = minOf(1f, metrics.widthPixels / metrics.density / width, metrics.heightPixels / metrics.density / height)
      return Pair(width * fit, height * fit)
    }

    private fun render(context: Context, manager: AppWidgetManager, appWidgetId: Int) {
      val (widthDp, heightDp) = sizeDp(context, manager, appWidgetId)
      val today = todayKey()
      val data = WidgetStorage.read(context)
      // Sin datos, o sin datos de hoy (la app lleva más de una semana sin abrirse): solo un aviso
      val usable = data?.takeIf { it.days.containsKey(today) }

      val views = RemoteViews(context.packageName, R.layout.agenda_widget)
      views.setImageViewBitmap(R.id.widget_paper, PostItArt.paper(context, widthDp, heightDp))

      val selected = if (usable != null) selectedDay(context, appWidgetId, today, usable.days.keys) else today
      val locale = Locale.getDefault()
      val pattern = DateFormat.getBestDateTimePattern(locale, "EEEEdMMM")
      val title = SimpleDateFormat(pattern, locale)
          .format(KEY_FORMAT.parse(selected) ?: Date())
          .replaceFirstChar { it.titlecase(locale) }
      views.setTextViewText(R.id.widget_date, title)

      val day = usable?.days?.get(selected)
      val rowCount = ((heightDp - CHROME_HEIGHT_DP) / ROW_HEIGHT_DP).toInt().coerceIn(1, MAX_ROWS)
      val rows = when {
        data == null -> listOf(Row(message(context, R.string.widget_open_app)))
        usable == null -> listOf(Row(message(context, R.string.widget_stale)))
        day == null || day.total == 0 -> listOf(Row(message(context, R.string.widget_no_tasks)))
        else -> taskRows(context, day, rowCount)
      }
      views.setTextViewText(R.id.widget_progress, progress(context, day, selected, today))

      ROW_IDS.forEachIndexed { index, id ->
        val row = rows.getOrNull(index)
        views.setViewVisibility(id, if (row == null) View.GONE else View.VISIBLE)
        if (row != null) {
          views.setTextViewText(id, row.text)
          // Las filas sin tarea no llevan acción propia: cuentan como el resto del widget
          if (row.taskId != null) {
            views.setOnClickPendingIntent(id, WidgetIntents.openTask(context, selected, row.taskId))
          }
        }
      }

      bindHeader(context, views, appWidgetId, usable, selected, today)
      views.setOnClickPendingIntent(R.id.widget_container, WidgetIntents.openApp(context))
      manager.updateAppWidget(appWidgetId, views)
    }

    // Flechas, título y "+" de la cabecera
    private fun bindHeader(
        context: Context, views: RemoteViews, appWidgetId: Int, usable: WidgetData?, selected: String, today: String) {
      val days = usable?.days?.keys?.toList() ?: emptyList()
      val index = days.indexOf(selected)

      bindArrow(context, views, R.id.widget_prev, appWidgetId, -1, index > 0)
      bindArrow(context, views, R.id.widget_next, appWidgetId, +1, index in 0 until days.size - 1)

      // Tocar el título vuelve a hoy cuando se está mirando otro día
      views.setOnClickPendingIntent(
          R.id.widget_date,
          if (selected != today) broadcast(context, appWidgetId, ACTION_TODAY, 0) else WidgetIntents.openApp(context))
      views.setOnClickPendingIntent(R.id.widget_add, WidgetIntents.newTask(context, selected))
    }

    private fun bindArrow(
        context: Context, views: RemoteViews, viewId: Int, appWidgetId: Int, delta: Int, enabled: Boolean) {
      views.setTextColor(viewId, if (enabled) PostItArt.INK else 0x333B3200)
      if (enabled) {
        views.setOnClickPendingIntent(viewId, broadcast(context, appWidgetId, ACTION_SHIFT_DAY, delta))
      } else {
        // Sin día al que ir, la flecha no hace nada (y no deja pasar el toque al resto del widget)
        views.setOnClickPendingIntent(viewId, broadcast(context, appWidgetId, ACTION_SHIFT_DAY, 0))
      }
    }

    private fun broadcast(context: Context, appWidgetId: Int, action: String, delta: Int): PendingIntent {
      val intent = Intent(context, AgendaWidgetProvider::class.java)
          .setAction(action)
          .setData(Uri.parse("widget://tasks/$appWidgetId/$action/$delta"))
          .putExtra(EXTRA_WIDGET_ID, appWidgetId)
          .putExtra(EXTRA_DELTA, delta)
      return PendingIntent.getBroadcast(
          context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    // Una fila del widget; si es una tarea, al tocarla se abre esa tarea en la app
    private class Row(val text: CharSequence, val taskId: String? = null)

    private fun message(context: Context, resId: Int): CharSequence =
        SpannableStringBuilder(context.getString(resId)).apply {
          setSpan(ForegroundColorSpan(PostItArt.INK_SOFT), 0, length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        }

    // "Hoy · 2 de 5 completadas", "Mañana · …" o solo las cuentas (y "¡Todo completado!" si no queda nada)
    private fun progress(context: Context, day: DayData?, selected: String, today: String): String {
      val label = when (selected) {
        today -> context.getString(R.string.widget_today)
        addDays(today, 1) -> context.getString(R.string.widget_tomorrow)
        addDays(today, -1) -> context.getString(R.string.widget_yesterday)
        else -> null
      }
      val counts = when {
        day == null || day.total == 0 -> null
        day.completed >= day.total -> context.getString(R.string.widget_all_done)
        else -> context.getString(R.string.widget_progress, day.completed, day.total)
      }
      return listOfNotNull(label, counts).joinToString(" · ")
    }

    private fun taskRows(context: Context, day: DayData, rowCount: Int): List<Row> {
      // Si no caben todas, la última fila resume las que faltan
      val shown = if (day.tasks.size > rowCount) rowCount - 1 else day.tasks.size
      val rows = day.tasks.take(shown).map { Row(taskText(context, it), it.id.ifEmpty { null }) }.toMutableList()
      if (day.total > shown) {
        rows.add(Row(message(context, R.string.widget_more, day.total - shown)))
      }
      return rows
    }

    private fun message(context: Context, resId: Int, count: Int): CharSequence =
        SpannableStringBuilder(context.getString(resId, count)).apply {
          setSpan(ForegroundColorSpan(PostItArt.INK_SOFT), 0, length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        }

    // ☐ (del color del tipo) + hora + texto; las completadas van con ☑ y el texto tachado y apagado
    private fun taskText(context: Context, task: TaskItem): CharSequence {
      val text = SpannableStringBuilder()
      fun append(value: String, vararg spans: Any) {
        val start = text.length
        text.append(value)
        spans.forEach { text.setSpan(it, start, text.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE) }
      }

      val boxColor = task.color?.let { PostItArt.shade(it, 0.72f) } ?: PostItArt.INK
      append(if (task.done) "☑ " else "☐ ", ForegroundColorSpan(boxColor), StyleSpan(Typeface.BOLD))
      if (task.repeating) append("🔄 ")
      if (task.at != null) {
        append(formatTime(context, task.at) + "  ", StyleSpan(Typeface.BOLD), RelativeSizeSpan(0.86f),
            ForegroundColorSpan(if (task.done) PostItArt.INK_SOFT else 0xFF5C4B00.toInt()))
      }
      if (task.done) {
        append(task.text, StrikethroughSpan(), ForegroundColorSpan(PostItArt.INK_SOFT))
      } else {
        append(task.text)
      }
      return text
    }

    // La hora con el formato del sistema (12 o 24 horas)
    private fun formatTime(context: Context, minutes: Int): String {
      val calendar = Calendar.getInstance().apply {
        set(Calendar.HOUR_OF_DAY, minutes / 60)
        set(Calendar.MINUTE, minutes % 60)
      }
      return DateFormat.getTimeFormat(context).format(calendar.time)
    }

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
