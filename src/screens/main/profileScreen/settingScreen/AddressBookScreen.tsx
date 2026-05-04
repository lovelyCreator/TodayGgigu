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
import { addressApi } from '../../../../services/addressApi';
import { useToast } from '../../../../context/ToastContext';

type AddressBookScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AddressBook'>;
type AddressBookScreenRouteProp = RouteProp<RootStackParamList, 'AddressBook'>;

const AddressBookScreen: React.FC = () => {
  const navigation = useNavigation<AddressBookScreenNavigationProp>();
  const route = useRoute<AddressBookScreenRouteProp>();
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  
  const [selectedAddressIds, setSelectedAddressIds] = useState<Set<string>>(new Set());
  const [isManagementMode, setIsManagementMode] = useState(false);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [saveIdChecked, setSaveIdChecked] = useState(false);
  const [isDefaultAddress, setIsDefaultAddress] = useState(false);
  const [showKakaoAddress, setShowKakaoAddress] = useState(false);
  
  // Form fields
  const [recipient, setRecipient] = useState('');
  const [contact, setContact] = useState('');
  const [detailedAddress, setDetailedAddress] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [personalCustomsCode, setPersonalCustomsCode] = useState('');
  const [note, setNote] = useState('');
  
  // Check if we came from shipping settings
  const fromShippingSettings = route.params?.fromShippingSettings || false;
  
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
      showToast('Address added successfully', 'success');
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
      showToast(error || 'Failed to add address', 'error');
    },
  });

  // Update address mutation
  const { mutate: updateAddress, isLoading: isUpdating } = useUpdateAddressMutation({
    onSuccess: (data) => {
      showToast('Address updated successfully', 'success');
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
      showToast(error || 'Failed to update address', 'error');
    },
  });

  const resetForm = () => {
    setRecipient('');
    setContact('');
    setDetailedAddress('');
    setZipCode('');
    setPersonalCustomsCode('');
    setNote('');
    setSaveIdChecked(false);
    setIsDefaultAddress(false);
    setEditingAddress(null);
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
    setDetailedAddress(address.street || '');
    setZipCode(address.zipCode || '');
    setPersonalCustomsCode(''); // Not stored in Address type
    setNote('');
    setSaveIdChecked(false);
    setIsDefaultAddress(address.isDefault || false);
    setAddressModalVisible(true);
  };

  const handleSaveAddress = () => {
    // Validation
    if (!recipient.trim()) {
      showToast('Please enter recipient name', 'error');
      return;
    }
    if (!contact.trim()) {
      showToast('Please enter contact number', 'error');
      return;
    }
    if (!detailedAddress.trim()) {
      showToast('Please enter detailed address', 'error');
      return;
    }
    if (!zipCode.trim()) {
      showToast('Please enter postal code', 'error');
      return;
    }

    const addressData = {
      customerClearanceType: 'individual',
      recipient: recipient.trim(),
      contact: contact.trim(),
      personalCustomsCode: personalCustomsCode.trim(),
      detailedAddress: detailedAddress.trim(),
      zipCode: zipCode.trim(),
      defaultAddress: isDefaultAddress,
      note: note.trim() || undefined,
    };

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
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Icon name="arrow-back" size={20} color={COLORS.text.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Shipping address</Text>
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.headerIconButton}>
          {/* <Icon name="search" size={24} color={COLORS.text.primary} /> */}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setIsManagementMode(!isManagementMode)}>
          <Text style={styles.managementText}>
            {isManagementMode ? 'Exit' : 'Management'}
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
                <Text style={styles.defaultBadge}>Default</Text>
              </View>
            ) : (
              isManagementMode && (
                <View style={styles.defaultBadgeContainer}>
                  <View style={styles.defaultCheckboxEmpty} />
                  <Text style={styles.defaultBadgeGray}>Default</Text>
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
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderAddressModal = () => (
    <Modal
      visible={addressModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setAddressModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.addressModalContent}>
          <View style={styles.addressModalHeader}>
            <Text style={styles.addressModalTitle}>{editingAddress ? 'Edit address' : 'New address'}</Text>
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
              <TouchableOpacity style={styles.defaultCheckboxRow} onPress={() => setIsDefaultAddress(!isDefaultAddress)}>
                <Text style={styles.defaultText}>Default</Text>
                <View style={[styles.checkboxSquare, isDefaultAddress && styles.checkboxSquareChecked]}>
                  {isDefaultAddress && <Icon name="checkmark" size={16} color={COLORS.white} />}
                </View>
              </TouchableOpacity>
            </View>

            <Text style={styles.addressModalLabel}><Text style={styles.addressModalRequired}>* </Text>Address information:</Text>
            <TouchableOpacity style={styles.addressSearchBtn} onPress={() => setShowKakaoAddress(true)}>
              <Icon name="search" size={16} color={COLORS.white} />
              <Text style={styles.addressSearchBtnText}>Search Address (Kakao)</Text>
            </TouchableOpacity>

            <Text style={styles.addressModalLabel}><Text style={styles.addressModalRequired}>* </Text>Postal code:</Text>
            <TextInput
              style={styles.addressModalInput}
              placeholder="e.g. 06000"
              placeholderTextColor={COLORS.gray[400]}
              value={zipCode}
              onChangeText={setZipCode}
              keyboardType="number-pad"
            />

            <Text style={styles.addressModalLabel}><Text style={styles.addressModalRequired}>* </Text>Detail address:</Text>
            <TextInput
              style={styles.addressModalInput}
              placeholder="Search address above or enter manually"
              placeholderTextColor={COLORS.gray[400]}
              value={detailedAddress}
              onChangeText={setDetailedAddress}
            />

            <Text style={styles.addressModalLabel}><Text style={styles.addressModalRequired}>* </Text>Recipient name:</Text>
            <TextInput
              style={styles.addressModalInput}
              placeholder="Up to 25 characters"
              placeholderTextColor={COLORS.gray[400]}
              value={recipient}
              onChangeText={setRecipient}
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
                value={contact}
                onChangeText={setContact}
                keyboardType="phone-pad"
              />
            </View>

            <Text style={styles.addressModalLabel}><Text style={styles.addressModalRequired}>* </Text>Customs clearance code:</Text>
            <TextInput
              style={styles.addressModalInput}
              placeholder="Please enter the customs clearance code"
              placeholderTextColor={COLORS.gray[400]}
              value={personalCustomsCode}
              onChangeText={setPersonalCustomsCode}
            />

            <TouchableOpacity
              style={styles.addressModalSaveButton}
              onPress={handleSaveAddress}
            >
              {(isAdding || isUpdating) ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.addressModalSaveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <FlatList
          data={addresses}
          renderItem={renderAddressItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.addressListContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No addresses found</Text>
              <Text style={styles.emptySubtext}>Add a new address to get started</Text>
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
            <Text style={styles.selectAllText}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.deleteAllButton}
            onPress={handleDeleteSelected}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteAllButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}

      {renderAddressModal()}

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
    paddingVertical: SPACING.md * 2,
    paddingTop: SPACING['2xl'] * 2,
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
    lineHeight: 22,
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  addressModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '90%',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  addressModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  addressModalTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  addressModalLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  addressModalRequired: {
    color: COLORS.red,
  },
  addressSearchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.red,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    alignSelf: 'flex-start',
    marginBottom: SPACING.sm,
  },
  addressSearchBtnText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    fontWeight: '600',
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
  addressModalRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  addressModalDropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.gray[50],
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  addressModalDropdownText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    fontWeight: "400",
  },
  defaultCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  defaultText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  addressModalInput: {
    backgroundColor: COLORS.gray[50],
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
  },
  addressModalTextArea: {
    backgroundColor: COLORS.gray[50],
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  addressModalPhoneRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  addressModalPhoneCode: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.gray[50],
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    minWidth: 120,
  },
  addressModalCheckbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: SPACING.md,
    gap: SPACING.sm,
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
  addressModalCheckboxText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[600],
    lineHeight: 18,
  },
  addressModalSaveButton: {
    backgroundColor: COLORS.red,
    paddingVertical: SPACING.smmd,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    marginTop: SPACING.lg,
    // marginBottom: SPACING.md,
  },
  addressModalSaveButtonDisabled: {
    backgroundColor: COLORS.gray[300],
    opacity: 0.6,
  },
  addressModalSaveButtonText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default AddressBookScreen;