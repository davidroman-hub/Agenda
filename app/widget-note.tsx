import { requestNoteFromWidget } from '@/services/widget-navigation';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

// Destino de los toques del widget de notas de Android: una nota o el tablero (las dos abren solo la
// sección de notas) o una nueva (?new=1). Igual que widget-task, usa <Redirect> para no navegar antes de
// que el navegador raíz esté listo
export default function WidgetNoteRoute() {
  // El widget también manda `id` (la nota tocada), que ya no se usa: tocar una nota solo abre las notas
  const { new: isNew } = useLocalSearchParams<{ id?: string; new?: string }>();
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    requestNoteFromWidget(isNew === '1');
    setRequested(true);
  }, [isNew]);

  return requested ? <Redirect href="/(tabs)" /> : null;
}
