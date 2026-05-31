import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Clipboard from '@react-native-clipboard/clipboard';
import { WebView } from 'react-native-webview';
import Icon from '../../../../components/Icon';
import EditIcon from '../../../../assets/icons/EditIcon';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../../../constants';
import { useToast } from '../../../../context/ToastContext';
import {
  coerceDisplayText,
  formatPriceKRW,
  resolveOrderItemCompanyName,
} from '../../../../utils/i18nHelpers';
import { useTranslation } from '../../../../hooks/useTranslation';
import { getOrderProgressStatusLabel } from '../../../../utils/orderProgressStatusLabel';
import { orderApi } from '../../../../services/orderApi';

const OrderDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { order: initialOrder } = route.params || {};
  const [currentOrder, setCurrentOrder] = useState(initialOrder);
  const order = currentOrder;
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [isDefaultAddress, setIsDefaultAddress] = useState(false);
  const [saveIdChecked, setSaveIdChecked] = useState(false);
  const [showKakaoAddress, setShowKakaoAddress] = useState(false);
  const [editAddress, setEditAddress] = useState({
    zonecode: '',
    roadAddress: '',
    detailAddress: '',
    recipient: '',
    contact: '',
    customsCode: '',
  });

  if (!order) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.headerSafeArea} edges={['top', 'left', 'right']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Icon name="arrow-back" size={24} color={COLORS.text.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('profile.orderDetail')}</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: COLORS.text.secondary }}>{t('profile.orderNotFound')}</Text>
        </View>
      </View>
    );
  }

  const kakaoPostcodeHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    #wrap { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="wrap"></div>
  <script src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"></script>
  <script>
    window.onload = function() {
      new daum.Postcode({
        oncomplete: function(data) {
          var msg = JSON.stringify({
            zonecode: data.zonecode,
            roadAddress: data.roadAddress || data.jibunAddress,
            jibunAddress: data.jibunAddress,
            sido: data.sido,
            sigungu: data.sigungu,
          });
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(msg);
          }
        },
        width: '100%',
        height: '100%',
        maxSuggestItems: 5,
      }).embed(document.getElementById('wrap'), { autoClose: true });
    };
  </script>
