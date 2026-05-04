import React, { useState, useEffect } from 'react';
import {
  Image,
  ImageProps,
  View,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../constants';

interface CachedImageProps extends Omit<ImageProps, 'source'> {
  uri: string;
  showLoader?: boolean;
}

const CachedImage: React.FC<CachedImageProps> = ({
  uri,
  style,
  showLoader = false,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentUri, setCurrentUri] = useState(uri);
  const [previousUri, setPreviousUri] = useState<string | null>(null);

  useEffect(() => {
    // When URI changes, keep the previous image visible
    if (uri !== currentUri) {
      setPreviousUri(currentUri);
      setCurrentUri(uri);
      setIsLoading(true);
      setError(false);
    }
  }, [uri]);

  const handleLoadStart = () => {
    setIsLoading(true);
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
    // Clear previous image after new one loads
    setPreviousUri(null);
  };

  const handleError = () => {
    setIsLoading(false);
    setError(true);
  };

  return (
    <View style={[styles.container, style]}>
      {/* Show previous image while loading new one */}
      {previousUri && isLoading && (
        <Image
          source={{ uri: previousUri }}
          style={[StyleSheet.absoluteFill, style]}
          {...props}
        />
      )}
      
      {/* Current/New image */}
      {!error && (
        <Image
          source={{ uri: currentUri }}
          style={[StyleSheet.absoluteFill, style]}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
          fadeDuration={300}
          {...props}
        />
      )}

      {/* Loading indicator (optional) */}
      {showLoader && isLoading && !previousUri && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      )}

      {/* Error placeholder */}
      {error && (
        <View style={[styles.errorContainer, style]}>
          {/* Show gray placeholder on error */}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.gray[100],
    overflow: 'hidden',
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray[50],
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray[100],
  },
  errorContent: {
    width: '100%',
    height: '100%',
  },
});

export default CachedImage;
