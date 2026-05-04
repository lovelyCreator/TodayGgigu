import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import Icon from '../../../../components/Icon';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants';
import { RootStackParamList } from '../../../../types';

type AddPaymentMethodScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'AddPaymentMethod'
>;

const AddPaymentMethodScreen: React.FC = () => {
  const navigation = useNavigation<AddPaymentMethodScreenNavigationProp>();

  const [formData, setFormData] = useState({
    cardholderName: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    billingAddress: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<'required' | 'optional'>('required');

  const handleSave = () => {
    // Validate required fields
    if (!formData.cardholderName || !formData.cardNumber || !formData.expiryDate || !formData.cvv) {
      Alert.alert('Missing Information', 'Please fill in all required fields marked with *');
      return;
    }

    // Validate card number (basic validation)
    if (formData.cardNumber.replace(/\s/g, '').length < 13) {
      Alert.alert('Invalid Card', 'Please enter a valid card number');
      return;
    }

    // Validate expiry date format (MM/YY)
    const expiryRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
    if (!expiryRegex.test(formData.expiryDate)) {
      Alert.alert('Invalid Expiry', 'Please enter expiry date in MM/YY format');
      return;
    }

    // Validate CVV
    if (formData.cvv.length < 3) {
      Alert.alert('Invalid CVV', 'Please enter a valid CVV');
      return;
    }

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      Alert.alert('Success', 'Payment method added successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    }, 1500);
  };

  const formatCardNumber = (text: string) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, '');
    // Add space every 4 digits
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted.substring(0, 19); // Max 16 digits + 3 spaces
  };

  const formatExpiryDate = (text: string) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, '');
    // Add slash after 2 digits
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Icon name="arrow-back" size={24} color={COLORS.text.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Add Card</Text>
      <View style={styles.placeholder} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          {/* Required Fields Label */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>
              <Text style={styles.required}>*</Text>Required Fields
            </Text>
          </View>

          {/* Card Company Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Card Company Name<Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              value={formData.cardholderName}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, cardholderName: text }))
              }
              placeholder="Please enter"
              placeholderTextColor={COLORS.gray[400]}
              editable={!isLoading}
            />
          </View>

          {/* Card Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Card Number<Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              value={formData.cardNumber}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, cardNumber: formatCardNumber(text) }))
              }
              placeholder="Please enter"
              placeholderTextColor={COLORS.gray[400]}
              keyboardType="numeric"
              maxLength={19}
              editable={!isLoading}
            />
          </View>

          {/* Card Holder */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Card Holder<Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="Please enter"
              placeholderTextColor={COLORS.gray[400]}
              editable={!isLoading}
            />
          </View>

          {/* Expiry Date and CVV Row */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.inputLabel}>
                Expiry Date<Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                value={formData.expiryDate}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, expiryDate: formatExpiryDate(text) }))
                }
                placeholder="Please enter"
                placeholderTextColor={COLORS.gray[400]}
                keyboardType="numeric"
                maxLength={5}
                editable={!isLoading}
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.inputLabel}>
                CVV<Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                value={formData.cvv}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, cvv: text.replace(/\D/g, '') }))
                }
                placeholder="Please enter"
                placeholderTextColor={COLORS.gray[400]}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
                editable={!isLoading}
              />
            </View>
          </View>

          {/* Bank or Card Owner Address */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Bank or Card Owner Address</Text>
            <TextInput
              style={styles.textInput}
              value={formData.billingAddress}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, billingAddress: text }))
              }
              placeholder="Please enter"
              placeholderTextColor={COLORS.gray[400]}
              editable={!isLoading}
            />
          </View>
        </View>

        {/* Submit Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.submitButtonText}>Submit</Text>
            )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm * 2,
    paddingTop: SPACING['2xl'] * 2,
    backgroundColor: COLORS.white,
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
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  sectionHeader: {
    marginBottom: SPACING.lg,
  },
  sectionLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  required: {
    color: COLORS.error,
    marginRight: 4,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    backgroundColor: COLORS.white,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  halfWidth: {
    flex: 1,
  },
  bottomContainer: {
    padding: SPACING.lg,
  },
  submitButton: {
    backgroundColor: COLORS.error,
    paddingVertical: SPACING.smmd,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.lightRed,
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
});

export default AddPaymentMethodScreen;
