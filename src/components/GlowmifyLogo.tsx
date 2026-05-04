import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { COLORS, FONTS, SPACING } from '../constants';

interface GlowmifyLogoProps {
  size?: number;
  showText?: boolean;
  textSize?: number;
}

const GlowmifyLogo: React.FC<GlowmifyLogoProps> = ({ 
  size = 500, 
  showText = true, 
  textSize = FONTS.sizes['4xl'] 
}) => {
  return (
    <View style={styles.container}>
      <View style={[styles.logo, { width: 200, height: 300 }]}>
        <Image
          source={require('../assets/icons/logo.png')}
          style={{ width: 150, height: 100}}
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
