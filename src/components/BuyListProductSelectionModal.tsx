import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Icon from './Icon';
import { SkeletonBlock } from './Skeleton';
import { COLORS, FONTS, SPACING } from '../constants';
import { useTranslation } from '../hooks/useTranslation';
import { productsApi } from '../services/productsApi';
import { cartApi } from '../services/cartApi';
import { useToast } from '../context/ToastContext';
import {
  buildCartModalSkusFromDetail,
  type CartModalSku,
} from '../utils/buildCartModalSkus';
import {
  buildAddToCartRequestFromDetail,
  buildOrderItemCartFallback,
  type OrderItemCartFallback,
} from '../utils/buildAddToCartRequest';
import { coerceDisplayText } from '../utils/i18nHelpers';

export interface BuyListProductSelectionItem {
  offerId: string;
  productName: string;
  image: string;
  companyName: string;
  companyNameMultiLang?: Record<string, unknown>;
  source?: string;
  skuId?: string;
  specId?: string;
  quantity: number;
  price: number;
}

type ProductCardState = {
  key: string;
  item: BuyListProductSelectionItem;
  skus: CartModalSku[];
  qtyMap: Record<string, number>;
  expanded: boolean;
  openSizeIdx: number;
  loading: boolean;
  productDetail: any | null;
  adding: boolean;
};

const VISIBLE_SKUS = 3;
const BACK_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };
const CARDS_SCROLL_MAX_HEIGHT = Dimensions.get('window').height * 0.65;

interface Props {
  visible: boolean;
  items: BuyListProductSelectionItem[];
  onClose: () => void;
}

