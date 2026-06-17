import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from '../../../../components/Icon';
import EditIcon from '../../../../assets/icons/EditIcon';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants';
import { RootStackParamList, Address } from '../../../../types';
import { useAuth } from '../../../../context/AuthContext';
import { useAddAddressMutation } from '../../../../hooks/useAddAddressMutation';
import { useUpdateAddressMutation } from '../../../../hooks/useUpdateAddressMutation';
import {
  addressApi,
  buildAddressSubmitBody,
  getAddressFormValidationErrorKey,
  getAddressSaveSuccessMessage,
  resolveAddressSaveError,
} from '../../../../services/addressApi';
import { useToast } from '../../../../context/ToastContext';
import { useTranslation } from '../../../../hooks/useTranslation';

type AddressBookScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AddressBook'>;
type AddressBookScreenRouteProp = RouteProp<RootStackParamList, 'AddressBook'>;

type AddressBookScreenProps = {
  embedded?: boolean;
  fromShippingSettings?: boolean;
};

const AddressBookScreen: React.FC<AddressBookScreenProps> = ({
  embedded = false,
  fromShippingSettings: fromShippingSettingsProp,
}) => {
  const navigation = useNavigation<AddressBookScreenNavigationProp>();
  const route = useRoute<AddressBookScreenRouteProp>();
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [selectedAddressIds, setSelectedAddressIds] = useState<Set<string>>(new Set());
  const [isManagementMode, setIsManagementMode] = useState(false);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [saveIdChecked, setSaveIdChecked] = useState(true);
  const [isDefaultAddress, setIsDefaultAddress] = useState(false);
  const [showKakaoAddress, setShowKakaoAddress] = useState(false);
  const [addressType, setAddressType] = useState<'personal' | 'business'>('personal');
  
  // Form fields
  const [recipient, setRecipient] = useState('');
  const [contact, setContact] = useState('');
  const [mainAddress, setMainAddress] = useState('');
  const [detailedAddress, setDetailedAddress] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [personalCustomsCode, setPersonalCustomsCode] = useState('');
  const [note, setNote] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);

  const showSaveError = (error: unknown) => {
    const formatted = resolveAddressSaveError(error, t);
    setSaveError(formatted);
    showToast(formatted, 'error', 6000);
  };

  const fromShippingSettings =
    fromShippingSettingsProp ?? route.params?.fromShippingSettings ?? false;
  
  // Get addresses from saved user data
  const addresses = user?.addresses || [];
  
  // Check if all addresses are selected
  const allSelected = addresses.length > 0 && selectedAddressIds.size === addresses.length;
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
  // Add address mutation
  const { mutate: addAddress, isLoading: isAdding } = useAddAddressMutation({
    onSuccess: (data) => {
      setSaveError(null);
      showToast(getAddressSaveSuccessMessage(false, t), 'success');
      setAddressModalVisible(false);
      resetForm();
      // Update user context with new addresses
      if (data?.addresses) {
        const mappedAddresses = data.addresses.map((addr: any) => ({
          id: addr._id || addr.id || '',
          type: (addr.customerClearanceType === 'business' ? 'work' : 'home') as 'home' | 'work' | 'other',
          name: addr.recipient || '',
          street: addr.detailedAddress || '',
          city: addr.mainAddress || '',
          state: '',
          zipCode: addr.zipCode || '',
          country: '',
          phone: addr.contact || '',
          isDefault: addr.defaultAddress || false,
          personalCustomsCode: addr.personalCustomsCode || '',
          note: addr.note || '',
          customerClearanceType: addr.customerClearanceType || 'individual',
        }));
        updateUser({ addresses: mappedAddresses });
      }
    },
    onError: (error) => {
      showSaveError(error || t('profile.addressModal.saveFailed'));
    },
  });

  // Update address mutation
  const { mutate: updateAddress, isLoading: isUpdating } = useUpdateAddressMutation({
    onSuccess: (data) => {
      setSaveError(null);
      showToast(getAddressSaveSuccessMessage(true, t), 'success');
      setAddressModalVisible(false);
      resetForm();
      // Update user context with new addresses
      if (data?.addresses) {
        const mappedAddresses = data.addresses.map((addr: any) => ({
          id: addr._id || addr.id || '',
          type: (addr.customerClearanceType === 'business' ? 'work' : 'home') as 'home' | 'work' | 'other',
          name: addr.recipient || '',
          street: addr.detailedAddress || '',
          city: addr.mainAddress || '',
          state: '',
          zipCode: addr.zipCode || '',
          country: '',
          phone: addr.contact || '',
          isDefault: addr.defaultAddress || false,
          personalCustomsCode: addr.personalCustomsCode || '',
          note: addr.note || '',
          customerClearanceType: addr.customerClearanceType || 'individual',
        }));
        updateUser({ addresses: mappedAddresses });
      }
    },
    onError: (error) => {
      showSaveError(error || t('profile.addressModal.saveFailed'));
    },
  });

  const resetForm = () => {
    setRecipient('');
    setContact('');
    setMainAddress('');
    setDetailedAddress('');
    setZipCode('');
    setPersonalCustomsCode('');
    setNote('');
    setSaveIdChecked(true);
    setIsDefaultAddress(false);
    setEditingAddress(null);
    setAddressType('personal');
    setSaveError(null);
  };

  const handleAddAddress = () => {
    resetForm();
    setAddressModalVisible(true);
  };

  const handleEditAddress = (address: Address) => {
    setEditingAddress(address);
    // Pre-fill form with existing address data
    setRecipient(address.name || '');
    setContact(address.phone || '');
    setMainAddress(address.city || '');
    setDetailedAddress(address.street || '');
    setZipCode(address.zipCode || '');
    setPersonalCustomsCode((address as any).personalCustomsCode || ''); // Not stored in Address type
    setNote('');
    setSaveIdChecked(true);
    setIsDefaultAddress(address.isDefault || false);
    setAddressType(address.type === 'work' ? 'business' : 'personal');
    setAddressModalVisible(true);
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

    if (editingAddress && editingAddress.id) {
      // Update existing address
      updateAddress(editingAddress.id, addressData);
    } else {
      // Add new address
      addAddress(addressData);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await addressApi.deleteAddress(addressId);
              if (response.success) {
                showToast('Address deleted successfully', 'success');
                // Update user context by removing the deleted address
                const remainingAddresses = addresses.filter(addr => addr.id !== addressId);
                updateUser({ addresses: remainingAddresses });
              } else {
                showToast(response.error || 'Failed to delete address', 'error');
              }
            } catch (error) {
              console.error('Delete address error:', error);
              showToast('Failed to delete address', 'error');
            }
          },
        },
      ]
    );
  };

  const handleToggleAddress = (addressId: string) => {
    setSelectedAddressIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(addressId)) {
        newSet.delete(addressId);
      } else {
        newSet.add(addressId);
      }
      return newSet;
    });
  };

  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedAddressIds(new Set());
    } else {
      setSelectedAddressIds(new Set(addresses.map(addr => addr.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedAddressIds.size === 0) {
      Alert.alert('No Selection', 'Please select addresses to delete');
      return;
    }

    Alert.alert(
      'Delete Addresses',
      `Are you sure you want to delete ${selectedAddressIds.size} address${selectedAddressIds.size > 1 ? 'es' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete each selected address
              const deletePromises = Array.from(selectedAddressIds).map(addressId =>
                addressApi.deleteAddress(addressId)
              );

              const results = await Promise.all(deletePromises);

              // Check if all deletions were successful
              const failedDeletes = results.filter(result => !result.success);
              if (failedDeletes.length > 0) {
                showToast(`Failed to delete ${failedDeletes.length} address(es)`, 'error');
              } else {
                showToast(`${selectedAddressIds.size} address(es) deleted successfully`, 'success');
              }

              // Update user context by removing deleted addresses
              const remainingAddresses = addresses.filter(addr => !selectedAddressIds.has(addr.id));
              updateUser({ addresses: remainingAddresses });

              setSelectedAddressIds(new Set());
            } catch (error) {
              console.error('Batch delete error:', error);
              showToast('Failed to delete addresses', 'error');
            }
          },
        },
      ]
    );
  };

  const renderHeader = () => (
    <View style={[styles.header, embedded && styles.embeddedHeader]}>
      {!embedded && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={20} color={COLORS.text.primary} />
        </TouchableOpacity>
      )}
      <Text style={[styles.headerTitle, embedded && styles.embeddedHeaderTitle]}>
        {t('profile.receivingAddress')}
      </Text>
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.headerIconButton}>
          {/* <Icon name="search" size={24} color={COLORS.text.primary} /> */}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setIsManagementMode(!isManagementMode)}>
          <Text style={styles.managementText}>
            {isManagementMode ? t('profile.done') : t('profile.management')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.headerIconButton}
          onPress={handleAddAddress}
        >
          <Icon name="add" size={20} color={COLORS.text.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAddressItem = ({ item }: { item: Address }) => {
    const isDefault = item.isDefault;
    const isSelected = selectedAddressIds.has(item.id);
    
    return (
      <View style={[styles.addressCard, isDefault && {backgroundColor: COLORS.lightRed}]}>
        <View style={styles.addressContent}>
          {isManagementMode && (
            <TouchableOpacity 
              style={styles.checkboxContainer}
              onPress={() => handleToggleAddress(item.id)}
            >
              <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                {isSelected && (
                  <Icon name="checkmark" size={16} color={COLORS.white} />
                )}
              </View>
            </TouchableOpacity>
          )}
          <View style={styles.addressTextContainer}>
            <Text style={styles.addressFullText}>
              {item.street || ''}{item.zipCode ? `, ${item.zipCode}` : ''}{item.city ? `, ${item.city}` : ''}
            </Text>
            <Text style={styles.addressContactText}>
              {item.name || user?.name || 'Unnamed'} {item.phone || ''}
            </Text>
            {isDefault ? (
              <View style={styles.defaultBadgeContainer}>
                {isManagementMode && (<Icon name="checkmark-circle" size={16} color={COLORS.red} />)}
                <Text style={styles.defaultBadge}>{t('profile.defaultAddressBadge')}</Text>
              </View>
            ) : (
              isManagementMode && (
                <View style={styles.defaultBadgeContainer}>
                  <View style={styles.defaultCheckboxEmpty} />
                  <Text style={styles.defaultBadgeGray}>{t('profile.defaultAddressBadge')}</Text>
                </View>
              )
            )}
          </View>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => handleEditAddress(item)}
            activeOpacity={0.7}
          >
            <EditIcon width={24} height={24} color={COLORS.text.primary} />
          </TouchableOpacity>
        </View>
        {isManagementMode && (
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => handleDeleteAddress(item.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteButtonText}>{t('profile.addressDelete')}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderAddressModal = () => (
    <Modal
      supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']}
      visible={addressModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setAddressModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.addressModalCard}>
          {/* Header */}
          <View style={styles.addressModalHeader}>
            <Text style={styles.addressModalTitle}>
              {t('profile.addressModal.title')}
            </Text>
            <TouchableOpacity
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => setAddressModalVisible(false)}
            >
              <Icon name="close" size={20} color={COLORS.gray[600]} />
            </TouchableOpacity>
          </View>

          {/* Scrollable body */}
          <ScrollView
            style={styles.addressModalBody}
            contentContainerStyle={styles.addressModalBodyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Personal / Business segmented tabs */}
            <View style={styles.segmentRow}>
              {(['personal', 'business'] as const).map((type) => {
                const active = addressType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.segmentItem, active && styles.segmentItemActive]}
                    activeOpacity={0.7}
                    onPress={() => setAddressType(type)}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        active && styles.segmentTextActive,
                      ]}
                    >
                      {type === 'personal'
                        ? t('profile.addressModal.typePersonal')
                        : t('profile.addressModal.typeBusiness')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Customs notice */}
            <Text style={styles.customsNotice}>
              {t('profile.addressModal.customsNotice')}
            </Text>

            {/* Current destination */}
            <Text style={styles.fieldLabel}>
              {t('profile.addressModal.currentDestination')}
            </Text>
            <TouchableOpacity style={styles.dropdownBox} activeOpacity={0.7}>
              <Text style={styles.dropdownText}>
                {t('profile.addressModal.countryKorea')}
              </Text>
              <Icon name="chevron-down" size={18} color={COLORS.gray[600]} />
            </TouchableOpacity>

            {/* Address */}
            <Text style={styles.fieldLabel}>
              <Text style={styles.requiredMark}>* </Text>
              {t('profile.addressModal.address')}
            </Text>
            <TouchableOpacity
              style={styles.searchAddressButton}
              activeOpacity={0.8}
              onPress={() => setShowKakaoAddress(true)}
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
              onChangeText={setMainAddress}
              editable={!isAdding && !isUpdating}
            />

            {/* Detail address */}
            <Text style={styles.fieldLabel}>
              <Text style={styles.requiredMark}>* </Text>
              {t('profile.addressModal.detailAddress')}:
            </Text>
            <TextInput
              style={styles.input}
              placeholder={t('profile.addressModal.detailAddressPlaceholder')}
              placeholderTextColor={COLORS.gray[400]}
              value={detailedAddress}
              onChangeText={setDetailedAddress}
              maxLength={120}
            />
            <Text style={styles.helperTextRed}>
              {t('profile.addressModal.detailAddressHelper')}
            </Text>

            {/* Postal code */}
            <Text style={styles.fieldLabel}>
              <Text style={styles.requiredMark}>* </Text>
              {t('profile.addressModal.postalCode')}:
            </Text>
            <TextInput
              style={styles.input}
              placeholder={t('profile.addressModal.postalCodePlaceholder')}
              placeholderTextColor={COLORS.gray[400]}
              value={zipCode}
              onChangeText={setZipCode}
              keyboardType="number-pad"
            />

            {/* Recipient name */}
            <Text style={styles.fieldLabel}>
              <Text style={styles.requiredMark}>* </Text>
              {t('profile.addressModal.recipientName')}:
            </Text>
            <TextInput
              style={styles.input}
              placeholderTextColor={COLORS.gray[400]}
              value={recipient}
              onChangeText={setRecipient}
              maxLength={25}
            />

            {/* Mobile number */}
            <Text style={styles.fieldLabel}>
              <Text style={styles.requiredMark}>* </Text>
              {t('profile.addressModal.mobileNumber')}:
            </Text>
            <View style={styles.phoneRow}>
              <TouchableOpacity style={styles.phoneCodeBox} activeOpacity={0.7}>
                <Text style={styles.phoneCodeText}>
                  {t('profile.addressModal.phoneCode')}
                </Text>
              </TouchableOpacity>
              <TextInput
                style={[styles.input, styles.phoneInput]}
                placeholderTextColor={COLORS.gray[400]}
                value={contact}
                onChangeText={setContact}
                keyboardType="phone-pad"
              />
            </View>

            {/* Customs code */}
            <Text style={styles.fieldLabel}>
              <Text style={styles.requiredMark}>* </Text>
              {t('profile.addressModal.customsCode')}:
            </Text>
            <TextInput
              style={styles.input}
              placeholder={t('profile.addressModal.customsCodePlaceholder')}
              placeholderTextColor={COLORS.gray[400]}
              value={personalCustomsCode}
              onChangeText={setPersonalCustomsCode}
            />
            <Text style={styles.helperTextRed}>
              {t('profile.addressModal.customsCodeHelper')}
            </Text>

            {/* Save customs code checkbox */}
            <TouchableOpacity
              style={styles.checkboxRow}
              activeOpacity={0.7}
              onPress={() => setSaveIdChecked(!saveIdChecked)}
            >
              <View
                style={[
                  styles.checkboxSquare,
                  saveIdChecked && styles.checkboxSquareChecked,
                ]}
              >
                {saveIdChecked && (
                  <Icon name="checkmark" size={13} color={COLORS.white} />
                )}
              </View>
              <Text style={styles.checkboxLabel}>
                {t('profile.addressModal.saveCustomsCode')}
              </Text>
            </TouchableOpacity>

            {/* Set as default checkbox */}
            <TouchableOpacity
              style={styles.checkboxRow}
              activeOpacity={0.7}
              onPress={() => setIsDefaultAddress(!isDefaultAddress)}
            >
              <View
                style={[
                  styles.checkboxSquare,
                  isDefaultAddress && styles.checkboxSquareChecked,
                ]}
              >
                {isDefaultAddress && (
                  <Icon name="checkmark" size={13} color={COLORS.white} />
                )}
              </View>
              <Text style={styles.checkboxLabel}>
                {t('profile.addressModal.setAsDefault')}
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {saveError ? (
            <View style={styles.saveErrorBanner}>
              <Text style={styles.saveErrorText}>{saveError}</Text>
            </View>
          ) : null}

          {/* Fixed footer */}
          <View style={styles.addressModalFooter}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              activeOpacity={0.7}
              onPress={() => {
                setSaveError(null);
                setAddressModalVisible(false);
              }}
            >
              <Text style={styles.modalCancelButtonText}>
                {t('profile.addressModal.cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalSaveButton}
              activeOpacity={0.85}
              onPress={handleSaveAddress}
              disabled={isAdding || isUpdating}
            >
              {isAdding || isUpdating ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.modalSaveButtonText}>
                  {t('profile.addressModal.save')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const content = (
    <>
      {renderHeader()}

      <ScrollView
        style={[styles.scrollView, embedded && styles.embeddedScrollView]}
        contentContainerStyle={embedded ? styles.embeddedScrollContent : undefined}
        showsVerticalScrollIndicator={false}
      >
        <FlatList
          data={addresses}
          renderItem={renderAddressItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.addressListContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('profile.noAddresses')}</Text>
              <Text style={styles.emptySubtext}>{t('profile.noAddressesSubtext')}</Text>
            </View>
          }
        />
      </ScrollView>

      {isManagementMode && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.selectAllButton}
            onPress={handleToggleAll}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, allSelected && styles.checkboxSelected]}>
              {allSelected && (
                <Icon name="checkmark" size={16} color={COLORS.white} />
              )}
            </View>
            <Text style={styles.selectAllText}>{t('profile.addressSelectAll')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.deleteAllButton}
            onPress={handleDeleteSelected}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteAllButtonText}>{t('profile.addressDelete')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {renderAddressModal()}

      {/* Kakao Address Search WebView */}
      <Modal
      supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']} visible={showKakaoAddress} transparent animationType="slide" onRequestClose={() => setShowKakaoAddress(false)}>
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
                source={{ html: kakaoPostcodeHtml, baseUrl: 'https://postcode.map.daum.net' }}
                style={{ flex: 1 }}
                onMessage={(e) => {
                  try {
                    const data = JSON.parse(e.nativeEvent.data);
                    console.log('Kakao address data received:', data);
                    
                    if (data.zonecode && data.roadAddress) {
                      setZipCode(data.zonecode);
                      const region = [data.sido, data.sigungu, data.bname]
                        .filter(Boolean)
                        .join(' ');
                      if (region) {
                        setMainAddress(region);
                      }
                      setDetailedAddress(data.roadAddress);
                      
                      showToast('Address selected successfully', 'success');
                      
                      // Close modal with a small delay to ensure state updates
                      setTimeout(() => {
                        setShowKakaoAddress(false);
                      }, 200);
                    } else {
                      console.warn('Incomplete address data:', data);
                      showToast('Please select a complete address', 'error');
                    }
                  } catch (err) {
                    console.error('Error parsing Kakao address data:', err);
                    showToast('Failed to parse address data', 'error');
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

  if (embedded) {
    return <View style={styles.embeddedContainer}>{content}</View>;
  }

  return <SafeAreaView style={styles.container}>{content}</SafeAreaView>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  embeddedContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  embeddedHeader: {
    paddingTop: SPACING.sm,
    borderBottomWidth: 0,
  },
  embeddedHeaderTitle: {
    flex: 1,
    textAlign: 'left',
    marginLeft: 0,
  },
  embeddedScrollView: {
    flex: 1,
  },
  embeddedScrollContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
    flex: 1,
    marginLeft: SPACING.sm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerIconButton: {
    padding: SPACING.xs,
  },
  managementText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '400',
  },
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  addressListContent: {
    // paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.xl,
  },
  addressCard: {
    backgroundColor: COLORS.white,
    marginBottom: SPACING.sm,
    // borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  addressContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  checkboxContainer: {
    paddingTop: SPACING.xs,
    paddingRight: SPACING.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.gray[300],
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: COLORS.red,
    borderColor: COLORS.red,
  },
  addressTextContainer: {
    flex: 1,
    marginRight: SPACING.md,
  },
  addressFullText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    lineHeight: Math.round(FONTS.sizes.md * 22 / 16),
    marginBottom: SPACING.sm,
    fontWeight: '400',
  },
  addressContactText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.gray[500],
    marginBottom: SPACING.sm,
    fontWeight: '400',
  },
  defaultBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  defaultBadge: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.red,
    fontWeight: '600',
  },
  defaultBadgeGray: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[400],
    fontWeight: '400',
  },
  defaultCheckboxEmpty: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.gray[300],
    backgroundColor: COLORS.white,
  },
  editButton: {
    padding: SPACING.xs,
  },
  deleteButton: {
    alignSelf: 'flex-end',
    marginTop: SPACING.sm,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
  },
  deleteButtonText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    fontWeight: '400',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONTS.sizes.base,
    color: COLORS.text.secondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyText: {
    fontSize: FONTS.sizes.lg,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  emptySubtext: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
    ...SHADOWS.lg,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  selectAllText: {
    fontSize: FONTS.sizes.lg,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  deleteAllButton: {
    backgroundColor: COLORS.red,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  deleteAllButtonText: {
    fontSize: FONTS.sizes.lg,
    color: COLORS.white,
    fontWeight: '700',
  },
  // Address Modal Styles
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
  // Segmented tabs
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
  // Fields
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
  inputBox: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    height: 44,
    justifyContent: 'center',
  },
  inputBoxSpacing: {
    marginTop: SPACING.sm,
  },
  inputPlaceholderStatic: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[400],
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
  // Footer
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

export default AddressBookScreen;