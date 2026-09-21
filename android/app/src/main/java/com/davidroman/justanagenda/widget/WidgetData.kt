package com.davidroman.justanagenda.widget

import android.content.Context
import android.graphics.Color
import org.json.JSONObject
import java.util.TreeMap

class TaskItem(
    val id: String,
    val text: String,
    val done: Boolean,
    val repeating: Boolean,
    /** Minutos desde medianoche del recordatorio */
    val at: Int?,
    /** Color del tipo de tarea */
    val color: Int?,
)

class DayData(val total: Int, val completed: Int, val tasks: List<TaskItem>)

class NoteItem(
    val id: String,
    val text: String,
    val color: Int,
    val rotation: Float,
    /** Chincheta: color de la cabeza, del pie y desplazamiento horizontal desde el centro (dp) */
    val pinHead: Int,
    val pinDark: Int,
    val pinOffset: Float,
)

class WidgetData(val days: TreeMap<String, DayData>, val notes: List<NoteItem>)

// Lo que la app deja en SharedPreferences (ver stores/widget-store.ts y utils/widget-data.ts) para que
// lean los dos widgets, aunque la app esté cerrada.
object WidgetStorage {
  const val PREFS_NAME = "agenda_widget"

  // Misma clave con la que escribe stores/widget-store.ts
  const val DATA_KEY = "widget-data-v3"

  /** null si la app aún no ha guardado nada (o lo guardado no se entiende) */
  fun read(context: Context): WidgetData? {
    val raw = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getString(DATA_KEY, null)
    val root = raw?.let { runCatching { JSONObject(it) }.getOrNull() } ?: return null
    return runCatching { parse(root) }.getOrNull()
  }

  private fun parse(root: JSONObject): WidgetData {
    val days = TreeMap<String, DayData>()
    root.optJSONObject("days")?.let { json ->
      json.keys().forEach { date ->
        val day = json.optJSONObject(date) ?: return@forEach
        val tasks = day.optJSONArray("tasks")
        val items = List(tasks?.length() ?: 0) { tasks!!.optJSONObject(it) }
            .filter { it != null && it.optString("text").isNotBlank() }
            .map {
              TaskItem(
                  id = it!!.optString("id"),
                  text = it.optString("text"),
                  done = it.optBoolean("done"),
                  repeating = it.optBoolean("repeating"),
                  at = if (it.has("at")) it.optInt("at") else null,
                  color = color(it.optString("color")),
              )
            }
        days[date] = DayData(day.optInt("total", items.size), day.optInt("completed", 0), items)
      }
    }

    val notesJson = root.optJSONArray("notes")
    val notes = List(notesJson?.length() ?: 0) { notesJson!!.optJSONObject(it) }
        .filter { it != null && it.optString("text").isNotBlank() }
        .map {
          val pin = it!!.optJSONObject("pin")
          NoteItem(
              id = it.optString("id"),
              text = it.optString("text"),
              color = color(it.optString("color")) ?: DEFAULT_NOTE_COLOR,
              rotation = it.optDouble("rotation", 0.0).toFloat(),
              pinHead = color(pin?.optString("head") ?: "") ?: DEFAULT_PIN_HEAD,
              pinDark = color(pin?.optString("dark") ?: "") ?: DEFAULT_PIN_DARK,
              pinOffset = pin?.optDouble("offset", 0.0)?.toFloat() ?: 0f,
          )
        }
    return WidgetData(days, notes)
  }

  private const val DEFAULT_NOTE_COLOR = 0xFFFBE164.toInt()
  private const val DEFAULT_PIN_HEAD = 0xFFD93A3A.toInt()
  private const val DEFAULT_PIN_DARK = 0xFF9C2020.toInt()

  private fun color(hex: String): Int? = runCatching { Color.parseColor(hex) }.getOrNull()
}
