import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../../../../components/Icon';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../../../constants';
import { RootStackParamList, Address } from '../../../../types';

type EditFinanceAddressScreenNavigationProp = StackNavigationProp<RootStackParamList, 'EditAddress'>;
type EditFinanceAddressScreenRouteProp = RouteProp<RootStackParamList, 'EditAddress'>;

const EditFinanceAddressScreen: React.FC = () => {
  const navigation = useNavigation<EditFinanceAddressScreenNavigationProp>();
  const route = useRoute<EditFinanceAddressScreenRouteProp>();
  const { address } = route.params;
  
  const [formData, setFormData] = useState({
    street: address.street,
    aptOrSuite: '', // New field for Apt or suite number
    city: address.city,
    state: address.state,
    zipCode: address.zipCode,
  });
  const [isPrimary, setIsPrimary] = useState(address.isDefault);
  const [isStoreAddress, setIsStoreAddress] = useState(false); // New toggle for store address

  const handleSaveAddress = () => {
    if (!formData.street || !formData.city || !formData.state || !formData.zipCode) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    // In a real app, this would update the address in backend
    Alert.alert(
      'Address Updated',
      'Your address has been updated successfully!',
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]
    );
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
            // In a real app, this would delete the address from backend
            Alert.alert(
              'Address Deleted',
              'Your address has been deleted successfully!',
              [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]
            );
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
        <Icon name="arrow-back" size={24} color={COLORS.text.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Edit Address</Text>
      <View style={styles.placeholder} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Address *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.street}
              onChangeText={(text) => setFormData(prev => ({ ...prev, street: text }))}
              placeholder="Enter street address"
              placeholderTextColor={COLORS.gray[400]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Apt or Suite Number</Text>
            <TextInput
              style={styles.textInput}
              value={formData.aptOrSuite}
              onChangeText={(text) => setFormData(prev => ({ ...prev, aptOrSuite: text }))}
              placeholder="Enter apartment or suite number"
              placeholderTextColor={COLORS.gray[400]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>City *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.city}
              onChangeText={(text) => setFormData(prev => ({ ...prev, city: text }))}
              placeholder="Enter city"
              placeholderTextColor={COLORS.gray[400]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>State *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.state}
              onChangeText={(text) => setFormData(prev => ({ ...prev, state: text }))}
              placeholder="Enter state"
              placeholderTextColor={COLORS.gray[400]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>ZIP Code *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.zipCode}
              onChangeText={(text) => setFormData(prev => ({ ...prev, zipCode: text }))}
              placeholder="Enter ZIP code"
              placeholderTextColor={COLORS.gray[400]}
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity 
            style={styles.toggleContainer}
            onPress={() => setIsPrimary(!isPrimary)}
            activeOpacity={0.7}
          >
            <View style={styles.toggleRow}>
              <Text style={styles.toggleText}>Set as Primary Address</Text>
              <View style={[styles.toggleSwitch, isPrimary && styles.toggleSwitchOn]}>
                <View style={[styles.toggleKnob, isPrimary && styles.toggleKnobOn]} />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.toggleContainer}
            onPress={() => setIsStoreAddress(!isStoreAddress)}
            activeOpacity={0.7}
          >
            <View style={styles.toggleRow}>
              <Text style={styles.toggleText}>Set as Store Address</Text>
              <View style={[styles.toggleSwitch, isStoreAddress && styles.toggleSwitchOn]}>
                <View style={[styles.toggleKnob, isStoreAddress && styles.toggleKnobOn]} />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.bottomContainer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={handleDeleteAddress}
            activeOpacity={0.8}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={handleSaveAddress}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
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
    paddingVertical: SPACING.md * 2,
    backgroundColor: COLORS.white,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '600',
    color: COLORS.text.primary,
    textAlign: 'center',
    flex: 1,
  },
  placeholder: {
    width: 24,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    backgroundColor: COLORS.white,
  },
  toggleContainer: {
    marginBottom: SPACING.lg,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  toggleText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  toggleSwitch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.gray[300],
    justifyContent: 'center',
    padding: SPACING.xs,
  },
  toggleSwitchOn: {
    backgroundColor: COLORS.primary,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.white,
  },
  toggleKnobOn: {
    transform: [{ translateX: 20 }],
  },
  bottomContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  deleteButtonText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.error,
  },
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.text.primary,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default EditFinanceAddressScreen;