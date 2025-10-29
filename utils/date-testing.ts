import {
    createLocalDateFromString,
    dateToLocalDateString,
    debugDate,
    getCurrentLocalDateString,
    migrateDateKey,
    needsDateMigration,
    normalizeToLocalMidnight
} from '@/utils/date-utils';

/**
 * Script de testing para las utilidades de fecha
 * Usado para verificar que la migración funciona correctamente
 */
export const testDateUtils = () => {
  console.log('🧪 === TESTING DATE UTILITIES ===');
  
  // Test 1: Fecha actual
  console.log('\n📅 Test 1: Fecha actual');
  const now = new Date();
  debugDate(now, 'Fecha actual original');
  
  const normalized = normalizeToLocalMidnight(now);
  debugDate(normalized, 'Fecha normalizada');
  
  const dateString = dateToLocalDateString(now);
  console.log('📝 String de fecha local:', dateString);
  
  const currentLocal = getCurrentLocalDateString();
  console.log('📝 String actual local:', currentLocal);
  
  // Test 2: Fechas problemáticas
  console.log('\n🚨 Test 2: Fechas problemáticas');
  
  // Simular fecha con zona horaria problemática
  const problematicDate = new Date('2025-10-27T22:00:00.000Z'); // UTC que puede cambiar fecha local
  debugDate(problematicDate, 'Fecha problemática UTC');
  
  const fixed = normalizeToLocalMidnight(problematicDate);
  debugDate(fixed, 'Fecha corregida');
  
  // Test 3: Migración de claves
  console.log('\n🔄 Test 3: Migración de claves');
  
  const oldKeys = [
    '2025-10-27',
    '2025-10-27T22:00:00.000Z',
    '2025-10-28T01:30:00.000-05:00',
    'invalid-date'
  ];
  
  oldKeys.forEach(key => {
    const migrated = migrateDateKey(key);
    console.log(`📝 Migración: "${key}" → "${migrated}"`);
  });
  
  // Test 4: Detección de migración necesaria
  console.log('\n🔍 Test 4: Detección de migración');
  
  const testDates = [
    '2025-10-27T00:00:00.000Z', // Necesita migración (tiene hora)
    '2025-10-27T15:30:00.000Z', // Necesita migración (tiene hora)
    normalizeToLocalMidnight(new Date()).toISOString() // No necesita (ya normalizada)
  ];
  
  testDates.forEach(date => {
    const needs = needsDateMigration(date);
    console.log(`🔍 "${date}" necesita migración: ${needs ? '✅ SÍ' : '❌ NO'}`);
  });
  
  // Test 5: Consistencia entre timezones
  console.log('\n🌍 Test 5: Consistencia entre timezones');
  
  // Simular diferentes momentos del día
  const testTimes = [
    new Date('2025-10-27T23:30:00'), // Casi medianoche
    new Date('2025-10-28T00:30:00'), // Pasada medianoche
    new Date('2025-10-28T12:00:00'), // Mediodía
  ];
  
  testTimes.forEach(time => {
    const dateString = dateToLocalDateString(time);
    const recreated = createLocalDateFromString(dateString);
    
    console.log(`🌍 ${time.toLocaleString()} → "${dateString}" → ${recreated.toLocaleString()}`);
    console.log(`   Mismo día: ${time.getDate() === recreated.getDate() ? '✅' : '❌'}`);
  });
  
  console.log('\n✅ === TESTING COMPLETADO ===');
};

/**
 * Función para testing específico del problema reportado
 * Simula el cambio de día a las 00:00 vs 01:00
 */
export const testMidnightTransition = () => {
  console.log('🕛 === TESTING TRANSICIÓN DE MEDIANOCHE ===');
  
  // Simular fecha problemática (23:00 del día anterior en UTC)
  const beforeMidnight = new Date('2025-10-27T23:00:00.000Z');
  const atMidnight = new Date('2025-10-28T00:00:00.000Z');
  const afterMidnight = new Date('2025-10-28T01:00:00.000Z');
  
  console.log('\n🕚 Antes de medianoche UTC:');
  debugDate(beforeMidnight, 'UTC 23:00');
  console.log('📝 Clave de fecha:', dateToLocalDateString(beforeMidnight));
  
  console.log('\n🕛 Medianoche UTC:');
  debugDate(atMidnight, 'UTC 00:00');
  console.log('📝 Clave de fecha:', dateToLocalDateString(atMidnight));
  
  console.log('\n🕐 Después de medianoche UTC:');
  debugDate(afterMidnight, 'UTC 01:00');
  console.log('📝 Clave de fecha:', dateToLocalDateString(afterMidnight));
  
  // Verificar consistencia
  const key1 = dateToLocalDateString(beforeMidnight);
  const key2 = dateToLocalDateString(atMidnight);
  const key3 = dateToLocalDateString(afterMidnight);
  
  console.log('\n📊 Resumen de claves:');
  console.log(`23:00 UTC → "${key1}"`);
  console.log(`00:00 UTC → "${key2}"`);
  console.log(`01:00 UTC → "${key3}"`);
  
  console.log('\n🎯 ¿Las tareas aparecen el día correcto?');
  console.log(`Todas las claves son consistentes: ${key1 === key2 && key2 === key3 ? '✅ SÍ' : '❌ NO'}`);
};

/**
 * Función para debugging en producción
 * Se puede llamar desde la consola del developer
 */
export const debugCurrentDateIssues = () => {
  console.log('🐛 === DEBUG DE PROBLEMAS DE FECHA ACTUALES ===');
  
  const now = new Date();
  const utcNow = new Date(now.toISOString());
  
  console.log('\n⏰ Información de zona horaria:');
  console.log('Offset de zona horaria (minutos):', now.getTimezoneOffset());
  console.log('Hora local:', now.toLocaleString());
  console.log('Hora UTC:', utcNow.toUTCString());
  
  console.log('\n📅 Métodos de conversión de fecha:');
  console.log('toISOString().split("T")[0]:', now.toISOString().split('T')[0]);
  console.log('dateToLocalDateString():', dateToLocalDateString(now));
  console.log('getCurrentLocalDateString():', getCurrentLocalDateString());
  
  console.log('\n🌍 Simulación de problema:');
  // Simular una fecha que podría causar el problema reportado
  const problemDate = new Date();
  problemDate.setHours(23, 59, 59, 999); // Casi medianoche
  
  const oldMethod = problemDate.toISOString().split('T')[0];
  const newMethod = dateToLocalDateString(problemDate);
  
  console.log(`Fecha problemática: ${problemDate.toLocaleString()}`);
  console.log(`Método antiguo: "${oldMethod}"`);
  console.log(`Método nuevo: "${newMethod}"`);
  console.log(`¿Coinciden?: ${oldMethod === newMethod ? '✅ SÍ' : '❌ NO'}`);
  
  if (oldMethod !== newMethod) {
    console.log('🚨 ¡PROBLEMA DETECTADO! Los métodos dan fechas diferentes.');
    console.log('   Esto explicaría por qué las tareas no aparecen hasta la 1 AM.');
  }
};
