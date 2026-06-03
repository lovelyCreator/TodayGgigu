import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { COLORS, FONTS, SPACING } from '../constants';

interface GlowmifyLogoProps {
  size?: number;
  showText?: boolean;
  textSize?: number;
}

const GlowmifyLogo: React.FC<GlowmifyLogoProps> = ({
  size = 150,
  showText = true,
  textSize = FONTS.sizes['4xl']
}) => {
  // 앱 기동 화면 (SplashScreen) 에서 보여줄 로고.
  // src/assets/images/logo.png (175×175 정사각) 를 사용한다.
  // 안드로이드 런처 아이콘에 쓰이는 것과 같은 파일이라 시각 일관성이 유지됨.
  const box = size;
  return (
    <View style={styles.container}>
      <View style={[styles.logo, { width: box, height: box }]}>
        <Image
          source={require('../assets/images/logo.png')}
          style={{ width: box, height: box }}
          resizeMode="contain"
        />
      </View>
      {/* {showText && (
        <View style={styles.appNameContainer}>
          <Text style={[styles.appName, { fontSize: textSize }]}>TodayMall</Text>
        </View>
      )} */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  logo: {
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    // marginBottom: SPACING.lg,
    overflow: 'hidden'
  },
  appNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appName: {
    fontWeight: 'bold',
    color: COLORS.black,
  },
});

export default GlowmifyLogo;
