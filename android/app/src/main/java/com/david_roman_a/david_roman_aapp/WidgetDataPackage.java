package com.david_roman_a.david_roman_aapp;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import java.util.List;
import java.util.ArrayList;
import android.util.Log;

public class WidgetDataPackage implements ReactPackage {
    
    private static final String TAG = "WidgetDataPackage";
    
    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        Log.d(TAG, "createNativeModules llamado");
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new WidgetDataModule(reactContext));
        Log.d(TAG, "WidgetDataModule agregado a la lista");
        return modules;
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        Log.d(TAG, "createViewManagers llamado");
        return new ArrayList<>();
    }
}
