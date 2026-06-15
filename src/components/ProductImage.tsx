import React, { useEffect, useState } from 'react';
import {
  Image,
  ImageProps,
  ImageStyle,
  StyleProp,
  View,
  ViewStyle,
  StyleSheet,
} from 'react-native';
import { resolveProductImageUri } from '../utils/alicdnImageCache';
import { normalizeProductImageUrl } from '../utils/productImageUrl';

type ProductImageProps = Omit<ImageProps, 'source'> & {
  uri?: string | null;
  style?: StyleProp<ViewStyle | ImageStyle>;
};

/**
 * Loads Alibaba CDN images by downloading to cache (Referer required on Android).
 * Border radius stays on the wrapper View so Fresco never rounds EmptyDrawable.
 */
const ProductImage: React.FC<ProductImageProps> = ({
  uri,
  style,
  resizeMode = 'cover',
  onError,
  ...rest
}) => {
  const [displayUri, setDisplayUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setDisplayUri(null);

    const normalized = normalizeProductImageUrl(uri);
    if (!normalized) {
      return undefined;
    }

    resolveProductImageUri(normalized)
      .then((resolved) => {
        if (!cancelled && resolved) {
          setDisplayUri(resolved);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDisplayUri(normalized);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [uri]);

  const normalized = normalizeProductImageUrl(uri);
  const containerStyle: StyleProp<ViewStyle> = [
    style as StyleProp<ViewStyle>,
    !displayUri && normalized ? { backgroundColor: '#f0f0f0' } : null,
  ];

  if (failed || !normalized) {
    return <View style={containerStyle} />;
  }

  if (!displayUri) {
    return <View style={containerStyle} />;
  }

  return (
    <View style={containerStyle}>
      <Image
        source={{ uri: displayUri }}
        style={styles.imageFill}
        resizeMode={resizeMode}
        fadeDuration={0}
        onError={(event) => {
          setFailed(true);
          onError?.(event);
        }}
        {...rest}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  imageFill: {
    width: '100%',
    height: '100%',
  },
});

export default React.memo(ProductImage);
