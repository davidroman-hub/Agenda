import { requestNoteFromWidget } from '@/services/widget-navigation';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

// Destino de los toques del widget de notas de Android: una nota (?id=…), una nueva (?new=1) o solo el
// tablero. Igual que widget-task, usa <Redirect> para no navegar antes de que el navegador raíz esté listo
export default function WidgetNoteRoute() {
  const { id, new: isNew } = useLocalSearchParams<{ id?: string; new?: string }>();
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    requestNoteFromWidget(id, isNew === '1');
    setRequested(true);
  }, [id, isNew]);

  return requested ? <Redirect href="/(tabs)" /> : null;
}
