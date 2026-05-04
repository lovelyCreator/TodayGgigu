import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput as RNTextInput,
} from 'react-native';
import Icon from '../../../components/Icon';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../../constants';
import { RootStackParamList } from '../../../types';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { inquiryApi } from '../../../services/inquiryApi';

type OrderInquiryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'OrderInquiry'>;
type OrderInquiryScreenRouteProp = RouteProp<RootStackParamList, 'OrderInquiry'>;

const OrderInquiryScreen: React.FC = () => {
  const navigation = useNavigation<OrderInquiryScreenNavigationProp>();
  const route = useRoute<OrderInquiryScreenRouteProp>();
  const { showToast } = useToast();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    orderId: route.params?.orderId || '',
    orderNumber: route.params?.orderNumber || '',
    email: user?.email || '',
    subject: '',
    message: '',
  });

  // Update order number and email when route params or user data changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      orderId: route.params?.orderId || prev.orderId,
      orderNumber: route.params?.orderNumber || prev.orderNumber,
      email: user?.email || prev.email,
    }));
  }, [route.params?.orderId, route.params?.orderNumber, user?.email]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.orderNumber.trim()) {
      newErrors.orderNumber = 'Order number is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const orderIdToSend = formData.orderId || formData.orderNumber;

      if (!orderIdToSend) {
        showToast(t('home.orderIdRequired'), 'error');
        setIsSubmitting(false);
        return;
      }

      const inquiryMessage = `${formData.subject.trim()}\n\n${formData.message.trim()}`;
      const response = await inquiryApi.createInquiry(orderIdToSend, inquiryMessage);

      if (!response.success) {
        showToast(response.error || 'Failed to submit order inquiry', 'error');
        return;
      }

      showToast(t('home.inquirySubmitted'), 'success');

      const inquiryId = response.data?.inquiry?._id || response.data?.inquiry?._id;
      if (inquiryId) {
        navigation.replace('Chat', {
          inquiryId,
          orderId: response.data?.inquiry?.order?._id || formData.orderId,
          orderNumber: response.data?.inquiry?.order?.orderNumber || formData.orderNumber,
        });
        return;
      }

      // Reset form
      setFormData({
        orderId: '',
        orderNumber: '',
        email: user?.email || '',
        subject: '',
        message: '',
      });

      setTimeout(() => {
        navigation.goBack();
      }, 800);
    } catch (error: any) {
      showToast(error?.message || 'Failed to submit inquiry. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('home.orderInquiryTitle')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.description}>
            {t('home.orderInquiryDescription')}
          </Text>

          <View style={styles.orderInfoBlock}>
            <Text style={styles.orderInfoTitle}>{t('home.orderInformation')}</Text>
            <View style={styles.orderInfoRow}>
              <Text style={styles.orderInfoLabel}>{t('home.orderNumber')}</Text>
              <Text style={styles.orderInfoValue}>{formData.orderNumber || t('home.na')}</Text>
            </View>
            {formData.orderId ? (
              <View style={styles.orderInfoRow}>
                <Text style={styles.orderInfoLabel}>{t('home.orderId')}</Text>
                <Text style={styles.orderInfoValue}>{formData.orderId}</Text>
              </View>
            ) : null}
          </View>

          {/* Order Number */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('home.orderNumber')} *</Text>
            <RNTextInput
              style={[styles.input, errors.orderNumber && styles.inputError]}
              placeholder={t('home.enterOrderNumber')}
              placeholderTextColor={COLORS.gray[400]}
              value={formData.orderNumber}
              onChangeText={(text) => {
                setFormData({ ...formData, orderNumber: text });
                if (errors.orderNumber) {
                  setErrors({ ...errors, orderNumber: '' });
                }
              }}
              autoCapitalize="characters"
            />
            {errors.orderNumber && (
              <Text style={styles.errorText}>{errors.orderNumber}</Text>
            )}
          </View>

          {/* Email */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('home.emailRequired')}</Text>
            <RNTextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder={t('home.enterEmail')}
              placeholderTextColor={COLORS.gray[400]}
              value={formData.email}
              onChangeText={(text) => {
                setFormData({ ...formData, email: text });
                if (errors.email) {
                  setErrors({ ...errors, email: '' });
                }
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}
          </View>

          {/* Subject */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('home.subjectRequired')}</Text>
            <RNTextInput
              style={[styles.input, errors.subject && styles.inputError]}
              placeholder={t('home.subjectPlaceholder')}
              placeholderTextColor={COLORS.gray[400]}
              value={formData.subject}
              onChangeText={(text) => {
                setFormData({ ...formData, subject: text });
                if (errors.subject) {
                  setErrors({ ...errors, subject: '' });
                }
              }}
            />
            {errors.subject && (
              <Text style={styles.errorText}>{errors.subject}</Text>
            )}
          </View>

          {/* Message */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('home.messageRequired')}</Text>
            <RNTextInput
              style={[styles.textArea, errors.message && styles.inputError]}
              placeholder={t('home.messagePlaceholder')}
              placeholderTextColor={COLORS.gray[400]}
              value={formData.message}
              onChangeText={(text) => {
                setFormData({ ...formData, message: text });
                if (errors.message) {
                  setErrors({ ...errors, message: '' });
                }
              }}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            {errors.message && (
              <Text style={styles.errorText}>{errors.message}</Text>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (isSubmitting || !formData.orderNumber || !formData.email || !formData.subject || !formData.message) && 
              styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting || !formData.orderNumber || !formData.email || !formData.subject || !formData.message}
            activeOpacity={0.8}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? t('home.submitting') : t('home.submitInquiry')}
            </Text>
          </TouchableOpacity>

          {/* Help Text */}
          <View style={styles.helpContainer}>
            <Icon name="information-circle-outline" size={20} color={COLORS.text.secondary} />
            <Text style={styles.helpText}>
              {t('home.inquiryHelpText')}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    paddingTop: SPACING['2xl'],
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
    paddingBottom: SPACING['3xl']
  },
  description: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.gray[100],
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  textArea: {
    backgroundColor: COLORS.gray[100],
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 120,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
  submitButton: {
    backgroundColor: COLORS.error,
    borderRadius: BORDER_RADIUS.full,
    paddingVertical: SPACING.smmd,
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
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
  orderInfoBlock: {
    backgroundColor: COLORS.gray[50],
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    marginBottom: SPACING.lg,
  },
  orderInfoTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  orderInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.xs,
  },
  orderInfoLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
  },
  orderInfoValue: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.gray[50],
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
  },
  helpText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
});

export default OrderInquiryScreen;
