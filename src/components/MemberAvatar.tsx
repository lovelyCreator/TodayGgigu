import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  StyleProp,
  ViewStyle,
  ImageStyle,
} from 'react-native';
import { COLORS } from '../constants';

export const isValidMemberAvatarUri = (avatar?: string | null): boolean =>
  !!avatar &&
  typeof avatar === 'string' &&
  avatar.trim() !== '' &&
  !avatar.includes('via.placeholder.com');

export type MemberAvatarProps = {
  uri?: string | null;
  displayName: string;
  size?: number;
  style?: StyleProp<ViewStyle | ImageStyle>;
};

const MemberAvatar: React.FC<MemberAvatarProps> = ({
  uri,
  displayName,
  size = 48,
  style,
}) => {
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    setLoadFailed(false);
  }, [uri]);

  const initial = (displayName.trim().charAt(0) || 'U').toUpperCase();
  const avatarUri = isValidMemberAvatarUri(uri) && !loadFailed ? uri!.trim() : null;
  const radius = size / 2;
  const dimensionStyle = { width: size, height: size, borderRadius: radius };

  if (!avatarUri) {
    return (
      <View
        style={[styles.fallback, dimensionStyle, style]}
      >
        <Text style={[styles.fallbackText, { fontSize: Math.round(size * 0.42) }]}>
          {initial}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: avatarUri }}
      style={[styles.image, dimensionStyle, style]}
      onError={() => setLoadFailed(true)}
    />
  );
};

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: COLORS.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    color: COLORS.white,
    fontWeight: '800',
  },
  image: {
    backgroundColor: COLORS.gray[200],
  },
});

export default MemberAvatar;