</body>
</html>`;

  const copy = (text: string) => {
    Clipboard.setString(text);
    showToast(t('profile.copied'), 'success');
  };

  const isPayCase = order.status === 'unpaid' || order.progressStatus === 'WH_PAY_WAIT';
  const isShipped = order.progressStatus === 'INTERNATIONAL_SHIPPED' || order.progressStatus === 'ORDER_RECEIVED';

  const handleConfirmReceived = async () => {
    setIsConfirming(true);
    try {
      const res = await orderApi.confirmReceived(order.id);
      if (res.success) {
        showToast(t('profile.orderConfirmedAsReceived'), 'success');
        navigation.goBack();
      } else {
        showToast(res.error || t('profile.failedToConfirm'), 'error');
      }
    } catch {
      showToast(t('profile.failedToConfirmReceipt'), 'error');
    } finally {
      setIsConfirming(false);
    }
  };

  const unknownStoreLabel = t('profile.unknownStore');

  const resolveStoreName = (item: any): string =>
    resolveOrderItemCompanyName(item, locale) ||
    coerceDisplayText(item?.companyName ?? item?.companyNameMultiLang, locale, '') ||
    unknownStoreLabel;

  const storeGroups: Record<string, any[]> = {};
  (order.items || []).forEach((item: any) => {
    const key = resolveStoreName(item);
    if (!storeGroups[key]) storeGroups[key] = [];
    storeGroups[key].push(item);
  });

  const address = order.shippingAddress;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.headerSafeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {getOrderProgressStatusLabel(t, order.progressStatus) ||
              order.orderStatus ||
              t('profile.orderDetail')}
          </Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Delivery Address */}
        {address && (
          <View style={styles.section}>
            <View style={styles.addressRow}>
              <Icon name="location-outline" size={24} color={COLORS.black} style={{ marginTop: 2 }} />
              <View style={styles.addressInfo}>
                <Text style={styles.addressFullText}>
                  {[address.detailedAddress, address.zipCode, address.city].filter(Boolean).join(', ')}
                </Text>
                <Text style={styles.addressPhone}>
                  {address.recipient}  {address.contact}
                </Text>
              </View>
              <View style={styles.addressActions}>
                <TouchableOpacity onPress={() => {
                  setEditAddress({
                    zonecode: address?.zipCode || '',
                    roadAddress: address?.detailedAddress || '',
                    detailAddress: address?.detailedAddress ? `${address.detailedAddress}`.trim() : '',
                    recipient: address?.recipient || '',
                    contact: address?.contact || '',
                    customsCode: address?.personalCustomsCode || '',
                  });
                  setIsDefaultAddress(address?.isDefault || false);
                  setAddressModalVisible(true);
                }} activeOpacity={0.7}>
                  <EditIcon width={20} height={20} color={COLORS.gray[600]} />
                </TouchableOpacity>
                {/* <TouchableOpacity onPress={() => navigation.navigate('AddressBook' as never)} activeOpacity={0.7}>
                  <Icon name="chevron-forward" size={20} color={COLORS.gray[600]} />
                </TouchableOpacity> */}
              </View>
            </View>
          </View>
        )}

        {/* Store groups + items */}
        {Object.entries(storeGroups).map(([storeName, items]) => (
          <View key={storeName} style={styles.section}>
            <Text style={styles.storeName}>
              {coerceDisplayText(storeName, locale, unknownStoreLabel)} {'>'}
            </Text>
            {items.map((item: any, i: number) => {
              const skuLabel = (item.skuAttributes || []).map((a: any) => a.valueTrans || a.value).join(' / ');
              return (
                <View key={i} style={styles.productRow}>
                  <Image source={{ uri: item.imageUrl || item.image }} style={styles.productImage} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productTitle} numberOfLines={2}>
                      {coerceDisplayText(item.subjectTrans, locale, '') ||
                        coerceDisplayText(item.subject, locale, '') ||
                        coerceDisplayText(item.productName, locale, '') ||
                        ''}
                    </Text>
                    {!!skuLabel && <Text style={styles.productSpecs}>{skuLabel}</Text>}
                    <View style={styles.priceRow}>
                      <Text style={styles.productPrice}>{formatPriceKRW(item.userPrice ?? item.price ?? 0)}</Text>
                      <Text style={styles.productQty}>×{item.quantity}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
            <View style={styles.summaryBox}>
              {order.firstTierCost?.productTotalKRW != null && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('profile.productTotal')}</Text>
                  <Text style={styles.summaryValue}>{formatPriceKRW(order.firstTierCost.productTotalKRW)}</Text>
                </View>
              )}
              {order.firstTierCost?.chinaShippingKRW != null && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('profile.chinaShipping')}</Text>
                  <Text style={styles.summaryValue}>{formatPriceKRW(order.firstTierCost.chinaShippingKRW)}</Text>
                </View>
              )}
              {order.firstTierCost?.baseInternationalShippingKRW != null && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('profile.intlShipping')}</Text>
                  <Text style={styles.summaryValue}>{formatPriceKRW(order.firstTierCost.baseInternationalShippingKRW)}</Text>
                </View>
              )}
              <View style={[styles.summaryRow, styles.summaryTotal]}>
                <Text style={styles.summaryTotalLabel}>{t('profile.amountPaid')}</Text>
                <Text style={styles.summaryTotalValue}>{formatPriceKRW(order.totalAmount ?? order.paidAmount ?? 0)}</Text>
              </View>
            </View>
          </View>
        ))}

        {/* Order details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.orderDetails')}</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('profile.orderNo')}</Text>
            <View style={styles.detailValueRow}>
              <Text style={styles.detailValue} numberOfLines={1}>{order.orderNumber}</Text>
              <TouchableOpacity onPress={() => copy(order.orderNumber)}>
                <Text style={styles.copyBtn}>{t('home.buyList.copy')}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('profile.created')}</Text>
            <Text style={styles.detailValue}>{new Date(order.createdAt || order.date).toLocaleString()}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom action bar */}
      <View style={styles.bottomBar}>
        {isPayCase ? (
          <TouchableOpacity style={styles.payBtn} onPress={() => navigation.navigate('Payment' as never)}>
            <Text style={styles.payBtnText}>{t('profile.pay')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.confirmBtn, !isShipped && styles.confirmBtnDisabled]}
            disabled={!isShipped || isConfirming}
            onPress={handleConfirmReceived}
          >
            {isConfirming ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.confirmBtnText}>{t('profile.confirmReceipt')}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Edit Address Modal — same as checkout page */}
      <Modal visible={addressModalVisible} transparent animationType="slide" onRequestClose={() => setAddressModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.addressModalContent}>
            <View style={styles.addressModalHeader}>
              <Text style={styles.addressModalTitle}>{t('home.buyList.editAddress')}</Text>
              <TouchableOpacity onPress={() => setAddressModalVisible(false)}>
                <Icon name="close" size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.addressModalLabel}>Currently delivering to:</Text>
              <View style={styles.addressModalRow}>
                <View style={styles.addressModalDropdown}>
                  <Text style={styles.addressModalDropdownText}>한국</Text>
                  <Icon name="chevron-down" size={20} color={COLORS.gray[600]} />
                </View>
                {/* <TouchableOpacity style={styles.defaultCheckboxRow} onPress={() => setIsDefaultAddress(!isDefaultAddress)}>
                  <Text style={styles.defaultText}>Default</Text>
                  <View style={[styles.checkboxSquare, isDefaultAddress && styles.checkboxSquareChecked]}>
                    {isDefaultAddress && <Icon name="checkmark" size={16} color={COLORS.white} />}
                  </View>
                </TouchableOpacity> */}
              </View>

              <Text style={styles.addressModalLabel}><Text style={styles.addressModalRequired}>* </Text>Address information:</Text>
              <TouchableOpacity style={styles.addressSearchBtn} onPress={() => setShowKakaoAddress(true)}>
                <Icon name="search" size={16} color={COLORS.white} />
                <Text style={styles.addressSearchBtnText}>Search Address (Kakao)</Text>
              </TouchableOpacity>

              <Text style={styles.addressModalLabel}><Text style={styles.addressModalRequired}>* </Text>Postal code:</Text>
              <TextInput
                style={styles.addressModalInput}
                placeholder={t('home.buyList.postalCode')}
                placeholderTextColor={COLORS.gray[400]}
                value={editAddress.zonecode}
                onChangeText={(v) => setEditAddress(prev => ({ ...prev, zonecode: v }))}
                keyboardType="number-pad"
              />

              <Text style={styles.addressModalLabel}><Text style={styles.addressModalRequired}>* </Text>Detail address:</Text>
              <TextInput
                style={styles.addressModalInput}
                placeholder={t('home.buyList.searchAddress')}
                placeholderTextColor={COLORS.gray[400]}
                value={editAddress.detailAddress}
                onChangeText={(v) => setEditAddress(prev => ({ ...prev, detailAddress: v }))}
              />

              <Text style={styles.addressModalLabel}><Text style={styles.addressModalRequired}>* </Text>Recipient name:</Text>
              <TextInput
                style={styles.addressModalInput}
                placeholder={t('home.buyList.upTo25Chars')}
                placeholderTextColor={COLORS.gray[400]}
                value={editAddress.recipient}
                onChangeText={(v) => setEditAddress(prev => ({ ...prev, recipient: v }))}
                maxLength={25}
              />

              <Text style={styles.addressModalLabel}><Text style={styles.addressModalRequired}>* </Text>Mobile number:</Text>
              <View style={styles.addressModalPhoneRow}>
                <View style={styles.addressModalPhoneCode}>
                  <Text style={{ fontSize: FONTS.sizes.sm, color: COLORS.text.primary }}>한국 +82</Text>
                  <Icon name="chevron-down" size={20} color={COLORS.gray[600]} />
                </View>
                <TextInput
                  style={[styles.addressModalInput, { flex: 1 }]}
                  value={editAddress.contact}
                  onChangeText={(v) => setEditAddress(prev => ({ ...prev, contact: v }))}
                  keyboardType="phone-pad"
                />
              </View>

              <Text style={styles.addressModalLabel}><Text style={styles.addressModalRequired}>* </Text>Customs clearance code:</Text>
              <TextInput
                style={styles.addressModalInput}
                placeholder={t('home.buyList.enterCustomsCode')}
                placeholderTextColor={COLORS.gray[400]}
                value={editAddress.customsCode}
                onChangeText={(v) => setEditAddress(prev => ({ ...prev, customsCode: v }))}
              />

              {/* <TouchableOpacity style={styles.addressModalCheckbox} onPress={() => setSaveIdChecked(!saveIdChecked)}>
                <View style={[styles.checkboxSquare, saveIdChecked && styles.checkboxSquareChecked]}>
                  {saveIdChecked && <Icon name="checkmark" size={16} color={COLORS.white} />}
                </View>
                <Text style={styles.addressModalCheckboxText}>Save ID number</Text>
              </TouchableOpacity> */}

              <TouchableOpacity
                style={styles.addressModalSaveButton}
                onPress={async () => {
                  if (!editAddress.recipient || !editAddress.contact || !editAddress.zonecode || !editAddress.detailAddress) {
                    showToast(t('profile.pleaseFillinAllRequiredFields'), 'error');
                    return;
                  }
                  setIsSavingAddress(true);
                  try {
                    const res = await orderApi.updateShippingAddress(order.id, {
                      recipient: editAddress.recipient,
                      contact: editAddress.contact,
                      detailedAddress: editAddress.detailAddress || editAddress.roadAddress,
                      zipCode: editAddress.zonecode,
                      personalCustomsCode: editAddress.customsCode,
                      country: 'South Korea',
                    });
                    if (res.success) {
                      showToast(t('profile.addressUpdatedSuccessfully'), 'success');
                      setAddressModalVisible(false);
                      // Re-fetch order to get updated address
                      const refreshed = await orderApi.getOrderById(order.id);
                      if (refreshed.success && refreshed.data?.order) {
                        setCurrentOrder((prev: any) => ({
                          ...prev,
                          shippingAddress: refreshed.data.order.shippingAddress,
                        }));
                      }
                    } else {
                      showToast(res.error || t('profile.failedToUpdateAddress'), 'error');
                    }
                  } catch (error: any) {
                    console.error('Address update error:', error);
                    showToast(error?.message || t('profile.failedToUpdateAddress'), 'error');
                  } finally {
                    setIsSavingAddress(false);
                  }
                }}
              >
                {isSavingAddress ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.addressModalSaveButtonText}>{t('profile.save')}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Kakao Address Search WebView */}
      <Modal visible={showKakaoAddress} transparent animationType="slide" onRequestClose={() => setShowKakaoAddress(false)}>
        <View style={styles.kakaoModalOverlay}>
          <View style={styles.kakaoModalContent}>
            <View style={styles.kakaoModalHeader}>
              <Text style={styles.kakaoModalTitle}>Search Address</Text>
              <TouchableOpacity onPress={() => setShowKakaoAddress(false)}>
                <Icon name="close" size={22} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>
            <WebView
              source={{ html: kakaoPostcodeHtml, baseUrl: 'https://postcode.map.daum.net' }}
              style={{ flex: 1 }}
              onMessage={(e) => {
                try {
                  const data = JSON.parse(e.nativeEvent.data);
                  setEditAddress(prev => ({
                    ...prev,
                    zonecode: data.zonecode || '',
                    roadAddress: data.roadAddress || '',
                    detailAddress: data.roadAddress || '',
                  }));
                  setShowKakaoAddress(false);
                } catch {}
              }}
              javaScriptEnabled
              domStorageEnabled
              mixedContentMode="always"
              originWhitelist={['*']}
              allowsInlineMediaPlayback
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerSafeArea: { backgroundColor: COLORS.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.red, textAlign: 'center' },
  section: { backgroundColor: COLORS.white, marginBottom: SPACING.sm, padding: SPACING.md, gap: SPACING.sm },
  addressRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start' },
  addressInfo: { flex: 1, gap: SPACING.xs },
  addressFullText: { fontSize: FONTS.sizes.md, color: COLORS.text.primary, lineHeight: 20 },
  addressPhone: { fontSize: FONTS.sizes.md, color: '#666666' },
  addressActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  storeName: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.text.primary },
  productRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start' },
  productImage: { width: 72, height: 72, borderRadius: BORDER_RADIUS.sm, backgroundColor: COLORS.gray[100] },
  productTitle: { fontSize: FONTS.sizes.sm, color: COLORS.text.primary, lineHeight: 18 },
  productSpecs: { fontSize: FONTS.sizes.xs, color: COLORS.text.secondary, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: 4 },
  productPrice: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.text.primary },
  productQty: { fontSize: FONTS.sizes.xs, color: COLORS.text.secondary },
  summaryBox: { borderTopWidth: 1, borderTopColor: COLORS.gray[100], paddingTop: SPACING.sm, gap: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: FONTS.sizes.sm, color: COLORS.text.secondary },
  summaryValue: { fontSize: FONTS.sizes.sm, color: COLORS.text.primary },
  summaryTotal: { borderTopWidth: 1, borderTopColor: COLORS.gray[100], paddingTop: SPACING.xs, marginTop: SPACING.xs },
  summaryTotalLabel: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text.primary },
  summaryTotalValue: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.red },
  sectionTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text.primary },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  detailLabel: { fontSize: FONTS.sizes.sm, color: COLORS.text.secondary, width: 90 },
  detailValueRow: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: SPACING.sm },
  detailValue: { fontSize: FONTS.sizes.sm, color: COLORS.text.primary, flex: 1, textAlign: 'right' },
  copyBtn: { fontSize: FONTS.sizes.sm, color: COLORS.red, fontWeight: '600' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: SPACING.md, backgroundColor: COLORS.white,
    borderTopWidth: 1, borderTopColor: COLORS.gray[200],
  },
  payBtn: { backgroundColor: COLORS.red, borderRadius: BORDER_RADIUS.md, paddingVertical: SPACING.md, alignItems: 'center' },
  payBtnText: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.white },
  confirmBtn: { backgroundColor: COLORS.red, borderRadius: BORDER_RADIUS.md, paddingVertical: SPACING.md, alignItems: 'center' },
  confirmBtnDisabled: { backgroundColor: COLORS.gray[300] },
  confirmBtnText: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.white },
  // Address modal styles (same as PaymentScreen)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  addressModalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: SPACING.md, maxHeight: '90%' },
  addressModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  addressModalTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text.primary },
  addressModalLabel: { fontSize: FONTS.sizes.sm, color: COLORS.text.secondary, marginBottom: SPACING.xs, marginTop: SPACING.sm },
  addressModalRequired: { color: COLORS.red },
  addressModalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  addressModalDropdown: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.gray[300], borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.sm, gap: SPACING.xs, flex: 1 },
  addressModalDropdownText: { fontSize: FONTS.sizes.sm, color: COLORS.text.primary, flex: 1 },
  defaultCheckboxRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginLeft: SPACING.sm },
  defaultText: { fontSize: FONTS.sizes.sm, color: COLORS.text.primary },
  checkboxSquare: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: COLORS.gray[400], justifyContent: 'center', alignItems: 'center' },
  checkboxSquareChecked: { borderColor: COLORS.red, backgroundColor: COLORS.red },
  addressModalTextArea: { borderWidth: 1, borderColor: COLORS.gray[300], borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, fontSize: FONTS.sizes.sm, color: COLORS.text.primary, minHeight: 80, textAlignVertical: 'top' },
  addressModalInput: { borderWidth: 1, borderColor: COLORS.gray[300], borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.sm, fontSize: FONTS.sizes.sm, color: COLORS.text.primary },
  addressModalPhoneRow: { flexDirection: 'row', gap: SPACING.sm },
  addressModalPhoneCode: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.gray[300], borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.sm, gap: SPACING.xs, minWidth: 110 },
  addressModalCheckbox: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginTop: SPACING.md },
  addressModalCheckboxText: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.text.secondary, lineHeight: 18 },
  addressModalSaveButton: { backgroundColor: COLORS.red, borderRadius: BORDER_RADIUS.md, paddingVertical: SPACING.md, alignItems: 'center', marginTop: SPACING.md, marginBottom: SPACING.xl },
  addressModalSaveButtonText: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.white },
  addressSearchBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    backgroundColor: COLORS.red, borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    alignSelf: 'flex-start', marginBottom: SPACING.sm,
  },
  addressSearchBtnText: { fontSize: FONTS.sizes.sm, color: COLORS.white, fontWeight: '600' },
  addressZoneRow: { flexDirection: 'row', gap: SPACING.sm },
  addressSelectedBox: {
    borderWidth: 1, borderColor: COLORS.gray[200], borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm, marginBottom: SPACING.sm, backgroundColor: COLORS.gray[50],
  },
  addressSelectedZone: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.text.primary },
  addressSelectedRoad: { fontSize: FONTS.sizes.sm, color: COLORS.text.secondary, marginTop: 2 },
  kakaoModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  kakaoModalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '80%' },
  kakaoModalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.gray[200],
  },
  kakaoModalTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text.primary },
});

export default OrderDetailScreen;
