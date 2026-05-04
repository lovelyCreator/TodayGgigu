import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BORDER_RADIUS, COLORS, FONTS, SHADOWS, SPACING } from '../../../../constants';
import Icon from '../../../../components/Icon';
import { RootStackParamList, Address } from '../../../../types';

type FinanceScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const FinanceScreen = () => {
  const navigation = useNavigation<FinanceScreenNavigationProp>();

  // Sample data - this should be replaced with actual API calls
  const balance = 1000;
  const transactions = [
    {
      id: 1,
      date: '8 Feb 2025',
      type: 'Withdrawal',
      amount: -100,
      status: 'done',
      icon: 'arrow-up' as string,
    },
    {
      id: 2,
      date: '8 Feb 2025',
      type: 'Payment Received',
      amount: 100,
      status: 'done',
      icon: 'arrow-down' as string,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={18} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Finance</Text>
        <TouchableOpacity onPress={() => navigation.navigate('BalanceSettings')} style={styles.backButton}>
          <Icon name="settings-outline" size={18} color={COLORS.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.balanceContainer}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>Total Balance</Text>
            <TouchableOpacity 
              style={styles.withdrawButton}
              onPress={() => navigation.navigate('Withdraw')}
            >
              <Text style={styles.withdrawButtonText}>Withdraw</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.balanceValue}>${balance}</Text>
        </View>

        <View style={styles.transactionsContainer}>
          {transactions.map((transaction) => (
            <TouchableOpacity 
              key={transaction.id} 
              style={styles.transactionItem}
              onPress={() => navigation.navigate('EditFinanceAddress', { 
                address: {
                  id: '1',
                  type: 'other',
                  name: 'Sample Address',
                  street: '123 Main St',
                  city: 'New York',
                  state: 'NY',
                  zipCode: '10001',
                  country: 'USA',
                  isDefault: true
                } as Address
              })}
            >
              <View style={styles.transactionLeft}>
                <View style={[styles.transactionRound, transaction.amount > 0 && styles.transactionActiveRound]}>
                  <Icon name={transaction.icon} size={14} color={COLORS.white} />
                </View>
                <View>
                    <Text style={styles.transactionDate}>{transaction.date}</Text>
                    <View style={styles.transactionInfo}>
                    <Text style={styles.transactionType}>{transaction.type}</Text>
                    <Text style={styles.transactionStatus}>{transaction.status}</Text>
                    </View>
                </View>
              </View>
              <View style={styles.transactionRight}>
                <Text style={[
                  styles.transactionAmount,
                  // transaction.amount < 0 ? styles.negativeAmount : styles.positiveAmount
                ]}>
                  {transaction.amount >= 0 ? '+' : '-'}${Math.abs(transaction.amount)}
                </Text>
                <Icon name="chevron-forward" size={20} color={COLORS.text.secondary} />
              </View>
            </TouchableOpacity>
          ))}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md * 2,
    paddingTop: SPACING.xl * 2,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    // marginLeft: 'auto',
    ...SHADOWS.small,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  settingsButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIcon: {
    fontSize: FONTS.sizes.md,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  balanceContainer: {
    marginBottom: 24,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[100],
    padding: SPACING.smmd,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 14,
    color: COLORS.text.primary,
  },
  withdrawButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.red,
  },
  withdrawButtonText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    fontWeight: '500',
  },
  balanceValue: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  transactionsContainer: {
    gap: 12,
  },
  transactionItem: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  transactionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionRound: {
    width: 24,
    height: 24,
    backgroundColor: COLORS.error,
    borderRadius: BORDER_RADIUS.lg,
    marginRight: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionActiveRound: {
    backgroundColor: COLORS.success,
  },
  transactionDate: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[400],
    marginBottom: 4,
  },
  transactionInfo: {
    marginBottom: 4,
  },
  transactionType: {
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  transactionStatus: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[400],
  },
  transactionRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionAmount: {
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
    marginRight: 8,
  },
  negativeAmount: {
    color: COLORS.red,
  },
  positiveAmount: {
    color: COLORS.success,
  },
  transactionArrow: {
    fontSize: FONTS.sizes.md,
    color: COLORS.gray[400],
  },
});

export default FinanceScreen;