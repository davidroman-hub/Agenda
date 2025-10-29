import { Linking } from 'react-native';

/**
 * Expresión regular para detectar URLs
 * Detecta http, https, www y dominios básicos
 */
const URL_REGEX = /(https?:\/\/\S+|www\.\S+|\w+\.\w{2,}(?:\/\S*)?)/gi;

/**
 * Detecta si un texto contiene URLs
 */
export function containsUrl(text: string): boolean {
  return URL_REGEX.test(text);
}

/**
 * Extrae todas las URLs de un texto
 */
export function extractUrls(text: string): string[] {
  const matches = text.match(URL_REGEX);
  return matches || [];
}

/**
 * Divide un texto en partes, separando URLs del texto normal
 * Retorna un array de objetos con {text, isUrl}
 */
export function parseTextWithUrls(text: string): { text: string; isUrl: boolean }[] {
  const parts: { text: string; isUrl: boolean }[] = [];
  let lastIndex = 0;
  
  // Reset regex
  URL_REGEX.lastIndex = 0;
  
  let match;
  while ((match = URL_REGEX.exec(text)) !== null) {
    // Agregar texto antes de la URL
    if (match.index > lastIndex) {
      const beforeUrl = text.substring(lastIndex, match.index);
      if (beforeUrl) {
        parts.push({ text: beforeUrl, isUrl: false });
      }
    }
    
    // Agregar la URL
    parts.push({ text: match[0], isUrl: true });
    lastIndex = match.index + match[0].length;
  }
  
  // Agregar texto restante después de la última URL
  if (lastIndex < text.length) {
    const remaining = text.substring(lastIndex);
    if (remaining) {
      parts.push({ text: remaining, isUrl: false });
    }
  }
  
  // Si no hay URLs, retornar el texto completo
  if (parts.length === 0) {
    parts.push({ text, isUrl: false });
  }
  
  return parts;
}

/**
 * Normaliza una URL para abrirla correctamente
 * Agrega http:// si no tiene protocolo
 */
export function normalizeUrl(url: string): string {
  // Si ya tiene protocolo, retornar tal como está
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Si empieza con www, agregar https
  if (url.startsWith('www.')) {
    return `https://${url}`;
  }
  
  // Si parece un dominio, agregar https
  if (url.includes('.') && !url.includes(' ')) {
    return `https://${url}`;
  }
  
  return url;
}

/**
 * Abre una URL en el navegador
 */
export async function openUrl(url: string): Promise<boolean> {
  try {
    const normalizedUrl = normalizeUrl(url);
    const canOpen = await Linking.canOpenURL(normalizedUrl);
    
    if (canOpen) {
      await Linking.openURL(normalizedUrl);
      return true;
    } else {
      console.warn('No se puede abrir la URL:', normalizedUrl);
      return false;
    }
  } catch (error) {
    console.error('Error abriendo URL:', error);
    return false;
  }
}

/**
 * Función de utilidad para testing
 */
export function testUrlDetection() {
  const testTexts = [
    'Visita https://example.com para más info',
    'Checa www.google.com o http://facebook.com',
    'Mi sitio es example.org/path?query=1',
    'Email: test@example.com y sitio: mysite.co',
    'Sin URLs en este texto',
    'GitHub: github.com/user/repo'
  ];
  
  console.log('🔗 Testing URL detection:');
  for (const text of testTexts) {
    console.log(`\nTexto: "${text}"`);
    console.log(`Contiene URLs: ${containsUrl(text)}`);
    console.log(`URLs extraídas:`, extractUrls(text));
    console.log(`Partes parseadas:`, parseTextWithUrls(text));
  }
}
