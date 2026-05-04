import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import Icon from './Icon';

import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants';
import { Product } from '../types';
import HeartPlusIcon from '../assets/icons/HeartPlusIcon';
import FamilyStarIcon from '../assets/icons/FamilyStarIcon';
import { formatPriceKRW } from '../utils/i18nHelpers';

const { width } = Dimensions.get('window');
const GRID_CARD_WIDTH = (width - SPACING.sm * 2 - SPACING.sm) / 2;

const getProductImageUri = (image?: string) => {
  if (!image) {
    return '';
  }

  return `${image}_200x200.jpg`;
};

const getPlatformBadgeLabel = (product: Product) =>
  String((product as any).source || (product as any).platform || '').toUpperCase();

const ProductImage = React.memo(
  ({
    uri,
    style,
    badgeLabel,
  }: {
    uri: string;
    style: any;
    badgeLabel: string;
  }) => (
    <View style={{ position: 'relative' }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={style}
          resizeMode="cover"
          fadeDuration={0}
        />
      ) : null}

      {badgeLabel ? (
        <View style={styles.platformBadge}>
          <Text style={styles.platformBadgeText}>{badgeLabel}</Text>
        </View>
      ) : null}
    </View>
  ),
);

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
  onLikePress?: () => void;
  isLiked?: boolean;
  showLikeButton?: boolean;
  showDiscountBadge?: boolean;
  showRating?: boolean;
  variant?: 'default' | 'grid' | 'horizontal' | 'newIn' | 'moreToLove' | 'simple';
  style?: object;
  imageStyle?: object;
  cardWidth?: number;
  onAddToCart?: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
  onLikePress,
  isLiked = false,
  showLikeButton = true,
  showDiscountBadge = true,
  showRating = true,
  variant = 'default',
  style,
  imageStyle,
  cardWidth,
  onAddToCart,
}) => {
  const handleLikePress = (e: any) => {
    e.stopPropagation();
    
    // Always call onLikePress - let parent handle login check
    if (onLikePress) {
      onLikePress();
    }
  };

  // Calculate discount percentage if not provided
  const discountPercentage = product.discount || 
    (product.originalPrice && product.price 
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0);
  const imageUri = getProductImageUri(product.image);
  const platformBadgeLabel = getPlatformBadgeLabel(product);

  // New In variant - vertical card with image, discount, like button, and product info
  if (variant === 'newIn') {
    // Calculate width for 3 items per line: (width - padding - gaps) / 3
    // Default calculation if cardWidth not provided
    const defaultCardW = cardWidth || Math.floor((width - SPACING.sm * 2 - SPACING.sm ) / 3);
    const cardW = cardWidth || defaultCardW;
    const cardH = Math.floor(cardW * 1.55);
    
    return (
      <TouchableOpacity
        style={[styles.newInCard, { width: cardW }, style]}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <View style={{ position: 'relative', width: cardW, height: cardW }}>
          {/* Product image */}
          <ProductImage
            uri={imageUri}
            style={[styles.newInImage, { width: cardW, height: cardW }, imageStyle]}
            badgeLabel={platformBadgeLabel}
          />
          
          {/* Like button */}
          {showLikeButton && (
            <TouchableOpacity
              style={styles.newInLikeButton}
              onPress={handleLikePress}
            >
              <HeartPlusIcon
                width={20}
                height={20}
                color={isLiked ? COLORS.red : COLORS.white}
              />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Product info below image */}
        <View style={styles.newInInfo}>
          <Text style={styles.newInName} numberOfLines={1}>
            {String(product.name || '')}
          </Text>
          <View style={styles.newInPriceContainer}>
            <Text style={styles.newInPrice}>
              {formatPriceKRW(product.price)}
            </Text>
            {product.originalPrice && product.originalPrice > product.price && (
              <Text style={styles.newInOriginalPrice}>
                {formatPriceKRW(product.originalPrice)}
              </Text>
            )}
          </View>
          {discountPercentage > 0 && (
            <View style={styles.newInDiscountBadge}>
              <Text style={styles.newInDiscountText}>
                -{discountPercentage}%
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  // Grid variant - flexible layout (can be 2 columns or full width)
  if (variant === 'grid') {
    const cardW = GRID_CARD_WIDTH;
    // For full-width cards, use a different aspect ratio
    const isFullWidth = cardW > GRID_CARD_WIDTH * 1.5;
    const imageW = cardW;
    const imageH = isFullWidth ? 180 : cardW * 1.0;
    
    return (
      <TouchableOpacity
        style={[styles.gridCard, { width: cardW }, isFullWidth && styles.fullWidthCard, style]}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <View style={[styles.imageWrapper, isFullWidth && styles.fullWidthImageWrapper]}>
          <ProductImage
            uri={imageUri}
            style={[styles.gridImage, { width: imageW, height: imageH }, isFullWidth && styles.fullWidthImage, imageStyle]}
            badgeLabel={platformBadgeLabel}
          />
          
          {/* Like button - bottom right */}
          {showLikeButton && (
            <TouchableOpacity
              style={styles.likeButtonRight}
              onPress={handleLikePress}
            >
              <HeartPlusIcon
                width={22}
                height={22}
                color={isLiked ? COLORS.red : COLORS.white}
              />
            </TouchableOpacity>
          )}
        </View>
        
        <View style={[styles.gridInfo, isFullWidth && styles.fullWidthInfo]}>
          <Text style={styles.gridName} numberOfLines={1}>
            {String(product.name || '')}
          </Text>
          <View style={styles.gridPriceRow}>
            <Text style={styles.gridPrice}>{formatPriceKRW(product.price || 0)}</Text>
            {product.originalPrice && (
              <Text style={styles.gridOriginalPrice}>
                {formatPriceKRW(product.originalPrice)}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Horizontal variant - for trending products
  if (variant === 'horizontal') {
    const cardW = GRID_CARD_WIDTH;
    const imageH = cardW * 1.0;
    
    return (
      <TouchableOpacity
        style={[styles.horizontalCard, { width: cardW }, style]}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <View style={styles.imageWrapper}>
          <ProductImage
            uri={imageUri}
            style={[styles.horizontalImage, { width: cardW, height: imageH }, imageStyle]}
            badgeLabel={platformBadgeLabel}
          />
          
          {/* Like button - bottom right */}
          {showLikeButton && (
            <TouchableOpacity
              style={styles.likeButtonRight}
              onPress={handleLikePress}
            >
              <HeartPlusIcon
                width={22}
                height={22}
                color={isLiked ? COLORS.red : COLORS.white}
              />
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.horizontalInfo}>
          <Text style={styles.horizontalName} numberOfLines={1}>
            {String(product.name || '')}
          </Text>
          <View style={styles.horizontalPriceRow}>
            <Text style={styles.horizontalPrice}>{formatPriceKRW(product.price || 0)}</Text>
            {product.originalPrice && (
              <Text style={styles.horizontalOriginalPrice}>
                {formatPriceKRW(product.originalPrice)}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // More to Love variant - shows full info with reviews and sold
  if (variant === 'moreToLove') {
    const cardW = cardWidth || GRID_CARD_WIDTH;
    const imageH = cardW * 1.0;
    // console.log('More to Love Product:', product);
    return (
      <TouchableOpacity
        style={[styles.moreToLoveCard, { width: cardW }, style]}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <View style={{ position: 'relative' }}>
          <View style={{ position: 'relative', width: cardW, height: cardW }}>
            <ProductImage
              uri={imageUri}
              style={[styles.moreToLoveImage, { width: cardW + 1, height: imageH }, imageStyle]}
              badgeLabel=""
            />
          </View>
          {/* <MoreToLoveImage /> */}
          
          {/* Like button - bottom right */}
          {showLikeButton && (
            <TouchableOpacity
              style={styles.likeButtonRight}
              onPress={handleLikePress}
            >
              <HeartPlusIcon
                width={22}
                height={22}
                color={isLiked ? COLORS.red : COLORS.white}
              />
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.moreToLoveInfo}>
          {/* Line 1: Product Name and Review in one line */}
          <View style={styles.moreToLoveNameRow}>
            <Text style={styles.moreToLoveName} numberOfLines={1}>
              {String(product.name || '')}
            </Text>
            {showRating && product.rating > 0 && (
              <View style={styles.moreToLoveReview}>
                <FamilyStarIcon width={12} height={12} color="#E5B546" />
                <Text style={styles.moreToLoveReviewText}>
                  {product.rating.toFixed(1)}
                </Text>
              </View>
            )}
          </View>
          
          {/* Line 2: Price with discount in same line */}
          <View style={styles.moreToLovePriceRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}>
              <Text style={styles.moreToLovePrice}>
                {formatPriceKRW(product.price || 0)}
              </Text>
              {product.originalPrice && product.originalPrice > product.price && (
                <Text style={styles.moreToLoveOriginalPrice}>
                  {formatPriceKRW(product.originalPrice)}
                </Text>
              )}
            </View>
            {discountPercentage > 0 && (
              <Text style={styles.moreToLoveDiscount}>
                -{discountPercentage}%
              </Text>
            )}
          </View>
          
          {/* Line 3: Live Text with scrolling animation */}
          {/* <LiveText product={product} /> */}
        </View>
      </TouchableOpacity>
    );
  }

  // Simple variant - for category page (image, name, price only)
  if (variant === 'simple') {
    const cardW = cardWidth || GRID_CARD_WIDTH;
    const imageH = cardW; // Square image (height = width)
    
    return (
      <TouchableOpacity
        style={[styles.simpleCard, { width: GRID_CARD_WIDTH }, style]}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <View style={{ position: 'relative', width: cardW, height: imageH }}>
          <ProductImage
            uri={imageUri}
            style={[styles.simpleImage, { width: GRID_CARD_WIDTH, height: GRID_CARD_WIDTH }, imageStyle]}
            badgeLabel={platformBadgeLabel}
          />
        </View>
        <View style={styles.simpleInfo}>
          <Text style={styles.simpleName} numberOfLines={2}>
            {String(product.name || '')}
          </Text>
          {/* <Text style={styles.simplePrice}>{formatPriceKRW(product.price || 0)}</Text> */}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.productCard, style]}
      onPress={onPress}
    >
      <View style={styles.productImageContainer}>
        <ProductImage
          uri={imageUri}
          style={[styles.productImage, imageStyle]}
          badgeLabel={platformBadgeLabel}
        />
        
        {showLikeButton && (
          <TouchableOpacity
            style={styles.likeButtonRight}
            onPress={handleLikePress}
          >
            <HeartPlusIcon
              width={22}
              height={22}
              color={isLiked ? COLORS.red : COLORS.white}
            />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {String(product.name || '')}
        </Text>
        
        <View style={styles.priceContainer}>
          {product.originalPrice && (
            <Text style={styles.originalPrice}>{formatPriceKRW(product.originalPrice)}</Text>
          )}
          <Text style={styles.productPrice}>{formatPriceKRW(product.price || 0)}</Text>
        </View>
        
        {showRating && (
          <View style={styles.ratingContainer}>
            <Icon name="star" size={12} color="#FFD700" />
            <Text style={styles.ratingText}>
              {String(product.rating || 0)} ({String(product.reviewCount || 0)})
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Default variant
  productCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.sm,
    marginBottom: SPACING.md,
  },
  productImageContainer: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 12,
  },
  productImage: {
    width: '100%',
    height: 180,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  productInfo: {
    padding: SPACING.sm,
  },
  productName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
    lineHeight: 18,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  originalPrice: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
    textDecorationLine: 'line-through',
    marginRight: SPACING.xs,
  },
  productPrice: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.red,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // New In variant
  newInCard: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    marginBottom: SPACING.md,
  },
  newInImage: {
    borderRadius: 8,
    borderBottomRightRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  newInLikeButton: {
    position: 'absolute',
    bottom: SPACING.xs,
    right: SPACING.xs,
    width: 28,
    height: 28,
    borderRadius: 16,
    backgroundColor: '#00000066',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newInInfo: {
    padding: SPACING.xs,
  },
  newInName: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
    lineHeight: 18,
  },
  newInPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  newInPrice: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  newInOriginalPrice: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[400],
    textDecorationLine: 'line-through',
  },
  newInCurrency: {
    fontSize: FONTS.sizes.xs,
  },
  newInDiscountBadge: {
    marginTop: SPACING.xs / 2,
    backgroundColor: COLORS.red,
    paddingHorizontal: SPACING.xs,
    borderRadius: 4,
    borderBottomRightRadius: 8,
    borderTopRightRadius: 0,
    alignSelf: 'flex-start',
  },
  newInDiscountText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.white,
    fontWeight: '700',
  },
  
  // Grid variant
  gridCard: {
    marginBottom: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
  },
  fullWidthCard: {
    flexDirection: 'row',
    padding: SPACING.sm,
  },
  gridImage: {
    marginBottom: SPACING.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  fullWidthImage: {
    marginBottom: 0,
    marginRight: SPACING.md,
  },
  gridInfo: {
    flex: 1,
  },
  fullWidthInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  fullWidthImageWrapper: {
    width: 200,
    marginRight: SPACING.md,
  },
  gridName: {
    fontSize: FONTS.sizes.smmd,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginBottom: 6,
    lineHeight: 18,
  },
  gridPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gridPrice: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.red,
  },
  gridOriginalPrice: {
    fontSize: FONTS.sizes.smmd,
    color: COLORS.gray[500],
    textDecorationLine: 'line-through',
  },
  
  // Horizontal variant (trending)
  horizontalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  horizontalImage: {
    marginBottom: SPACING.sm,
    marginRight: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  horizontalInfo: {
    flex: 1,
  },
  horizontalName: {
    fontSize: FONTS.sizes.smmd,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginBottom: 6,
    lineHeight: 18,
  },
  horizontalPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  horizontalPrice: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.red,
  },
  horizontalOriginalPrice: {
    fontSize: FONTS.sizes.smmd,
    color: COLORS.gray[500],
    textDecorationLine: 'line-through',
  },
  
  // More to Love variant
  moreToLoveCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    overflow: 'hidden',
    // paddingBottom: SPACING.sm,
    marginBottom: SPACING.md,
  },
  moreToLoveImage: {
    marginBottom: SPACING.sm,
    borderRadius: 12,
    // borderBottomRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  moreToLoveInfo: {
    flex: 1,
    paddingHorizontal: 4,
    paddingBottom: 10,
  },
  moreToLoveNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  moreToLoveName: {
    fontSize: FONTS.sizes.smmd,
    fontWeight: '500',
    color: COLORS.text.primary,
    flex: 1,
    marginRight: SPACING.xs,
    maxWidth: '75%', // Reduce width to make room for review
    lineHeight: 18,
  },
  moreToLoveReview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  moreToLoveReviewText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  moreToLovePriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.xs,
    marginTop: 2,
  },
  moreToLovePrice: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  moreToLoveCurrency: {
    fontSize: FONTS.sizes.xs,
  },
  moreToLoveOriginalPrice: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[400],
    textDecorationLine: 'line-through',
  },
  moreToLoveDiscount: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.red,
    fontWeight: '600',
  },
  
  // Simple variant (category page)
  simpleCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  simpleImage: {
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  simpleInfo: {
    padding: SPACING.sm,
  },
  simpleName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginBottom: 4,
    lineHeight: 18,
  },
  simplePrice: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.red,
  },
  
  // Shared styles
  imageWrapper: {
    position: 'relative',
  },
  likeButtonRight: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 28,
    height: 28,
    borderRadius: 18,
    backgroundColor: '#00000066',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.white,
    zIndex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  discountBadgeInline: {
    backgroundColor: COLORS.red,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  discountTextInline: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  ratingText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '500',
    marginLeft: 4,
  },
  soldText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  platformBadge: {
    position: 'absolute',
    top: 8,
    left: 0,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderTopRightRadius: BORDER_RADIUS.full,
    borderBottomRightRadius: BORDER_RADIUS.full,
    zIndex: 2,
  },
  platformBadgeText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
  },
  
  // Live text styles
  liveTextContainer: {
    height: 20,
    marginVertical: 2,
    overflow: 'hidden',
  },
  liveText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.error,
    fontWeight: '600',
    lineHeight: 20,
  },
});

// Memoize ProductCard to prevent unnecessary re-renders
// Only re-render when props actually change
export default React.memo(ProductCard, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.product?.id === nextProps.product?.id &&
    prevProps.isLiked === nextProps.isLiked &&
    prevProps.variant === nextProps.variant &&
    prevProps.showLikeButton === nextProps.showLikeButton &&
    prevProps.showDiscountBadge === nextProps.showDiscountBadge &&
    prevProps.showRating === nextProps.showRating &&
    prevProps.product?.image === nextProps.product?.image &&
    prevProps.product?.name === nextProps.product?.name &&
    prevProps.product?.price === nextProps.product?.price &&
    prevProps.product?.originalPrice === nextProps.product?.originalPrice
  );
});
