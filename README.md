# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Características principales

### 📝 Gestión de Tareas
- Crear, editar y eliminar tareas
- Recordatorios con notificaciones
- Tareas repetitivas (diarias, semanales, mensuales)
- Soporte para texto largo (hasta 500 caracteres)

### 🔗 Enlaces Clickeables
- **Nueva funcionalidad**: Los enlaces en las tareas son automáticamente detectados y convertidos en hipervínculos
- Formatos soportados:
  - `https://example.com`
  - `http://example.com`
  - `www.example.com`
  - `example.com`
- Los enlaces se pueden tocar para abrir en el navegador
- Estilos diferenciados para enlaces (azul con subrayado)

### 🗓️ Gestión de Fechas
- Compatibilidad global con zonas horarias
- Migración automática de fechas
- Widgets de Android (ver más abajo)

### 📌 Notas
- Post-its de colores (con su chincheta) sobre un tablero de corcho, con archivos e imágenes adjuntos
- Se reordenan arrastrándolos (pulsación larga); el orden se guarda y va en las copias de seguridad

### 🧩 Widgets de Android
Nativos, en Kotlin (`android/app/src/main/java/com/davidroman/justanagenda/widget/`), porque Expo no ofrece widgets.
- **Agenda de hoy**: un post-it con las tareas del día (hora, color de tipo, completadas tachadas), flechas ‹ › para cambiar de día y ＋ para añadir una tarea
- **Tablero de notas**: el corcho con las últimas notas; tocar una abre su editor y ＋ crea una nueva
- Pasan solos al día nuevo a medianoche. La app les manda los datos (`utils/widget-data.ts`) y se abren con enlaces `justagenda://widget-task` y `justagenda://widget-note`

### Ejemplos de tareas con enlaces:
```
Revisar documentación en https://docs.expo.dev
Visitar mi sitio web: www.example.com
Checa github.com/user/repo para el código
```

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
