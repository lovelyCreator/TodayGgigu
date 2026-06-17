import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import Icon from '../../../components/Icon';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../../constants';
import { RootStackParamList } from '../../../types';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { setLocale } from '../../../store/slices/i18nSlice';
import { translations } from '../../../i18n/translations';

type LanguageSettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'LanguageSettings'>;

interface Language {
  code: 'en' | 'ko' | 'zh';
  name: string;
  nativeName: string;
}

const LanguageSettingsScreen: React.FC = () => {
  const navigation = useNavigation<LanguageSettingsScreenNavigationProp>();
  const dispatch = useAppDispatch();
  const currentLocale = useAppSelector((state) => state.i18n.locale);
  
  const t = (key: string) => {
    const keys = key.split('.');
    let value: any = translations[currentLocale as keyof typeof translations];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return value || key;
  };

  const languages: Language[] = [
    {
      code: 'en',
      name: t('profile.languageEnglish'),
      nativeName: 'English',
    },
    {
      code: 'ko',
      name: t('profile.languageKorean'),
      nativeName: '한국어',
    },
    {
      code: 'zh',
      name: t('profile.languageChinese'),
      nativeName: '中文',
    },
  ];

  const handleLanguageSelect = (languageCode: 'en' | 'ko' | 'zh') => {
    dispatch(setLocale(languageCode));
    // Navigate back to profile after selection
    setTimeout(() => {
      navigation.goBack();
    }, 300);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Icon name="arrow-back" size={24} color={COLORS.text.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{t('profile.languageSettings')}</Text>
      <View style={styles.placeholder} />
    </View>
  );

  const renderLanguageOptions = () => (
    <View style={styles.languageContainer}>
      {languages.map((language) => (
        <TouchableOpacity
          key={language.code}
          style={styles.languageItem}
          onPress={() => handleLanguageSelect(language.code)}
        >
          <View style={styles.languageInfo}>
            <Text style={styles.languageName}>{language.name}</Text>
            <Text style={styles.languageNativeName}>{language.nativeName}</Text>
          </View>
          {currentLocale === language.code && (
            <Icon name="checkmark" size={24} color={COLORS.primary} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.description}>
            {t('profile.chooseLanguage')}
          </Text>
          {renderLanguageOptions()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
    backgroundColor: COLORS.white,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONTS.sizes['xl'],
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
  },
  description: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xl,
    lineHeight: Math.round(FONTS.sizes.md * 22 / 16),
  },
  languageContainer: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  languageNativeName: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
  },
});

export default LanguageSettingsScreen;