import React, { useState } from 'react';
import { Image, StyleSheet, Text, View, ViewStyle } from 'react-native';

type AvatarProps = {
  uri?: string | null;
  label: string;
  size?: number;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  textColor?: string;
  fontSize?: number;
  style?: ViewStyle;
};

export default function Avatar({
  uri,
  label,
  size = 44,
  backgroundColor = '#ede9fe',
  borderColor,
  borderWidth,
  textColor = '#9333ea',
  fontSize,
  style,
}: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = !!uri && !failed;

  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...(borderWidth ? { borderWidth, borderColor } : null),
  };

  return (
    <View style={[containerStyle, style]}>
      {showImage ? (
        <Image
          source={{ uri }}
          style={styles.image}
          onError={() => setFailed(true)}
        />
      ) : (
        <Text style={{ fontSize: fontSize ?? size * 0.4, fontWeight: '700', color: textColor }}>
          {label.charAt(0).toUpperCase()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
  },
});
