package com.david_roman_a.david_roman_aapp.widget;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

public class WidgetUpdateService {
    
    public static void updateWidgets(Context context) {
        Intent intent = new Intent(context, AgendaWidgetProvider.class);
        intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        int[] widgetIds = appWidgetManager.getAppWidgetIds(
            new ComponentName(context, AgendaWidgetProvider.class));
        
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, widgetIds);
        context.sendBroadcast(intent);
    }
    
    public static void saveTasksToWidget(Context context, String date, String tasksJson) {
        SharedPreferences prefs = context.getSharedPreferences("agenda_data", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString("tasks_" + date, tasksJson);
        editor.apply();
        
        // Actualizar widgets después de guardar
        updateWidgets(context);
    }
}
