import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from '../../../components/Icon';
import { COLORS, FONTS, SHADOWS, SPACING, BORDER_RADIUS } from '../../../constants';
import { RootStackParamList } from '../../../types';
import { useGeneralInquiry } from '../../../hooks/useGeneralInquiry';
import { useTranslation } from '../../../hooks/useTranslation';
import { useAuth } from '../../../context/AuthContext';

type CreateGeneralInquiryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CreateGeneralInquiry'>;

type InquiryCategory = 'general' | 'support' | 'complaint' | 'suggestion' | 'technical';

const CreateGeneralInquiryScreen: React.FC = () => {
  const navigation = useNavigation<CreateGeneralInquiryScreenNavigationProp>();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { createInquiry, isLoading } = useGeneralInquiry();

  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<InquiryCategory>('general');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<{ subject?: string; message?: string }>({});

  const categories: { value: InquiryCategory; label: string }[] = [
    { value: 'general', label: t('inquiry.category.general') || 'General' },
    { value: 'support', label: t('inquiry.category.support') || 'Support' },
    { value: 'complaint', label: t('inquiry.category.complaint') || 'Complaint' },
    { value: 'suggestion', label: t('inquiry.category.suggestion') || 'Suggestion' },
    { value: 'technical', label: t('inquiry.category.technical') || 'Technical' },
  ];

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: { subject?: string; message?: string } = {};

    if (subject.length > 200) {
      newErrors.subject = t('inquiry.errors.subjectTooLong') || 'Subject must be 200 characters or less';
    }

    if (!message.trim()) {
      newErrors.message = t('inquiry.errors.messageRequired') || 'Message is required';
    } else if (message.trim().length < 1) {
      newErrors.message = t('inquiry.errors.messageMinLength') || 'Message must be at least 1 character';
    } else if (message.length > 5000) {
      newErrors.message = t('inquiry.errors.messageTooLong') || 'Message must be 5000 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (!isAuthenticated) {
      Alert.alert(
        t('home.pleaseLogin') || 'Please Login',
        t('inquiry.errors.loginRequired') || 'You must be logged in to create an inquiry',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const inquiry = await createInquiry({
        subject: subject.trim() || undefined,
        category,
        message: message.trim(),
      });

      if (inquiry) {
        Alert.alert(
          t('inquiry.success') || 'Success',
          t('inquiry.createdSuccessfully') || 'Inquiry created successfully',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.navigate('GeneralInquiryChat', { inquiryId: inquiry._id });
              },
            },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert(
        t('inquiry.error') || 'Error',
        error.message || t('inquiry.errors.createFailed') || 'Failed to create inquiry'
      );
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t('inquiry.createNew') || 'Create New Inquiry'}
          </Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {t('home.pleaseLogin') || 'Please login to create an inquiry'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('inquiry.createNew') || 'Create New Inquiry'}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.description}>
          {t('inquiry.description') || 'Got a question or request? Submit your inquiry and our support team will reply quickly.'}
        </Text>

        {/* Category Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>
            {t('inquiry.category.label') || 'Category'} <Text style={styles.optional}>({t('inquiry.optional') || 'Optional'})</Text>
          </Text>
          <View style={styles.categoryContainer}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.categoryButton,
                  category === cat.value && styles.categoryButtonActive,
                ]}
                onPress={() => setCategory(cat.value)}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    category === cat.value && styles.categoryButtonTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Subject */}
        <View style={styles.section}>
          <Text style={styles.label}>
            {t('inquiry.subject') || 'Subject'} <Text style={styles.optional}>({t('inquiry.optional') || 'Optional'})</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.subject && styles.inputError]}
            value={subject}
            onChangeText={(text) => {
              setSubject(text);
              if (errors.subject) {
                setErrors({ ...errors, subject: undefined });
              }
            }}
            placeholder={t('inquiry.subjectPlaceholder') || 'Enter inquiry subject (max 200 characters)'}
            placeholderTextColor={COLORS.gray[400]}
            maxLength={200}
          />
          {errors.subject && <Text style={styles.errorText}>{errors.subject}</Text>}
          <Text style={styles.helperText}>
            {subject.length}/200 {t('inquiry.characters') || 'characters'}
          </Text>
        </View>

        {/* Message */}
        <View style={styles.section}>
          <Text style={styles.label}>
            {t('inquiry.message') || 'Message'} <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.textArea, errors.message && styles.inputError]}
            value={message}
            onChangeText={(text) => {
              setMessage(text);
              if (errors.message) {
                setErrors({ ...errors, message: undefined });
              }
            }}
            placeholder={t('inquiry.messagePlaceholder') || 'Describe your inquiry in detail...'}
            placeholderTextColor={COLORS.gray[400]}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            maxLength={5000}
          />
          {errors.message && <Text style={styles.errorText}>{errors.message}</Text>}
          <Text style={styles.helperText}>
            {message.length}/5000 {t('inquiry.characters') || 'characters'}
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.submitButtonText}>
              {t('inquiry.submit') || 'Submit Inquiry'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Help Text */}
        <View style={styles.helpContainer}>
          <Icon name="information-circle-outline" size={20} color={COLORS.text.secondary} />
          <Text style={styles.helpText}>
            {t('inquiry.helpText') || 'We typically respond to inquiries within 24 hours during business days.'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
    ...SHADOWS.small,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  description: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  section: {
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    ...SHADOWS.small,
  },
  label: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  required: {
    color: COLORS.error,
  },
  optional: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
    fontWeight: 'normal',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  categoryButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.gray[100],
    borderWidth: 1,
    borderColor: COLORS.gray[300],
  },
  categoryButtonActive: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  categoryButtonText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    ...SHADOWS.small,
  },
  textArea: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    minHeight: 150,
    ...SHADOWS.small,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
  helperText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
    marginTop: SPACING.xs,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    ...SHADOWS.md,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.gray[400],
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.gray[50],
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  helpText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.secondary,
  },
});

export default CreateGeneralInquiryScreen;

