import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import { ScreenSkeleton } from '../../../../../components/Skeleton';
import { COLORS, FONTS, SPACING } from '../../../../../constants';
import { RootStackParamList } from '../../../../../types';
import { useTranslation } from '../../../../../hooks/useTranslation';
import { productListApi, SellerProduct } from '../../../../../services/productListApi';
import { useAddToCartMutation } from '../../../../../hooks/useAddToCartMutation';
import { useToast } from '../../../../../context/ToastContext';
import ImageSearchResultsModal from '../../../searchScreen/ImageSearchResultsModal';

type Nav = StackNavigationProp<RootStackParamList, 'ProductManagement'>;

const BACK_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

// ─── 캘린더 도우미 (시작/종료 날짜 선택 모달에서 사용) ───────────────
const DAY_LABELS_KO = ['일', '월', '화', '수', '목', '금', '토'];

/** 자정 기준으로 날짜만 비교 가능한 Date 반환. */
const stripTime = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** 'YYYY-MM-DD' — 시작/종료 행과 모달 안 입력칸 양쪽에 표시할 때 사용. */
const formatDateForRow = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** 'YYYY년 M월' — 캘린더 헤더. */
const formatMonthHeader = (d: Date): string =>
  `${d.getFullYear()}년 ${d.getMonth() + 1}월`;

/** 주어진 달의 1주(7칸) × 6주(42칸) 그리드. prev/next 달의 채움 셀도 포함.
 *  각 셀: { date, inMonth } — inMonth=false 면 회색 표시. */
const buildMonthGrid = (
  baseFirst: Date,
): Array<{ date: Date; inMonth: boolean }> => {
  const year = baseFirst.getFullYear();
  const month = baseFirst.getMonth();
  const firstWeekday = baseFirst.getDay(); // 0=일
  const cells: Array<{ date: Date; inMonth: boolean }> = [];
  // 앞쪽: 이전 달 채움
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    cells.push({ date: d, inMonth: false });
  }
  // 본달
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ date: new Date(year, month, day), inMonth: true });
  }
  // 뒷쪽: 다음 달 채움 (총 42칸)
  while (cells.length < 42) {
    const tail = cells.length - firstWeekday - daysInMonth + 1;
    cells.push({ date: new Date(year, month + 1, tail), inMonth: false });
  }
  return cells;
};

const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const isBetween = (d: Date, start: Date, end: Date): boolean => {
  const t = stripTime(d).getTime();
  return t > stripTime(start).getTime() && t < stripTime(end).getTime();
};

const ProductManagementScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { t, locale } = useTranslation();

  // Filter UI state. The backend endpoint only consumes categoryKey + status;
  // the remaining filters are part of the layout but not yet wired server-side.
  const [searchText, setSearchText] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  type SortKey = 'uploadTime' | 'sales' | 'price';
  const [activeSort, setActiveSort] = useState<SortKey>('uploadTime');
  // 활성 정렬의 방향 — chip 한 번 더 누르면 asc<->desc 토글.
  // 기본은 desc (최신/높은 가격/높은 판매량부터). 다른 chip 으로 갈아탈 땐 desc 로 초기화.
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  // 보기 모드는 grid 로 고정. 토글 단추는 사용자 요청으로 제거됐지만
  // useState 를 그대로 유지한다 — Fast Refresh 상황에서 hooks 인덱스가
  // 어긋나 "Should have a queue" Render Error 가 뜨는 것을 막기 위함.
  // 또한 추후 토글 단추를 다시 노출할 때 그대로 setter 가 살아 있어야 한다.
  // setViewMode 는 의도적으로 미사용이며 void 처리로 미사용 힌트만 끈다.
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  void setViewMode;

  type PickerKey = 'productType' | 'category' | 'labelType' | 'extra1' | 'extra2';

  // Filter dropdown selections (value = stable key).
  const [productType, setProductType] = useState('all');
  const [categoryValue, setCategoryValue] = useState('all');
  const [labelType, setLabelType] = useState('select');
  const [extra1, setExtra1] = useState('select');
  const [extra2, setExtra2] = useState('all');
  // Which dropdown's picker is open.
  const [openPicker, setOpenPicker] = useState<null | PickerKey>(null);
  // 열린 picker 칩의 화면 절대 좌표 — 모달을 칩 바로 아래에 고정시키기 위해
  // measureInWindow 결과를 저장한다. picker 가 닫히면 null.
  const [pickerLayout, setPickerLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  // 각 picker 칩별 ref — onPress 시 화면 위치를 측정한다.
  const pickerRefs = useRef<Record<PickerKey, View | null>>({
    productType: null,
    category: null,
    labelType: null,
    extra1: null,
    extra2: null,
  });

  // ─── 시작/종료 날짜 선택 모달 ────────────────────────────────────────
  // 시작 시간-종료 시간 행을 누르면 그 행 바로 아래에 떠 있는 캘린더
  // 팝오버가 열린다. 좌측에는 빠른 선택(오늘 / 최근1주 / 최근3개월),
  // 우측에는 두 달치 그리드 + 시작/종료 시각 입력.
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [dateRowLayout, setDateRowLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const dateRowRef = useRef<View | null>(null);
  // 시작·종료 날짜는 자정 기준 Date 객체로 보관. null = 미선택.
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  // 시각 입력은 단순 문자열 — 백엔드 연결 전이라 표시만.
  const [startTime, setStartTime] = useState('12:00 AM');
  const [endTime, setEndTime] = useState('11:59 PM');
  // 왼쪽 캘린더가 보여줄 달의 1일. 오른쪽 캘린더는 그 다음 달을 자동 표시.
  const [calendarBaseMonth, setCalendarBaseMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  // ─── 카드 액션 아이콘 (장바구니 / 이미지 검색 / 편집) ─────────────
  // 검색 아이콘을 누르면 ImageSearchResultsModal 을 띄운다. 모달은
  // imageUri + imageBase64 둘 다 필요해 RNFS 로 thumbnail 을 임시 받아 base64 화.
  const { showToast } = useToast();
  const { mutate: addToCart } = useAddToCartMutation({
    onSuccess: () => {
      showToast(
        t('profile.productMgmt.addedToCart') || '장바구니에 담겼습니다',
        'success',
      );
    },
    onError: (err) => {
      showToast(err || 'Failed to add to cart', 'error');
    },
  });

  const [imageSearchVisible, setImageSearchVisible] = useState(false);
  const [imageSearchUri, setImageSearchUri] = useState('');
  const [imageSearchBase64, setImageSearchBase64] = useState('');
  const [imageSearchLoading, setImageSearchLoading] = useState(false);

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


  // 'YYYY-MM-DD' + '12:00 AM' / '11:59 PM' 같은 사람이 읽는 시각 문자열을
  // 합쳐 ISO 8601 timestamp 로 변환한다. 시각 파싱 실패 시 자정 / 23:59:59 로 fallback.
  const combineDateAndTime = (date: Date, timeStr: string, isEnd: boolean): string => {
    const m = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    let hour = isEnd ? 23 : 0;
    let minute = isEnd ? 59 : 0;
    let second = isEnd ? 59 : 0;
    if (m) {
      hour = parseInt(m[1], 10) % 12;
      minute = parseInt(m[2], 10);
      second = isEnd ? 59 : 0;
      const ampm = m[3]?.toUpperCase();
      if (ampm === 'PM') hour += 12;
    }
    const d = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      hour,
      minute,
      second,
    );
    return d.toISOString();
  };

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 새 endpoint(customer/product-list/products) 는 lang 만 받아 응답의
      // productName / productNameMultiLang 을 그 언어 기준으로 정렬해 준다.
      // 날짜 구간이 선택돼 있으면 periodFrom/periodTo 도 함께 보내
      // 백엔드가 도입할 때 자동으로 서버 사이드 필터로 전환되게 한다.
      const params: Parameters<typeof productListApi.getProducts>[0] = {
        lang: locale,
      };
      if (startDate) {
        params.periodFrom = combineDateAndTime(startDate, startTime, false);
      }
      if (endDate) {
        params.periodTo = combineDateAndTime(endDate, endTime, true);
      }
      const res = await productListApi.getProducts(params);
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
  }, [locale, startDate, endDate, startTime, endTime]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // 백엔드가 아직 periodFrom/periodTo 를 무시할 가능성이 있으므로 클라이언트에서도
  // createdAt 기준으로 한 번 더 거른다. 같이 보내 두면 백엔드가 필터를 도입할 때
  // 두 단계 모두 통과해 결과가 변하지 않고, 도입 전엔 이 단계가 실질 필터 역할.
  //
  // 가격 필터(¥ priceMin ~ ¥ priceMax) 도 같은 useMemo 안에서 처리한다.
  // 사용자가 한쪽만 채워도(예: 최소만) 그쪽 경계만 적용. 양쪽 비면 가격 필터 패스.
  const visibleProducts = React.useMemo(() => {
    // 시간 경계
    const fromMs = startDate
      ? new Date(combineDateAndTime(startDate, startTime, false)).getTime()
      : -Infinity;
    const toMs = endDate
      ? new Date(combineDateAndTime(endDate, endTime, true)).getTime()
      : Infinity;
    // 가격 경계 — 입력은 'YYYY-MM-DD' 같은 텍스트가 아닌 숫자 문자열.
    // 비숫자 글자는 제거 후 parseFloat. 빈 값이거나 파싱 실패면 경계 없음.
    const parsePrice = (raw: string): number | null => {
      const clean = raw.replace(/[^0-9.]/g, '');
      if (!clean) return null;
      const n = parseFloat(clean);
      return isNaN(n) ? null : n;
    };
    const minPrice = parsePrice(priceMin);
    const maxPrice = parsePrice(priceMax);

    const noTimeFilter = !startDate && !endDate;
    const noPriceFilter = minPrice == null && maxPrice == null;

    // 1) 필터링
    const filtered =
      noTimeFilter && noPriceFilter
        ? [...products]
        : products.filter((p) => {
            if (!noTimeFilter && p.createdAt) {
              const ms = new Date(p.createdAt).getTime();
              if (!isNaN(ms) && (ms < fromMs || ms > toMs)) return false;
            }
            if (!noPriceFilter && typeof p.unitPrice === 'number') {
              if (minPrice != null && p.unitPrice < minPrice) return false;
              if (maxPrice != null && p.unitPrice > maxPrice) return false;
            }
            return true;
          });

    // 2) 정렬 — activeSort + sortDir 기준. 한 chip 만 활성이므로 단일 기준.
    //    uploadTime ← createdAt 의 timestamp
    //    price      ← unitPrice
    //    sales      ← 현재 응답에 판매량 필드 없음 — 백엔드 도입 전엔 createdAt 으로 fallback.
    const sortValue = (p: typeof filtered[number]): number => {
      if (activeSort === 'price') {
        return typeof p.unitPrice === 'number' ? p.unitPrice : 0;
      }
      // uploadTime / sales 둘 다 createdAt 으로 정렬 (sales 는 백엔드 필드 도입 시 교체).
      const t = p.createdAt ? new Date(p.createdAt).getTime() : 0;
      return isNaN(t) ? 0 : t;
    };
    filtered.sort((a, b) => {
      const va = sortValue(a);
      const vb = sortValue(b);
      return sortDir === 'asc' ? va - vb : vb - va;
    });
    return filtered;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, startDate, endDate, startTime, endTime, priceMin, priceMax, activeSort, sortDir]);

  // 시간 필터로 가려진 항목은 선택 대상에서 빼야 하므로 visibleProducts 기준으로 판정.
  const allSelected =
    visibleProducts.length > 0 && selectedIds.length === visibleProducts.length;

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : visibleProducts.map((p) => p._id));
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
          // ref 부착 — onPress 에서 measureInWindow 로 화면 절대 좌표 측정.
          ref={(node) => {
            pickerRefs.current[pickerKey] = node as unknown as View | null;
          }}
          style={[styles.dropdownBox, open && styles.dropdownBoxActive]}
          activeOpacity={0.7}
          onPress={() => {
            // 매 클릭마다 다시 측정 (회전 / 스크롤 대비).
            const node = pickerRefs.current[pickerKey];
            if (node && (node as any).measureInWindow) {
              (node as any).measureInWindow(
                (x: number, y: number, width: number, height: number) => {
                  setPickerLayout({ x, y, width, height });
                  setOpenPicker(pickerKey);
                },
              );
            } else {
              setOpenPicker(pickerKey);
            }
          }}
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

  const renderSortChip = (key: SortKey, label: string) => {
    const active = activeSort === key;
    return (
      <TouchableOpacity
        style={[styles.sortChip, active && styles.sortChipActive]}
        activeOpacity={0.7}
        onPress={() => {
          if (active) {
            // 같은 chip 을 다시 누르면 방향 토글.
            setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
          } else {
            // 다른 chip 으로 갈아탈 땐 desc 부터 시작.
            setActiveSort(key);
            setSortDir('desc');
          }
        }}
      >
        <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>
          {label}
        </Text>
        <Icon
          // 활성 chip 만 현재 방향 반영, 비활성은 항상 chevron-down.
          name={active ? (sortDir === 'asc' ? 'chevron-up' : 'chevron-down') : 'chevron-down'}
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

      {/* 시작 시간-종료 시간 선택 — 누르면 행 바로 아래에 캘린더 팝오버 모달.
          ref + measureInWindow 로 위치 잡아 모달 anchor 좌표·너비에 사용. */}
      <TouchableOpacity
        ref={(node) => {
          dateRowRef.current = node as unknown as View | null;
        }}
        style={styles.dateRow}
        activeOpacity={0.7}
        onPress={() => {
          const node = dateRowRef.current;
          if (node && (node as any).measureInWindow) {
            (node as any).measureInWindow(
              (x: number, y: number, width: number, height: number) => {
                setDateRowLayout({ x, y, width, height });
                setDateModalOpen(true);
              },
            );
          } else {
            setDateModalOpen(true);
          }
        }}
      >
        <Icon name="time-outline" size={16} color={COLORS.gray[400]} />
        <Text
          style={[
            styles.datePlaceholder,
            (startDate || endDate) && styles.datePlaceholderFilled,
          ]}
          numberOfLines={1}
        >
          {startDate
            ? `${formatDateForRow(startDate)}${endDate ? ` ~ ${formatDateForRow(endDate)}` : ''}`
            : t('profile.productMgmt.dateRangePlaceholder')}
        </Text>
      </TouchableOpacity>

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

        {/* 그리드/리스트 보기 토글 단추는 사용자 요청으로 제거됨.
            viewMode state 와 FlatList 의 numColumns 분기는 그대로 두어
            기본 grid 레이아웃이 유지된다 (추후 다른 진입점에서 mode 를
            바꿀 일이 생기면 그때 다시 노출하면 됨). */}
      </View>
    );
  };

  // ─── 카드 아이콘 핸들러 (장바구니 / 이미지검색 / 편집) ───────────────
  /** SellerProduct.company 가 string 이라 cartApi 가 요구하는 MultiLang
   *  객체로 감싼다. 글자 셋(한자/한글/그 외)을 보고 해당 슬롯에만 채워
   *  백엔드가 zh 슬롯에서 한글을 받아 500 을 내는 케이스를 막는다.
   *  (BuyListScreen 의 buildCompanyMultiLang 과 동일 패턴.) */
  const buildCompanyMultiLang = (raw: unknown): { en?: string; ko?: string; zh?: string } => {
    if (raw && typeof raw === 'object') return raw as any;
    if (typeof raw !== 'string' || !raw.trim()) return {};
    const s = raw.trim();
    if (/[一-鿿]/.test(s)) return { zh: s };
    if (/[가-힯ᄀ-ᇿ㄰-㆏]/.test(s)) return { ko: s };
    return { en: s };
  };

  const handleCardAddToCart = (item: SellerProduct) => {
    const priceStr = String(item.unitPrice ?? 0);
    addToCart(
      {
        offerId: parseInt(item.offerId || '0', 10) || 0,
        categoryName: '',
        subject: item.productName,
        subjectTrans: item.productName,
        imageUrl: thumbOf(item) || item.productUrl || '',
        skuInfo: {
          skuId: parseInt(item.skuId || '0', 10) || 0,
          specId: item.specId || String(item.offerId || ''),
          price: priceStr,
          amountOnSale: 999999,
          consignPrice: priceStr,
          skuAttributes: [],
          fenxiaoPriceInfo: { onePiecePrice: priceStr, offerPrice: priceStr },
        },
        companyName: buildCompanyMultiLang(item.company),
        sellerOpenId: '',
        source: '1688',
        quantity: 1,
        minOrderQuantity: 1,
      },
      locale,
    );
  };

  const handleCardImageSearch = async (item: SellerProduct) => {
    const url = thumbOf(item) || item.productUrl || '';
    if (!url) {
      showToast(t('profile.productMgmt.imageLoadFailed') || 'Failed to load image', 'error');
      return;
    }
    setImageSearchLoading(true);
    try {
      // ProductDetailScreen 의 handleSimilarImageSearch 와 동일한 패턴 — RNFS 로
      // 임시 파일 받아서 base64 로 읽어 모달에 전달.
      const RNFS = require('react-native-fs');
      const tempPath = `${RNFS.CachesDirectoryPath}/product_search_${Date.now()}.jpg`;
      await RNFS.downloadFile({ fromUrl: url, toFile: tempPath }).promise;
      const base64 = await RNFS.readFile(tempPath, 'base64');
      setImageSearchUri(url);
      setImageSearchBase64(base64);
      setImageSearchVisible(true);
    } catch {
      showToast(t('profile.productMgmt.imageLoadFailed') || 'Failed to load image', 'error');
    } finally {
      setImageSearchLoading(false);
    }
  };

  const handleCardEdit = (item: SellerProduct) => {
    navigation.navigate('OnlineProductEdit', {
      productId: item._id,
      // offerId + source 로 GET /products/detail 호출 가능. SellerProduct.offerId
      // 가 비어 있을 가능성이 거의 없지만, 없으면 _id 로 fallback 해 백엔드가
      // 자체 매핑하도록 한다.
      offerId: item.offerId || item._id,
      source: '1688',
      productName: item.productName,
      unitPrice: item.unitPrice,
      option1: item.option1,
      option2: item.option2,
      categoryName: item.categoryName,
      thumbnailUrl: thumbOf(item) || item.productUrl || '',
    });
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
        {/* 이미지 옆 3개 아이콘 — 장바구니 / 이미지검색 / 편집.
            stopPropagation 효과를 내기 위해 핸들러는 자체 onPress 만 받아
            카드 onPress(toggleSelectOne) 가 동시에 발화하지 않도록 함. */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.cardActionBtn}
            hitSlop={BACK_HIT_SLOP}
            onPress={(e) => {
              e.stopPropagation();
              handleCardAddToCart(item);
            }}
          >
            <Icon name="cart-outline" size={16} color={COLORS.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cardActionBtn}
            hitSlop={BACK_HIT_SLOP}
            onPress={(e) => {
              e.stopPropagation();
              handleCardImageSearch(item);
            }}
            disabled={imageSearchLoading}
          >
            {imageSearchLoading ? (
              <ActivityIndicator size="small" color={COLORS.text.primary} />
            ) : (
              <Icon name="search" size={16} color={COLORS.text.primary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cardActionBtn}
            hitSlop={BACK_HIT_SLOP}
            onPress={(e) => {
              e.stopPropagation();
              handleCardEdit(item);
            }}
          >
            <Icon name="create-outline" size={16} color={COLORS.text.primary} />
          </TouchableOpacity>
        </View>
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
      // Skeleton fills the list area while the seller's products are fetched.
      return <ScreenSkeleton variant="grid" showHeader={false} />;
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
    if (visibleProducts.length === 0) {
      return (
        <View style={styles.centerBox}>
          <Text style={styles.emptyText}>{t('profile.productMgmt.empty')}</Text>
        </View>
      );
    }
    return (
      <FlatList
        key={viewMode}
        data={visibleProducts}
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

  // --- Dropdown picker modal (anchored popover) ---
  // 칩 바로 아래에 떠 있는 팝오버. 좌표·너비는 측정한 pickerLayout 으로
  // 인라인 오버라이드된다(BuyListScreen 의 발주관리/통관/운송 드롭다운과
  // 같은 패턴). backdrop 은 투명 — 페지가 어두워지지 않고 바깥 탭으로만 닫힘.
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
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setOpenPicker(null)}
        >
          <View
            style={[
              styles.pickerAnchor,
              pickerLayout && {
                top: pickerLayout.y + pickerLayout.height + 4,
                left: pickerLayout.x,
                width: pickerLayout.width,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.pickerCard}>
              {cfg.options.map((opt) => {
                const selected = opt.value === cfg.selected;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.pickerItem, selected && styles.pickerItemSelected]}
                    activeOpacity={0.7}
                    onPress={() => {
                      cfg.onSelect(opt.value);
                      setOpenPicker(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        selected && styles.pickerItemTextSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {opt.label}
                    </Text>
                    {selected && (
                      <Icon name="checkmark" size={14} color={COLORS.red} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  // ─── 시작/종료 날짜 선택 모달 ────────────────────────────────────────
  // 빠른 선택(오늘 / 최근1주 / 최근3개월) — 클릭 즉시 startDate/endDate 갱신.
  const applyQuickRange = (key: 'today' | 'week' | 'month3') => {
    const today = stripTime(new Date());
    if (key === 'today') {
      setStartDate(today);
      setEndDate(today);
      setCalendarBaseMonth(new Date(today.getFullYear(), today.getMonth(), 1));
      return;
    }
    if (key === 'week') {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      setStartDate(start);
      setEndDate(today);
      setCalendarBaseMonth(new Date(start.getFullYear(), start.getMonth(), 1));
      return;
    }
    // month3
    const start = new Date(today);
    start.setMonth(start.getMonth() - 3);
    setStartDate(start);
    setEndDate(today);
    setCalendarBaseMonth(new Date(start.getFullYear(), start.getMonth(), 1));
  };

  // 그리드 셀 탭 — 시작·종료 선택 사이클 (start만 → start+end → 다시 start).
  const handleDayPress = (d: Date) => {
    const day = stripTime(d);
    if (!startDate || (startDate && endDate)) {
      setStartDate(day);
      setEndDate(null);
      return;
    }
    if (day.getTime() < startDate.getTime()) {
      // 시작보다 빠른 날을 누르면 시작으로 교체.
      setStartDate(day);
      setEndDate(null);
      return;
    }
    setEndDate(day);
  };

  const shiftMonth = (delta: number) => {
    setCalendarBaseMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1),
    );
  };

  const renderCalendarPane = (baseMonth: Date) => {
    const cells = buildMonthGrid(baseMonth);
    const monthIndex = baseMonth.getMonth();
    return (
      <View style={styles.calendarPane}>
        <Text style={styles.calendarMonthLabel}>{formatMonthHeader(baseMonth)}</Text>
        <View style={styles.calendarWeekHeaderRow}>
          {DAY_LABELS_KO.map((d) => (
            <Text key={d} style={styles.calendarWeekHeader}>{d}</Text>
          ))}
        </View>
        <View style={styles.calendarGrid}>
          {cells.map((cell, idx) => {
            const sameStart = startDate && isSameDay(cell.date, startDate);
            const sameEnd = endDate && isSameDay(cell.date, endDate);
            const inRange =
              startDate && endDate && isBetween(cell.date, startDate, endDate);
            const isEndpoint = !!(sameStart || sameEnd);
            const isInMonth = cell.inMonth && cell.date.getMonth() === monthIndex;
            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.calendarDayCell,
                  inRange && styles.calendarDayCellInRange,
                  isEndpoint && styles.calendarDayCellEndpoint,
                ]}
                activeOpacity={0.7}
                onPress={() => handleDayPress(cell.date)}
              >
                <Text
                  style={[
                    styles.calendarDayText,
                    !isInMonth && styles.calendarDayTextMuted,
                    isEndpoint && styles.calendarDayTextEndpoint,
                  ]}
                >
                  {cell.date.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderDateRangeModal = () => {
    if (!dateModalOpen) return null;
    const nextMonth = new Date(
      calendarBaseMonth.getFullYear(),
      calendarBaseMonth.getMonth() + 1,
      1,
    );
    return (
      <Modal
        visible
        transparent
        animationType="fade"
        onRequestClose={() => setDateModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setDateModalOpen(false)}
        >
          <View
            style={[
              styles.dateModalAnchor,
              dateRowLayout && {
                top: dateRowLayout.y + dateRowLayout.height + 4,
                left: dateRowLayout.x,
                width: Math.max(dateRowLayout.width, 560),
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.dateModalCard}>
              {/* 본문 — 좌측 quick-select rail + 우측 캘린더 영역 */}
              <View style={styles.dateModalBody}>
                <View style={styles.quickRail}>
                  {([
                    { key: 'today', label: t('profile.productMgmt.dateRange.today') },
                    { key: 'week', label: t('profile.productMgmt.dateRange.week') },
                    { key: 'month3', label: t('profile.productMgmt.dateRange.month3') },
                  ] as const).map((q) => (
                    <TouchableOpacity
                      key={q.key}
                      style={styles.quickRailItem}
                      activeOpacity={0.7}
                      onPress={() => applyQuickRange(q.key)}
                    >
                      <Text style={styles.quickRailItemText}>{q.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.dateModalMain}>
                  {/* 시작/종료 날짜·시간 입력 행 */}
                  <View style={styles.dateInputsRow}>
                    <View style={styles.dateInputBox}>
                      <Text style={styles.dateInputText} numberOfLines={1}>
                        {startDate
                          ? formatDateForRow(startDate)
                          : t('profile.productMgmt.dateRange.startDate')}
                      </Text>
                    </View>
                    <View style={styles.timeInputBox}>
                      <TextInput
                        style={styles.timeInput}
                        value={startTime}
                        onChangeText={setStartTime}
                        placeholderTextColor={COLORS.gray[400]}
                      />
                    </View>
                    <Text style={styles.dateRangeArrow}>{'>'}</Text>
                    <View style={styles.dateInputBox}>
                      <Text style={styles.dateInputText} numberOfLines={1}>
                        {endDate
                          ? formatDateForRow(endDate)
                          : t('profile.productMgmt.dateRange.endDate')}
                      </Text>
                    </View>
                    <View style={styles.timeInputBox}>
                      <TextInput
                        style={styles.timeInput}
                        value={endTime}
                        onChangeText={setEndTime}
                        placeholderTextColor={COLORS.gray[400]}
                      />
                    </View>
                  </View>

                  {/* 두 달 그리드 — 양옆에 prev/next 버튼 */}
                  <View style={styles.calendarNavRow}>
                    <TouchableOpacity
                      onPress={() => shiftMonth(-12)}
                      hitSlop={BACK_HIT_SLOP}
                      style={styles.calendarNavBtn}
                    >
                      <Text style={styles.calendarNavBtnText}>{'«'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => shiftMonth(-1)}
                      hitSlop={BACK_HIT_SLOP}
                      style={styles.calendarNavBtn}
                    >
                      <Text style={styles.calendarNavBtnText}>{'‹'}</Text>
                    </TouchableOpacity>
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity
                      onPress={() => shiftMonth(1)}
                      hitSlop={BACK_HIT_SLOP}
                      style={styles.calendarNavBtn}
                    >
                      <Text style={styles.calendarNavBtnText}>{'›'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => shiftMonth(12)}
                      hitSlop={BACK_HIT_SLOP}
                      style={styles.calendarNavBtn}
                    >
                      <Text style={styles.calendarNavBtnText}>{'»'}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.calendarPanesRow}>
                    {renderCalendarPane(calendarBaseMonth)}
                    {renderCalendarPane(nextMonth)}
                  </View>
                </View>
              </View>

              {/* 푸터 — 초기화 / 확인 */}
              <View style={styles.dateModalFooter}>
                <TouchableOpacity
                  style={styles.dateModalResetBtn}
                  onPress={() => {
                    setStartDate(null);
                    setEndDate(null);
                    setStartTime('12:00 AM');
                    setEndTime('11:59 PM');
                  }}
                >
                  <Text style={styles.dateModalResetText}>
                    {t('profile.productMgmt.dateRange.reset')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dateModalConfirmBtn}
                  onPress={() => setDateModalOpen(false)}
                >
                  <Text style={styles.dateModalConfirmText}>
                    {t('profile.productMgmt.dateRange.confirm')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeTop} edges={['top']}>
        {renderHeader()}
      </SafeAreaView>
      <View style={styles.body}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {renderFilters()}
          {renderToolbar()}
          {renderBody()}
        </ScrollView>
        {renderPickerModal()}
        {renderDateRangeModal()}
        {/* 이미지 검색 결과 모달 — 카드의 검색(🔍) 아이콘에서 진입.
            ProductDetailScreen 의 유사 상품 검색 모달과 동일한 컴포넌트. */}
        {imageSearchVisible && (
          <ImageSearchResultsModal
            visible={imageSearchVisible}
            onClose={() => setImageSearchVisible(false)}
            imageUri={imageSearchUri}
            imageBase64={imageSearchBase64}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeTop: {
    backgroundColor: COLORS.white,
  },
  body: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
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
    flexShrink: 1,
  },
  datePlaceholderFilled: {
    color: COLORS.text.primary,
    fontWeight: '600',
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
  // 카드의 우상단(이미지 오른쪽 옆 공간) 에 3개 액션 아이콘을 한 행으로 띄움.
  // grid 모드에서는 카드가 column flex 라 그냥 두면 이미지 아래로 가버리므로
  // position: 'absolute' 로 top-right 에 떠 있게 한다.
  cardActions: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 2,
  },
  cardActionBtn: {
    width: 22,
    height: 22,
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
  // 칩 바로 아래에 떠 있는 팝오버용 backdrop 은 투명. 바깥 탭으로만 닫힘.
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  // 측정 전에는 화면 밖에 잠깐 그렸다가 pickerLayout 으로 인라인 오버라이드된다.
  pickerAnchor: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    width: 220,
  },
  pickerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    paddingVertical: SPACING.xs,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  pickerItemSelected: {
    backgroundColor: 'rgba(255, 85, 0, 0.08)',
  },
  pickerItemText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    marginRight: SPACING.xs,
  },
  pickerItemTextSelected: {
    color: COLORS.red,
    fontWeight: '700',
  },
  // ─── 시작/종료 날짜 모달 ──────────────────────────────────────────
  dateModalAnchor: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    width: 560,
    maxWidth: '95%',
  },
  dateModalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  dateModalBody: {
    flexDirection: 'row',
  },
  // 좌측 quick-select rail (오늘 / 최근1주 / 최근3개월)
  quickRail: {
    width: 90,
    paddingVertical: SPACING.sm,
    borderRightWidth: 1,
    borderRightColor: COLORS.gray[100],
  },
  quickRailItem: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  quickRailItemText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },
  // 우측 메인 — 시작/종료 입력 + 두 달 그리드
  dateModalMain: {
    flex: 1,
    padding: SPACING.sm,
  },
  dateInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.sm,
  },
  dateInputBox: {
    flex: 1,
    minWidth: 0,
    height: 32,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 6,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  dateInputText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.primary,
  },
  timeInputBox: {
    width: 90,
    height: 32,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 6,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  timeInput: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.primary,
    padding: 0,
  },
  dateRangeArrow: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
    marginHorizontal: 2,
  },
  // 그리드 양옆 prev/next 버튼 행
  calendarNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  calendarNavBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarNavBtnText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.gray[500],
    fontWeight: '700',
  },
  // 두 달 그리드 가로 배치
  calendarPanesRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  calendarPane: {
    flex: 1,
  },
  calendarMonthLabel: {
    textAlign: 'center',
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  calendarWeekHeaderRow: {
    flexDirection: 'row',
  },
  calendarWeekHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    color: COLORS.gray[500],
    paddingVertical: 2,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1.1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
  },
  // 시작·종료 사이 셀 — 연한 살구색 strip. 모서리는 둥글지 않아 연속된 띠처럼 보인다.
  calendarDayCellInRange: {
    backgroundColor: '#FFE4D2',
  },
  // 시작/종료 일자 — 같은 살구색 배경이지만 텍스트는 붉은색 + bold.
  // 인-레인지와 같은 톤이라 강조가 텍스트로만 표현됨 (스크린샷 일치).
  calendarDayCellEndpoint: {
    backgroundColor: '#FFE4D2',
  },
  calendarDayText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.primary,
  },
  calendarDayTextMuted: {
    color: COLORS.gray[300],
  },
  calendarDayTextEndpoint: {
    color: COLORS.red,
    fontWeight: '700',
  },
  // 푸터 — 초기화 / 확인
  dateModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  dateModalResetBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  dateModalResetText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.red,
    fontWeight: '600',
  },
  dateModalConfirmBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    backgroundColor: COLORS.red,
    borderRadius: 6,
  },
  dateModalConfirmText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    fontWeight: '700',
  },
});

export default ProductManagementScreen;
