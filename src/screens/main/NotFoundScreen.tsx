import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import LinearGradient from 'react-native-linear-gradient';

import { COLORS, FONTS, SPACING, BORDER_RADIUS, SCREEN_HEIGHT } from '../../constants';
import { RootStackParamList } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import ArrowBackIcon from '../../assets/icons/ArrowBackIcon';

type NotFoundScreenNavigationProp = StackNavigationProp<RootStackParamList, 'NotFound'>;

const NotFoundScreen: React.FC = () => {
  const navigation = useNavigation<NotFoundScreenNavigationProp>();
  const { t } = useTranslation();

  const handleGoHome = () => {
    navigation.navigate('Main');
  };

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[...COLORS.gradients.authBackground]}
        style={styles.gradientBackground}
      />
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={handleGoBack}
        activeOpacity={0.8}
      >
        <ArrowBackIcon width={20} height={20} color={COLORS.text.primary} />
        <Text style={styles.secondaryButtonText}>
          {t('notFound.goBack') || 'Go Back'}
        </Text>
      </TouchableOpacity>
      
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Image source={require('../../assets/icons/404.png')} style={{ width: 200, height: 120 }} resizeMode="contain" />
        </View>
        
        <Text style={styles.description}>
          {t('notFound.description') || "Sorry, the page you're looking for doesn't exist or has been moved."}
        </Text>
        <View style={{marginBottom: SPACING.md, flexDirection: 'column', justifyContent: 'flex-end', gap: SPACING.xs,}}>
          <Text style={[styles.description, {color: COLORS.text.secondary, fontSize: FONTS.sizes.xs}]}>
            {t('notFound.footerDescription') || "Sorry, the page you're looking for doesn't exist or has been moved."}
            <Text style={{color: '#327FE5'}}
            onPress={() => navigation.navigate('CustomerService')}>
              {t('notFound.viewHelp') || "View Help"}
            </Text>
          </Text>
          <Text style={[styles.description, {fontSize: FONTS.sizes.sm}]}>
            {t('notFound.footer') || "© 2025 TodayMall. All Rights Reserved."}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT / 2,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xxl,
    paddingTop: 140,
  },
  iconContainer: {
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: 72,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: FONTS.sizes['2xl'],
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  description: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    textAlign: 'center',
    lineHeight: Math.round(FONTS.sizes.md * 24 / 16),
    marginBottom: SPACING.xxl,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 400,
    gap: SPACING.md,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.text.red,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm
  },
  primaryButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
    marginTop: SPACING.xl,
  },
  secondaryButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
});

export default NotFoundScreen;

