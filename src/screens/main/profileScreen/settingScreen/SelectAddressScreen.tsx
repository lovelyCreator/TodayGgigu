import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import Icon from '../../../../components/Icon';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants';
import { RootStackParamList, Address } from '../../../../types';
import { useAuth } from '../../../../context/AuthContext';

type SelectAddressScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SelectAddress'>;
type SelectAddressScreenRouteProp = RouteProp<RootStackParamList, 'SelectAddress'>;

const SelectAddressScreen: React.FC = () => {
  const navigation = useNavigation<SelectAddressScreenNavigationProp>();
  const route = useRoute<SelectAddressScreenRouteProp>();
  const { user } = useAuth();
  
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    route.params?.selectedAddressId || null
  );
  
  // Get addresses from saved user data
  const addresses = user?.addresses || [];

  const handleSelectAddress = (address: Address) => {
    // Just update the selected address ID, don't navigate yet
    setSelectedAddressId(address.id);
  };

  const handleConfirm = () => {
    if (!selectedAddressId) {
      Alert.alert('Error', 'Please select an address');
      return;
    }
    
    const selectedAddress = addresses.find(addr => addr.id === selectedAddressId);
    if (selectedAddress) {
      // Get the previous route to determine where to navigate back
      const navigationState = navigation.getState();
      const routes = navigationState.routes;
      const currentIndex = navigationState.index;
      const previousRoute = currentIndex > 0 ? routes[currentIndex - 1] : null;
      
      if (previousRoute?.name === 'Payment') {
        // Get previous route params if available
        const previousParams = (previousRoute.params as any) || {};
        // Navigate back to Payment with selected address, preserving original params
        navigation.navigate('Payment', { 
          ...previousParams,
          selectedAddress 
        });
      } else {
        // Default: Just go back
        navigation.goBack();
      }
    }
  };

  const handleAddNewAddress = () => {
    navigation.navigate('AddNewAddress', {});
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Icon name="arrow-back" size={24} color={COLORS.text.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Select Address</Text>
      <View style={styles.placeholder} />
    </View>
  );

  const renderAddressItem = ({ item }: { item: Address }) => {
    const isSelected = selectedAddressId === item.id;
    
    return (
        <TouchableOpacity
          style={[styles.addressCard, isSelected && styles.addressCardSelected]}
          onPress={() => handleSelectAddress(item)}
          activeOpacity={0.7}
        >
        <View style={styles.addressRow}>
          <View style={styles.addressIconContainer}>
            <Icon name="location" size={20} color={isSelected ? COLORS.red : COLORS.gray[500]} />
          </View>
          <View style={styles.addressInfo}>
            <View style={styles.addressHeader}>
              <Text style={styles.addressName}>{item.name || user?.name || 'Unnamed'}</Text>
              {item.isDefault && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultBadgeText}>Default</Text>
                </View>
              )}
            </View>
            <Text style={styles.addressPhone}>{item.phone || ''}</Text>
            <Text style={styles.addressText}>
              {item.street || ''} {item.zipCode ? `, ${item.zipCode}` : ''}
            </Text>
            {item.city && (
              <Text style={styles.addressCity}>{item.city}</Text>
            )}
          </View>
          <View style={styles.radioButton}>
            <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
              {isSelected && (
                <View style={styles.radioInner} />
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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
              <Icon name="location-outline" size={64} color={COLORS.gray[300]} />
              <Text style={styles.emptyText}>No addresses found</Text>
              <Text style={styles.emptySubtext}>Add a new address to get started</Text>
            </View>
          }
        />
        
        <TouchableOpacity 
          style={styles.addNewButton}
          onPress={handleAddNewAddress}
          activeOpacity={0.7}
        >
          <Icon name="add-circle-outline" size={24} color={COLORS.white} />
          <Text style={styles.addNewButtonText}>Add New Address</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.confirmButton, !selectedAddressId && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          activeOpacity={0.7}
          disabled={!selectedAddressId}
        >
          <Text style={styles.confirmButtonText}>Confirm</Text>
        </TouchableOpacity>
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
    paddingVertical: SPACING.sm * 2,
    paddingTop: SPACING['2xl'] * 2,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
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
  addressListContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
  },
  addressCard: {
    backgroundColor: COLORS.white,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  addressCardSelected: {
    borderColor: COLORS.red,
    borderWidth: 2,
    backgroundColor: COLORS.gray[50],
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressIconContainer: {
    marginRight: SPACING.sm,
    marginTop: 2,
  },
  addressInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    gap: SPACING.sm,
  },
  addressName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  defaultBadge: {
    backgroundColor: COLORS.red,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  defaultBadgeText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.white,
    fontWeight: '600',
  },
  addressPhone: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
    marginBottom: SPACING.xs,
  },
  addressText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    lineHeight: Math.round(FONTS.sizes.sm * 20 / 14),
    marginBottom: SPACING.xs,
  },
  addressCity: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
  },
  radioButton: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.gray[300],
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: COLORS.red,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.red,
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.red,
    paddingVertical: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  addNewButtonText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  confirmButton: {
    backgroundColor: COLORS.red,
    paddingVertical: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  confirmButtonDisabled: {
    backgroundColor: COLORS.gray[300],
    opacity: 0.6,
  },
  confirmButtonText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING['3xl'],
  },
  emptyText: {
    fontSize: FONTS.sizes.lg,
    color: COLORS.text.primary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
  },
});

export default SelectAddressScreen;

