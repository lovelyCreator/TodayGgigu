import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from '../../../../components/Icon';
import { COLORS, FONTS, SPACING } from '../../../../constants';
import { RootStackParamList } from '../../../../types';
import { useTranslation } from '../../../../hooks/useTranslation';

type Nav = StackNavigationProp<RootStackParamList, 'PaymentHistory'>;

const BACK_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

type PickerKey = 'businessName' | 'transactionType' | 'reviewStatus' | 'wallet';

type PaymentHistoryScreenProps = {
  embedded?: boolean;
};

/** 결제내역 - Payment History list screen. */
const PaymentHistoryScreen: React.FC<PaymentHistoryScreenProps> = ({
  embedded = false,
}) => {
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation();

  const [searchText, setSearchText] = useState('');
  const [businessName, setBusinessName] = useState('select');
  const [transactionType, setTransactionType] = useState('select');
  const [reviewStatus, setReviewStatus] = useState('all');
  const [wallet, setWallet] = useState('select');
  const [openPicker, setOpenPicker] = useState<PickerKey | null>(null);

  const selectOption = { value: 'select', label: t('profile.paymentHistory.select') };
  const allOption = { value: 'all', label: t('profile.paymentHistory.all') };

  const pickerConfig: Record<
    PickerKey,
    {
      label: string;
      options: { value: string; label: string }[];
      selected: string;
      onSelect: (v: string) => void;
    }
  > = {
    businessName: {
      label: t('profile.paymentHistory.businessName'),
      options: [selectOption],
      selected: businessName,
      onSelect: setBusinessName,
    },
    transactionType: {
      label: t('profile.paymentHistory.transactionType'),
      options: [selectOption],
      selected: transactionType,
      onSelect: setTransactionType,
    },
    reviewStatus: {
      label: t('profile.paymentHistory.reviewStatus'),
      options: [allOption],
      selected: reviewStatus,
      onSelect: setReviewStatus,
    },
    wallet: {
      label: t('profile.paymentHistory.wallet'),
      options: [selectOption],
      selected: wallet,
      onSelect: setWallet,
    },
  };

  const labelFor = (
    options: { value: string; label: string }[],
    selected: string,
  ): string => options.find((o) => o.value === selected)?.label || '';

  const handleReset = () => {
    setSearchText('');
    setBusinessName('select');
    setTransactionType('select');
    setReviewStatus('all');
    setWallet('select');
  };

  const renderDropdown = (key: PickerKey) => {
    const cfg = pickerConfig[key];
    const open = openPicker === key;
    return (
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{cfg.label}</Text>
        <TouchableOpacity
          style={[styles.dropdownBox, open && styles.dropdownBoxActive]}
          activeOpacity={0.7}
          onPress={() => setOpenPicker(key)}
        >
          <Text style={styles.dropdownValue} numberOfLines={1}>
            {labelFor(cfg.options, cfg.selected)}
          </Text>
          <Icon
            name={open ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={open ? COLORS.red : COLORS.gray[500]}
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderPickerModal = () => {
    if (!openPicker) return null;
    const cfg = pickerConfig[openPicker];
    return (
      <Modal
      supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']}
        visible
        transparent
        animationType="fade"
        onRequestClose={() => setOpenPicker(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setOpenPicker(null)}
        >
          <View style={styles.modalSheet}>
            {cfg.options.map((opt) => {
              const selected = opt.value === cfg.selected;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.modalOption, selected && styles.modalOptionSelected]}
                  activeOpacity={0.7}
                  onPress={() => {
                    cfg.onSelect(opt.value);
                    setOpenPicker(null);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      selected && styles.modalOptionTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {selected && <Icon name="checkmark" size={18} color={COLORS.white} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const body = (
    <View style={[styles.container, embedded && styles.embeddedContainer]}>
      {!embedded && (
        <View style={styles.header}>
          <TouchableOpacity
            hitSlop={BACK_HIT_SLOP}
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={22} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('profile.paymentHistory.title')}</Text>
          <View style={styles.backButton} />
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Filter card */}
        <View style={styles.card}>
          {/* Card heading with orange bar */}
          <View style={styles.cardHeading}>
            <View style={styles.headingBar} />
            <Text style={styles.headingText}>
              {t('profile.paymentHistory.heading')}
            </Text>
          </View>

          <View style={styles.filterBody}>
            {/* Search input */}
            <View style={styles.searchBox}>
              <Icon name="search" size={18} color={COLORS.gray[500]} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('profile.paymentHistory.searchPlaceholder')}
                placeholderTextColor={COLORS.gray[400]}
                value={searchText}
                onChangeText={setSearchText}
              />
            </View>

            {/* Dropdown filters */}
            {renderDropdown('businessName')}
            {renderDropdown('transactionType')}
            {renderDropdown('reviewStatus')}
            {renderDropdown('wallet')}

            {/* Period / date range */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>
                {t('profile.paymentHistory.period')}
              </Text>
              <TouchableOpacity style={styles.dateBox} activeOpacity={0.7}>
                <Text style={styles.dateText}>2024-04-11 ~ 2024-04-18</Text>
                <Icon name="calendar-outline" size={18} color={COLORS.gray[500]} />
              </TouchableOpacity>
            </View>

            {/* Actions */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.searchButton} activeOpacity={0.85}>
                <Icon name="search" size={16} color={COLORS.white} />
                <Text style={styles.searchButtonText}>
                  {t('profile.paymentHistory.search')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.resetButton}
                activeOpacity={0.7}
                onPress={handleReset}
              >
                <Icon name="refresh" size={16} color={COLORS.gray[600]} />
                <Text style={styles.resetButtonText}>
                  {t('profile.paymentHistory.reset')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Result card */}
        <View style={styles.card}>
          <View style={styles.downloadRow}>
            <TouchableOpacity style={styles.downloadButton} activeOpacity={0.7}>
              <Text style={styles.downloadButtonText}>
                {t('profile.paymentHistory.pdfDownload')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.downloadButton} activeOpacity={0.7}>
              <Text style={styles.downloadButtonText}>
                {t('profile.paymentHistory.excelDownload')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Empty state */}
          <View style={styles.emptyBox}>
            <Image
              source={require('../../../../assets/icons/cart_empty.png')}
              style={styles.emptyImage}
              resizeMode="contain"
            />
            <Text style={styles.emptyText}>
              {t('profile.paymentHistory.empty')}
            </Text>
          </View>
        </View>
      </ScrollView>

      {renderPickerModal()}
    </View>
  );

  if (embedded) {
    return body;
  }

  return (
    <SafeAreaView style={styles.safeTop} edges={['top']}>
      {body}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // SafeAreaView 외곽 — 상단 인셋(헤더 웃부분)을 흰색으로 칠한다.
  // 헤더와 같은 색이라 위쪽이 깔끔하게 이어진다.
  safeTop: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  embeddedContainer: {
    backgroundColor: COLORS.background,
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
  // Scroll
  scrollContent: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  // Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    overflow: 'hidden',
  },
  cardHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  headingBar: {
    width: 4,
    height: 16,
    borderRadius: 2,
    backgroundColor: COLORS.red,
    marginRight: SPACING.sm,
  },
  headingText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  // Filter body
  filterBody: {
    padding: SPACING.md,
    gap: SPACING.smmd,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    paddingHorizontal: SPACING.sm,
    height: 44,
    backgroundColor: COLORS.gray[50],
  },
  searchInput: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    padding: 0,
  },
  field: {
    gap: SPACING.xs,
  },
  fieldLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.gray[700],
  },
  dropdownBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    paddingHorizontal: SPACING.sm,
    height: 44,
    backgroundColor: COLORS.gray[50],
  },
  dropdownBoxActive: {
    borderColor: COLORS.red,
  },
  dropdownValue: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    marginRight: SPACING.xs,
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
    backgroundColor: COLORS.gray[50],
  },
  dateText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },
  // Actions
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  searchButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    height: 44,
    backgroundColor: COLORS.red,
    borderRadius: 8,
  },
  searchButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
  },
  resetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
  },
  resetButtonText: {
    color: COLORS.gray[700],
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  // Download row
  downloadRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  downloadButton: {
    paddingHorizontal: SPACING.md,
    height: 36,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadButtonText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[700],
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.gray[100],
  },
  // Empty state
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyImage: {
    width: 130,
    height: 130,
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[400],
  },
  // Picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingVertical: SPACING.sm,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  modalOptionSelected: {
    backgroundColor: COLORS.red,
  },
  modalOptionText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
  },
  modalOptionTextSelected: {
    color: COLORS.white,
    fontWeight: '700',
  },
});

export default PaymentHistoryScreen;
