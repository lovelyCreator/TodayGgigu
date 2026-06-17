import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../../../../components/Icon';
import { LinearGradient } from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONTS, SPACING } from '../../../../constants';
import { useAuth } from '../../../../context/AuthContext';

const ChargeScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [selectedMethod, setSelectedMethod] = useState<'kwise' | null>('kwise');
  const [userName, setUserName] = useState(user?.name || '');
  const [amount, setAmount] = useState('');

  // Bank transfer information
  const bankInfo = {
    recipient: 'TodayMall Co., Ltd.',
    accountNumber: '171301-04-359074',
    bank: 'Kookmin Bank',
  };

  const handleCopy = (text: string) => {
    Clipboard.setString(text);
    // You can add a toast notification here
    // console.log('Copied:', text);
  };

  const handleSubmit = () => {
    if (!userName.trim() || !amount.trim()) {
      // console.log('Please fill all fields');
      return;
    }
    // console.log('Submit charge request:', { userName, amount, method: selectedMethod });
    // Handle submission logic here
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={['#FFE4E6', '#FFF0F1', '#FFFFFF']}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Charge</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Payment Method Card */}
          <View style={styles.card}>
            <View style={styles.methodHeader}>
              <View style={styles.kwiseBadge}>
                <Text style={styles.kwiseText}>₩WISE</Text>
              </View>
              <Text style={styles.methodTitle}>Bank Transfer</Text>
              <TouchableOpacity 
                style={styles.checkButton}
                onPress={() => setSelectedMethod('kwise')}
              >
                <Icon 
                  name={selectedMethod === 'kwise' ? 'checkmark-circle' : 'ellipse-outline'} 
                  size={28} 
                  color={selectedMethod === 'kwise' ? '#4A90E2' : '#CCC'}
                />
              </TouchableOpacity>
            </View>

            {/* Bank Transfer Information */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Transfer Information</Text>

              {/* Recipient */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Recipient: </Text>
                <Text style={styles.infoValue}>{bankInfo.recipient}</Text>
                <TouchableOpacity 
                  style={styles.copyButton}
                  onPress={() => handleCopy(bankInfo.recipient)}
                >
                  <Icon name="content-copy" size={18} color="#4A90E2" />
                </TouchableOpacity>
              </View>

              {/* Account Number */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{bankInfo.bank}: </Text>
                <Text style={styles.infoValue}>{bankInfo.accountNumber}</Text>
                <TouchableOpacity 
                  style={styles.copyButton}
                  onPress={() => handleCopy(bankInfo.accountNumber)}
                >
                  <Icon name="content-copy" size={18} color="#4A90E2" />
                </TouchableOpacity>
              </View>

              {/* User Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Your Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder={user?.name || "Enter your name"}
                  placeholderTextColor="#999"
                  value={userName}
                  onChangeText={setUserName}
                />
              </View>

              {/* Amount Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Transfer Amount</Text>
                <View style={styles.amountInputContainer}>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="Enter amount to deposit"
                    placeholderTextColor="#999"
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                  />
                  <Text style={styles.currencyLabel}>KRW</Text>
                </View>
              </View>

              {/* Warning Text */}
              <Text style={styles.warningText}>
                The depositor name must match the actual name of the person who made the transfer for the order to be processed correctly.
              </Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            style={styles.submitButton}
            onPress={handleSubmit}
          >
            <Text style={styles.submitButtonText}>Submit Transfer Information</Text>
          </TouchableOpacity>
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
    paddingVertical: SPACING.lg * 2,
    marginBottom: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
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
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
    marginTop: -20,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.lg,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  kwiseBadge: {
    backgroundColor: '#A8D08D',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: SPACING.md,
  },
  kwiseText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.white,
  },
  methodTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.text.primary,
    flex: 1,
  },
  checkButton: {
    padding: SPACING.xs,
  },
  infoSection: {
    marginTop: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: FONTS.sizes.md,
    color: '#4A90E2',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    fontWeight: '500',
    flex: 1,
  },
  copyButton: {
    padding: SPACING.xs,
  },
  inputGroup: {
    marginTop: SPACING.lg,
  },
  inputLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingRight: SPACING.md,
  },
  amountInput: {
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
  warningText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    lineHeight: Math.round(FONTS.sizes.sm * 20 / 14),
    marginTop: SPACING.lg,
  },
  submitButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 25,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginTop: SPACING.md,
  },
  submitButtonText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
});

export default ChargeScreen;