export function BuyListProductSelectionModal({ visible, items, onClose }: Props) {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();

  const [cards, setCards] = useState<ProductCardState[]>([]);

  const loadCardDetail = useCallback(
    async (item: BuyListProductSelectionItem, key: string) => {
      const source = item.source || '1688';
      try {
        const res = await productsApi.getProductDetail(item.offerId, source, locale);
        const apiProduct: any =
          (res.data as any)?.product ??
          (res.data as any)?.data?.product ??
          res.data;
        const skus = buildCartModalSkusFromDetail(apiProduct, {
          productName: item.productName,
          galleryFirst: item.image,
          unitPrice: item.price,
          skuId: item.skuId,
          specId: item.specId,
          offerId: item.offerId,
          optionDefaultLabel: t('profile.productMgmt.cartModal.optionDefault'),
        });
        const initialQty: Record<string, number> = {};
        if (item.skuId) {
          initialQty[item.skuId] = Math.max(1, item.quantity || 1);
        }
        setCards((prev) =>
          prev.map((c) =>
            c.key === key
              ? {
                  ...c,
                  skus,
                  loading: false,
                  productDetail: res.data,
                  qtyMap: initialQty,
                }
              : c,
          ),
        );
      } catch {
        const skus = buildCartModalSkusFromDetail(null, {
          productName: item.productName,
          galleryFirst: item.image,
          unitPrice: item.price,
          skuId: item.skuId,
          specId: item.specId,
          offerId: item.offerId,
          optionDefaultLabel: t('profile.productMgmt.cartModal.optionDefault'),
        });
        setCards((prev) =>
          prev.map((c) =>
            c.key === key ? { ...c, skus, loading: false, productDetail: null } : c,
          ),
        );
      }
    },
    [locale, t],
  );

  useEffect(() => {
    if (!visible || items.length === 0) {
      setCards([]);
      return;
    }
    const initial: ProductCardState[] = items.map((item, index) => ({
      key: `${item.offerId}:${item.skuId || item.specId || index}`,
      item,
      skus: [],
      qtyMap: {},
      expanded: false,
      openSizeIdx: -1,
      loading: true,
      productDetail: null,
      adding: false,
    }));
    setCards(initial);
    initial.forEach((card) => {
      loadCardDetail(card.item, card.key);
    });
  }, [visible, items, loadCardDetail]);

  const setCardQty = (cardKey: string, skuId: string, next: number) => {
    setCards((prev) =>
      prev.map((c) =>
        c.key === cardKey
          ? { ...c, qtyMap: { ...c.qtyMap, [skuId]: Math.max(0, next) } }
          : c,
      ),
    );
  };

  const setCardExpanded = (cardKey: string, expanded: boolean) => {
    setCards((prev) =>
      prev.map((c) => (c.key === cardKey ? { ...c, expanded } : c)),
    );
  };

  const setCardOpenSizeIdx = (cardKey: string, idx: number) => {
    setCards((prev) =>
      prev.map((c) => (c.key === cardKey ? { ...c, openSizeIdx: idx } : c)),
    );
  };

  const setCardSkus = (cardKey: string, updater: (skus: CartModalSku[]) => CartModalSku[]) => {
    setCards((prev) =>
      prev.map((c) => (c.key === cardKey ? { ...c, skus: updater(c.skus) } : c)),
    );
  };

  const resolveCompanyLabel = (item: BuyListProductSelectionItem) => {
    const fromMulti = coerceDisplayText(item.companyNameMultiLang, locale);
    if (fromMulti) return fromMulti;
    return item.companyName || '';
  };

  const handleAddCardToCart = async (card: ProductCardState) => {
    const targets: { group: CartModalSku; variant: CartModalSku['sizes'][0]; qty: number }[] = [];
    for (const group of card.skus) {
      for (const variant of group.sizes) {
        const qty = card.qtyMap[variant.skuId] ?? 0;
        if (qty > 0) targets.push({ group, variant, qty });
      }
    }
    if (targets.length === 0) {
      showToast(t('profile.productMgmt.cartModal.qtyRequired'), 'error');
      return;
    }

    setCards((prev) =>
      prev.map((c) => (c.key === card.key ? { ...c, adding: true } : c)),
    );

    let successCount = 0;
    let failCount = 0;
    const fallback = buildOrderItemCartFallback(card.item as OrderItemCartFallback);

    try {
      for (const { variant, qty } of targets) {
        let productDetail = card.productDetail;
        if (!productDetail) {
          const source = card.item.source || '1688';
          const detailRes = await productsApi.getProductDetail(
            card.item.offerId,
            source,
            locale,
          );
          if (!detailRes.success || !detailRes.data) {
            failCount += 1;
            continue;
          }
          productDetail = detailRes.data;
        }

        const request = buildAddToCartRequestFromDetail({
          productDetail,
          quantity: qty,
          locale,
          preferredSkuId: variant.skuId,
          preferredSpecId: variant.specId,
          orderItemFallback: fallback,
        });
        if (!request) {
          failCount += 1;
          continue;
        }
        const response = await cartApi.addToCart(request, locale);
        if (response.success) successCount += 1;
        else failCount += 1;
      }

      if (successCount > 0 && failCount === 0) {
        showToast(t('product.addedToCart'), 'success');
      } else if (successCount > 0) {
        showToast(t('buyList.addToCartPartialSuccess'), 'warning');
      } else {
        showToast(t('product.failedToAdd'), 'error');
      }
    } finally {
      setCards((prev) =>
        prev.map((c) => (c.key === card.key ? { ...c, adding: false } : c)),
      );
    }
  };

  const renderProductCard = (card: ProductCardState) => {
    const { item } = card;
    const mainThumb = item.image || '';
    const hasMore = card.skus.length > VISIBLE_SKUS;
    const visibleSkus = card.expanded ? card.skus : card.skus.slice(0, VISIBLE_SKUS);
    const totalQty = Object.values(card.qtyMap).reduce((s, n) => s + (n || 0), 0);
    const sourceLabel = (item.source || '1688').toUpperCase();

    return (
      <View key={card.key} style={styles.productCard}>
        <View style={styles.productCardHeader}>
          <Text style={styles.productCardName} numberOfLines={2}>
            {item.productName}
          </Text>
          <View style={styles.sourceBadge}>
            <Text style={styles.sourceBadgeText} numberOfLines={1}>
              {resolveCompanyLabel(item) || sourceLabel}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.skuRow}>
          {mainThumb ? (
            <Image source={{ uri: mainThumb }} style={styles.mainImage} resizeMode="cover" />
          ) : (
            <View style={[styles.mainImage, styles.imagePlaceholder]}>
              <Icon name="image-outline" size={32} color={COLORS.gray[400]} />
            </View>
          )}

          <ScrollView
            style={styles.skuList}
            contentContainerStyle={styles.skuListContent}
            showsVerticalScrollIndicator
            nestedScrollEnabled
          >
            {card.loading &&
              Array.from({ length: 3 }).map((_, i) => (
                <View key={i} style={styles.skuBlock}>
                  <View style={styles.skuLine}>
                    <SkeletonBlock width={32} height={32} borderRadius={6} />
                    <View style={{ flex: 1 }}>
                      <SkeletonBlock width={'70%' as any} height={12} borderRadius={3} />
                    </View>
                    <SkeletonBlock width={64} height={24} borderRadius={6} />
                  </View>
                  <View style={styles.skuLine2}>
                    <SkeletonBlock width={56} height={14} borderRadius={3} />
                    <SkeletonBlock width={72} height={24} borderRadius={6} />
                  </View>
                </View>
              ))}

            {!card.loading &&
              visibleSkus.map((sku, gIdx) => {
                const selectedVariant = sku.sizes[sku.selectedSizeIdx] || sku.sizes[0];
                const variantSkuId = selectedVariant?.skuId || sku.skuId;
                const qty = card.qtyMap[variantSkuId] ?? 0;
                const price = selectedVariant?.price ?? sku.price;
                const hasSizes = sku.sizes.length > 0 && sku.sizes.some((s) => s.size);
                const sizeOpen = card.openSizeIdx === gIdx;

                return (
                  <View key={sku.skuId || sku.specId || sku.name} style={styles.skuBlock}>
                    <View style={styles.skuLine}>
                      {sku.image ? (
                        <Image source={{ uri: sku.image }} style={styles.skuThumb} resizeMode="cover" />
                      ) : (
                        <View style={[styles.skuThumb, styles.imagePlaceholder]} />
                      )}
                      <Text style={styles.skuName} numberOfLines={2}>
                        {sku.name}
                      </Text>
                      <TouchableOpacity
                        style={styles.optionPill}
                        activeOpacity={hasSizes && sku.sizes.length > 1 ? 0.7 : 1}
                        onPress={() => {
                          if (!hasSizes || sku.sizes.length <= 1) return;
                          setCardOpenSizeIdx(
                            card.key,
                            card.openSizeIdx === gIdx ? -1 : gIdx,
                          );
                        }}
                      >
                        <Text style={styles.optionText} numberOfLines={1}>
                          {selectedVariant?.size || sku.optionLabel}
                        </Text>
                        <Icon
                          name={sizeOpen ? 'chevron-up' : 'chevron-down'}
                          size={12}
                          color={COLORS.text.secondary}
                        />
                      </TouchableOpacity>
                    </View>

                    {sizeOpen && (
                      <View style={styles.sizeDropdown}>
                        {sku.sizes.map((variant, sIdx) => {
                          const isSel = sIdx === sku.selectedSizeIdx;
                          return (
                            <TouchableOpacity
                              key={variant.skuId || `${sIdx}`}
                              style={[styles.sizeOption, isSel && styles.sizeOptionSelected]}
                              onPress={() => {
                                setCardSkus(card.key, (prev) =>
                                  prev.map((g, idx) =>
                                    idx === gIdx ? { ...g, selectedSizeIdx: sIdx } : g,
                                  ),
                                );
                                setCardOpenSizeIdx(card.key, -1);
                              }}
                            >
                              <Text
                                style={[
                                  styles.sizeOptionText,
                                  isSel && styles.sizeOptionTextSelected,
                                ]}
                              >
                                {variant.size || sku.optionLabel}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    <View style={styles.skuLine2}>
                      <Text style={styles.price}>¥ {price.toFixed(2)}</Text>
                      <View style={styles.qtyBox}>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => setCardQty(card.key, variantSkuId, qty - 1)}
                        >
                          <Icon name="remove" size={14} color={COLORS.text.primary} />
                        </TouchableOpacity>
                        <Text style={styles.qtyValue}>{qty}</Text>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => setCardQty(card.key, variantSkuId, qty + 1)}
                        >
                          <Icon name="add" size={14} color={COLORS.text.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
          </ScrollView>
        </View>

        <View style={styles.cardFooter}>
          {hasMore ? (
            <TouchableOpacity
              style={styles.moreBtn}
              onPress={() => setCardExpanded(card.key, !card.expanded)}
            >
              <Text style={styles.moreText}>
                {card.expanded
                  ? t('profile.productMgmt.cartModal.collapse')
                  : `${t('profile.productMgmt.cartModal.more')} (${card.skus.length - VISIBLE_SKUS})`}
              </Text>
              <Icon
                name={card.expanded ? 'chevron-up' : 'chevron-down'}
                size={12}
                color={COLORS.text.secondary}
              />
            </TouchableOpacity>
          ) : (
            <View />
          )}
          <TouchableOpacity
            style={[styles.confirmBtn, totalQty <= 0 && styles.confirmBtnDisabled]}
            disabled={totalQty <= 0 || card.adding}
            onPress={() => handleAddCardToCart(card)}
          >
            {card.adding ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Icon name="cart-outline" size={14} color={COLORS.white} />
                <Text style={styles.confirmText}>
                  {t('profile.productMgmt.cartModal.confirm')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Modal
      supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']} visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.shell}>
          <View style={styles.header}>
            <View style={styles.iconBox}>
              <Icon name="cart-outline" size={18} color={COLORS.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{t('profile.productMgmt.cartModal.title')}</Text>
              <Text style={styles.subtitle} numberOfLines={2}>
                {t('profile.productMgmt.cartModal.subtitle')}
              </Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>
                {t('buyList.productSelectionModal.productCount', {
                  count: String(items.length),
                })}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={BACK_HIT_SLOP}>
              <Icon name="close" size={20} color={COLORS.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={[styles.cardsScroll, { maxHeight: CARDS_SCROLL_MAX_HEIGHT }]}
            contentContainerStyle={styles.cardsColumn}
            showsVerticalScrollIndicator
            nestedScrollEnabled
          >
            {cards.map(renderProductCard)}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
  },
  shell: {
    width: '100%',
    maxWidth: 920,
    maxHeight: '92%',
    flexDirection: 'column',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FONTS.sizes.md,
    fontWeight: '800',
    color: COLORS.text.primary,
  },
  subtitle: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  countBadge: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: COLORS.gray[50],
  },
  countBadgeText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  cardsScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  cardsColumn: {
    gap: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  productCard: {
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 10,
    padding: SPACING.sm,
    backgroundColor: COLORS.white,
  },
  productCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  productCardName: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  sourceBadge: {
    maxWidth: 110,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sourceBadgeText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.gray[100],
    marginVertical: SPACING.sm,
  },
  skuRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    minHeight: 200,
  },
  mainImage: {
    width: 88,
    height: 88,
    borderRadius: 8,
    backgroundColor: COLORS.gray[100],
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  skuList: {
    flex: 1,
    maxHeight: 280,
  },
  skuListContent: {
    gap: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  skuBlock: {
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  skuLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  skuLine2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    marginTop: 6,
  },
  skuThumb: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: COLORS.gray[100],
  },
  skuName: {
    flex: 1,
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  optionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 64,
    justifyContent: 'space-between',
  },
  optionText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  sizeDropdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 38,
  },
  sizeOption: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 40,
    alignItems: 'center',
  },
  sizeOptionSelected: {
    borderColor: COLORS.red,
    backgroundColor: 'rgba(255, 85, 0, 0.06)',
  },
  sizeOptionText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  sizeOptionTextSelected: {
    color: COLORS.red,
    fontWeight: '700',
  },
  price: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '800',
    color: COLORS.red,
    minWidth: 56,
    textAlign: 'right',
  },
  qtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 6,
  },
  qtyBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: {
    minWidth: 24,
    textAlign: 'center',
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  moreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 6,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    flexShrink: 1,
  },
  moreText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.red,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minHeight: 36,
  },
  confirmBtnDisabled: {
    opacity: 0.45,
  },
  confirmText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.white,
  },
});
