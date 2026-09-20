# Build Configuration Needed

## 1. Update app.json for Play Store

```json
{
  "expo": {
    // ... existing config
    "android": {
      "permissions": [
        "android.permission.POST_NOTIFICATIONS",
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.SCHEDULE_EXACT_ALARM",
        "android.permission.VIBRATE"
      ],
      "blockedPermissions": [
        "android.permission.SYSTEM_ALERT_WINDOW",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.READ_CALENDAR",
        "android.permission.WRITE_CALENDAR",
        "android.permission.ACCESS_NOTIFICATION_POLICY"
      ],
      "adaptiveIcon": {
        // ... existing
      },
      "versionCode": 1, // REQUIRED - increment for each build
      "package": "com.davidroman.justanagenda", // Consider renaming
      "playStoreUrl": "https://play.google.com/store/apps/details?id=com.davidroman.justanagenda"
    }
  }
}
```

## 2. Generate Upload Key (Signing Key)
```bash
# Generate signing key
keytool -genkey -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload

# Store credentials securely
```

## 3. Configure EAS for production build
```json
// eas.json - ADD THIS
{
  "build": {
    "production": {
      "android": {
        "buildType": "aab", // Required for Play Store
        "gradleCommand": ":app:bundleRelease"
      }
    }
  }
}
```
