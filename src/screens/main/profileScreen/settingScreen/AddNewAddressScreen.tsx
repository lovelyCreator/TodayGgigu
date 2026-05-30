import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import Icon from '../../../../components/Icon';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants';
import { CustomSwitchProps, RootStackParamList, Address } from '../../../../types';
import { AddressSearchModal } from '../../../../components';
import { useAuth } from '../../../../context/AuthContext';
import { useAddAddressMutation } from '../../../../hooks/useAddAddressMutation';
import { buildAddressSubmitBody } from '../../../../services/addressApi';

type AddNewAddressScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AddNewAddress'>;
type AddNewAddressScreenRouteProp = RouteProp<RootStackParamList, 'AddNewAddress'>;

const AddNewAddressScreen: React.FC = () => {
  const navigation = useNavigation<AddNewAddressScreenNavigationProp>();
  const route = useRoute<AddNewAddressScreenRouteProp>();
  
  const [formData, setFormData] = useState({
    recipient: '',
    contact: '',
    personalCustomsCode: '',
    detailedAddress: '',
    zipCode: '',
    note: '',
  });
  const [isPrimary, setIsPrimary] = useState(false);
  const [isStoreAddress, setIsStoreAddress] = useState(false);
  const [showAddressSearch, setShowAddressSearch] = useState(false);
  
  // Check if we came from shipping settings
  const fromShippingSettings = route.params?.fromShippingSettings || false;
  const { user, updateUser } = useAuth();

  const {
    mutate: createAddress,
    isLoading,
    isError,
    error,
    isSuccess,
  } = useAddAddressMutation({
    onSuccess: (data) => {
      // Add the new address to saved addresses array
      if (data?.addresses && data.addresses.length > 0) {
        const newAddressFromApi = data.addresses[data.addresses.length - 1]; // Get the last one (newly added)
        
        // Convert API address to Address type
        const newAddress: Address & { personalCustomsCode?: string; note?: string; customerClearanceType?: string } = {
          id: newAddressFromApi._id,
          type: newAddressFromApi.customerClearanceType === 'business' ? 'work' : 'home',
          name: newAddressFromApi.recipient || '',
          street: newAddressFromApi.detailedAddress || '',
          city: newAddressFromApi.mainAddress || '',
          state: '',
          zipCode: newAddressFromApi.zipCode || '',
          country: '',
          phone: newAddressFromApi.contact || '',
          isDefault: newAddressFromApi.defaultAddress || false,
          personalCustomsCode: newAddressFromApi.personalCustomsCode || '',
          note: newAddressFromApi.note || '',
          customerClearanceType: newAddressFromApi.customerClearanceType || 'individual',
        };
        
        // Add to saved addresses
        const currentAddresses = user?.addresses || [];
        const updatedAddresses = [...currentAddresses, newAddress];
        updateUser({ addresses: updatedAddresses });
      }
      
      Alert.alert('Success', 'Address added successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (errorMessage) => {
      Alert.alert('Error', errorMessage);
    },
  });

  const handleSelectAddress = (address: any) => {
    setFormData(prev => ({
      ...prev,
      detailedAddress: address.roadAddress || address.address || '',
      zipCode: address.postalCode || address.zipCode || '',
    }));
  };

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

    // Call the create address mutation
    createAddress(addressData);
  };

  useEffect(() => {
    if (isSuccess) {
      // Navigation is handled in onSuccess callback
    }
  }, [isSuccess]);

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Icon name="arrow-back" size={24} color={COLORS.text.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Add Shipping Address</Text>
      <View style={styles.placeholder} />
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
          {/* Type Selection */}
          <View style={styles.typeSection}>
            <Text style={styles.typeLabel}>
              Type<Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.typeOptions}>
              <TouchableOpacity
                style={styles.typeOption}
                onPress={() => setIsStoreAddress(false)}
                disabled={isLoading}
              >
                <View style={[styles.radioButton, !isStoreAddress && styles.radioButtonSelected]}>
                  {!isStoreAddress && <View style={styles.radioButtonInner} />}
                </View>
                <Text style={styles.typeOptionText}>Personal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.typeOption}
                onPress={() => setIsStoreAddress(true)}
                disabled={isLoading}
              >
                <View style={[styles.radioButton, isStoreAddress && styles.radioButtonSelected]}>
                  {isStoreAddress && <View style={styles.radioButtonInner} />}
                </View>
                <Text style={styles.typeOptionText}>Business</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recipient Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Recipient<Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              value={formData.recipient}
              onChangeText={(text) => setFormData(prev => ({ ...prev, recipient: text }))}
              placeholder="Please enter the recipient's real name"
              placeholderTextColor={COLORS.gray[400]}
              editable={!isLoading}
            />
          </View>

          {/* Basic Address */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>
                Basic Address<Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity onPress={() => setShowAddressSearch(true)}>
                <Text style={styles.importLink}>Import</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.textInput}
              value={formData.detailedAddress}
              onChangeText={(text) => setFormData(prev => ({ ...prev, detailedAddress: text }))}
              placeholder="Please enter your address"
              placeholderTextColor={COLORS.gray[400]}
              editable={!isLoading}
            />
            <Text style={styles.helperText}>Please enter the recipient's real name</Text>
          </View>

          {/* Postal Code */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Postal Code<Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              value={formData.zipCode}
              onChangeText={(text) => setFormData(prev => ({ ...prev, zipCode: text }))}
              placeholder="Postal Code"
              placeholderTextColor={COLORS.gray[400]}
              keyboardType="numeric"
              editable={!isLoading}
            />
          </View>

          {/* Contact Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Contact Number<Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              value={formData.contact}
              onChangeText={(text) => setFormData(prev => ({ ...prev, contact: text }))}
              placeholder="Contact Number"
              placeholderTextColor={COLORS.gray[400]}
              keyboardType="phone-pad"
              editable={!isLoading}
            />
          </View>

          {/* Personal Customs Code */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Please enter your unified number<Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              value={formData.personalCustomsCode}
              onChangeText={(text) => setFormData(prev => ({ ...prev, personalCustomsCode: text }))}
              placeholder="Please enter your unified number"
              placeholderTextColor={COLORS.gray[400]}
              editable={!isLoading}
            />
          </View>

          {/* Delivery Note */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Note</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={formData.note}
              onChangeText={(text) => setFormData(prev => ({ ...prev, note: text }))}
              placeholder="Please enter delivery note."
              placeholderTextColor={COLORS.gray[400]}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!isLoading}
            />
          </View>

          {/* Set as Default */}
          <TouchableOpacity 
            style={styles.defaultAddressContainer}
            onPress={() => setIsPrimary(!isPrimary)}
            activeOpacity={0.7}
            disabled={isLoading}
          >
            <Text style={styles.defaultAddressText}>Set as Default Address</Text>
            <CustomSwitch
              value={isPrimary}
              onChange={setIsPrimary}
              activeColor={COLORS.red}
              inactiveColor={COLORS.gray[300]}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomContainer}>
          <TouchableOpacity 
            style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
            onPress={handleSaveAddress}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <AddressSearchModal
        visible={showAddressSearch}
        onClose={() => setShowAddressSearch(false)}
        onSelectAddress={handleSelectAddress}
      />
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
    paddingVertical: SPACING.sm * 2,
    paddingTop: SPACING['2xl'] * 2,
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
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
  },
  typeSection: {
    marginBottom: SPACING.lg,
  },
  typeLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  required: {
    color: COLORS.error,
    marginLeft: 2,
  },
  typeOptions: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.gray[300],
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: COLORS.red,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.red,
  },
  typeOptionText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  inputLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  importLink: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.red,
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    backgroundColor: COLORS.white,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  helperText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.success,
    marginTop: SPACING.xs,
  },
  defaultAddressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
  },
  defaultAddressText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
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
  bottomContainer: {
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    paddingBottom: SPACING['3xl'],
  },
  saveButton: {
    backgroundColor: COLORS.error,
    paddingVertical: SPACING.smmd,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.lightRed,
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
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

export default AddNewAddressScreen;