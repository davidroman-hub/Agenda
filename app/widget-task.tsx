import { requestNewTaskFromWidget, requestTaskFromWidget } from '@/services/widget-navigation';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

// Destino de los toques del widget de tareas de Android: una tarea (?date=…&id=…) o el "+" que crea
// una en ese día (?date=…). No enseña nada: pide abrirla y pasa a la agenda (funciona igual con la app
// cerrada o ya abierta). Se usa <Redirect> y no router.replace porque en el arranque en frío el
// navegador raíz aún puede no estar montado
export default function WidgetTaskRoute() {
  const { date, id } = useLocalSearchParams<{ date?: string; id?: string }>();
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    if (id) requestTaskFromWidget(date, id);
    else requestNewTaskFromWidget(date);
    setRequested(true);
  }, [date, id]);

  return requested ? <Redirect href="/(tabs)" /> : null;
}
