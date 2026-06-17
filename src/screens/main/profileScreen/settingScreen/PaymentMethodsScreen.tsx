import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import Icon from '../../../../components/Icon';
import { ScreenSkeleton } from '../../../../components/Skeleton';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants';
import { RootStackParamList, PaymentMethod } from '../../../../types';
import { useAuth } from '../../../../context/AuthContext';

type PaymentMethodsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'PaymentMethods'>;

const PaymentMethodsScreen: React.FC = () => {
  const navigation = useNavigation<PaymentMethodsScreenNavigationProp>();
  const { user, updateUser } = useAuth();
  
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.paymentMethods) {
      setPaymentMethods(user.paymentMethods);
    }
  }, [user]);

  const handleAddPaymentMethod = () => {
    navigation.navigate('AddPaymentMethod' as never);
  };

  const handleEditPaymentMethod = (paymentMethod: PaymentMethod) => {
    // In a real app, this would navigate to edit payment method screen
    Alert.alert('Edit Payment Method', 'This feature will be available soon!');
  };

  const handleDeletePaymentMethod = (paymentMethodId: string) => {
    Alert.alert(
      'Delete Payment Method',
      'Are you sure you want to delete this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deletePaymentMethod(paymentMethodId),
        },
      ]
    );
  };

  const deletePaymentMethod = async (paymentMethodId: string) => {
    try {
      setLoading(true);
      const updatedPaymentMethods = paymentMethods.filter(pm => pm.id !== paymentMethodId);
      await updateUser({ paymentMethods: updatedPaymentMethods });
      setPaymentMethods(updatedPaymentMethods);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete payment method. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (paymentMethodId: string) => {
    try {
      setLoading(true);
      const updatedPaymentMethods = paymentMethods.map(pm => ({
        ...pm,
        isDefault: pm.id === paymentMethodId,
      }));
      await updateUser({ paymentMethods: updatedPaymentMethods });
      setPaymentMethods(updatedPaymentMethods);
    } catch (error) {
      Alert.alert('Error', 'Failed to set default payment method. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethodIcon = (type: string) => {
    switch (type) {
      case 'card':
        return 'card-outline';
      case 'paypal':
        return 'logo-paypal';
      case 'apple_pay':
        return 'logo-apple';
      case 'google_pay':
        return 'logo-google';
      default:
        return 'wallet-outline';
    }
  };

  const getPaymentMethodColor = (type: string) => {
    switch (type) {
      case 'card':
        return COLORS.primary;
      case 'paypal':
        return '#0070BA';
      case 'apple_pay':
        return COLORS.text.primary;
      case 'google_pay':
        return '#4285F4';
      default:
        return COLORS.text.secondary;
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Icon name="arrow-back" size={24} color={COLORS.text.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Add Card</Text>
      <View style={styles.placeholder} />
    </View>
  );

  const renderPaymentMethodItem = ({ item }: { item: PaymentMethod }) => (
    <View style={styles.paymentCard}>
      <View style={styles.paymentHeader}>
        <View style={styles.paymentInfo}>
          <View style={styles.paymentIcon}>
            <Icon
              name={getPaymentMethodIcon(item.type) as any}
              size={24}
              color={getPaymentMethodColor(item.type)}
            />
          </View>
          <View style={styles.paymentDetails}>
            <Text style={styles.paymentType}>
              {item.type === 'card' 
                ? `${item.brand} •••• ${item.last4}`
                : item.type.toUpperCase().replace('_', ' ')
              }
            </Text>
            {item.type === 'card' && (
              <Text style={styles.paymentExpiry}>
                Expires {item.expiryMonth}/{item.expiryYear}
              </Text>
            )}
          </View>
        </View>
        {item.isDefault && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultText}>Default</Text>
          </View>
        )}
      </View>
      
      <View style={styles.paymentActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleEditPaymentMethod(item)}
        >
          <Icon name="create-outline" size={16} color={COLORS.primary} />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        
        {!item.isDefault && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleSetDefault(item.id)}
          >
            <Icon name="star-outline" size={16} color={COLORS.warning} />
            <Text style={styles.actionText}>Set Default</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeletePaymentMethod(item.id)}
        >
          <Icon name="trash-outline" size={16} color={COLORS.error} />
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="card-outline" size={80} color={COLORS.text.secondary} />
      <Text style={styles.emptyTitle}>No payment methods</Text>
      <Text style={styles.emptySubtitle}>
        Add a payment method for faster checkout
      </Text>
      <TouchableOpacity
        style={styles.addFirstButton}
        onPress={handleAddPaymentMethod}
      >
        <Text style={styles.addFirstButtonText}>Add Payment Method</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return <ScreenSkeleton variant="list" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {paymentMethods.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.paymentListContent}>
            {paymentMethods.map((item) => renderPaymentMethodItem({ item }))}
          </View>
        )}
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
  paymentListContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  paymentCard: {
    backgroundColor: COLORS.white,
    borderRadius: SPACING.md,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  paymentDetails: {
    flex: 1,
  },
  paymentType: {
    fontSize: FONTS.sizes.base,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  paymentExpiry: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
  },
  defaultBadge: {
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  defaultText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.success,
    fontWeight: '600',
  },
  paymentActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  actionText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.primary,
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING['3xl'],
  },
  emptyTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: Math.round(FONTS.sizes.sm * 20 / 14),
    marginBottom: SPACING.xl,
  },
  addFirstButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  addFirstButtonText: {
    fontSize: FONTS.sizes.base,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default PaymentMethodsScreen;
