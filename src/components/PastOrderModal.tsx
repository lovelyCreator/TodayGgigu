import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import Icon from './Icon';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants';
import { useTranslation } from '../hooks/useTranslation';
import { orderApi, mapLocaleToOrdersLang } from '../services/orderApi';
import type { Order, OrderItem } from '../types';

interface PastOrderModalProps {
  visible: boolean;
  onClose: () => void;
  /** 선택된 과거주문(세트상품/바로주문)을 상위(장바구니)에서 처리. */
  onSubmit?: (orders: Order[], mode: 'set' | 'buyNow') => void;
}

const PAGE_SIZE = 10;

/** 다국어 필드에서 현재 로케일 값 선택. */
const pickLang = (
  value: string | Record<string, string> | undefined,
  locale: string,
  fallback = '',
): string => {
  if (!value) return fallback;
  if (typeof value === 'string') return value || fallback;
  return value[locale] || value.ko || value.en || value.zh || fallback;
};

const formatYuan = (n: number): string => `¥${(Number(n) || 0).toFixed(2)}`;
const formatDate = (iso?: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const PastOrderModal: React.FC<PastOrderModalProps> = ({ visible, onClose, onSubmit }) => {
  const { t, locale } = useTranslation();
  const lng = (locale as string) || 'ko';

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // 'all' = 전체 과거주문, 'set' = 세트상품(번들) 주문만.
  const [viewMode, setViewMode] = useState<'all' | 'set'>('all');

  const tk = (key: string, fallback: string) => {
    const v = t(`cartOrder.pastOrder.${key}`);
    return v && v !== `cartOrder.pastOrder.${key}` ? v : fallback;
  };

  const fetchOrders = useCallback(
    async (p: number, search: string) => {
      setLoading(true);
      try {
        const res = await orderApi.getOrders({
          page: p,
          pageSize: PAGE_SIZE,
          lang: mapLocaleToOrdersLang(lng),
          viewFilter: 'all',
          ...(search.trim() ? { search: search.trim() } : {}),
        });
        if (res.success && res.data?.orders) {
          setOrders(res.data.orders);
          setTotal(res.data.pagination?.total ?? res.data.orders.length);
          setTotalPages(res.data.pagination?.totalPages ?? 1);
        } else {
          setOrders([]);
          setTotal(0);
          setTotalPages(1);
        }
      } catch {
        setOrders([]);
        setTotal(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    },
    [lng],
  );

  // 모달이 열릴 때 1페이지 로드.
  useEffect(() => {
    if (visible) {
      setPage(1);
      setSelectedIds(new Set());
      setSearchQuery('');
      setAppliedSearch('');
      setViewMode('all');
      fetchOrders(1, '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  /** 세트상품(번들) 주문 판별 — 번들 비용이 있거나 상위 주문번호가 있으면 세트. */
  const isSetOrder = (o: Order): boolean =>
    (o as any).bundleSecondTierCost != null || (o as any).parentOrderNumber != null;

  // viewMode(전체/세트) + 통합 검색(주문번호/상품번호/상품명/상품링크) 필터.
  const filteredOrders = useMemo(() => {
    let list = viewMode === 'set' ? orders.filter(isSetOrder) : orders;
    const q = appliedSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((o) => {
      if (String(o.orderNumber || '').toLowerCase().includes(q)) return true;
      return (o.items || []).some((it) => {
        const no = String(it.productNo ?? it.itemUniqueNo ?? '').toLowerCase();
        const name = pickLang(it.subjectMultiLang as any, lng, it.subject || '').toLowerCase();
        const link = String((it as any).promotionUrl || '').toLowerCase();
        return no.includes(q) || name.includes(q) || link.includes(q);
      });
    });
  }, [orders, appliedSearch, lng, viewMode]);

  const allSelected =
    filteredOrders.length > 0 && filteredOrders.every((o) => selectedIds.has(o._id || o.orderNumber));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOrders.map((o) => o._id || o.orderNumber)));
    }
  };
  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const submitSelected = (mode: 'set' | 'buyNow') => {
    const chosen = filteredOrders.filter((o) => selectedIds.has(o._id || o.orderNumber));
    if (chosen.length === 0) return;
    onSubmit?.(chosen, mode);
    onClose();
  };

  const doSearch = () => {
    setAppliedSearch(searchQuery);
    setPage(1);
    fetchOrders(1, searchQuery);
  };

  const goPage = (p: number) => {
    if (p < 1 || p > totalPages || p === page) return;
    setPage(p);
    fetchOrders(p, appliedSearch);
  };

  const renderItemRow = (item: OrderItem) => {
    const subject = pickLang(item.subjectMultiLang as any, lng, item.subject || '');
    const attrs = (item.skuAttributes || []) as any[];
    const attrText = attrs
      .map((a) => {
        const name = pickLang(a.attributeNameMultiLang, lng, a.attributeNameTrans || a.attributeName || '');
        const val = pickLang(a.valueMultiLang, lng, a.valueTrans || a.value || '');
        return name && val ? `${name}: ${val}` : '';
      })
      .filter(Boolean)
      .join(' / ');
    const unit = item.userPrice ?? item.price ?? 0;
    const subtotal = item.subtotal ?? unit * (item.quantity || 1);
    return (
      <View key={item._id || String(item.productNo)} style={styles.itemRow}>
        <View style={styles.itemBadge}>
          <Text style={styles.itemBadgeText}>{item.productNo || item.itemUniqueNo || ''}</Text>
        </View>
        <Image
          source={{ uri: item.imageUrl || 'https://via.placeholder.com/56' }}
          style={styles.itemImage}
        />
        <View style={styles.itemInfo}>
          <Text style={styles.itemSubject} numberOfLines={2}>{subject}</Text>
          {attrText ? <Text style={styles.itemAttr} numberOfLines={1}>{attrText}</Text> : null}
          <Text style={styles.itemMeta}>{tk('quantity', '수량')}: {item.quantity || 1}</Text>
          <Text style={styles.itemPrice}>{formatYuan(unit)}</Text>
          {item.price != null && item.userPrice != null && item.price !== item.userPrice ? (
            <Text style={styles.itemOriginal}>{tk('originalPrice', '원가')} {formatYuan(item.price)}</Text>
          ) : null}
          <Text style={styles.itemAmount}>
            {tk('productAmount', '상품금액')}: <Text style={styles.itemAmountValue}>{formatYuan(subtotal)}</Text>
          </Text>
        </View>
      </View>
    );
  };

  const renderOrder = ({ item: order }: { item: Order }) => {
    const id = order._id || order.orderNumber;
    const items = order.items || [];
    const company = items[0]
      ? pickLang((items[0] as any).companyNameMultiLang, lng, items[0].companyName || '')
      : '';
    const orderTotal = items.reduce(
      (s, it) => s + (it.subtotal ?? (it.userPrice ?? it.price ?? 0) * (it.quantity || 1)),
      0,
    );
    const checked = selectedIds.has(id);
    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <TouchableOpacity onPress={() => toggleOne(id)} style={styles.checkboxHit}>
            <View style={[styles.checkbox, checked && styles.checkboxOn]}>
              {checked && <Icon name="checkmark" size={12} color={COLORS.white} />}
            </View>
          </TouchableOpacity>
          <Text style={styles.orderHeaderText} numberOfLines={1}>
            <Text style={styles.orderHeaderStrong}>{tk('orderDate', '주문 날짜')} {formatDate(order.createdAt)}</Text>
            {'  '}<Text style={styles.orderHeaderNum}>{order.orderNumber}</Text>
            {company ? `  ${company}` : ''}
          </Text>
        </View>
        <View style={styles.orderHeaderSub}>
          <Text style={styles.orderHeaderCount}>
            {(tk('itemsCount', '{n}개 상품') || '').replace('{n}', String(items.length))}
          </Text>
          <Text style={styles.orderHeaderTotal}>{formatYuan(orderTotal)}</Text>
        </View>
        {items.map(renderItemRow)}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={[
        'portrait',
        'portrait-upside-down',
        'landscape',
        'landscape-left',
        'landscape-right',
      ]}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{tk('title', '과거주문')}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={22} color={COLORS.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Toolbar */}
          <View style={styles.toolbar}>
            <View style={styles.selectAllWrap}>
              <TouchableOpacity onPress={toggleAll} style={styles.checkboxHit}>
                <View style={[styles.checkbox, allSelected && styles.checkboxOn]}>
                  {allSelected && <Icon name="checkmark" size={12} color={COLORS.white} />}
                </View>
              </TouchableOpacity>
              <Text style={styles.selectAllText}>{tk('selectAll', '전체선택')}</Text>
              <View style={styles.toolbarDivider} />
              {/* 과거주문(전체) ↔ 세트상품 토글 */}
              <TouchableOpacity onPress={() => setViewMode('all')}>
                <Text style={[styles.toolbarTitle, viewMode === 'all' && styles.toolbarTitleActive]}>
                  {tk('title', '과거주문')}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.toolbarBtns}>
              <TouchableOpacity
                style={[styles.setBtn, viewMode === 'set' && styles.setBtnActive]}
                onPress={() => setViewMode('set')}
              >
                <Text style={[styles.setBtnText, viewMode === 'set' && styles.setBtnTextActive]}>
                  {tk('setProduct', '세트상품')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.buyBtn} onPress={() => submitSelected('buyNow')}>
                <Text style={styles.buyBtnText}>{tk('buyNow', '바로주문')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 통합 검색 — 주문번호 / 상품번호 / 상품명 / 상품링크 */}
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={tk('searchPlaceholder', '주문번호, 상품번호, 상품명, 상품링크')}
              placeholderTextColor={COLORS.gray[400]}
              returnKeyType="search"
              onSubmitEditing={doSearch}
            />
            <TouchableOpacity style={styles.searchBtn} onPress={doSearch}>
              <Text style={styles.searchBtnText}>{tk('search', '검색')}</Text>
            </TouchableOpacity>
          </View>

          {/* List */}
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={COLORS.red} />
            </View>
          ) : (
            <FlatList
              data={filteredOrders}
              keyExtractor={(o) => o._id || o.orderNumber}
              renderItem={renderOrder}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>{tk('empty', '과거 주문이 없습니다')}</Text>
                </View>
              }
            />
          )}

          {/* Pagination */}
          <View style={styles.pagination}>
            <Text style={styles.paginationText}>
              {tk('display', '표시')} {PAGE_SIZE} / {total}{tk('countSuffix', '건')}
            </Text>
            <View style={styles.pageBtns}>
              <TouchableOpacity
                style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                disabled={page <= 1}
                onPress={() => goPage(page - 1)}
              >
                <Text style={styles.pageBtnText}>{tk('prev', '이전')}</Text>
              </TouchableOpacity>
              <Text style={styles.pageIndicator}>{page} / {totalPages}</Text>
              <TouchableOpacity
                style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
                disabled={page >= totalPages}
                onPress={() => goPage(page + 1)}
              >
                <Text style={styles.pageBtnText}>{tk('next', '다음')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: SPACING.md },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    maxWidth: 680,
    width: '100%',
    maxHeight: '90%',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  title: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text.primary },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  selectAllWrap: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, flexShrink: 1 },
  selectAllText: { fontSize: FONTS.sizes.sm, color: COLORS.text.secondary, marginLeft: 4 },
  toolbarDivider: { width: 2, height: 14, backgroundColor: COLORS.red, marginHorizontal: SPACING.sm },
  toolbarTitle: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.gray[500] },
  toolbarTitleActive: { color: COLORS.red },
  toolbarBtns: { flexDirection: 'row', gap: SPACING.sm },
  setBtn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderWidth: 1, borderColor: COLORS.gray[300], borderRadius: BORDER_RADIUS.md },
  setBtnActive: { borderColor: COLORS.red, backgroundColor: COLORS.lightRed },
  setBtnText: { fontSize: FONTS.sizes.sm, color: COLORS.text.primary, fontWeight: '600' },
  setBtnTextActive: { color: COLORS.red, fontWeight: '700' },
  buyBtn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, backgroundColor: '#F4A78F', borderRadius: BORDER_RADIUS.md },
  buyBtnText: { fontSize: FONTS.sizes.sm, color: COLORS.white, fontWeight: '700' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm },
  searchInput: {
    flex: 1,
    height: 38,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },
  searchBtn: { backgroundColor: COLORS.red, borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.md, height: 38, justifyContent: 'center' },
  searchBtnText: { color: COLORS.white, fontSize: FONTS.sizes.sm, fontWeight: '700' },
  listContent: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
  loadingBox: { paddingVertical: SPACING['2xl'], alignItems: 'center' },
  emptyBox: { paddingVertical: SPACING['2xl'], alignItems: 'center' },
  emptyText: { color: COLORS.text.secondary, fontSize: FONTS.sizes.sm },
  orderCard: { borderWidth: 1, borderColor: COLORS.gray[200], borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.md, overflow: 'hidden' },
  orderHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.sm, paddingTop: SPACING.sm, gap: SPACING.xs },
  checkboxHit: { padding: 2 },
  orderHeaderText: { flex: 1, fontSize: FONTS.sizes.xs, color: COLORS.text.secondary },
  orderHeaderStrong: { fontWeight: '700', color: COLORS.text.primary },
  orderHeaderNum: { color: COLORS.gray[500] },
  orderHeaderSub: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.sm, paddingBottom: SPACING.xs },
  orderHeaderCount: { fontSize: FONTS.sizes.xs, color: COLORS.text.secondary },
  orderHeaderTotal: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.red },
  itemRow: { flexDirection: 'row', padding: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.gray[100], gap: SPACING.sm },
  itemBadge: { backgroundColor: '#2B3A52', borderRadius: BORDER_RADIUS.sm, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
  itemBadgeText: { color: COLORS.white, fontSize: FONTS.sizes.xs, fontWeight: '700' },
  itemImage: { width: 56, height: 56, borderRadius: BORDER_RADIUS.sm, backgroundColor: COLORS.gray[100] },
  itemInfo: { flex: 1, minWidth: 0 },
  itemSubject: { fontSize: FONTS.sizes.sm, color: COLORS.text.primary, fontWeight: '600' },
  itemAttr: { fontSize: FONTS.sizes.xs, color: COLORS.text.secondary, marginTop: 2 },
  itemMeta: { fontSize: FONTS.sizes.xs, color: COLORS.text.secondary, marginTop: 4 },
  itemPrice: { fontSize: FONTS.sizes.sm, color: COLORS.text.primary, fontWeight: '700', marginTop: 2 },
  itemOriginal: { fontSize: FONTS.sizes.xs, color: COLORS.gray[400], textDecorationLine: 'line-through' },
  itemAmount: { fontSize: FONTS.sizes.xs, color: COLORS.text.secondary, marginTop: 2 },
  itemAmountValue: { color: COLORS.red, fontWeight: '700' },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  paginationText: { fontSize: FONTS.sizes.xs, color: COLORS.text.secondary },
  pageBtns: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  pageBtn: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.gray[300], borderRadius: BORDER_RADIUS.sm },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { fontSize: FONTS.sizes.xs, color: COLORS.text.primary },
  pageIndicator: { fontSize: FONTS.sizes.xs, color: COLORS.text.primary, fontWeight: '600' },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORS.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: COLORS.red, borderColor: COLORS.red },
});

export default PastOrderModal;
