import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../../../../components/Icon';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS, FONTS, SPACING } from '../../../../constants';
import { useToast } from '../../../../context/ToastContext';

interface TrackingEvent {
  status: string;
  date: string;
  time: string;
  description: string;
}

const DeliveryDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { showToast } = useToast();
  const [showAllTracking, setShowAllTracking] = useState(false);
  const [showAllOrderDetails, setShowAllOrderDetails] = useState(false);

  // Sample data
  const trackingNumber = '9928383938383847';
  const courierCompany = '中通快递';
  
  const trackingEvents: TrackingEvent[] = [
    {
      status: 'Delivered',
      date: '02-02',
      time: '11:31',
      description: '您的快件已在收货取出签收，如遇问题请联系快递员【主管：13943602234】，无需找商家/平台。签收代收点：快递-方达华府每日鲜超市，咨询电话：0433-8159476，投诉电话：0433-2629992。关注"中通快递"官方微信公众号反馈问题，处理更快捷！感谢使用中通快递，期待再次为您服务！',
    },
    {
      status: '待取件',
      date: '01-03',
      time: '17:16',
      description: '快件已由快递员【主管：13943602234】送达代收点存放，取件地址：【快递-方达华府每日鲜超市】，请于08:00-20:00】，请及时取件。如遇取件问题或找不到包裹等问题请联系快递员，无需找商家/平台。咨询电话：0433-8159476，投诉电话：0433-2629992。关注"中通快递"官方微信公众号反馈实时物流信息',
    },
  ];

  const deliveryAddress = {
    location: 'Yanbian University, University Town, Sihe Fresh Store, Building D, Room 276, Unit [X], Floor [Y], 66736, Yanbian, China',
    phone: 'Wang mou 86-133****8878',
  };

  const orderDetails = {
    storeName: 'SANSUI Brand STORE',
    productImage: 'https://via.placeholder.com/100',
    productTitle: 'Text Text Text Text Text Text Text ...',
    productSpecs: '2pack/1.2V/United States',
    productPrice: 500.00,
    originalPrice: 600.00,
    quantity: 1,
    subtotal: 285,
    shippingFee: 8,
    storeDiscount: -1,
    amountPaid: 292,
    paymentMethod: '支付方式',
    orderNumber: '028742908347502394875',
    transactionSnapshot: 'used as a reference in case of a dispute >',
    customsClearanceCode: '通关码',
    creationTime: '2026-01-30 09:55:31',
    paymentTime: '2026-01-30 09:55:31',
    shippingTime: '2026-01-30 09:55:31',
  };

  const handleCopy = (text: string, label: string) => {
    Clipboard.setString(text);
    showToast(`${label} copied`, 'success');
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
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.headerIconButton}>
            <Icon name="headset-mic" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconButton}>
            <Icon name="document-text" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconButton}>
            <Icon name="ellipsis-horizontal" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Tracking Number */}
        <View style={styles.trackingNumberSection}>
          <Icon name="cube" size={20} color="#4A90E2" />
          <Text style={styles.courierCompany}>{courierCompany}：{trackingNumber}</Text>
          <TouchableOpacity onPress={() => handleCopy(trackingNumber, 'Tracking number')}>
            <Text style={styles.copyButton}>Copy</Text>
          </TouchableOpacity>
        </View>

        {/* Tracking Timeline */}
        <View style={styles.trackingSection}>
          {trackingEvents.slice(0, showAllTracking ? trackingEvents.length : 2).map((event, index) => (
            <View key={`event-${index}`} style={styles.trackingEvent}>
              <View style={styles.timelineIndicator}>
                <View style={[styles.timelineDot, index === 0 && styles.timelineDotActive]} />
                {index < trackingEvents.length - 1 && <View style={styles.timelineLine} />}
              </View>
              <View style={styles.eventContent}>
                <View style={styles.eventHeader}>
                  <Text style={[styles.eventStatus, index === 0 && styles.eventStatusActive]}>
                    {event.status}
                  </Text>
                  <Text style={styles.eventTime}>{event.date} {event.time}</Text>
                </View>
                <Text style={styles.eventDescription}>{event.description}</Text>
              </View>
            </View>
          ))}
          
          <TouchableOpacity
            style={styles.viewMoreButton}
            onPress={() => setShowAllTracking(!showAllTracking)}
          >
            <Text style={styles.viewMoreText}>
              View {showAllTracking ? 'Less' : 'More'} Tracking Details
            </Text>
            <Icon 
              name={showAllTracking ? 'chevron-up' : 'chevron-down'} 
              size={16} 
              color="#4A90E2" 
            />
          </TouchableOpacity>
        </View>

        {/* Delivery Address */}
        <View style={styles.addressSection}>
          <View style={styles.addressHeader}>
            <Icon name="location" size={20} color={COLORS.text.primary} />
            <View style={styles.addressContent}>
              <Text style={styles.addressText}>{deliveryAddress.location}</Text>
              <Text style={styles.phoneText}>{deliveryAddress.phone}</Text>
            </View>
          </View>
        </View>

        {/* Order Details */}
        <View style={styles.orderSection}>
          <Text style={styles.storeName}>{orderDetails.storeName} {'>'}</Text>
          
          <View style={styles.productCard}>
            <Image source={{ uri: orderDetails.productImage }} style={styles.productImage} />
            <View style={styles.productInfo}>
              <Text style={styles.productTitle} numberOfLines={2}>{orderDetails.productTitle}</Text>
              <Text style={styles.productSpecs}>{orderDetails.productSpecs}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.productPrice}>${orderDetails.productPrice.toFixed(2)}</Text>
                <Text style={styles.originalPrice}>${orderDetails.originalPrice.toFixed(2)}</Text>
              </View>
            </View>
            <Text style={styles.quantity}>x{orderDetails.quantity}</Text>
          </View>

          <TouchableOpacity
            style={styles.viewMoreButton}
            onPress={() => setShowAllOrderDetails(!showAllOrderDetails)}
          >
            <Text style={styles.viewMoreText}>
              View All Order Details
            </Text>
            <Icon 
              name={showAllOrderDetails ? 'chevron-up' : 'chevron-down'} 
              size={16} 
              color="#4A90E2" 
            />
          </TouchableOpacity>

          {showAllOrderDetails && (
            <View style={styles.orderDetailsExpanded}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Subtotal</Text>
                <Text style={styles.detailValue}>${orderDetails.subtotal}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Shipping Fee</Text>
                <Text style={styles.detailValue}>${orderDetails.shippingFee}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Store Discount</Text>
                <Text style={[styles.detailValue, styles.discountValue]}>-¥{orderDetails.storeDiscount}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Amount Paid</Text>
                <Text style={[styles.detailValue, styles.amountPaid]}>¥{orderDetails.amountPaid}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payment Method</Text>
                <Text style={styles.detailValue}>{orderDetails.paymentMethod}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Order Number</Text>
                <View style={styles.detailValueWithCopy}>
                  <Text style={styles.detailValue}>{orderDetails.orderNumber}</Text>
                  <TouchableOpacity onPress={() => handleCopy(orderDetails.orderNumber, 'Order number')}>
                    <Text style={styles.copyButton}>Copy</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Transaction Snapshot</Text>
                <TouchableOpacity>
                  <Text style={styles.linkText}>{orderDetails.transactionSnapshot}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Customs Clearance Code</Text>
                <Text style={styles.detailValue}>{orderDetails.customsClearanceCode}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Creation Time</Text>
                <Text style={styles.detailValue}>{orderDetails.creationTime}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payment Time</Text>
                <Text style={styles.detailValue}>{orderDetails.paymentTime}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Shipping Time</Text>
                <Text style={styles.detailValue}>{orderDetails.shippingTime}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md * 2,
    backgroundColor: COLORS.white,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  trackingNumberSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  courierCompany: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  copyButton: {
    fontSize: FONTS.sizes.sm,
    color: '#4A90E2',
    fontWeight: '500',
  },
  trackingSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    marginTop: SPACING.xs,
  },
  trackingEvent: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  timelineIndicator: {
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.gray[300],
  },
  timelineDotActive: {
    backgroundColor: '#FF6B35',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.gray[200],
    marginTop: SPACING.xs,
  },
  eventContent: {
    flex: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  eventStatus: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  eventStatusActive: {
    color: '#FF6B35',
  },
  eventTime: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
  },
  eventDescription: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    lineHeight: Math.round(FONTS.sizes.sm * 20 / 14),
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  viewMoreText: {
    fontSize: FONTS.sizes.sm,
    color: '#4A90E2',
    fontWeight: '500',
  },
  addressSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    marginTop: SPACING.xs,
  },
  addressHeader: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  addressContent: {
    flex: 1,
  },
  addressText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    lineHeight: Math.round(FONTS.sizes.sm * 20 / 14),
    marginBottom: SPACING.xs,
  },
  phoneText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
  },
  orderSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xl,
  },
  storeName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  productCard: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: COLORS.gray[200],
    marginRight: SPACING.md,
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  productSpecs: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  productPrice: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  originalPrice: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    textDecorationLine: 'line-through',
  },
  quantity: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
  },
  orderDetailsExpanded: {
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
    paddingTop: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  detailLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
  },
  detailValue: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },
  detailValueWithCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  discountValue: {
    color: '#FF6B35',
  },
  amountPaid: {
    color: '#FF6B35',
    fontWeight: '700',
  },
  linkText: {
    fontSize: FONTS.sizes.sm,
    color: '#4A90E2',
    textDecorationLine: 'underline',
  },
});

export default DeliveryDetailScreen;
