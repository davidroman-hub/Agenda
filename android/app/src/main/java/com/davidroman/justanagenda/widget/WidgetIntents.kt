package com.davidroman.justanagenda.widget

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import com.davidroman.justanagenda.MainActivity

// Los toques que llevan a la app. Los enlaces justagenda://widget-task y justagenda://widget-note los
// recogen app/widget-task.tsx y app/widget-note.tsx, con la app cerrada o abierta.
object WidgetIntents {
  private const val FLAGS = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE

  fun openApp(context: Context): PendingIntent =
      PendingIntent.getActivity(context, 0, Intent(context, MainActivity::class.java), FLAGS)

  /** Abre una tarea concreta en su día */
  fun openTask(context: Context, date: String, taskId: String): PendingIntent =
      link(context, "widget-task", "date" to date, "id" to taskId)

  /** Abre el editor de una tarea nueva en ese día */
  fun newTask(context: Context, date: String): PendingIntent =
      link(context, "widget-task", "date" to date)

  /** Abre el tablero de notas, con una nota concreta o, sin id, solo el tablero */
  fun openNote(context: Context, noteId: String?): PendingIntent =
      if (noteId == null) link(context, "widget-note") else link(context, "widget-note", "id" to noteId)

  fun newNote(context: Context): PendingIntent = link(context, "widget-note", "new" to "1")

  private fun link(context: Context, route: String, vararg params: Pair<String, String>): PendingIntent {
    val uri = Uri.Builder().scheme("justagenda").authority(route).apply {
      params.forEach { (key, value) -> appendQueryParameter(key, value) }
    }.build()
    val intent = Intent(Intent.ACTION_VIEW, uri, context, MainActivity::class.java)
    // Cada enlace es un destino distinto: el código de petición solo tiene que ser el mismo para el mismo enlace
    return PendingIntent.getActivity(context, uri.hashCode(), intent, FLAGS)
  }
}
