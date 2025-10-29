import { useThemeColor } from '@/hooks/use-theme-color';
import { openUrl, parseTextWithUrls } from '@/utils/url-utils';
import React from 'react';
import { Alert, Text, TextStyle } from 'react-native';

interface LinkableTextProps {
  readonly children: string;
  readonly style?: TextStyle;
  readonly linkStyle?: TextStyle;
  readonly onLinkPress?: (url: string) => void;
  readonly numberOfLines?: number;
  readonly ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
  readonly lightColor?: string; // Color del texto en modo claro
  readonly darkColor?: string; // Color del texto en modo oscuro
}

/**
 * Componente que renderiza texto con enlaces clickeables
 * Detecta automáticamente URLs en el texto y las convierte en enlaces
 */
export default function LinkableText({
  children,
  style,
  linkStyle,
  onLinkPress,
  numberOfLines,
  ellipsizeMode,
  lightColor,
  darkColor,
}: Readonly<LinkableTextProps>) {
  // Obtener el color apropiado para el tema actual
  const textColor = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const handleLinkPress = async (url: string) => {
    if (onLinkPress) {
      onLinkPress(url);
      return;
    }

    try {
      const success = await openUrl(url);
      if (!success) {
        Alert.alert(
          'Error',
          'No se pudo abrir el enlace. Verifica que la URL sea correcta.',
          [{ text: 'OK' }]
        );
      }
    } catch {
      Alert.alert(
        'Error',
        'Ocurrió un error al intentar abrir el enlace.',
        [{ text: 'OK' }]
      );
    }
  };

  const renderTextWithLinks = () => {
    const parts = parseTextWithUrls(children);
    
    return parts.map((part, index) => {
      const key = `${part.isUrl ? 'url' : 'text'}-${index}-${part.text.substring(0, 10)}`;
      
      if (part.isUrl) {
        return (
          <Text
            key={key}
            style={[
              style,
              linkStyle || defaultLinkStyle,
            ]}
            onPress={() => handleLinkPress(part.text)}
          >
            {part.text}
          </Text>
        );
      } else {
        return (
          <Text 
            key={key} 
            style={[
              style,
              { color: textColor }
            ]}
          >
            {part.text}
          </Text>
        );
      }
    });
  };

  return (
    <Text
      style={[{ color: textColor }, style]}
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
    >
      {renderTextWithLinks()}
    </Text>
  );
}

const defaultLinkStyle: TextStyle = {
  color: '#007AFF',
  textDecorationLine: 'underline',
};
