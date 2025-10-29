/**
 * Script de prueba para la funcionalidad de enlaces
 * Ejecuta este script para ver ejemplos de detección de URLs
 */

import { parseTextWithUrls, testUrlDetection } from '../utils/url-utils';

// Función para probar la detección de URLs
export function testLinkFunctionality() {
  console.log('🔗 === TESTING LINK FUNCTIONALITY ===');
  
  // Ejecutar tests de URL utilities
  testUrlDetection();
  
  console.log('\n📱 === EJEMPLOS PARA TAREAS ===');
  
  const taskExamples = [
    'Revisar documentación en https://docs.expo.dev y hacer deploy',
    'Visitar mi sitio web: www.example.com para más info',
    'Checa github.com/facebook/react para el código fuente',
    'Email a team@company.com o ir a company.org/contact',
    'Leer artículo en medium.com/@author/article-name',
    'Backup en drive.google.com y slack.com para notificar',
    'Meeting notes: notion.so/workspace/page y zoom.us/j/123456',
    'Esta tarea no tiene enlaces, solo texto normal'
  ];
  
  for (const [index, task] of taskExamples.entries()) {
    console.log(`\n${index + 1}. Tarea: "${task}"`);
    
    // Simular el comportamiento del componente LinkableText
    const parts = parseTextWithUrls(task);
    console.log('   Partes detectadas:');
    
    for (const part of parts) {
      if (part.isUrl) {
        console.log(`     🔗 [ENLACE] "${part.text}"`);
      } else {
        console.log(`     📝 [TEXTO] "${part.text}"`);
      }
    }
  }
  
  console.log('\n✅ === FUNCIONALIDAD INTEGRADA ===');
  console.log('📱 Los enlaces en las tareas ahora son clickeables');
  console.log('🎨 Aparecen en azul con subrayado');
  console.log('🚀 Se abren automáticamente en el navegador');
  console.log('🌐 Soporta múltiples formatos de URL');
  console.log('📝 Compatible con texto largo (hasta 500 caracteres)');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testLinkFunctionality();
}
