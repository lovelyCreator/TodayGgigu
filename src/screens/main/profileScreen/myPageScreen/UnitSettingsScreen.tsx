import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import Icon from '../../../../components/Icon';
import { LinearGradient } from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONTS, SPACING } from '../../../../constants';
import { useAppSelector } from '../../../../store/hooks';
import { translations } from '../../../../i18n/translations';

type Currency = {
  id: string;
  name: string;
  symbol: string;
  code: string;
};

const UnitSettingsScreen = () => {
  const navigation = useNavigation();
  const locale = useAppSelector((state) => state.i18n.locale) as 'en' | 'ko' | 'zh';
  const [selectedCurrency, setSelectedCurrency] = useState('KRW');
  
  // Translation function
  const t = (key: string) => {
    const keys = key.split('.');
    let value: any = translations[locale as keyof typeof translations];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };

  const currencies: Currency[] = [
    { id: 'KRW', name: t('profile.koreanWon'), symbol: '₩', code: 'KRW' },
    { id: 'CNY', name: t('profile.chineseYuan'), symbol: '¥', code: 'CNY' },
    { id: 'USD', name: t('profile.usDollar'), symbol: '$', code: 'USD' },
  ];

  const handleSelectCurrency = (currencyId: string) => {
    setSelectedCurrency(currencyId);
    // TODO: Save to AsyncStorage or context
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Gradient */}
      {/* <LinearGradient
        colors={['#FFE4E6', '#FFF0F1', '#FFFFFF']} */}
      <View
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.unit')}</Text>
        <View style={styles.placeholder} />
      {/* </LinearGradient> */}
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>{t('profile.selectCurrencyUnit')}</Text>
          <Text style={styles.sectionDescription}>
            {t('profile.chooseCurrencyDescription')}
          </Text>

          <View style={styles.currencyContainer}>
            {currencies.map((currency, index) => (
              <TouchableOpacity
                key={currency.id}
                style={[
                  styles.currencyCard,
                  selectedCurrency === currency.id && styles.currencyCardSelected,
                  index === 0 && styles.firstCard,
                  index === currencies.length - 1 && styles.lastCard,
                ]}
                onPress={() => handleSelectCurrency(currency.id)}
              >
                <View style={styles.currencyLeft}>
                  <View style={[
                    styles.symbolContainer,
                    selectedCurrency === currency.id && styles.symbolContainerSelected
                  ]}>
                    <Text style={[
                      styles.currencySymbol,
                      selectedCurrency === currency.id && styles.currencySymbolSelected
                    ]}>
                      {currency.symbol}
                    </Text>
                  </View>
                  <View style={styles.currencyInfo}>
                    <Text style={[
                      styles.currencyName,
                      selectedCurrency === currency.id && styles.currencyNameSelected
                    ]}>
                      {currency.name}
                    </Text>
                    <Text style={styles.currencyCode}>{currency.code}</Text>
                  </View>
                </View>
                <View style={[
                  styles.radioButton,
                  selectedCurrency === currency.id && styles.radioButtonSelected
                ]}>
                  {selectedCurrency === currency.id && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Icon name="information-circle-outline" size={24} color="#4A90E2" />
            </View>
            <Text style={styles.infoText}>
              {t('profile.currencyChangeInfo')}
            </Text>
          </View>
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
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.md,    
    paddingTop: SPACING['2xl'],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.text.primary,
    letterSpacing: 0.5,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    marginTop: -20,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  sectionDescription: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xl,
    lineHeight: 20,
  },
  currencyContainer: {
    backgroundColor: COLORS.white,
    borderRadius: SPACING.md,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: SPACING.xl,
  },
  currencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  currencyCardSelected: {
    backgroundColor: '#FFF0F1',
  },
  firstCard: {
    borderTopLeftRadius: SPACING.md,
    borderTopRightRadius: SPACING.md,
  },
  lastCard: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: SPACING.md,
    borderBottomRightRadius: SPACING.md,
  },
  currencyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  symbolContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  symbolContainerSelected: {
    backgroundColor: '#FFE4E6',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.secondary,
  },
  currencySymbolSelected: {
    color: '#FF6B9D',
  },
  currencyInfo: {
    flex: 1,
  },
  currencyName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  currencyNameSelected: {
    color: '#FF6B9D',
  },
  currencyCode: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#FF6B9D',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF6B9D',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E8F4FD',
    borderRadius: SPACING.md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: '#D0E8F7',
  },
  infoIconContainer: {
    marginRight: SPACING.md,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
});

export default UnitSettingsScreen;
