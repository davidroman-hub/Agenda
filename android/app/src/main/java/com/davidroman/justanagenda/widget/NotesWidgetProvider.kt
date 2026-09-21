package com.davidroman.justanagenda.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews
import com.davidroman.justanagenda.R

// Widget de notas: un tablero de corcho con las últimas notas como post-its pegados con chincheta
// (los mismos colores e inclinaciones que en la app). Tocar uno abre esa nota; el "+" crea una nueva.
class NotesWidgetProvider : AppWidgetProvider() {

  override fun onUpdate(context: Context, manager: AppWidgetManager, appWidgetIds: IntArray) {
    appWidgetIds.forEach { render(context, manager, it) }
  }

  override fun onAppWidgetOptionsChanged(
      context: Context, manager: AppWidgetManager, appWidgetId: Int, newOptions: Bundle) {
    render(context, manager, appWidgetId)
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    // El texto de "sin notas" cambia con el idioma
    if (intent.action == Intent.ACTION_LOCALE_CHANGED) updateAll(context)
  }

  companion object {
    private val ROW_IDS = intArrayOf(R.id.notes_row1, R.id.notes_row2, R.id.notes_row3)
    private val CELL_IDS = arrayOf(
        intArrayOf(R.id.notes_cell1, R.id.notes_cell2),
        intArrayOf(R.id.notes_cell3, R.id.notes_cell4),
        intArrayOf(R.id.notes_cell5, R.id.notes_cell6))

    fun updateAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, NotesWidgetProvider::class.java))
      ids.forEach { render(context, manager, it) }
    }

    private fun render(context: Context, manager: AppWidgetManager, appWidgetId: Int) {
      val (widthDp, heightDp) = AgendaWidgetProvider.sizeDp(context, manager, appWidgetId)
      val notes = WidgetStorage.read(context)?.notes ?: emptyList()
      val columns = PostItArt.gridColumns(widthDp)
      val rows = PostItArt.gridRows(heightDp)

      val views = RemoteViews(context.packageName, R.layout.notes_widget)
      views.setImageViewBitmap(
          R.id.notes_board,
          PostItArt.board(
              context, widthDp, heightDp, notes, columns, rows,
              PostItArt.isNight(context), context.getString(R.string.notes_widget_empty)))

      // Las zonas táctiles se reparten igual que los post-its dibujados: mismos márgenes y celdas iguales
      ROW_IDS.forEachIndexed { row, rowId ->
        views.setViewVisibility(rowId, if (row < rows) View.VISIBLE else View.GONE)
        CELL_IDS[row].forEachIndexed { column, cellId ->
          views.setViewVisibility(cellId, if (column < columns) View.VISIBLE else View.GONE)
          val note = notes.getOrNull(row * columns + column)
          // Un hueco sin nota no lleva acción propia: cuenta como el resto del tablero
          if (note != null) views.setOnClickPendingIntent(cellId, WidgetIntents.openNote(context, note.id))
        }
      }

      views.setOnClickPendingIntent(R.id.notes_add, WidgetIntents.newNote(context))
      views.setOnClickPendingIntent(R.id.notes_container, WidgetIntents.openNote(context, null))
      manager.updateAppWidget(appWidgetId, views)
    }
  }
}
