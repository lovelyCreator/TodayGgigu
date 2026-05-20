import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from '../../../../../components/Icon';
import { COLORS, FONTS, SPACING } from '../../../../../constants';
import { RootStackParamList } from '../../../../../types';
import { useTranslation } from '../../../../../hooks/useTranslation';
import UnitSurveyRequestModal from './UnitSurveyRequestModal';

type Nav = StackNavigationProp<RootStackParamList, 'OEMSurvey'>;

const BACK_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

/** OEM - 진행단계 (OEM survey progress screen). */
const OEMSurveyScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation();

  const [searchText, setSearchText] = useState('');
  const [requestModalVisible, setRequestModalVisible] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          hitSlop={BACK_HIT_SLOP}
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={22} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.OEM')}</Text>
        <TouchableOpacity
          style={styles.requestButton}
          activeOpacity={0.85}
          onPress={() => setRequestModalVisible(true)}
        >
          <Text style={styles.requestButtonText}>
            {t('profile.oemSurvey.requestForm')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Filters */}
        <View style={styles.filterPanel}>
          <View style={styles.searchBox}>
            <TextInput
              style={styles.searchInput}
              placeholder={t('profile.unitSurvey.searchPlaceholder')}
              placeholderTextColor={COLORS.gray[400]}
              value={searchText}
              onChangeText={setSearchText}
            />
            <Icon name="search" size={18} color={COLORS.gray[500]} />
          </View>

          <TouchableOpacity style={styles.dateBox} activeOpacity={0.7}>
            <Text style={styles.datePlaceholder}>
              {t('profile.unitSurvey.datePlaceholder')}
            </Text>
            <Icon name="calendar-outline" size={18} color={COLORS.gray[500]} />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Empty state */}
        <View style={styles.emptyBox}>
          <Image
            source={require('../../../../../assets/icons/cart_empty.png')}
            style={styles.emptyImage}
            resizeMode="contain"
          />
          <Text style={styles.emptyText}>{t('profile.unitSurvey.empty')}</Text>
        </View>
      </ScrollView>

      <UnitSurveyRequestModal
        visible={requestModalVisible}
        title={t('profile.oemSurvey.requestForm')}
        onClose={() => setRequestModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  requestButton: {
    paddingHorizontal: SPACING.smmd,
    height: 36,
    backgroundColor: COLORS.red,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
  },
  // Filters
  filterPanel: {
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    paddingHorizontal: SPACING.sm,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    padding: 0,
  },
  dateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    paddingHorizontal: SPACING.sm,
    height: 44,
  },
  datePlaceholder: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[400],
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.gray[200],
  },
  // Empty state
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyImage: {
    width: 160,
    height: 100,
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[400],
  },
});

export default OEMSurveyScreen;
