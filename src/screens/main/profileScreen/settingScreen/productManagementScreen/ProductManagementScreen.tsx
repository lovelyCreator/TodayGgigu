import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from '../../../../../components/Icon';
import { COLORS, FONTS, SPACING } from '../../../../../constants';
import { RootStackParamList } from '../../../../../types';
import { useTranslation } from '../../../../../hooks/useTranslation';
import { productListApi, SellerProduct } from '../../../../../services/productListApi';

type Nav = StackNavigationProp<RootStackParamList, 'ProductManagement'>;

const BACK_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

const ProductManagementScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation();

  // Filter UI state. The backend endpoint only consumes categoryKey + status;
  // the remaining filters are part of the layout but not yet wired server-side.
  const [searchText, setSearchText] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [activeSort, setActiveSort] = useState<'uploadTime' | 'sales' | 'price'>('uploadTime');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  type PickerKey = 'productType' | 'category' | 'labelType' | 'extra1' | 'extra2';

  // Filter dropdown selections (value = stable key).
  const [productType, setProductType] = useState('all');
  const [categoryValue, setCategoryValue] = useState('all');
  const [labelType, setLabelType] = useState('select');
  const [extra1, setExtra1] = useState('select');
  const [extra2, setExtra2] = useState('all');
  // Which dropdown's picker is open.
  const [openPicker, setOpenPicker] = useState<null | PickerKey>(null);

  const productTypeOptions = [
    { value: 'all', label: t('profile.productMgmt.typeOptions.all') },
    { value: 'draft', label: t('profile.productMgmt.typeOptions.draft') },
    { value: 'selling', label: t('profile.productMgmt.typeOptions.selling') },
    { value: 'soldOut', label: t('profile.productMgmt.typeOptions.soldOut') },
    { value: 'hidden', label: t('profile.productMgmt.typeOptions.hidden') },
  ];
  const categoryOptions = [
    { value: 'all', label: t('profile.productMgmt.all') },
  ];
  const labelTypeOptions = [
    { value: 'select', label: t('profile.productMgmt.labelOptions.select') },
    { value: 'product', label: t('profile.productMgmt.labelOptions.product') },
    { value: 'foodInspect', label: t('profile.productMgmt.labelOptions.foodInspect') },
  ];
  const extra1Options = [
    { value: 'select', label: t('profile.productMgmt.extra1Options.select') },
    { value: 'optionA', label: t('profile.productMgmt.extra1Options.optionA') },
  ];
  const extra2Options = [
    { value: 'all', label: t('profile.productMgmt.extra2Options.all') },
    { value: 'ordered', label: t('profile.productMgmt.extra2Options.ordered') },
    { value: 'notOrdered', label: t('profile.productMgmt.extra2Options.notOrdered') },
  ];

  const pickerConfig = {
    productType: { options: productTypeOptions, selected: productType, onSelect: setProductType },
    category: { options: categoryOptions, selected: categoryValue, onSelect: setCategoryValue },
    labelType: { options: labelTypeOptions, selected: labelType, onSelect: setLabelType },
    extra1: { options: extra1Options, selected: extra1, onSelect: setExtra1 },
    extra2: { options: extra2Options, selected: extra2, onSelect: setExtra2 },
  } as const;

  const labelFor = (
    options: { value: string; label: string }[],
    selected: string,
  ): string => options.find((o) => o.value === selected)?.label || '';

  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const allSelected = products.length > 0 && selectedIds.length === products.length;

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await productListApi.getProducts({ status: 'selling' });
      if (res.success && res.data?.products) {
        setProducts(res.data.products);
      } else {
        setProducts([]);
        setError(res.message || t('profile.productMgmt.empty'));
      }
    } catch (e: any) {
      setProducts([]);
      setError(e?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : products.map((p) => p._id));
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleDelete = () => {
    if (selectedIds.length === 0) return;
    requestAnimationFrame(() => {
      Alert.alert('', t('profile.productMgmt.deleteConfirm'), [
        { text: t('profile.productMgmt.reset'), style: 'cancel' },
        {
          text: t('profile.productMgmt.delete'),
          style: 'destructive',
          onPress: () => {
            // Optimistic local removal; wire to a delete endpoint when available.
            setProducts((prev) => prev.filter((p) => !selectedIds.includes(p._id)));
            setSelectedIds([]);
          },
        },
      ]);
    });
  };

  const thumbOf = (p: SellerProduct): string | null =>
    p.thumbnails?.find((th) => th.isThumbnail)?.url || p.thumbnails?.[0]?.url || null;

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        hitSlop={BACK_HIT_SLOP}
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Icon name="arrow-back" size={22} color={COLORS.text.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{t('profile.productMgmt.title')}</Text>
      <View style={styles.backButton} />
    </View>
  );

  // --- Filter panel: label on the LEFT, box on the RIGHT ---
  const renderFilterDropdown = (pickerKey: PickerKey, label: string) => {
    const cfg = pickerConfig[pickerKey];
    const open = openPicker === pickerKey;
    return (
      <View style={styles.filterRow}>
        <Text style={styles.filterRowLabel}>{label}</Text>
        <TouchableOpacity
          style={[styles.dropdownBox, open && styles.dropdownBoxActive]}
          activeOpacity={0.7}
          onPress={() => setOpenPicker(pickerKey)}
        >
          <Text style={styles.dropdownValue} numberOfLines={1}>
            {labelFor(cfg.options, cfg.selected)}
          </Text>
          <Icon
            name={open ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={open ? COLORS.red : COLORS.gray[500]}
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderSortChip = (
    key: 'uploadTime' | 'sales' | 'price',
    label: string,
  ) => {
    const active = activeSort === key;
    return (
      <TouchableOpacity
        style={[styles.sortChip, active && styles.sortChipActive]}
        activeOpacity={0.7}
        onPress={() => setActiveSort(key)}
      >
        <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>
          {label}
        </Text>
        <Icon
          name={key === 'uploadTime' ? 'arrow-down' : 'arrow-up'}
          size={12}
          color={active ? COLORS.red : COLORS.gray[500]}
        />
      </TouchableOpacity>
    );
  };

  const renderFilters = () => (
    <View style={styles.filterPanel}>
      {/* Search row: label left, input box right */}
      <View style={styles.filterRow}>
        <Text style={styles.filterRowLabel}>{t('profile.productMgmt.inquiry')}</Text>
        <View style={styles.searchBox}>
          <TextInput
            style={styles.searchInput}
            placeholder={t('profile.productMgmt.searchPlaceholder')}
            placeholderTextColor={COLORS.gray[400]}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      {/* Dropdowns: label left, box right */}
      {renderFilterDropdown('productType', t('profile.productMgmt.productType'))}
      {renderFilterDropdown('category', t('profile.productMgmt.category'))}
      {renderFilterDropdown('labelType', t('profile.productMgmt.labelType'))}

      {/* Sort chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sortRow}
      >
        {renderSortChip('uploadTime', t('profile.productMgmt.uploadTime'))}
        {renderSortChip('sales', t('profile.productMgmt.sales'))}
        {renderSortChip('price', t('profile.productMgmt.price'))}
      </ScrollView>

      {/* Price range */}
      <View style={styles.priceRow}>
        <TextInput
          style={styles.priceInput}
          placeholder="¥ 0.00"
          placeholderTextColor={COLORS.gray[400]}
          keyboardType="numeric"
          value={priceMin}
          onChangeText={setPriceMin}
        />
        <Text style={styles.priceTilde}>~</Text>
        <TextInput
          style={styles.priceInput}
          placeholder="¥ 0.00"
          placeholderTextColor={COLORS.gray[400]}
          keyboardType="numeric"
          value={priceMax}
          onChangeText={setPriceMax}
        />
      </View>

      {/* Date range placeholder */}
      <View style={styles.dateRow}>
        <Icon name="time-outline" size={16} color={COLORS.gray[400]} />
        <Text style={styles.datePlaceholder}>
          {t('profile.productMgmt.dateRangePlaceholder')}
        </Text>
      </View>

      {/* Search / Reset */}
      <View style={styles.filterActions}>
        <TouchableOpacity
          style={styles.searchButton}
          activeOpacity={0.85}
          onPress={loadProducts}
        >
          <Text style={styles.searchButtonText}>{t('profile.productMgmt.search')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.resetButton}
          activeOpacity={0.7}
          onPress={() => {
            setSearchText('');
            setPriceMin('');
            setPriceMax('');
            setActiveSort('uploadTime');
          }}
        >
          <Text style={styles.resetButtonText}>{t('profile.productMgmt.reset')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // --- Bulk action toolbar ---
  const renderToolbar = () => {
    const hasSelection = selectedIds.length > 0;
    return (
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={styles.selectAllWrap}
          activeOpacity={0.7}
          onPress={toggleSelectAll}
        >
          <View style={[styles.checkbox, allSelected && styles.checkboxChecked]}>
            {allSelected && <Icon name="checkmark" size={12} color={COLORS.white} />}
          </View>
          <Text style={styles.selectAllText}>{t('profile.productMgmt.selectAll')}</Text>
        </TouchableOpacity>

        <View style={styles.toolbarActions}>
          <TouchableOpacity style={styles.registerButton} activeOpacity={0.85}>
            <Text style={styles.registerButtonText}>
              {t('profile.productMgmt.register')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.outlineButton, !hasSelection && styles.outlineButtonDisabled]}
            activeOpacity={0.7}
            disabled={!hasSelection}
          >
            <Text
              style={[
                styles.outlineButtonText,
                !hasSelection && styles.outlineButtonTextDisabled,
              ]}
            >
              {t('profile.productMgmt.download')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.outlineButton, !hasSelection && styles.outlineButtonDisabled]}
            activeOpacity={0.7}
            disabled={!hasSelection}
            onPress={handleDelete}
          >
            <Text
              style={[
                styles.outlineButtonText,
                !hasSelection && styles.outlineButtonTextDisabled,
              ]}
            >
              {t('profile.productMgmt.delete')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewToggleBtn, viewMode === 'grid' && styles.viewToggleBtnActive]}
            onPress={() => setViewMode('grid')}
          >
            <Icon
              name="grid"
              size={16}
              color={viewMode === 'grid' ? COLORS.white : COLORS.gray[500]}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]}
            onPress={() => setViewMode('list')}
          >
            <Icon
              name="list"
              size={16}
              color={viewMode === 'list' ? COLORS.white : COLORS.gray[500]}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // --- Product item ---
  const renderProductItem = ({ item }: { item: SellerProduct }) => {
    const checked = selectedIds.includes(item._id);
    const thumb = thumbOf(item);
    return (
      <TouchableOpacity
        style={[styles.productCard, viewMode === 'grid' && styles.productCardGrid]}
        activeOpacity={0.8}
        onPress={() => toggleSelectOne(item._id)}
      >
        <View style={[styles.checkbox, checked && styles.checkboxChecked, styles.cardCheckbox]}>
          {checked && <Icon name="checkmark" size={12} color={COLORS.white} />}
        </View>
        {thumb ? (
          <Image source={{ uri: thumb }} style={styles.productImage} resizeMode="cover" />
        ) : (
          <View style={[styles.productImage, styles.productImagePlaceholder]}>
            <Icon name="image-outline" size={28} color={COLORS.gray[400]} />
          </View>
        )}
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.productName}
          </Text>
          {!!item.sku && <Text style={styles.productMeta}>SKU: {item.sku}</Text>}
          {!!item.labelName && (
            <View style={styles.labelBadge}>
              <Text style={styles.labelBadgeText}>{item.labelName}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderBody = () => {
    if (loading) {
      return (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.red} />
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.centerBox}>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadProducts}>
            <Text style={styles.retryButtonText}>{t('profile.productMgmt.search')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (products.length === 0) {
      return (
        <View style={styles.centerBox}>
          <Text style={styles.emptyText}>{t('profile.productMgmt.empty')}</Text>
        </View>
      );
    }
    return (
      <FlatList
        key={viewMode}
        data={products}
        keyExtractor={(item) => item._id}
        renderItem={renderProductItem}
        numColumns={viewMode === 'grid' ? 2 : 1}
        columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
        contentContainerStyle={styles.listContent}
        scrollEnabled={false}
        ListFooterComponent={
          <View style={styles.loadingDoneRow}>
            <View style={styles.loadingDoneLine} />
            <Text style={styles.loadingDoneText}>
              {t('profile.productMgmt.loadingDone')}
            </Text>
            <View style={styles.loadingDoneLine} />
          </View>
        }
      />
    );
  };

  // --- Dropdown picker modal ---
  const renderPickerModal = () => {
    if (!openPicker) return null;
    const cfg = pickerConfig[openPicker];
    return (
      <Modal
        visible
        transparent
        animationType="fade"
        onRequestClose={() => setOpenPicker(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setOpenPicker(null)}
        >
          <View style={styles.modalSheet}>
            {cfg.options.map((opt) => {
              const selected = opt.value === cfg.selected;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.modalOption, selected && styles.modalOptionSelected]}
                  activeOpacity={0.7}
                  onPress={() => {
                    cfg.onSelect(opt.value);
                    setOpenPicker(null);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      selected && styles.modalOptionTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {selected && (
                    <Icon name="checkmark" size={18} color={COLORS.white} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderFilters()}
        {renderToolbar()}
        {renderBody()}
      </ScrollView>
      {renderPickerModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  // Filter panel
  filterPanel: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderBottomWidth: 8,
    borderBottomColor: COLORS.gray[100],
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  filterRowLabel: {
    width: 64,
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[700],
  },
  searchBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    paddingHorizontal: SPACING.sm,
    height: 44,
    justifyContent: 'center',
  },
  searchInput: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    padding: 0,
  },
  dropdownBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    paddingHorizontal: SPACING.sm,
    height: 44,
  },
  dropdownBoxActive: {
    borderColor: COLORS.red,
  },
  dropdownValue: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    marginRight: SPACING.xs,
  },
  sortRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
  },
  sortChipActive: {
    borderColor: COLORS.red,
    backgroundColor: 'rgba(255, 85, 0, 0.08)',
  },
  sortChipText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[600],
  },
  sortChipTextActive: {
    color: COLORS.red,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    height: 44,
    paddingHorizontal: SPACING.sm,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },
  priceTilde: {
    marginHorizontal: SPACING.sm,
    fontSize: FONTS.sizes.md,
    color: COLORS.gray[500],
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    height: 44,
    paddingHorizontal: SPACING.sm,
    marginTop: SPACING.sm,
  },
  datePlaceholder: {
    marginLeft: SPACING.xs,
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[400],
  },
  filterActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  searchButton: {
    flex: 1,
    height: 44,
    backgroundColor: COLORS.red,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
  },
  resetButton: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    color: COLORS.gray[700],
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  // Toolbar
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  selectAllWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORS.gray[400],
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.red,
    borderColor: COLORS.red,
  },
  selectAllText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },
  toolbarActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  registerButton: {
    paddingHorizontal: SPACING.sm,
    height: 34,
    backgroundColor: COLORS.red,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
  },
  outlineButton: {
    paddingHorizontal: SPACING.sm,
    height: 34,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButtonDisabled: {
    backgroundColor: COLORS.gray[100],
  },
  outlineButtonText: {
    color: COLORS.gray[700],
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  outlineButtonTextDisabled: {
    color: COLORS.gray[400],
  },
  viewToggle: {
    flexDirection: 'row',
    marginLeft: 'auto',
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 6,
    overflow: 'hidden',
  },
  viewToggleBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggleBtnActive: {
    backgroundColor: COLORS.red,
  },
  // Body
  listContent: {
    padding: SPACING.md,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  productCardGrid: {
    flexDirection: 'column',
    width: '48.5%',
  },
  cardCheckbox: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    zIndex: 2,
    backgroundColor: COLORS.white,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: COLORS.gray[100],
  },
  productImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
    marginLeft: SPACING.sm,
    justifyContent: 'center',
  },
  productName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  productMeta: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
    marginTop: 4,
  },
  labelBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 85, 0, 0.12)',
  },
  labelBadgeText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.red,
    fontWeight: '600',
  },
  centerBox: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.gray[500],
  },
  retryButton: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.red,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  loadingDoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  loadingDoneLine: {
    width: 40,
    height: 1,
    backgroundColor: COLORS.gray[300],
    marginHorizontal: SPACING.sm,
  },
  loadingDoneText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[400],
  },
  // Picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingVertical: SPACING.sm,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  modalOptionSelected: {
    backgroundColor: COLORS.red,
  },
  modalOptionText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
  },
  modalOptionTextSelected: {
    color: COLORS.white,
    fontWeight: '700',
  },
});

export default ProductManagementScreen;
