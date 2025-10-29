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
}: Readonly<LinkableTextProps>) {
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
          <Text key={key} style={style}>
            {part.text}
          </Text>
        );
      }
    });
  };

  return (
    <Text
      style={style}
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
