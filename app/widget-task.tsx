import { requestTaskFromWidget } from '@/services/widget-navigation';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

// Destino de los toques en las tareas del widget de Android. No enseña nada: pide abrir la tarea
// y pasa a la agenda (funciona igual con la app cerrada o ya abierta). Se usa <Redirect> y no
// router.replace porque en el arranque en frío el navegador raíz aún puede no estar montado
export default function WidgetTaskRoute() {
  const { date, id } = useLocalSearchParams<{ date?: string; id?: string }>();
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    requestTaskFromWidget(date, id);
    setRequested(true);
  }, [date, id]);

  return requested ? <Redirect href="/(tabs)" /> : null;
}
