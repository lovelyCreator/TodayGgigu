import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
  Platform,
  SafeAreaView,
} from 'react-native';
import Icon from '../../../components/Icon';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../../constants';
import { useAppSelector } from '../../../store/hooks';
import { translations } from '../../../i18n/translations';
import { useSocket } from '../../../context/SocketContext';
import { inquiryApi } from '../../../services/inquiryApi';

const CustomerServiceScreen: React.FC = () => {
  const navigation = useNavigation();
  const locale = useAppSelector((s) => s.i18n.locale) as 'en' | 'ko' | 'zh';
  const { onMessageReceived, onUnreadCountUpdated, getUnreadCounts, unreadCount } = useSocket();
  const [totalUnreadCount, setTotalUnreadCount] = useState<number>(0);
  
  // Translation function
  const t = (key: string) => {
    const keys = key.split('.');
    let value: any = translations[locale as keyof typeof translations];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };

  // Fetch unread counts when screen comes into focus using REST API
  useFocusEffect(
    React.useCallback(() => {
      const fetchUnreadCounts = async () => {
        try {
          const response = await inquiryApi.getUnreadCounts();
          if (response.success && response.data) {
            setTotalUnreadCount(response.data.totalUnread);
            // Note: onUnreadCountUpdated is a callback registration function, not a direct update function
            // The socket context will handle updates via its own event listeners
          }
        } catch (error) {
          // console.error('Failed to fetch unread counts:', error);
        }
      };
      fetchUnreadCounts();
    }, [onUnreadCountUpdated])
  );

  // Update total unread count from socket context
  useEffect(() => {
    setTotalUnreadCount(unreadCount);
  }, [unreadCount]);

  // Listen to socket events for new messages
  useEffect(() => {
    const handleMessageReceived = (data: { 
      message: any; 
      inquiryId: string; 
      unreadCount?: number; 
      totalUnreadCount?: number;
    }) => {
      // Update total unread count when new message arrives
      if (data.totalUnreadCount !== undefined) {
        setTotalUnreadCount(data.totalUnreadCount);
      }
    };

    const handleUnreadCountUpdated = (count: number) => {
      setTotalUnreadCount(count);
    };

    onMessageReceived(handleMessageReceived);
    onUnreadCountUpdated(handleUnreadCountUpdated);

    // Cleanup
    return () => {
      // Cleanup handled by socket context
    };
  }, [onMessageReceived, onUnreadCountUpdated]);

  const handlePhoneCall = () => {
    const phoneNumber = '070-7792-6663';
    const phoneUrl = Platform.OS === 'ios' ? `telprompt:${phoneNumber}` : `tel:${phoneNumber}`;
    Linking.openURL(phoneUrl);
  };

  const handleKakaoTalk = () => {
    // Open KakaoTalk or show message
    // console.log('Open KakaoTalk');
    // You can implement deep linking to KakaoTalk here
  };

  const handleOrderInquiry = () => {
    // Navigate to Order Inquiry screen
    (navigation as any).navigate('OrderInquiry');
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
        <Text style={styles.headerTitle}>{t('customerService.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Banner Image */}
      <View style={styles.bannerContainer}>
        <View style={styles.bannerImageWrapper}>
          <Image
            source={require('../../../assets/images/avatar.png')}
            style={styles.bannerImage}
            resizeMode="cover"
          />
        </View>
      </View>

      {/* Online Client Center */}
      <View style={styles.contentContainer}>
        <Text style={styles.sectionTitle}>{t('customerService.onlineClientCenter')}</Text>

        {/* Phone Button */}
        <TouchableOpacity
          style={[styles.contactButton, styles.phoneButton]}
          onPress={handlePhoneCall}
        >
          <Icon name="call" size={24} color={COLORS.white} />
          <Text style={styles.phoneButtonText}>070-7792-6663</Text>
        </TouchableOpacity>

        {/* Kakao Talk Button */}
        <TouchableOpacity
          style={[styles.contactButton, styles.kakaoButton]}
          onPress={handleKakaoTalk}
        >
          <Icon name="chatbubble" size={24} color={COLORS.text.primary} />
          <Text style={styles.kakaoButtonText}>{t('customerService.kakaoTalk')}</Text>
        </TouchableOpacity>

        {/* Order Inquiry Button */}
        <TouchableOpacity
          style={[styles.contactButton, styles.orderButton]}
          onPress={handleOrderInquiry}
        >
          <View style={styles.orderButtonContent}>
            <Icon name="document-text" size={24} color={COLORS.text.primary} />
            <Text style={styles.orderButtonText}>{t('customerService.orderInquiry')}</Text>
            {totalUnreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
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
  bannerContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  bannerImageWrapper: {
    width: '100%',
    height: 140,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.gray[200],
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.lg,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  phoneButton: {
    backgroundColor: '#4A90E2',
  },
  phoneButtonText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.white,
  },
  kakaoButton: {
    backgroundColor: '#FEE500',
  },
  kakaoButtonText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  orderButton: {
    backgroundColor: '#D4F1F4',
    position: 'relative',
  },
  orderButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    position: 'relative',
  },
  orderButtonText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  unreadBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.red,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  unreadBadgeText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: COLORS.white,
  },
});

export default CustomerServiceScreen;
