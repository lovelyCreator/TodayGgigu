import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from '../../../components/Icon';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { COLORS, FONTS, SHADOWS, SPACING } from '../../../constants';
import { RootStackParamList, CustomerOrderDetails } from '../../../types';

type LeaveFeedbackRouteProp = RouteProp<RootStackParamList, 'LeaveFeedback'>;
type LeaveFeedbackScreenNavigationProp = StackNavigationProp<RootStackParamList, 'LeaveFeedback'>;

interface ProductData {
  id: string;
  brand: string;
  name: string;
  size: string;
  color: string;
  originalPrice?: number;
  currentPrice: number;
  discount?: number;
  image: any;
}

const LeaveFeedbackScreen: React.FC = () => {
  const route = useRoute<LeaveFeedbackRouteProp>();
  const navigation = useNavigation<LeaveFeedbackScreenNavigationProp>();
  const { orderId, product } = route.params;
  
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<CustomerOrderDetails | null>(null);

  let variatons = product.variation;
  if (typeof variatons === 'string') {
    variatons = JSON.parse(variatons);
  };
  let options = variatons[0].options;
  if (typeof options === 'string') {
    options = JSON.parse(options);
  };
  // const options = variatons ? JSON.parse(variatons[0].options) : null
  const imgUrl = options ? options[0].image : ''
  // console.log("Variations", product);

  
    // API hook removed
  // const loadProductData = async () => {
  //   try {
  //     setLoading(true);
  //     // Get order data from the new customer orders API
  //     const response = await customerOrdersApi.getCustomerOrderById(parseInt(orderId));
      
  //     if (response.success && response.data) {
  //       console.log('Received customer order data:', response.data);
  //       setOrder(response.data);
        
  //       // For now, we'll create a simple product representation
  //       const productData: ProductData = {
  //         id: productId,
  //         brand: response.data.module?.module_name || 'Store',
  //         name: `Order #${response.data.id}`,
  //         size: 'N/A',
  //         color: 'N/A',
  //         currentPrice: response.data.order_amount,
  //         image: require('../../assets/images/sneakers.png'), // Fallback image
  //       };
        
  //       setProduct(productData);
  //     } else {
  //       console.error('Failed to load order:', response.message);
  //     }
  //   } catch (error) {
  //     console.error('Error loading product data:', error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleRatingPress = (selectedRating: number) => {
    setRating(selectedRating);
  };

  const handleSubmitFeedback = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a rating before submitting.');
      return;
    }

    try {
      setSubmitting(true);
      // In a real app, submit to API
      console.log('Submitting feedback:', {
        orderId,
        productId: product?.id,
        rating,
        comment,
      });
      // API call removed
      // Alert.alert(
      //   'Feedback Submitted',
      //   'Thank you for your feedback!',
      //   [{ text: 'OK', onPress: () => navigation.goBack() }]
      // );
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
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
      <Text style={styles.headerTitle}>Leave Feedback</Text>
      <View style={styles.placeholder} />
    </View>
  );

  const renderProductInfo = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.red} />
        </View>
      );
    }
    
    if (!product) {
      return (
        <View style={styles.loadingContainer}>
          <Text>Product not found</Text>
        </View>
      );
    }
    
    return (
      // <View style={styles.productContainer}>
      //   <Image source={product.image} style={styles.productImage} />
      //   <View style={styles.productDetails}>
      //     <Text style={styles.productBrand}>{product.brand}</Text>
      //     <Text style={styles.productName}>{product.name}</Text>
      //     <Text style={styles.productSpecs}>
      //       Size: {product.size}  Color: {product.color}
      //     </Text>
      //     <View style={styles.priceContainer}>
      //       {product.originalPrice && (
      //         <Text style={styles.originalPrice}>${product.originalPrice.toFixed(2)}</Text>
      //       )}
      //       <Text style={styles.currentPrice}>${product.currentPrice.toFixed(2)}</Text>
      //       {product.discount && (
      //         <Text style={styles.discountText}>-{product.discount}%</Text>
      //       )}
      //     </View>
      //   </View>
      // </View>
      <View>
        <View style={styles.productContainer}>
          <Image
            source={{uri: imgUrl}}
            style={styles.productImage}
            resizeMode="cover"
          />
          
          <View style={styles.productDetails}>
            {/* <Text style={styles.productBrand}>{item.brand}</Text> */}
            <Text style={styles.productName} numberOfLines={2}>
              {product.item_name}
            </Text>
            <Text style={styles.productSpecs}>
              {variatons && variatons[0].name} - {options && options[0].value}
            </Text>
            
            <View style={styles.priceContainer}>
              {/* {item.originalPrice && (
                <Text style={styles.originalPrice}>${item.originalPrice.toFixed(2)}</Text>
              )} */}
              <Text style={styles.currentPrice}>${(options[0].price || 0).toFixed(2)}</Text>
              {/* {item.discount && (
                <Text style={styles.discountText}>-{item.discount}%</Text>
              )} */}
            </View>
          </View>
        </View>
        
        {/* Add separator between items except for the last one */}
        {/* {index < order.items.length - 1 && <View style={styles.itemSeparator} />} */}
      </View>
    );
  };

  const renderStarRating = () => (
    <View style={styles.ratingContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => handleRatingPress(star)}
          style={styles.starButton}
        >
          <Icon
            name={star <= rating ? "star" : "star-outline"}
            size={40}
            color={star <= rating ? "#FFD700" : COLORS.gray[300]}
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderNoteSection = () => (
    <View style={styles.noteContainer}>
      <Text style={styles.noteLabel}>Note</Text>
      <TextInput
        style={styles.noteInput}
        multiline
        numberOfLines={4}
        placeholder="Write your feedback here..."
        value={comment}
        onChangeText={setComment}
      />
    </View>
  );

  const renderSubmitButton = () => (
    <TouchableOpacity
      style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
      onPress={handleSubmitFeedback}
      disabled={submitting}
    >
      {submitting ? (
        <ActivityIndicator color={COLORS.white} />
      ) : (
        <Text style={styles.submitButtonText}>Submit Feedback</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderProductInfo()}
        {/* <View style={styles.divider} /> */}
        {/* <Text style={styles.ratingTitle}>Rate Your Experience</Text> */}
        {renderStarRating()}
        {renderNoteSection()}
        {renderSubmitButton()}
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
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    paddingTop: SPACING.xl,
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
    fontSize: FONTS.sizes.xl,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  placeholder: {
    width: 40,
    height: 40,
  },
  loadingContainer: {
    padding: SPACING.md,
    paddingBottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productContainer: {
    flexDirection: 'row',
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
  },
  productImage: {
    width: 90,
    height: 120,
    borderRadius: 12,
    backgroundColor: COLORS.gray[100],
    marginRight: SPACING.md,
  },
  productDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  productBrand: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
    marginBottom: SPACING.xs,
  },
  productName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
    lineHeight: 20,
  },
  productSpecs: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
    marginBottom: SPACING.sm,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  originalPrice: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[400],
    textDecorationLine: 'line-through',
    marginRight: SPACING.xs,
  },
  currentPrice: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.red,
    marginRight: SPACING.xs,
  },
  discountText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.red,
    backgroundColor: COLORS.red+10,
    borderRadius: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.gray[200],
    marginVertical: SPACING.lg,
  },
  ratingTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginHorizontal: SPACING.lg,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
  },
  starButton: {
    padding: SPACING.xs,
  },
  noteContainer: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
  },
  noteLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    textAlignVertical: 'top',
    minHeight: 120,
    backgroundColor: COLORS.gray[50],
  },
  submitButton: {
    backgroundColor: COLORS.black,
    paddingVertical: SPACING.md,
    marginHorizontal: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.gray[400],
  },
  submitButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default LeaveFeedbackScreen;