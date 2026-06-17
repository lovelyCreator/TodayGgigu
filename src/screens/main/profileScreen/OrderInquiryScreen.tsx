import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput as RNTextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../../../components/Icon';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, BACK_NAVIGATION_HIT_SLOP } from '../../../constants';
import { RootStackParamList } from '../../../types';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { inquiryApi } from '../../../services/inquiryApi';
import { orderApi } from '../../../services/orderApi';
import { useTranslation } from '../../../hooks/useTranslation';
import { useAppSelector } from '../../../store/hooks';

type OrderInquiryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'OrderInquiry'>;
type OrderInquiryScreenRouteProp = RouteProp<RootStackParamList, 'OrderInquiry'>;

const OrderInquiryScreen: React.FC = () => {
  const navigation = useNavigation<OrderInquiryScreenNavigationProp>();
  const route = useRoute<OrderInquiryScreenRouteProp>();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();
  const locale = useAppSelector((s) => s.i18n.locale) as string;

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
      newErrors.orderNumber = t('chat.orderNumberRequired');
    }

    if (!formData.email.trim()) {
      newErrors.email = t('chat.emailAddressRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('chat.validEmailRequired');
    }

    if (!formData.subject.trim()) {
      newErrors.subject = t('chat.subjectFieldRequired');
    }

    if (!formData.message.trim()) {
      newErrors.message = t('chat.messageFieldRequired');
    } else if (formData.message.trim().length < 10) {
      newErrors.message = t('chat.messageMinLength');
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
      let orderIdToSend = formData.orderId.trim();
      let resolvedOrderNumber = formData.orderNumber.trim();

      if (!resolvedOrderNumber) {
        showToast(t('chat.orderIdRequired'), 'error');
        setIsSubmitting(false);
        return;
      }

      const proxyRes = await orderApi.getOrderByOrderNumber(resolvedOrderNumber, locale);
      const proxyOrder = proxyRes.success ? proxyRes.data?.orders?.[0] : undefined;
      if (proxyOrder) {
        orderIdToSend = String(proxyOrder._id ?? proxyOrder.id ?? orderIdToSend);
        resolvedOrderNumber = proxyOrder.orderNumber || resolvedOrderNumber;
      }

      if (!orderIdToSend) {
        showToast(t('chat.orderIdRequired'), 'error');
        setIsSubmitting(false);
        return;
      }

      const inquiryMessage = `${formData.subject.trim()}\n\n${formData.message.trim()}`;
      const response = await inquiryApi.createInquiry(orderIdToSend, inquiryMessage);

      if (!response.success) {
        showToast(response.error || t('chat.failedToSubmitOrderInquiry'), 'error');
        return;
      }

      showToast(t('chat.inquirySubmitted'), 'success');

      const inquiryId = response.data?.inquiry?._id || response.data?.inquiry?._id;
      if (inquiryId) {
        navigation.replace('Chat', {
          inquiryId,
          orderId: response.data?.inquiry?.order?._id || orderIdToSend,
          orderNumber: response.data?.inquiry?.order?.orderNumber || resolvedOrderNumber,
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
      showToast(error?.message || t('chat.failedToSubmitInquiryTryAgain'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity hitSlop={BACK_NAVIGATION_HIT_SLOP}
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('chat.orderInquiryTitle')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.description}>
            {t('chat.orderInquiryDescription')}
          </Text>

          <View style={styles.orderInfoBlock}>
            <Text style={styles.orderInfoTitle}>{t('chat.orderInformation')}</Text>
            <View style={styles.orderInfoRow}>
              <Text style={styles.orderInfoLabel}>{t('chat.orderNumber')}</Text>
              <Text style={styles.orderInfoValue}>{formData.orderNumber || t('chat.na')}</Text>
            </View>
            {formData.orderId ? (
              <View style={styles.orderInfoRow}>
                <Text style={styles.orderInfoLabel}>{t('chat.orderId')}</Text>
                <Text style={styles.orderInfoValue}>{formData.orderId}</Text>
              </View>
            ) : null}
          </View>

          {/* Order Number */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('chat.orderNumber')} *</Text>
            <RNTextInput
              style={[styles.input, errors.orderNumber && styles.inputError]}
              placeholder={t('chat.enterOrderNumber')}
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
            <Text style={styles.label}>{t('chat.emailRequired')}</Text>
            <RNTextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder={t('chat.enterEmail')}
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
            <Text style={styles.label}>{t('chat.subjectRequired')}</Text>
            <RNTextInput
              style={[styles.input, errors.subject && styles.inputError]}
              placeholder={t('chat.subjectPlaceholder')}
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
            <Text style={styles.label}>{t('chat.messageRequired')}</Text>
            <RNTextInput
              style={[styles.textArea, errors.message && styles.inputError]}
              placeholder={t('chat.messagePlaceholder')}
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
              {isSubmitting ? t('chat.submitting') : t('chat.submitInquiry')}
            </Text>
          </TouchableOpacity>

          {/* Help Text */}
          <View style={styles.helpContainer}>
            <Icon name="information-circle-outline" size={20} color={COLORS.text.secondary} />
            <Text style={styles.helpText}>
              {t('chat.inquiryHelpText')}
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
    paddingTop: SPACING.md,
    backgroundColor: COLORS.background,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONTS.sizes['xl'],
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  placeholder: {
    width: 32,
    height: 32,
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
    lineHeight: Math.round(FONTS.sizes.md * 22 / 16),
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
    lineHeight: Math.round(FONTS.sizes.sm * 20 / 14),
  },
});

export default OrderInquiryScreen;
