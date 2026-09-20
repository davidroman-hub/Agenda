# Hospedar Política de Privacidad

## Dónde está publicada hoy

- **URL:** https://just-an-agenda.netlify.app/ (la página elige el idioma del navegador y trae selector)
- **Archivo que se sube:** `app-store-assets/privacy-policy-multilang.html`, publicado con el nombre `index.html`
- **Cada vez que cambie la política:** vuelve a desplegar en Netlify (Deploys → arrastrar la carpeta con el `index.html` nuevo) y comprueba que la página muestra el cambio. Pon la misma URL en Play Console (política de privacidad de la ficha).
- El enlace de la app está en `app/(tabs)/settings.tsx` (`PRIVACY_POLICY_URL`).

Lo que sigue son las opciones generales de hosting (histórico).

## Opción 1: GitHub Pages (Recomendado - GRATIS)

### Pasos:
1. **Crear repositorio público en GitHub**:
   ```
   Nombre: justagenda-privacy-policy
   ```

2. **Subir el archivo**:
   - Sube `privacy-policy.html` como `index.html`

3. **Activar GitHub Pages**:
   - Ve a Settings > Pages
   - Source: Deploy from a branch
   - Branch: main / root
   - Save

4. **Tu URL será**:
   ```
   https://tu-usuario.github.io/justagenda-privacy-policy
   ```

5. **Actualizar en settings.tsx**:
   ```typescript
   const handlePrivacyPolicyPress = () => {
     Linking.openURL("https://tu-usuario.github.io/justagenda-privacy-policy");
   };
   ```

## Opción 2: Netlify (Alternativa gratuita)

1. Ve a [netlify.com](https://netlify.com)
2. Drag & drop el archivo `privacy-policy.html`
3. Cambia el nombre a `index.html`
4. Tu sitio estará en `https://random-name.netlify.app`

## Opción 3: Tu propio dominio

Si tienes un sitio web, sube el archivo como:
```
https://tudominio.com/privacy-policy.html
```

## Verificación

Después de hostear, verifica que:
- [x] La página carga correctamente
- [x] Se ve bien en móvil
- [x] El enlace funciona desde la app
- [x] Actualiza la URL en el código

## Para Play Store

Google Play Store requiere que la URL de la política de privacidad:
- ✅ Sea accesible públicamente
- ✅ No requiera login
- ✅ Funcione en navegadores móviles
- ✅ No redirija a otros sitios

¡Tu política ya cumple todos estos requisitos!
