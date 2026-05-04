import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  PanResponder,
} from 'react-native';
import Icon from './Icon';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants';
import { Product } from '../types';

const { height: SCREEN_HEIGHT, width } = Dimensions.get('window');

interface VariationSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  product: Product;
  onAddToCart: (product: Product, quantity: number, selectedColor?: string, selectedSize?: string) => Promise<void>;
}

const VariationSelectionModal: React.FC<VariationSelectionModalProps> = ({
  visible,
  onClose,
  product,
  onAddToCart,
}) => {
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  // Track selections for all variation types dynamically
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const isDismissing = useRef(false);

  // Parse variation types from variant names (same as product detail page)
  // Example: "Color: Cat print thickened modal-grey / Specifications: 20*25cm"
  const getVariationTypes = () => {
    const variationTypesMap = new Map<string, Map<string, { value: string; image?: string; [key: string]: any }>>();
    
    // Check if we have raw variants data (from product detail API)
    const rawVariants = (product as any).rawVariants || [];
    
    if (rawVariants.length > 0) {
      // Parse each variant name to extract variation types
      rawVariants.forEach((variant: any) => {
        const variantName = variant.name || '';
        
        if (!variantName) return;
        
        // Split by "/" to get each variation type
        const parts = variantName.split('/').map((p: string) => p.trim());
        
        parts.forEach((part: string) => {
          // Extract type name (before ":") and value (after ":")
          const colonIndex = part.indexOf(':');
          if (colonIndex === -1) return;
          
          const typeName = part.substring(0, colonIndex).trim();
          const value = part.substring(colonIndex + 1).trim();
          
          if (!typeName || !value) return;
          
          // Initialize map for this variation type if it doesn't exist
          if (!variationTypesMap.has(typeName)) {
            variationTypesMap.set(typeName, new Map());
          }
          
          const optionsMap = variationTypesMap.get(typeName)!;
          
          // Only add if value doesn't exist (remove duplicates)
          if (!optionsMap.has(value)) {
            optionsMap.set(value, {
              value: value,
              image: variant.image || undefined,
              ...variant,
            });
          }
        });
      });
    }
    
    // Also check for colors and sizes as separate properties (for backward compatibility)
    if (product.colors && product.colors.length > 0) {
      const colorVariation = variationTypesMap.get('Color');
      if (!colorVariation) {
        variationTypesMap.set('Color', new Map());
        const colorMap = variationTypesMap.get('Color')!;
        product.colors.forEach((color: any) => {
          if (!colorMap.has(color.name)) {
            colorMap.set(color.name, {
              value: color.name,
              image: color.image,
              hex: color.hex,
            });
          }
        });
      }
    }
    
    if (product.sizes && product.sizes.length > 0) {
      const sizeVariation = variationTypesMap.get('Size');
      if (!sizeVariation) {
        variationTypesMap.set('Size', new Map());
        const sizeMap = variationTypesMap.get('Size')!;
        product.sizes.forEach((size: string) => {
          if (!sizeMap.has(size)) {
            sizeMap.set(size, {
              value: size,
            });
          }
        });
      }
    }
    
    // Convert map to array format
    const variationTypes: Array<{ name: string; options: Array<{ value: string; image?: string; [key: string]: any }> }> = [];
    
    variationTypesMap.forEach((optionsMap, typeName) => {
      variationTypes.push({
        name: typeName,
        options: Array.from(optionsMap.values()),
      });
    });
    
    return variationTypes;
  };

  // Reset selections when product changes
  useEffect(() => {
    setSelectedColor(null);
    setSelectedSize(null);
    setSelectedVariations({});
    setQuantity(1);
  }, [product?.id]); // Reset when product ID changes

  const dismissModal = () => {
    if (isDismissing.current) return;
    isDismissing.current = true;
    
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      panY.setValue(0);
      onClose();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150 || gestureState.vy > 0.5) {
          if (isDismissing.current) return;
          isDismissing.current = true;
          onClose();
        } else {
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      isDismissing.current = false;
      panY.setValue(0);
      // Reset selections when modal opens (in case product changed while modal was closed)
      setSelectedColor(null);
      setSelectedSize(null);
      setSelectedVariations({});
      setQuantity(1);
      slideAnim.setValue(SCREEN_HEIGHT);
      // Slide up animation
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      // Reset panY after modal is hidden
      setTimeout(() => {
        panY.setValue(0);
      }, 300);
    }
  }, [visible]);

  const handleQuantityChange = (increment: boolean) => {
    if (increment) {
      setQuantity(prev => prev + 1);
    } else {
      setQuantity(prev => Math.max(1, prev - 1));
    }
  };

  const handleAddToCart = async () => {
    // Check if all required variations are selected
    const variationTypes = getVariationTypes();
    
    // Check if all variation types have selections
    for (const variationType of variationTypes) {
      const variationName = variationType.name.toLowerCase();
      const selectedValue = selectedVariations[variationName] || 
                           (variationName === 'color' ? selectedColor : null) ||
                           (variationName === 'size' ? selectedSize : null);
      
      if (!selectedValue) {
        return; // Don't proceed if any variation is not selected
      }
    }

    setIsAdding(true);
    try {
      // Use selectedColor and selectedSize for backward compatibility
      await onAddToCart(product, quantity, selectedColor || undefined, selectedSize || undefined);
      onClose();
    } catch (error) {
      // console.error('Failed to add to cart:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const canAddToCart = () => {
    const variationTypes = getVariationTypes();
    
    // If there are no variations, button should be enabled
    if (variationTypes.length === 0) {
      return true;
    }
    
    // Check if all variation types have selections
    for (const variationType of variationTypes) {
      const variationName = variationType.name.toLowerCase();
      const selectedValue = selectedVariations[variationName] || 
                           (variationName === 'color' ? selectedColor : null) ||
                           (variationName === 'size' ? selectedSize : null);
      
      if (!selectedValue) {
        return false; // At least one variation is not selected
      }
    }
    
    return true; // All variations are selected
  };

  const renderVariationSelector = (variationType: { name: string; options: Array<{ value: string; [key: string]: any }> }, index: number) => {
    const variationName = variationType.name.toLowerCase();
    
    // Get selected value from selectedVariations state
    const selectedValue = selectedVariations[variationName] || 
                         (variationName === 'color' ? selectedColor : null) ||
                         (variationName === 'size' ? selectedSize : null);
    
    const handleSelect = (value: string) => {
      // Update selectedVariations state
      setSelectedVariations(prev => ({
        ...prev,
        [variationName]: value,
      }));
      
      // Also update selectedColor and selectedSize for backward compatibility
      if (variationName === 'color') {
        setSelectedColor(value);
      } else if (variationName === 'size') {
        setSelectedSize(value);
      }
    };

    // First variation type shows with images (if available), others show only text
    const isFirstVariation = index === 0;
    const hasImages = variationType.options.some((opt: any) => opt.image);

    if (isFirstVariation && hasImages) {
      // Render first variation type with images
      return (
        <View style={styles.selectorContainer}>
          <Text style={styles.selectorTitle}>{variationType.name} : {selectedValue || `Select ${variationType.name}`}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {variationType.options.map((option: any, optIndex: number) => {
              const isSelected = selectedValue === option.value;
              return (
                <TouchableOpacity
                  key={optIndex}
                  style={styles.colorOption}
                  onPress={() => handleSelect(option.value)}
                >
                  {option.image && (
                    <Image
                      source={{ uri: option.image }}
                      style={[
                        styles.colorImage,
                        isSelected && styles.selectedColorImage,
                      ]}
                    />
                  )}
                  <Text 
                    style={[
                      styles.colorName,
                      isSelected && styles.selectedColorName,
                    ]}
                    numberOfLines={3}
                  >
                    {option.value}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      );
    } else {
      // Render other variation types (or first if no images) as text buttons
      return (
        <View style={styles.selectorContainer}>
          <Text style={styles.selectorTitle}>{variationType.name} : {selectedValue || `Select ${variationType.name}`}</Text>
          <View style={styles.sizeGrid}>
            {variationType.options.map((option: any, optIndex: number) => {
              const isSelected = selectedValue === option.value;
              return (
                <TouchableOpacity
                  key={optIndex}
                  style={[
                    styles.sizeOption,
                    isSelected && styles.selectedSizeOption,
                  ]}
                  onPress={() => handleSelect(option.value)}
                >
                  <Text
                    style={[
                      styles.sizeText,
                      isSelected && styles.selectedSizeText,
                    ]}
                  >
                    {option.value}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );
    }
  };

  const renderAllVariations = () => {
    const variationTypes = getVariationTypes();
    
    if (variationTypes.length === 0) {
      return null;
    }
    
    return variationTypes.map((variationType, index) => (
      <View key={index}>
        {renderVariationSelector(variationType, index)}
      </View>
    ));
  };


  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={dismissModal}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={dismissModal}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalContent,
                {
                  transform: [
                    { translateY: Animated.add(slideAnim, panY) }
                  ],
                },
              ]}
            >
              {/* Handle bar */}
              <View {...panResponder.panHandlers} style={styles.handleContainer}>
                <View style={styles.handle} />
              </View>

              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Select Variations</Text>
                <TouchableOpacity onPress={dismissModal} style={styles.closeButton}>
                  <Icon name="close" size={24} color={COLORS.text.primary} />
                </TouchableOpacity>
              </View>

              {/* Product Info */}
              <View style={styles.productInfoContainer}>
                <Image
                  source={{ uri: product.image || (product as any).images?.[0] }}
                  style={styles.productImage}
                />
                <View style={styles.productDetails}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {product.name}
                  </Text>
                  <Text style={styles.productPrice}>${product.price.toFixed(2)}</Text>
                </View>
              </View>

              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {(() => {
                  const variations = renderAllVariations();
                  if (!variations || variations.length === 0) {
                    return (
                      <View style={styles.selectorContainer}>
                        <Text style={styles.selectorTitle}>No variations available</Text>
                      </View>
                    );
                  }
                  return variations;
                })()}

                {/* Quantity Selector */}
                <View style={styles.selectorContainer}>
                  <Text style={styles.selectorTitle}>Quantity</Text>
                  <View style={styles.quantityContainer}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => handleQuantityChange(false)}
                      disabled={quantity <= 1}
                    >
                      <Icon
                        name="remove"
                        size={20}
                        color={quantity <= 1 ? COLORS.gray[400] : COLORS.text.primary}
                      />
                    </TouchableOpacity>
                    <Text style={styles.quantityText}>{quantity}</Text>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => handleQuantityChange(true)}
                    >
                      <Icon name="add" size={20} color={COLORS.text.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>

              {/* Add to Cart Button */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={[
                    styles.addToCartButton,
                    (!canAddToCart() || isAdding) && styles.addToCartButtonDisabled,
                  ]}
                  onPress={handleAddToCart}
                  disabled={!canAddToCart() || isAdding}
                >
                  {isAdding ? (
                    <Text style={styles.addToCartButtonText}>Adding...</Text>
                  ) : (
                    <Text style={styles.addToCartButtonText}>Add to Cart</Text>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.85,
    paddingBottom: 40,
    ...SHADOWS.lg,
  },
  handleContainer: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.gray[300],
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    marginTop: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  productInfoContainer: {
    flexDirection: 'row',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.gray[200],
    marginRight: SPACING.md,
  },
  productDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  productPrice: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.red,
  },
  content: {
    flex: 1,
  },
  selectorContainer: {
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  selectorTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  colorOption: {
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  colorImage: {
    width: 60,
    height: 60,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xs,
    borderWidth: 2,
    borderColor: COLORS.gray[300],
  },
  selectedColorImage: {
    borderColor: COLORS.red,
    borderWidth: 3,
  },
  colorName: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 80,
  },
  selectedColorName: {
    color: COLORS.red,
    fontWeight: '600',
  },
  sizeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  sizeOption: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    backgroundColor: COLORS.white,
    minWidth: 60,
    alignItems: 'center',
  },
  selectedSizeOption: {
    borderColor: COLORS.red,
    borderWidth: 2,
    backgroundColor: COLORS.gray[50],
  },
  sizeText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  selectedSizeText: {
    color: COLORS.red,
    fontWeight: '600',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 120,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.xs,
  },
  quantityButton: {
    padding: SPACING.sm,
  },
  quantityText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.primary,
    minWidth: 30,
    textAlign: 'center',
  },
  footer: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  addToCartButton: {
    backgroundColor: COLORS.black,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  addToCartButtonDisabled: {
    backgroundColor: COLORS.gray[400],
    opacity: 0.6,
  },
  addToCartButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default VariationSelectionModal;

