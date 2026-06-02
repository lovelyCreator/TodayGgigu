import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { COLORS, SPACING } from '../../constants';
import SkeletonBlock from './SkeletonBlock';

const { width } = Dimensions.get('window');

interface Props {
  /**
   * URL of the image already in cache (passed from the previous screen).
   * When provided, the hero slot reserves the same square but stays empty —
   * the real <ProductImage> in `renderImageGallery` will paint over the
   * skeleton as soon as the product detail screen mounts its gallery, so
   * we don't draw a second copy here. We still match the height so the
   * skeleton placeholders below don't shift when the gallery appears.
   */
  hasHeroImage?: boolean;
}

/**
 * Body skeleton that mirrors the silhouette of <ProductDetailScreen>:
 *   - hero gallery square (matches `styles.productImage` height = width)
 *   - title + price block
 *   - variation chips row
 *   - seller card
 *   - description teaser
 *   - related products grid header
 *
 * Drawn while `loading || !product` is true. The real sections fade in on
 * top once the data fetch finishes; reserving the same heights here keeps
 * the FlatList from jumping during that hand-off.
 */
const ProductDetailBodySkeleton: React.FC<Props> = ({ hasHeroImage }) => {
  return (
    <View style={styles.root}>
      {/* Hero slot — same square as the gallery image */}
      <View style={[styles.hero, { backgroundColor: hasHeroImage ? 'transparent' : COLORS.gray[200] }]} />

      {/* Title / meta */}
      <View style={styles.padded}>
        <SkeletonBlock width="80%" height={20} />
        <SkeletonBlock width="55%" height={16} style={{ marginTop: SPACING.sm }} />

        {/* Price */}
        <View style={{ marginTop: SPACING.lg, flexDirection: 'row', alignItems: 'flex-end' }}>
          <SkeletonBlock width={120} height={26} />
          <SkeletonBlock width={70} height={14} style={{ marginLeft: SPACING.sm }} />
        </View>

        {/* Variation chips */}
        <View style={styles.chipRow}>
          {[0, 1, 2, 3].map((i) => (
            <SkeletonBlock
              key={i}
              width={58}
              height={32}
              borderRadius={16}
              style={{ marginRight: SPACING.sm, marginTop: SPACING.sm }}
            />
          ))}
        </View>

        {/* Seller card */}
        <View style={styles.sellerCard}>
          <SkeletonBlock width={44} height={44} borderRadius={22} />
          <View style={{ flex: 1, marginLeft: SPACING.sm }}>
            <SkeletonBlock width="60%" height={14} />
            <SkeletonBlock width="35%" height={12} style={{ marginTop: SPACING.xs }} />
          </View>
          <SkeletonBlock width={68} height={28} borderRadius={14} />
        </View>

        {/* Description teaser */}
        <SkeletonBlock width="40%" height={16} style={{ marginTop: SPACING.lg }} />
        <SkeletonBlock width="100%" height={12} style={{ marginTop: SPACING.sm }} />
        <SkeletonBlock width="95%" height={12} style={{ marginTop: SPACING.xs }} />
        <SkeletonBlock width="70%" height={12} style={{ marginTop: SPACING.xs }} />

        {/* Related products header + grid */}
        <SkeletonBlock width="35%" height={18} style={{ marginTop: SPACING.xl }} />
        <View style={styles.gridRow}>
          {[0, 1].map((i) => (
            <View key={i} style={styles.gridCard}>
              <SkeletonBlock width="100%" height={140} borderRadius={8} />
              <SkeletonBlock width="85%" height={12} style={{ marginTop: SPACING.sm }} />
              <SkeletonBlock width="50%" height={12} style={{ marginTop: SPACING.xs }} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    backgroundColor: COLORS.background,
  },
  hero: {
    width,
    height: width,
  },
  padded: {
    padding: SPACING.md,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.sm,
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: SPACING.sm,
    marginTop: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.gray[100],
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  gridCard: {
    width: '48%',
  },
});

export default ProductDetailBodySkeleton;
