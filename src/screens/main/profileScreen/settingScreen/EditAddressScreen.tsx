import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../../../../components/Icon';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants';
import { RootStackParamList, Address, CustomSwitchProps } from '../../../../types';
import { useAuth } from '../../../../context/AuthContext';
import { useUpdateAddressMutation } from '../../../../hooks/useUpdateAddressMutation';
import { buildAddressSubmitBody } from '../../../../services/addressApi';
import { useDeleteAddressMutation } from '../../../../hooks/useDeleteAddressMutation';

type EditAddressScreenNavigationProp = StackNavigationProp<RootStackParamList, 'EditAddress'>;
type EditAddressScreenRouteProp = RouteProp<RootStackParamList, 'EditAddress'>;

const EditAddressScreen: React.FC = () => {
  const navigation = useNavigation<EditAddressScreenNavigationProp>();
  const route = useRoute<EditAddressScreenRouteProp>();
  const fromShippingSettings = route.params?.fromShippingSettings || false;
  const { address } = route.params;
  const { user, updateUser } = useAuth();
  
  const [formData, setFormData] = useState({
    recipient: (address as any).name || address.street || '',
    contact: address.phone || '',
    personalCustomsCode: (address as any).personalCustomsCode || '',
    detailedAddress: address.street || '',
    zipCode: address.zipCode || '',
    note: (address as any).note || '',
  });
  const [isPrimary, setIsPrimary] = useState(address.isDefault || false);
  const [isStoreAddress, setIsStoreAddress] = useState((address as any).isStoreAddress || false);
  
  const {
    mutate: updateAddress,
    isLoading: isUpdating,
    isError: isUpdateError,
    error: updateError,
    isSuccess: isUpdateSuccess,
  } = useUpdateAddressMutation({
    onSuccess: (data) => {
      // Update the address in saved addresses array
      if (data?.addresses && data.addresses.length > 0) {
        const updatedAddressFromApi = data.addresses.find(addr => addr._id === address.id);
        
        if (updatedAddressFromApi) {
          // Convert API address to Address type
          const updatedAddress: Address & { personalCustomsCode?: string; note?: string; customerClearanceType?: string } = {
            id: updatedAddressFromApi._id,
            type: updatedAddressFromApi.customerClearanceType === 'business' ? 'work' : 'home',
            name: updatedAddressFromApi.recipient || '',
            street: updatedAddressFromApi.detailedAddress || '',
            city: updatedAddressFromApi.mainAddress || '',
            state: '',
            zipCode: updatedAddressFromApi.zipCode || '',
            country: '',
            phone: updatedAddressFromApi.contact || '',
            isDefault: updatedAddressFromApi.defaultAddress || false,
            personalCustomsCode: updatedAddressFromApi.personalCustomsCode || '',
            note: updatedAddressFromApi.note || '',
            customerClearanceType: updatedAddressFromApi.customerClearanceType || 'individual',
          };
          
          // Update in saved addresses
          const currentAddresses = user?.addresses || [];
          const updatedAddresses = currentAddresses.map(addr => 
            addr.id === address.id ? updatedAddress : addr
          );
          updateUser({ addresses: updatedAddresses });
        }
      }
      
      Alert.alert('Success', 'Address updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (errorMessage) => {
      Alert.alert('Error', errorMessage);
    },
  });
  
  const {
    mutate: deleteAddress,
    isLoading: isDeleting,
    isError: isDeleteError,
    error: deleteError,
    isSuccess: isDeleteSuccess,
  } = useDeleteAddressMutation({
    onSuccess: () => {
      // Remove address from saved addresses array
      const currentAddresses = user?.addresses || [];
      const updatedAddresses = currentAddresses.filter(addr => addr.id !== address.id);
      updateUser({ addresses: updatedAddresses });
      
      Alert.alert('Success', 'Address deleted successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (errorMessage) => {
      Alert.alert('Error', errorMessage);
    },
  });

  const handleSaveAddress = () => {
    const detail = formData.detailedAddress.trim();
    if (!detail || detail.length < 2) {
      Alert.alert('Missing Information', 'Please enter detailed address (at least 2 characters).');
      return;
    }

    const addressData = buildAddressSubmitBody({
      addressType: isStoreAddress ? 'business' : 'personal',
      recipient: formData.recipient,
      contact: formData.contact,
      mainAddress: '',
      detailedAddress: detail,
      zipCode: formData.zipCode,
      personalCustomsCode: formData.personalCustomsCode,
      defaultAddress: isPrimary,
      note: formData.note,
    });

    // Call the update address mutation
    updateAddress(address.id, addressData);
  };

  const handleDeleteAddress = () => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Call the delete address mutation
            deleteAddress(address.id);
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (isUpdateSuccess || isDeleteSuccess) {
      // Navigation is handled in onSuccess callbacks
    }
  }, [isUpdateSuccess, isDeleteSuccess]);

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Icon name="arrow-back" size={24} color={COLORS.text.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Edit Address</Text>
      <TouchableOpacity
        style={styles.deleteButtonHeader}
        onPress={handleDeleteAddress}
        disabled={isUpdating || isDeleting}
      >
        {isDeleting ? (
          <ActivityIndicator size="small" color={COLORS.error} />
        ) : (
          <Icon name="trash-outline" size={24} color={COLORS.error} />
        )}
      </TouchableOpacity>
    </View>
  );
  
  const CustomSwitch: React.FC<CustomSwitchProps> = ({
    value,
    onChange,
    activeColor = "#ff007f",
    inactiveColor = "#ccc",
    style,
  }) => {
    const [animation] = useState(new Animated.Value(value ? 1 : 0));

    useEffect(() => {
      Animated.timing(animation, {
        toValue: value ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }, [value]);

    const interpolateBackground = animation.interpolate({
      inputRange: [0, 1],
      outputRange: [inactiveColor, activeColor],
    });

    const translateX = animation.interpolate({
      inputRange: [0, 1],
      outputRange: [2, 22],
    });

    const toggleSwitch = () => {
      onChange(!value);
    };

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={toggleSwitch}
        style={style}
        disabled={isUpdating || isDeleting}
      >
        <Animated.View
          style={[
            styles.switchBackground,
            { backgroundColor: interpolateBackground },
          ]}
        >
          <Animated.View
            style={[
              styles.circle,
              { transform: [{ translateX }] },
            ]}
          />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Recipient<Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              value={formData.recipient}
              onChangeText={(text) => setFormData(prev => ({ ...prev, recipient: text }))}
              placeholder="Enter recipient name"
              placeholderTextColor={COLORS.gray[400]}
              editable={!isUpdating && !isDeleting}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Contact Number<Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              value={formData.contact}
              onChangeText={(text) => setFormData(prev => ({ ...prev, contact: text }))}
              placeholder="Enter your phone number"
              placeholderTextColor={COLORS.gray[400]}
              keyboardType="phone-pad"
              editable={!isUpdating && !isDeleting}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Detailed Address<Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              value={formData.detailedAddress}
              onChangeText={(text) => setFormData(prev => ({ ...prev, detailedAddress: text }))}
              placeholder="Enter detailed address"
              placeholderTextColor={COLORS.gray[400]}
              editable={!isUpdating && !isDeleting}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Postal Code<Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              value={formData.zipCode}
              onChangeText={(text) => setFormData(prev => ({ ...prev, zipCode: text }))}
              placeholder="Enter postal code"
              placeholderTextColor={COLORS.gray[400]}
              keyboardType="numeric"
              editable={!isUpdating && !isDeleting}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Personal Customs Code<Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              value={formData.personalCustomsCode}
              onChangeText={(text) => setFormData(prev => ({ ...prev, personalCustomsCode: text }))}
              placeholder="Enter personal customs code"
              placeholderTextColor={COLORS.gray[400]}
              editable={!isUpdating && !isDeleting}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Note</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={formData.note}
              onChangeText={(text) => setFormData(prev => ({ ...prev, note: text }))}
              placeholder="Enter delivery note"
              placeholderTextColor={COLORS.gray[400]}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!isUpdating && !isDeleting}
            />
          </View>

          <TouchableOpacity 
            style={styles.primaryAddressContainer}
            onPress={() => setIsPrimary(!isPrimary)}
            activeOpacity={0.7}
            disabled={isUpdating || isDeleting}
          >
            <View style={styles.primaryAddressRow}>
              <Text style={styles.primaryAddressText}>Set as Primary Address</Text>
              <View style={styles.checkbox}>
                <CustomSwitch
                  value={isPrimary}
                  onChange={setIsPrimary}
                  activeColor={COLORS.red}
                  inactiveColor={COLORS.gray[300]}
                />
              </View>
            </View>
          </TouchableOpacity>
          
          {fromShippingSettings && (
            <TouchableOpacity 
              style={styles.primaryAddressContainer}
              onPress={() => setIsStoreAddress(!isStoreAddress)}
              activeOpacity={0.7}
              disabled={isUpdating || isDeleting}
            >
              <View style={styles.primaryAddressRow}>
                <View style={styles.checkbox}>
                  <CustomSwitch
                    value={isStoreAddress}
                    onChange={setIsStoreAddress}
                    activeColor={COLORS.red}
                    inactiveColor={COLORS.gray[300]}
                  />
                </View>
                <Text style={styles.primaryAddressText}>Set as Store Address</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.bottomContainer}>
          <TouchableOpacity 
            style={[styles.deleteButton, (isUpdating || isDeleting) && styles.buttonDisabled]}
            onPress={handleDeleteAddress}
            activeOpacity={0.8}
            disabled={isUpdating || isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={COLORS.black} />
            ) : (
              <Text style={styles.deleteButtonText}>Delete</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.saveButton, (isUpdating || isDeleting) && styles.buttonDisabled]}
            onPress={handleSaveAddress}
            activeOpacity={0.8}
            disabled={isUpdating || isDeleting}
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
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
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md * 2,
    backgroundColor: COLORS.white,
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
    fontWeight: '600',
    color: COLORS.text.primary,
    textAlign: 'center',
    flex: 1,
  },
  deleteButtonHeader: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: FONTS.sizes.smmd,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  required: {
    color: COLORS.error,
    marginLeft: 2,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    backgroundColor: COLORS.gray[50],
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  row: {
    flexDirection: 'row',
  },
  primaryAddressContainer: {
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.smmd,
    marginBottom: SPACING.md,
  },
  primaryAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.gray[300],
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  checkboxSelected: {
    backgroundColor: COLORS.red,
    borderColor: COLORS.red,
  },
  primaryAddressText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  bottomContainer: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    gap: '5%',
    justifyContent: 'space-between',
  },
  deleteButton: {
    backgroundColor: COLORS.gray[50],
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    alignItems: 'center',
    width: '45%',
  },
  deleteButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.black,
  },
  saveButton: {
    backgroundColor: COLORS.black,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    width: '45%',
  },
  saveButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  switchBackground: {
    width: SPACING['2xl'],
    height: SPACING.lg,
    borderRadius: 20,
    justifyContent: "center",
    padding: 2,
  },
  circle: {
    width: SPACING.mdlg,
    height: SPACING.mdlg,
    borderRadius: 12,
    backgroundColor: "#fff",
    elevation: 3,
  },
});

export default EditAddressScreen;