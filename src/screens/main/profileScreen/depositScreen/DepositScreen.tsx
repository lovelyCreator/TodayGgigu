import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Modal,
  TextInputProps,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../../../../components/Icon';
import { LinearGradient } from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, SPACING } from '../../../../constants';
import { DatePickerModal, Button } from '../../../../components';
import { depositApi } from '../../../../services/depositApi';
import { useTranslation } from '../../../../hooks/useTranslation';

interface Transaction {
  id: number;
  type: 'charge' | 'discharge';
  amount: number;
  date: string;
  time: string;
  description: string;
  status: string;
}

const PRESET_CHARGE_AMOUNTS = [10000, 50000, 100000, 500000, 1000000] as const;

type DepositScreenProps = {
  embedded?: boolean;
};

const DepositScreen: React.FC<DepositScreenProps> = ({ embedded = false }) => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'charge' | 'discharge'>('all');
  // const [selectedItems, setSelectedItems] = useState<number[]>([]); // Commented out - delete feature disabled
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  // Modal States
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  
  // Charge Modal States
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeNote, setChargeNote] = useState('');
  
  // Withdraw Modal States
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawReason, setWithdrawReason] = useState('');
  const [withdrawAccountNumber, setWithdrawAccountNumber] = useState('');
  const [withdrawAccountName, setWithdrawAccountName] = useState('');

  // Balance state (fetched from API)
  const [totalDeposit, setTotalDeposit] = useState(0);
  const [availableDeposit, setAvailableDeposit] = useState(0);
  const [withdrawalDeposit, setWithdrawalDeposit] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [chargeLoading, setChargeLoading] = useState(false);

  // Fetch balance from API
  const fetchBalance = useCallback(async () => {
    try {
      setBalanceLoading(true);
      const response = await depositApi.getBalance();
      if (response.success && response.data) {
        const d = response.data as any;
        setTotalDeposit(d.depositBalance ?? d.balance ?? d.totalDeposit ?? 0);
        setAvailableDeposit(d.withdrawableAmount ?? d.availableDeposit ?? d.depositBalance ?? 0);
        setWithdrawalDeposit(d.frozenAmount ?? d.withdrawalDeposit ?? 0);
      }
    } catch (e) {
      console.error('[DepositScreen] Failed to fetch balance:', e);
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  // Fetch transactions from API
  const fetchTransactions = useCallback(async () => {
    try {
      setTransactionsLoading(true);
      const response = await depositApi.getTransactions();
      if (response.success && response.data) {
        const list = (response.data as any).transactions || [];
        const mapped: Transaction[] = list.map((t: any, idx: number) => {
          const date = new Date(t.createdAt || t.date);
          // Determine charge vs discharge: positive amount or recharge/refund type = charge
          const amt = t.amount || 0;
          const isCharge = amt > 0 || t.type === 'recharge' || t.type === 'refund';
          return {
            id: idx + 1,
            type: isCharge ? 'charge' as const : 'discharge' as const,
            amount: Math.abs(amt),
            date: date.toISOString().split('T')[0],
            time: date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
            description: t.description || t.type || '',
            status: t.status || 'completed',
          };
        });
        setTransactions(mapped);
      }
    } catch (e) {
      console.error('[DepositScreen] Failed to fetch transactions:', e);
    } finally {
      setTransactionsLoading(false);
    }
  }, []);

  // Refresh data when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchBalance();
      fetchTransactions();
    }, [fetchBalance, fetchTransactions])
  );

  // Filter transactions based on search, date range, and active tab
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Filter by tab
      if (activeTab !== 'all' && t.type !== activeTab) return false;

      // Filter by search query
      if (searchQuery && !t.description.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Filter by date range
      if (startDate || endDate) {
        const transactionDate = new Date(t.date);
        if (startDate && transactionDate < startDate) return false;
        if (endDate) {
          const endOfDay = new Date(endDate);
          endOfDay.setHours(23, 59, 59, 999);
          if (transactionDate > endOfDay) return false;
        }
      }

      return true;
    });
  }, [transactions, activeTab, searchQuery, startDate, endDate]);

  // Map raw API transaction status to a localized label (falls back to raw value if unknown).
  const TRANSACTION_STATUS_KEYS = [
    'completed', 'success', 'pending', 'processing',
    'failed', 'cancelled', 'canceled', 'approved', 'rejected',
  ];
  const getTransactionStatusLabel = (status: string) => {
    const key = (status || '').toLowerCase().trim();
    return TRANSACTION_STATUS_KEYS.includes(key)
      ? t(`deposit.transactionStatus.${key}`)
      : status;
  };

  // Map raw transaction type/description keyword to a localized label (keeps real descriptions as-is).
  const TRANSACTION_TYPE_KEYS = [
    'charge', 'recharge', 'deposit', 'discharge', 'withdraw', 'refund', 'payment',
  ];
  // Phrase patterns coming from the backend description (a trailing order id is preserved).
  const TRANSACTION_DESCRIPTION_PATTERNS = [
    { re: /^payment for order\b/i, key: 'paymentForOrder' },
    { re: /^refund(?:er)? for order\b/i, key: 'refundForOrder' },
  ];
  const getTransactionDescriptionLabel = (description: string) => {
    const raw = (description || '').trim();
    const key = raw.toLowerCase();
    if (TRANSACTION_TYPE_KEYS.includes(key)) {
      return t(`deposit.transactionType.${key}`);
    }
    for (const p of TRANSACTION_DESCRIPTION_PATTERNS) {
      if (p.re.test(raw)) {
        const rest = raw.replace(p.re, '').trim();
        const label = t(`deposit.transactionType.${p.key}`);
        return rest ? `${label} ${rest}` : label;
      }
    }
    return raw;
  };

  const handleSearch = () => {
    // Search is handled automatically by useMemo
    // console.log('Searching with:', { searchQuery, startDate, endDate });
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStartDate(null);
    setEndDate(null);
  };

  // Delete functionality commented out
  // const handleDeleteSelected = () => {
  //   if (selectedItems.length === 0) return;
  //   setTransactions(prev => prev.filter(t => !selectedItems.includes(t.id)));
  //   setSelectedItems([]);
  // };

  // const toggleSelectItem = (id: number) => {
  //   setSelectedItems(prev => 
  //     prev.includes(id) 
  //       ? prev.filter(itemId => itemId !== id)
  //       : [...prev, id]
  //   );
  // };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const handleStartDateConfirm = (date: Date) => {
    setStartDate(date);
  };

  const handleEndDateConfirm = (date: Date) => {
    setEndDate(date);
  };

  const handleChargeConfirm = async () => {
    const amount = parseInt(chargeAmount);
    if (!amount || amount <= 0) {
      Alert.alert(t('common.error'), t('deposit.invalidAmount'));
      return;
    }

    setChargeLoading(true);
    try {
      const response = await depositApi.createRechargeRequest({
        transferMethod: 'bank_transfer',
        remitterName: chargeNote || '',
        rechargeCurrency: 'KRW',
        amount: amount,
        depositCurrencyAmount: amount,
        serviceFee: 0,
        receivingBankInformation: {
          bankName: t('deposit.bankName'),
          accountNumber: '171301-04-359074',
          accountHolder: t('deposit.companyName'),
        },
        description: chargeNote || `Deposit charge ₩${amount.toLocaleString()}`,
        proofImageUrl: '',
      });

      if (response.success) {
        Alert.alert(t('inquiry.success'), t('deposit.rechargeSuccess'));
        // Add to local transactions list
        const newTransaction: Transaction = {
          id: transactions.length + 1,
          type: 'charge',
          amount: amount,
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
          description: chargeNote || 'Recharge Request',
          status: 'pending',
        };
        setTransactions([newTransaction, ...transactions]);
        // Refresh balance
        fetchBalance();
        setChargeAmount('');
        setChargeNote('');
        setShowChargeModal(false);
      } else {
        Alert.alert(t('common.error'), response.error || 'Failed to create recharge request.');
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || 'An unexpected error occurred.');
    } finally {
      setChargeLoading(false);
    }
  };

  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const handleWithdrawConfirm = async () => {
    const amount = parseInt(withdrawAmount);
    if (!amount || amount <= 0) {
      Alert.alert(t('common.error'), t('deposit.invalidAmount'));
      return;
    }
    if (!withdrawAccountNumber.trim() || !withdrawAccountName.trim()) {
      Alert.alert(t('common.error'), t('deposit.enterAccountDetails'));
      return;
    }

    setWithdrawLoading(true);
    try {
      const response = await depositApi.createWithdrawRequest({
        transferMethod: 'bank_transfer',
        amount: amount,
        currency: 'KRW',
        receivingBankInformation: {
          bankName: t('deposit.bankName'),
          accountNumber: withdrawAccountNumber.trim(),
          accountHolder: withdrawAccountName.trim(),
        },
        description: withdrawReason.trim() || t('deposit.withdrawalDesc'),
      });

      if (response.success) {
        Alert.alert(t('inquiry.success'), t('deposit.withdrawalSuccess'));
        fetchBalance();
        fetchTransactions();
        setWithdrawAmount('');
        setWithdrawReason('');
        setWithdrawAccountNumber('');
        setWithdrawAccountName('');
        setShowWithdrawModal(false);
      } else {
        Alert.alert(t('common.error'), response.error || 'Failed to create withdrawal request.');
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || 'An unexpected error occurred.');
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handlePresetCharge = (amount: number) => {
    setChargeAmount((prev) => {
      const current = parseInt(prev.replace(/[^\d]/g, ''), 10) || 0;
      return String(current + amount);
    });
  };

  const openChargeModal = () => {
    setChargeAmount('');
    setChargeNote('');
    setShowChargeModal(true);
  };

  return (
    <View style={[styles.root, embedded && styles.embeddedRoot]}>
      {!embedded && (
        <>
          <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
          <SafeAreaView style={styles.safeTop} edges={['top']}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Icon name="arrow-back" size={16} color={COLORS.black} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{t('deposit.title')}</Text>
              <View style={styles.headerSide} />
            </View>
          </SafeAreaView>
        </>
      )}

      <ScrollView
        style={[styles.scrollView, embedded && styles.embeddedScrollView]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={embedded ? styles.embeddedScrollContent : undefined}
      >
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.mainBalanceContainer}>
            <Text style={styles.balanceLabel}>{t('deposit.totalBalance')}</Text>
            {balanceLoading ? (
              <ActivityIndicator size="small" color={COLORS.red} style={{ marginTop: 8 }} />
            ) : (
              <Text style={styles.mainBalanceAmount}>₩{totalDeposit.toLocaleString()}</Text>
            )}
          </View>

          <View style={styles.balanceTypesContainer}>
            <View style={styles.balanceTypeItem}>
              <Text style={styles.balanceTypeLabel}>{t('deposit.available')}</Text>
              <Text style={styles.balanceTypeAmount}>₩{availableDeposit.toLocaleString()}</Text>
            </View>
            <View style={styles.balanceTypeDivider} />
            <View style={styles.balanceTypeItem}>
              <Text style={styles.balanceTypeLabel}>{t('deposit.frozen')}</Text>
              <Text style={[styles.balanceTypeAmount, withdrawalDeposit === 0 && { color: COLORS.gray[400] }]}>
                ₩{withdrawalDeposit.toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={openChargeModal}>
              <Icon name="add-circle-outline" size={18} color={COLORS.white} />
              <Text style={styles.actionButtonText}>{t('deposit.charge')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.actionButtonSecondary]} onPress={() => setShowWithdrawModal(true)}>
              <Icon name="remove-circle-outline" size={18} color={COLORS.red} />
              <Text style={[styles.actionButtonText, styles.actionButtonSecondaryText]}>{t('deposit.withdraw')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Transaction History */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>{t('deposit.transactionHistory')}</Text>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            {(['all', 'charge', 'discharge'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabButtonText, activeTab === tab && styles.tabButtonTextActive]}>
                  {tab === 'all' ? t('deposit.all') : tab === 'charge' ? t('deposit.charge') : t('deposit.withdraw')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Search & Filter */}
          <View style={styles.filterRow}>
            <View style={styles.searchInputWrapper}>
              <Icon name="search" size={16} color={COLORS.gray[400]} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('deposit.searchTransactions')}
                placeholderTextColor={COLORS.gray[400]}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>
          <View style={styles.dateRow}>
            <TouchableOpacity style={styles.dateInput} onPress={() => setShowStartPicker(true)}>
              <Text style={[styles.dateText, !startDate && styles.placeholderText]}>
                {startDate ? formatDate(startDate) : t('deposit.startDate')}
              </Text>
              <Icon name="calendar-outline" size={14} color={COLORS.gray[400]} />
            </TouchableOpacity>
            <Text style={styles.dateSeparator}>~</Text>
            <TouchableOpacity style={styles.dateInput} onPress={() => setShowEndPicker(true)}>
              <Text style={[styles.dateText, !endDate && styles.placeholderText]}>
                {endDate ? formatDate(endDate) : t('deposit.endDate')}
              </Text>
              <Icon name="calendar-outline" size={14} color={COLORS.gray[400]} />
            </TouchableOpacity>
            {(startDate || endDate) && (
              <TouchableOpacity onPress={handleClearFilters} style={styles.clearButton}>
                <Icon name="close" size={18} color={COLORS.gray[400]} />
              </TouchableOpacity>
            )}
          </View>

          {/* Date Picker Modals */}
          <DatePickerModal visible={showStartPicker} onClose={() => setShowStartPicker(false)} onConfirm={handleStartDateConfirm} initialDate={startDate || undefined} title={t('deposit.startDate')} />
          <DatePickerModal visible={showEndPicker} onClose={() => setShowEndPicker(false)} onConfirm={handleEndDateConfirm} initialDate={endDate || undefined} title={t('deposit.endDate')} />

          {/* Transaction List */}
          {transactionsLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={COLORS.red} />
            </View>
          ) : filteredTransactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{t('deposit.noTransactions')}</Text>
            </View>
          ) : (
            <View style={styles.transactionsList}>
              {filteredTransactions.map((transaction) => (
                <View key={transaction.id} style={styles.transactionCard}>
                  <View style={[styles.transactionIcon, transaction.type === 'charge' ? styles.chargeIcon : styles.dischargeIcon]}>
                    <Icon
                      name={transaction.type === 'charge' ? 'arrow-down' : 'arrow-up'}
                      size={16}
                      color={transaction.type === 'charge' ? '#22C55E' : COLORS.red}
                    />
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionDescription} numberOfLines={1}>{getTransactionDescriptionLabel(transaction.description)}</Text>
                    <Text style={styles.transactionDate}>{transaction.date} {transaction.time}</Text>
                  </View>
                  <View style={styles.transactionRight}>
                    <Text style={[styles.transactionAmount, transaction.type === 'charge' ? styles.chargeAmount : styles.dischargeAmount]}>
                      {transaction.type === 'charge' ? '+' : '-'}₩{transaction.amount.toLocaleString()}
                    </Text>
                    <Text style={styles.transactionStatus}>{getTransactionStatusLabel(transaction.status)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Charge Modal */}
      <Modal
      supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']}
        visible={showChargeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowChargeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('deposit.charge')}</Text>
              <TouchableOpacity onPress={() => setShowChargeModal(false)}>
                <Icon name="close" size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSectionLabel}>{t('deposit.selectAmount')}</Text>
              
              {/* Preset Amount Buttons: 3 + 2 rows */}
              <View style={styles.presetAmountsContainer}>
                <View style={styles.presetAmountRow}>
                  {PRESET_CHARGE_AMOUNTS.slice(0, 3).map((amount) => (
                    <TouchableOpacity
                      key={amount}
                      style={styles.presetAmountButton}
                      onPress={() => handlePresetCharge(amount)}
                    >
                      <Text style={styles.presetAmountText}>
                        ₩{amount.toLocaleString()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.presetAmountRow}>
                  {PRESET_CHARGE_AMOUNTS.slice(3, 5).map((amount) => (
                    <TouchableOpacity
                      key={amount}
                      style={styles.presetAmountButton}
                      onPress={() => handlePresetCharge(amount)}
                    >
                      <Text style={styles.presetAmountText}>
                        ₩{amount.toLocaleString()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Custom Amount Input */}
              <Text style={styles.modalInputLabel}>{t('deposit.customAmount')}</Text>
              <View style={styles.customAmountContainer}>
                <TextInput
                  style={styles.customAmountInput}
                  placeholder={t('deposit.enterAmount')}
                  placeholderTextColor="#999"
                  value={chargeAmount}
                  onChangeText={setChargeAmount}
                  keyboardType="numeric"
                />
                <Text style={styles.currencyLabel}>KRW</Text>
              </View>

              {/* Note Input */}
              <Text style={styles.modalInputLabel}>{t('deposit.note')}</Text>
              <TextInput
                style={[styles.noteInput, styles.noteBorder]}
                placeholder={t('deposit.enterNote')}
                placeholderTextColor="#999"
                value={chargeNote}
                onChangeText={setChargeNote}
                multiline
              />

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.modalSubmitButton, chargeLoading && { opacity: 0.6 }]}
                onPress={handleChargeConfirm}
                disabled={chargeLoading}
              >
                {chargeLoading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.modalSubmitButtonText}>{t('deposit.confirm')}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowChargeModal(false)}
                disabled={chargeLoading}
              >
                <Text style={styles.modalCancelButtonText}>{t('deposit.cancel')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Withdraw Modal */}
      <Modal
      supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']}
        visible={showWithdrawModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWithdrawModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('deposit.withdrawalRequest')}</Text>
              <TouchableOpacity onPress={() => setShowWithdrawModal(false)}>
                <Icon name="close" size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Amount Input */}
              <Text style={styles.modalInputLabel}>{t('deposit.withdrawalAmount')}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={t('deposit.enterAmount')}
                placeholderTextColor="#999"
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
                keyboardType="numeric"
              />

              {/* Account Name Input */}
              <Text style={styles.modalInputLabel}>{t('deposit.accountOwnerName')}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={t('deposit.enterName')}
                placeholderTextColor="#999"
                value={withdrawAccountName}
                onChangeText={setWithdrawAccountName}
              />

              {/* Account Number Input */}
              <Text style={styles.modalInputLabel}>{t('deposit.bankAccountNumber')}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={t('deposit.enterAccountNumber')}
                placeholderTextColor="#999"
                value={withdrawAccountNumber}
                onChangeText={setWithdrawAccountNumber}
                keyboardType="numeric"
              />

              {/* Reason Input */}
              <Text style={styles.modalInputLabel}>{t('deposit.withdrawalReason')}</Text>
              <TextInput
                style={[styles.noteInput, styles.noteBorder]}
                placeholder={t('deposit.enterReason')}
                placeholderTextColor="#999"
                value={withdrawReason}
                onChangeText={setWithdrawReason}
                multiline
              />

              {/* Error Message */}
              <Text style={styles.warningText}>
                {t('deposit.accountHolderWarning')}
              </Text>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.modalSubmitButton, withdrawLoading && { opacity: 0.6 }]}
                onPress={handleWithdrawConfirm}
                disabled={withdrawLoading}
              >
                {withdrawLoading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.modalSubmitButtonText}>{t('deposit.confirm')}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowWithdrawModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>{t('deposit.cancel')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  embeddedRoot: {
    backgroundColor: COLORS.background,
  },
  embeddedScrollView: {
    flex: 1,
  },
  embeddedScrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  safeTop: {
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
    backgroundColor: COLORS.white,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  headerTitle: {
    flex: 1,
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.black,
    textAlign: 'center',
  },
  headerSide: {
    width: 36,
    height: 36,
  },
  scrollView: {
    flex: 1,
  },
  // Balance Card
  balanceCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: 12,
    padding: SPACING.lg,
  },
  balanceLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
  },
  mainBalanceContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  mainBalanceAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.red,
    marginTop: 4,
  },
  balanceTypesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  balanceTypeItem: {
    flex: 1,
    alignItems: 'center',
  },
  balanceTypeDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.gray[200],
  },
  balanceTypeLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
    marginBottom: 4,
  },
  balanceTypeAmount: {
    fontSize: FONTS.sizes.base,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: SPACING.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.red,
    gap: 6,
  },
  actionButtonSecondary: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.red,
  },
  actionButtonText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.white,
  },
  actionButtonSecondaryText: {
    color: COLORS.red,
  },
  // Transaction Section
  sectionContainer: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.base,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray[100],
    borderRadius: 8,
    padding: 3,
    marginBottom: SPACING.sm,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  tabButtonText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: COLORS.text.primary,
  },
  filterRow: {
    marginBottom: 8,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  searchInput: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    paddingVertical: 8,
    paddingLeft: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: 6,
  },
  dateInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  dateText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },
  placeholderText: {
    color: COLORS.gray[400],
  },
  dateSeparator: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[400],
  },
  clearButton: {
    padding: 4,
  },
  // Transactions
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[400],
  },
  transactionsList: {
    gap: 8,
    paddingBottom: SPACING.xl,
  },
  transactionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  chargeIcon: {
    backgroundColor: '#ECFDF5',
  },
  dischargeIcon: {
    backgroundColor: COLORS.lightRed,
  },
  transactionInfo: {
    flex: 1,
    marginRight: 8,
  },
  transactionDescription: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 11,
    color: COLORS.gray[400],
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: FONTS.sizes.base,
    fontWeight: '700',
  },
  chargeAmount: {
    color: '#22C55E',
  },
  dischargeAmount: {
    color: COLORS.red,
  },
  transactionStatus: {
    fontSize: 10,
    color: COLORS.gray[400],
    marginTop: 2,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: SPACING.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  modalBody: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  modalSectionLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  presetAmountsContainer: {
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  presetAmountRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  presetAmountButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: COLORS.white,
    alignItems: 'center',
  },
  presetAmountButtonActive: {
    backgroundColor: COLORS.red,
    borderColor: COLORS.red,
  },
  presetAmountText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  presetAmountTextActive: {
    color: COLORS.white,
  },
  modalInputLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  customAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingRight: SPACING.md,
  },
  customAmountInput: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
  },
  currencyLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  noteInput: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  noteBorder: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modalInput: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modalSubmitButton: {
    backgroundColor: COLORS.red,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  modalSubmitButtonText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.white,
  },
  modalCancelButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  modalCancelButtonText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  warningText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.red,
    lineHeight: Math.round(FONTS.sizes.sm * 20 / 14),
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
  },
});

export default DepositScreen;
