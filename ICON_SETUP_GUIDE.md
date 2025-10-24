icon# Guía para Cambiar el Ícono de la App

## 📱 Implementación de tu nuevo ícono "Just an Agenda"

### Pasos para implementar tu nuevo ícono:

#### 1. **Preparar la imagen principal**
- Guarda tu imagen como `icon.png` en `/assets/images/`
- **Tamaño requerido**: 1024x1024 píxeles
- **Formato**: PNG con fondo transparente si es posible

#### 2. **Crear versiones para Android (Adaptive Icon)**
Para Android necesitas crear versiones específicas:

**a) Foreground (primer plano):**
- Archivo: `android-icon-foreground.png`
- Tamaño: 432x432 píxeles
- Solo el elemento principal (la agenda con el check)
- Fondo transparente

**b) Background (fondo):**
- Archivo: `android-icon-background.png` 
- Tamaño: 432x432 píxeles
- Solo el fondo amarillo/verde degradado
- Sin elementos del primer plano

**c) Monochrome (monocromático):**
- Archivo: `android-icon-monochrome.png`
- Tamaño: 432x432 píxeles
- Versión en blanco y negro del ícono
- Para temas del sistema

#### 3. **Favicon para web**
- Archivo: `favicon.png`
- Tamaño: 16x16, 32x32, o 48x48 píxeles
- Versión simplificada del ícono

#### 4. **Splash screen**
- Archivo: `splash-icon.png`
- Tamaño: 200x200 píxeles (como está configurado)
- Versión del ícono para pantalla de carga

## 🛠️ Herramientas recomendadas para generar los íconos:

### Opción 1: Online (Fácil)
- **Easyappicon.com**: Sube tu imagen 1024x1024 y genera todos los tamaños
- **AppIcon.co**: Genera íconos para múltiples plataformas
- **Favicon.io**: Para generar favicons

### Opción 2: Manual (Photoshop/GIMP)
- Redimensiona manualmente cada versión
- Mantén la calidad y proporciones

### Opción 3: Expo CLI (Recomendado)
```bash
# Instalar herramienta de íconos de Expo
npm install -g @expo/image-utils

# Generar íconos automáticamente
npx expo install expo-app-icon-utils
```

## 📋 Checklist de implementación:

- [ ] `icon.png` (1024x1024) - Ícono principal
- [ ] `android-icon-foreground.png` (432x432) - Primer plano Android
- [ ] `android-icon-background.png` (432x432) - Fondo Android  
- [ ] `android-icon-monochrome.png` (432x432) - Monocromo Android
- [ ] `favicon.png` (32x32) - Favicon web
- [ ] `splash-icon.png` (200x200) - Splash screen

## 🎨 Configuración actualizada:

Ya se actualizaron los siguientes elementos en `app.json`:
- ✅ Nombre de la app: "Just an Agenda"
- ✅ Slug: "just-an-agenda"  
- ✅ Scheme: "justagenda"
- ✅ Color de fondo Android: `#F4D03F` (amarillo de tu imagen)
- ✅ Color de splash screen actualizado

## 🚀 Próximos pasos:

1. **Reemplaza los archivos** en `/assets/images/` con las versiones de tu nueva imagen
2. **Reinicia la app** con `npx expo start --clear`
3. **Prueba en dispositivo** escaneando el QR code
4. **Verifica** que el ícono se vea bien en:
   - Home screen del dispositivo
   - Lista de aplicaciones
   - Configuración del sistema
   - Notificaciones

## 💡 Tips importantes:

- **Mantén simplicidad**: Los íconos pequeños deben ser legibles
- **Contraste**: Asegúrate de que se vea bien en fondos claros y oscuros  
- **Consistencia**: Mantén el mismo estilo en todas las versiones
- **Prueba real**: Siempre prueba en dispositivos reales, no solo simuladores

¡Tu nuevo ícono "Just an Agenda" quedará perfecto! 🎉
