import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from './Icon';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants';
import { Address } from '../types';
import { useAuth } from '../context/AuthContext';
import { useAddAddressMutation } from '../hooks/useAddAddressMutation';
import { useUpdateAddressMutation } from '../hooks/useUpdateAddressMutation';
import {
  buildAddressSubmitBody,
  getAddressFormValidationErrorKey,
  getAddressSaveSuccessMessage,
  resolveAddressSaveError,
} from '../services/addressApi';
import { useToast } from '../context/ToastContext';
import { useTranslation } from '../hooks/useTranslation';

const KAKAO_POSTCODE_HTML = `<!DOCTYPE html>
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
            bname: data.bname,
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

export interface AddNewAddressModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editingAddress?: Address | null;
}

const AddNewAddressModal: React.FC<AddNewAddressModalProps> = ({
  visible,
  onClose,
  onSuccess,
  editingAddress = null,
}) => {
  const { updateUser } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [saveIdChecked, setSaveIdChecked] = useState(true);
  const [isDefaultAddress, setIsDefaultAddress] = useState(false);
  const [showKakaoAddress, setShowKakaoAddress] = useState(false);
  const [addressType, setAddressType] = useState<'personal' | 'business'>('personal');

  const [recipient, setRecipient] = useState('');
  const [contact, setContact] = useState('');
  const [mainAddress, setMainAddress] = useState('');
  const [detailedAddress, setDetailedAddress] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [personalCustomsCode, setPersonalCustomsCode] = useState('');
  const [note, setNote] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);

  const showSaveError = useCallback(
    (error: unknown) => {
      const formatted = resolveAddressSaveError(error, t);
      setSaveError(formatted);
      showToast(formatted, 'error', 6000);
    },
    [showToast, t],
  );

  const clearSaveError = useCallback(() => {
    setSaveError(null);
  }, []);

  const mapApiAddresses = useCallback(
    (addresses: Array<Record<string, unknown>>) =>
      addresses.map((addr) => ({
        id: String(addr._id || addr.id || ''),
        type: (addr.customerClearanceType === 'business' ? 'work' : 'home') as 'home' | 'work' | 'other',
        name: String(addr.recipient || ''),
        street: String(addr.detailedAddress || ''),
        city: String(addr.mainAddress || ''),
        state: '',
        zipCode: String(addr.zipCode || ''),
        country: '',
        phone: String(addr.contact || ''),
        isDefault: Boolean(addr.defaultAddress),
        personalCustomsCode: String(addr.personalCustomsCode || ''),
        note: String(addr.note || ''),
        customerClearanceType: String(addr.customerClearanceType || 'individual'),
      })),
    [],
  );

  const resetForm = useCallback(() => {
    setRecipient('');
    setContact('');
    setMainAddress('');
    setDetailedAddress('');
    setZipCode('');
    setPersonalCustomsCode('');
    setNote('');
    setSaveIdChecked(true);
    setIsDefaultAddress(false);
    setAddressType('personal');
  }, []);

  const prefillFromAddress = useCallback((address: Address) => {
    setRecipient(address.name || '');
    setContact(address.phone || '');
    setMainAddress(address.city || '');
    setDetailedAddress(address.street || '');
    setZipCode(address.zipCode || '');
    setPersonalCustomsCode((address as Address & { personalCustomsCode?: string }).personalCustomsCode || '');
    setNote('');
    setSaveIdChecked(true);
    setIsDefaultAddress(address.isDefault || false);
    setAddressType(address.type === 'work' ? 'business' : 'personal');
  }, []);

  useEffect(() => {
    if (!visible) return;
    if (editingAddress) {
      prefillFromAddress(editingAddress);
    } else {
      resetForm();
    }
  }, [visible, editingAddress, prefillFromAddress, resetForm]);

  const handleClose = useCallback(() => {
    setShowKakaoAddress(false);
    setSaveError(null);
    onClose();
  }, [onClose]);

  const { mutate: addAddress, isLoading: isAdding } = useAddAddressMutation({
    skipProfileRefetch: true,
    onSuccess: (data) => {
      setSaveError(null);
      showToast(getAddressSaveSuccessMessage(false, t), 'success');
      if (data?.addresses) {
        updateUser({ addresses: mapApiAddresses(data.addresses as Array<Record<string, unknown>>) });
      }
      handleClose();
      onSuccess?.();
    },
    onError: (error) => {
      showSaveError(error || t('profile.addressModal.saveFailed'));
    },
  });

  const { mutate: updateAddress, isLoading: isUpdating } = useUpdateAddressMutation({
    skipProfileRefetch: true,
    onSuccess: (data) => {
      setSaveError(null);
      showToast(getAddressSaveSuccessMessage(true, t), 'success');
      if (data?.addresses) {
        updateUser({ addresses: mapApiAddresses(data.addresses as Array<Record<string, unknown>>) });
      }
      handleClose();
      onSuccess?.();
    },
    onError: (error) => {
      showSaveError(error || t('profile.addressModal.saveFailed'));
    },
  });

  const bindField = (setter: (value: string) => void) => (value: string) => {
    if (saveError) clearSaveError();
    setter(value);
  };

  const handleSaveAddress = () => {
    const validationKey = getAddressFormValidationErrorKey({
      mainAddress,
      detailedAddress,
      zipCode,
      recipient,
      contact,
      personalCustomsCode,
    });
    if (validationKey) {
      showSaveError(t(`profile.addressModal.${validationKey}`));
      return;
    }

    const detail = detailedAddress.trim();
    if (detail.length > 120) {
      showSaveError(t('profile.addressModal.detailAddressHelper'));
      return;
    }

    const addressData = buildAddressSubmitBody({
      addressType,
      recipient,
      contact,
      mainAddress,
      detailedAddress: detail,
      zipCode,
      personalCustomsCode,
      defaultAddress: isDefaultAddress,
      note,
    });

    if (editingAddress?.id) {
      updateAddress(editingAddress.id, addressData);
    } else {
      addAddress(addressData);
    }
  };

  const isSaving = isAdding || isUpdating;
  const modalTitle = editingAddress
    ? t('profile.addressModal.editTitle')
    : t('profile.addressModal.title');

  return (
    <>
      <Modal
      supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']}
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.addressModalCard}>
            <View style={styles.addressModalHeader}>
              <Text style={styles.addressModalTitle}>{modalTitle}</Text>
              <TouchableOpacity
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={handleClose}
              >
                <Icon name="close" size={20} color={COLORS.gray[600]} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.addressModalBody}
              contentContainerStyle={styles.addressModalBodyContent}
              showsVerticalScrollIndicator
            >
              <View style={styles.segmentRow}>
                {(['personal', 'business'] as const).map((type) => {
                  const active = addressType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[styles.segmentItem, active && styles.segmentItemActive]}
                      activeOpacity={0.7}
                      onPress={() => setAddressType(type)}
                      disabled={isSaving}
                    >
                      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                        {type === 'personal'
                          ? t('profile.addressModal.typePersonal')
                          : t('profile.addressModal.typeBusiness')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.customsNotice}>{t('profile.addressModal.customsNotice')}</Text>

              <Text style={styles.fieldLabel}>{t('profile.addressModal.currentDestination')}</Text>
              <TouchableOpacity style={styles.dropdownBox} activeOpacity={0.7}>
                <Text style={styles.dropdownText}>{t('profile.addressModal.countryKorea')}</Text>
                <Icon name="chevron-down" size={18} color={COLORS.gray[600]} />
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>{t('profile.addressModal.address')}</Text>
              <TouchableOpacity
                style={styles.searchAddressButton}
                activeOpacity={0.8}
                onPress={() => setShowKakaoAddress(true)}
                disabled={isSaving}
              >
                <Text style={styles.searchAddressButtonText}>
                  {t('profile.addressModal.searchAddress')}
                </Text>
              </TouchableOpacity>
              <TextInput
                style={[styles.input, styles.inputBoxSpacing]}
                placeholder={t('profile.addressModal.selectRegion')}
                placeholderTextColor={COLORS.gray[400]}
                value={mainAddress}
                onChangeText={bindField(setMainAddress)}
                editable={!isSaving}
              />

              <Text style={styles.fieldLabel}>
                <Text style={styles.requiredMark}>* </Text>
                {t('profile.addressModal.detailAddress')}:
              </Text>
              <TextInput
                style={styles.input}
                placeholder={t('profile.addressModal.detailAddressPlaceholder')}
                placeholderTextColor={COLORS.gray[400]}
                value={detailedAddress}
                onChangeText={bindField(setDetailedAddress)}
                maxLength={120}
                editable={!isSaving}
              />
              <Text style={styles.helperTextRed}>{t('profile.addressModal.detailAddressHelper')}</Text>

              <Text style={styles.fieldLabel}>
                <Text style={styles.requiredMark}>* </Text>
                {t('profile.addressModal.postalCode')}:
              </Text>
              <TextInput
                style={styles.input}
                placeholder={t('profile.addressModal.postalCodePlaceholder')}
                placeholderTextColor={COLORS.gray[400]}
                value={zipCode}
                onChangeText={bindField(setZipCode)}
                keyboardType="number-pad"
                editable={!isSaving}
              />

              <Text style={styles.fieldLabel}>{t('profile.addressModal.recipientName')}:</Text>
              <TextInput
                style={styles.input}
                placeholder={t('profile.addressModal.recipientNamePlaceholder')}
                placeholderTextColor={COLORS.gray[400]}
                value={recipient}
                onChangeText={bindField(setRecipient)}
                maxLength={25}
                editable={!isSaving}
              />

              <Text style={styles.fieldLabel}>{t('profile.addressModal.mobileNumber')}:</Text>
              <View style={styles.phoneRow}>
                <TouchableOpacity style={styles.phoneCodeBox} activeOpacity={0.7}>
                  <Text style={styles.phoneCodeText}>{t('profile.addressModal.phoneCode')}</Text>
                </TouchableOpacity>
                <TextInput
                  style={[styles.input, styles.phoneInput]}
                  placeholder={t('profile.addressModal.phonePlaceholder')}
                  placeholderTextColor={COLORS.gray[400]}
                  value={contact}
                  onChangeText={bindField(setContact)}
                  keyboardType="phone-pad"
                  editable={!isSaving}
                />
              </View>

              <Text style={styles.fieldLabel}>{t('profile.addressModal.customsCode')}:</Text>
              <TextInput
                style={styles.input}
                placeholder={t('profile.addressModal.customsCodePlaceholder')}
                placeholderTextColor={COLORS.gray[400]}
                value={personalCustomsCode}
                onChangeText={bindField(setPersonalCustomsCode)}
                editable={!isSaving}
              />
              <Text style={styles.helperTextRed}>{t('profile.addressModal.customsCodeHelper')}</Text>

              <TouchableOpacity
                style={styles.checkboxRow}
                activeOpacity={0.7}
                onPress={() => setSaveIdChecked(!saveIdChecked)}
              >
                <View style={[styles.checkboxSquare, saveIdChecked && styles.checkboxSquareChecked]}>
                  {saveIdChecked && <Icon name="checkmark" size={13} color={COLORS.white} />}
                </View>
                <Text style={styles.checkboxLabel}>{t('profile.addressModal.saveCustomsCode')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkboxRow}
                activeOpacity={0.7}
                onPress={() => setIsDefaultAddress(!isDefaultAddress)}
              >
                <View style={[styles.checkboxSquare, isDefaultAddress && styles.checkboxSquareChecked]}>
                  {isDefaultAddress && <Icon name="checkmark" size={13} color={COLORS.white} />}
                </View>
                <Text style={styles.checkboxLabel}>{t('profile.addressModal.setAsDefault')}</Text>
              </TouchableOpacity>
            </ScrollView>

            {saveError ? (
              <View style={styles.saveErrorBanner}>
                <Text style={styles.saveErrorText}>{saveError}</Text>
              </View>
            ) : null}

            <View style={styles.addressModalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                activeOpacity={0.7}
                onPress={handleClose}
                disabled={isSaving}
              >
                <Text style={styles.modalCancelButtonText}>{t('profile.addressModal.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                activeOpacity={0.85}
                onPress={handleSaveAddress}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.modalSaveButtonText}>{t('profile.addressModal.save')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
      supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']}
        visible={showKakaoAddress}
        transparent
        animationType="slide"
        onRequestClose={() => setShowKakaoAddress(false)}
      >
        <View style={styles.kakaoModalOverlay}>
          <View style={styles.kakaoModalContent}>
            <View style={styles.kakaoModalHeader}>
              <Text style={styles.kakaoModalTitle}>{t('profile.addressModal.searchAddress')}</Text>
              <TouchableOpacity onPress={() => setShowKakaoAddress(false)}>
                <Icon name="close" size={22} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>
            {showKakaoAddress && (
              <WebView
                key={`kakao-${showKakaoAddress}`}
                source={{ html: KAKAO_POSTCODE_HTML, baseUrl: 'https://postcode.map.daum.net' }}
                style={{ flex: 1 }}
                onMessage={(e) => {
                  try {
                    const data = JSON.parse(e.nativeEvent.data);
                    if (data.zonecode && data.roadAddress) {
                      setZipCode(data.zonecode);
                      const region = [data.sido, data.sigungu, data.bname].filter(Boolean).join(' ');
                      if (region) setMainAddress(region);
                      setDetailedAddress(data.roadAddress);
                      showToast(t('profile.addressModal.addressSelected'), 'success');
                      setTimeout(() => setShowKakaoAddress(false), 200);
                    } else {
                      showToast(t('profile.addressModal.addressIncomplete'), 'error');
                    }
                  } catch {
                    showToast(t('profile.addressModal.addressParseFailed'), 'error');
                  }
                }}
                javaScriptEnabled
                domStorageEnabled
                mixedContentMode="always"
                originWhitelist={['*']}
                allowsInlineMediaPlayback
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  addressModalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '88%',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
  },
  addressModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  addressModalTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  addressModalBody: {
    flexGrow: 0,
  },
  addressModalBodyContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.md,
  },
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray[100],
    borderRadius: BORDER_RADIUS.md,
    padding: 3,
  },
  segmentItem: {
    flex: 1,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.sm,
  },
  segmentItemActive: {
    backgroundColor: COLORS.white,
    ...SHADOWS.sm,
  },
  segmentText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.gray[500],
  },
  segmentTextActive: {
    color: COLORS.text.primary,
    fontWeight: '700',
  },
  customsNotice: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
    lineHeight: Math.round(FONTS.sizes.xs * 17 / 12),
    marginTop: SPACING.smmd,
  },
  fieldLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  requiredMark: {
    color: COLORS.red,
  },
  dropdownBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    height: 44,
  },
  dropdownText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    height: 44,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    backgroundColor: COLORS.white,
  },
  inputBoxSpacing: {
    marginTop: SPACING.sm,
  },
  searchAddressButton: {
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.lightRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchAddressButtonText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.red,
  },
  helperTextRed: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.red,
    marginTop: SPACING.xs,
    lineHeight: Math.round(FONTS.sizes.xs * 16 / 12),
  },
  phoneRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  phoneCodeBox: {
    minWidth: 130,
    height: 44,
    paddingHorizontal: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneCodeText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },
  phoneInput: {
    flex: 1,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[600],
    lineHeight: Math.round(FONTS.sizes.xs * 17 / 12),
  },
  saveErrorBanner: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#EF4444',
  },
  saveErrorText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    lineHeight: Math.round(FONTS.sizes.sm * 18 / 14),
  },
  addressModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  modalCancelButton: {
    paddingHorizontal: SPACING.lg,
    height: 42,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButtonText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[700],
    fontWeight: '600',
  },
  modalSaveButton: {
    minWidth: 72,
    paddingHorizontal: SPACING.lg,
    height: 42,
    backgroundColor: COLORS.text.primary,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveButtonText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    fontWeight: '700',
  },
  kakaoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  kakaoModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
  },
  kakaoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  kakaoModalTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  checkboxSquare: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.red,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSquareChecked: {
    backgroundColor: COLORS.red,
    borderColor: COLORS.red,
  },
});

export default AddNewAddressModal;
