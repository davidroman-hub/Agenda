package com.davidroman.justanagenda

import android.content.Context
import com.davidroman.justanagenda.widget.AgendaWidgetProvider
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

// Puente JS -> nativo: la app guarda aquí el resumen del día y el widget lo lee de SharedPreferences.
// Expo no ofrece widgets, por eso vive en código nativo.
class WidgetDataManagerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "WidgetDataManager"

  @ReactMethod
  fun saveWidgetData(key: String, data: String, promise: Promise) {
    try {
      reactApplicationContext
          .getSharedPreferences(AgendaWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE)
          .edit()
          .putString(key, data)
          .apply()
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("WIDGET_SAVE_ERROR", e.message, e)
    }
  }

  @ReactMethod
  fun forceWidgetUpdate(promise: Promise) {
    try {
      AgendaWidgetProvider.updateAll(reactApplicationContext)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("WIDGET_UPDATE_ERROR", e.message, e)
    }
  }
}
