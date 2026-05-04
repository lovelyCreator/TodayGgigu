import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Linking,
} from 'react-native';
import Icon from '../../../components/Icon';
import { useNavigation } from '@react-navigation/native';

import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../../constants';

const PrivacyPolicyScreen: React.FC = () => {
  const navigation = useNavigation();

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@todaymall.com');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={18} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.introText}>
            At TodayMall, your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your information when you use our app and services.
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Information We Collect</Text>
            <View style={{flexDirection: 'row'}}>
              <Text style={styles.dot}> • </Text>
              <Text style={styles.bulletPoint}>Account Information: Name, email, phone number, and password when you register. </Text>
            </View>
            <View style={{flexDirection: 'row'}}>
              <Text style={styles.dot}> • </Text>
              <Text style={styles.bulletPoint}>Shopping Activity: Products you view, add to cart, purchase and reviews you leave. </Text>
            </View>
            <View style={{flexDirection: 'row'}}>
              <Text style={styles.dot}> • </Text>
              <Text style={styles.bulletPoint}>Media & Content: Videos, images, and product listings you upload or interact with. </Text>
            </View>
            <View style={{flexDirection: 'row'}}>
              <Text style={styles.dot}> • </Text>
              <Text style={styles.bulletPoint}>Device & Usage Data: App usage, IP address, browser/ device type, and cookies for performance and security. </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
            <Text style={styles.description}>We use your information to:</Text>
            <View style={{flexDirection: 'row'}}>
              <Text style={styles.dot}> • </Text>
              <Text style={styles.bulletPoint}>Provide and improve our services. </Text>
            </View>
            <View style={{flexDirection: 'row'}}>
              <Text style={styles.dot}> • </Text>
              <Text style={styles.bulletPoint}>Personalize your shopping experience. </Text>
            </View>
            <View style={{flexDirection: 'row'}}>
              <Text style={styles.dot}> • </Text>
              <Text style={styles.bulletPoint}>Process orders, payments, and deliveries. </Text>
            </View>
            <View style={{flexDirection: 'row'}}>
              <Text style={styles.dot}> • </Text>
              <Text style={styles.bulletPoint}>Communicate updates, promotions, and support. </Text>
            </View>
            <View style={{flexDirection: 'row'}}>
              <Text style={styles.dot}> • </Text>
              <Text style={styles.bulletPoint}>Ensure a safe and secure marketplace. </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Sharing Your Information</Text>
            <View style={{flexDirection: 'row'}}>
              <Text style={styles.dot}> • </Text>
              <Text style={styles.bulletPoint}>We do not sell your personal data to third parties. </Text>
            </View>
            <View style={{flexDirection: 'row'}}>
              <Text style={styles.dot}> • </Text>
              <Text style={styles.bulletPoint}>We may share data with trusted partners (e.g., payment providers, delivery services) to complete your transactions. </Text>
            </View>
            <View style={{flexDirection: 'row'}}>
              <Text style={styles.dot}> • </Text>
              <Text style={styles.bulletPoint}>We may disclose information if required by law or to protect our community. </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Your Choices & Rights</Text>
            <View style={{flexDirection: 'row'}}>
              <Text style={styles.dot}> • </Text>
              <Text style={styles.bulletPoint}>You can update your account details anytime in your profile. </Text>
            </View>
            <View style={{flexDirection: 'row'}}>
              <Text style={styles.dot}> • </Text>
              <Text style={styles.bulletPoint}>You can opt out of marketing emails in settings. </Text>
            </View>
            <View style={{flexDirection: 'row'}}>
              <Text style={styles.dot}> • </Text>
              <Text style={styles.bulletPoint}>You may request account deletion by contacting support. </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Data Security</Text>
            <Text style={styles.description}>We use encryption, secure servers, and regular monitoring to protect your personal information.</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Updates to This Policy</Text>
            <Text style={styles.description}>We may update this Privacy Policy from time to time. Changes will be posted in the app with the updated date.</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Contact Us</Text>
            <Text style={styles.description}>If you have questions about this Privacy Policy, please contact us at:</Text>
            <TouchableOpacity onPress={handleContactSupport}>
              <Text style={styles.emailLink}>📧 support@todaymall.com</Text>
            </TouchableOpacity>
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
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    paddingTop: SPACING.xl,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  placeholder: {
    width: 24,
  },
  scrollView: {
    flex: 1,
    marginBottom: SPACING['3xl']
  },
  content: {
    padding: SPACING.md,
  },
  introText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.base,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  description: {
    fontSize: FONTS.sizes.base,
    color: COLORS.text.primary,
    lineHeight: 22,
    marginBottom: SPACING.xs,
  },
  bulletPoint: {
    fontSize: FONTS.sizes.base,
    color: COLORS.text.primary,
    lineHeight: 22,
    marginBottom: SPACING.xs,
  },
  emailLink: {
    fontSize: FONTS.sizes.base,
    color: COLORS.text.primary,
    // textDecorationLine: 'underline',
  },
  dot: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    width: SPACING.md,
    // lineHeight: 22,
    marginBottom: SPACING.xs,
  }
});

export default PrivacyPolicyScreen;
