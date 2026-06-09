import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
import { ScreenSkeleton, SkeletonBlock } from '../../../../../components/Skeleton';
import { COLORS, FONTS, SPACING } from '../../../../../constants';
import { RootStackParamList } from '../../../../../types';
import { useTranslation } from '../../../../../hooks/useTranslation';
import { productListApi, SellerProduct } from '../../../../../services/productListApi';
import {
  groupSellerProductsByOffer,
  type GroupedSellerProduct,
  resolveSellerProductGroupKey,
} from '../../../../../utils/groupSellerProducts';
import { productsApi } from '../../../../../services/productsApi';
import { useAddToCartMutation } from '../../../../../hooks/useAddToCartMutation';
import { useToast } from '../../../../../context/ToastContext';
import ImageSearchResultsModal from '../../../searchScreen/ImageSearchResultsModal';
import { TabletContent } from '../../../../../components/TabletContent';
import { useResponsive } from '../../../../../hooks/useResponsive';
import {
  getEmbeddedDashboardPanelWidth,
  getGridItemWidth,
  getListPageContentWidth,
  getListPagePadding,
} from '../../../../../utils/responsiveLayout';

/** 상품리스트 그리드 — 한 행에 표시할 카드 수. */
const PRODUCT_MGMT_GRID_COLS = 3;

type Nav = StackNavigationProp<RootStackParamList, 'ProductManagement'>;

const BACK_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

// 장바구니 담기 모달에서 사용하는 SKU 행의 정규화 타입.
// getProductDetail 의 productSkuInfos 항목을 한 줄 표시에 필요한 최소 필드로
// 추려 둔 것 — name 은 옵션 텍스트(예: "춤추는 우주오리 + 드라이버"),
// optionLabel 은 우측 작은 셀렉터 알약 텍스트(없으면 '기본').
// 장바구니 모달에서 한 행 = 한 색상 그룹.
// sizes 는 그 색상에 묶인 SKU 들 (각 사이즈 → 가격/skuId).
// selectedSizeIdx 는 우측 알약 드롭다운에서 선택된 사이즈의 인덱스.
type CartModalSizeVariant = {
  skuId: string;
  specId: string;
  size: string;        // 예: 'S', 'M', '2XL'
  price: number;
  attributes: any[];
};
type CartModalSku = {
  // 그룹 식별자 — 색상 이름 또는 SKU id (단일 그룹일 때).
  skuId: string;
  specId: string;
  name: string;        // 색상 이름 (예: '화이트')
  optionLabel: string; // 우측 알약 라벨 — 보통 '색상' 같은 attribute 이름. 빈 그룹은 '기본'.
  price: number;       // 현재 선택된 사이즈의 가격
  image: string;
  attributes: any[];
  // 이 색상에 포함된 사이즈 옵션들.
  sizes: CartModalSizeVariant[];
  selectedSizeIdx: number;
};

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

type ProductManagementScreenProps = {
  embedded?: boolean;
};

const ProductManagementScreen: React.FC<ProductManagementScreenProps> = ({
  embedded = false,
}) => {
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

  const responsive = useResponsive();
  const listPagePadding = getListPagePadding(responsive);
  const listContentPaddingH = responsive.isTabletLandscape
    ? 0
    : responsive.isTablet
      ? responsive.gutter
      : SPACING.md;
  const listContentPaddingV = responsive.isTablet ? responsive.gutter : SPACING.md;
  const gridGap = SPACING.sm;
  const [listContainerWidth, setListContainerWidth] = useState(0);

  const gridContentWidth = useMemo(() => {
    if (listContainerWidth > 0) {
      return Math.max(0, listContainerWidth - listContentPaddingH * 2);
    }
    let pageW = getListPageContentWidth(responsive);
    if (embedded && responsive.isTabletLandscape) {
      pageW = getEmbeddedDashboardPanelWidth(responsive.width, listPagePadding);
    }
    return Math.max(0, pageW - listContentPaddingH * 2);
  }, [
    listContainerWidth,
    responsive,
    embedded,
    listPagePadding,
    listContentPaddingH,
  ]);

  const gridCols = viewMode === 'grid' ? PRODUCT_MGMT_GRID_COLS : 1;

  const gridCardWidth = useMemo(
    () => getGridItemWidth(gridContentWidth, gridCols, gridGap),
    [gridContentWidth, gridCols, gridGap],
  );

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
  const { mutate: addToCart, isLoading: isAddingToCart } = useAddToCartMutation({
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
  // 카테고리 드롭다운 옵션 — OnlineProductEditScreen 의 카테고리 옵션과
  // 동일한 i18n 키를 재사용해 두 화면이 일관된 카테고리 목록을 갖도록 함.
  const categoryOptions = [
    { value: 'all', label: t('profile.productMgmt.all') },
    { value: 'apparel', label: t('profile.productMgmt.onlineEdit.catApparel') },
    { value: 'accessory', label: t('profile.productMgmt.onlineEdit.catAccessory') },
    { value: 'home', label: t('profile.productMgmt.onlineEdit.catHome') },
    { value: 'beauty', label: t('profile.productMgmt.onlineEdit.catBeauty') },
    { value: 'toy', label: t('profile.productMgmt.onlineEdit.catToy') },
    { value: 'digital', label: t('profile.productMgmt.onlineEdit.catDigital') },
    { value: 'other', label: t('profile.productMgmt.onlineEdit.catOther') },
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
  // 상품다운로드 단추 → 단추 바로 아래에 떠 있는 anchored 드롭다운(3개 옵션:
  // 이미지 Excel 다운 / Excel 다운 / 식검 다운).
  const [downloadDropdownOpen, setDownloadDropdownOpen] = useState<boolean>(false);
  const [downloadBtnLayout, setDownloadBtnLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const downloadBtnRef = useRef<View>(null);
  // 장바구니 담기 모달 — 상품 카드의 장바구니 아이콘에서 진입.
  // 모달이 열릴 때 productsApi.getProductDetail 로 SKU 목록을 받아오고,
  // 각 SKU 마다 옵션/가격/수량 행을 렌더한다. 수량이 0 이상인 SKU 만 실제로
  // 장바구니에 담긴다. SKU 가 많으면 기본 3 개만 노출하고 '더보기' 로 펼침.
  const [cartModalProduct, setCartModalProduct] = useState<GroupedSellerProduct | null>(null);
  const [cartModalSkus, setCartModalSkus] = useState<CartModalSku[]>([]);
  const [cartModalQtyMap, setCartModalQtyMap] = useState<Record<string, number>>({});
  const [cartModalExpanded, setCartModalExpanded] = useState<boolean>(false);
  // 사이즈 드롭다운이 열린 색상 그룹의 인덱스. -1 = 모두 닫힘.
  const [cartModalOpenSizeIdx, setCartModalOpenSizeIdx] = useState<number>(-1);
  const [cartModalLoading, setCartModalLoading] = useState<boolean>(false);


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

    // 동일 offerId(SKU 변형) 는 한 카드로 합친다 — products/detail 과 동일한 상품 단위.
    const grouped = groupSellerProductsByOffer(filtered);

    if (!searchText.trim()) return grouped;

    const q = searchText.trim().toLowerCase();
    return grouped.filter((p) => {
      const name = String(p.productName ?? '').toLowerCase();
      const offer = String(p.offerId ?? '').toLowerCase();
      const company = String(p.company ?? '').toLowerCase();
      return name.includes(q) || offer.includes(q) || company.includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, startDate, endDate, startTime, endTime, priceMin, priceMax, activeSort, sortDir, searchText]);

  // 시간 필터로 가려진 항목은 선택 대상에서 빼야 하므로 visibleProducts 기준으로 판정.
  const allSelected =
    visibleProducts.length > 0 && selectedIds.length === visibleProducts.length;

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : visibleProducts.map((p) => p.groupKey));
  };

  const toggleSelectOne = (groupKey: string) => {
    setSelectedIds((prev) =>
      prev.includes(groupKey) ? prev.filter((x) => x !== groupKey) : [...prev, groupKey],
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
            setProducts((prev) =>
              prev.filter((p) => !selectedIds.includes(resolveSellerProductGroupKey(p))),
            );
            setSelectedIds([]);
          },
        },
      ]);
    });
  };

  const thumbOf = (p: SellerProduct): string | null =>
    p.thumbnails?.find((th) => th.isThumbnail)?.url || p.thumbnails?.[0]?.url || null;

  const renderHeader = () => (
    <View
      style={[
        styles.header,
        responsive.isTabletLandscape && {
          paddingHorizontal: listPagePadding,
        },
      ]}
    >
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
            ref={downloadBtnRef as any}
            style={[styles.outlineButton, !hasSelection && styles.outlineButtonDisabled]}
            activeOpacity={0.7}
            disabled={!hasSelection}
            onPress={() => {
              // 단추의 화면 좌표를 측정해 그 바로 아래에 드롭다운을 배치.
              downloadBtnRef.current?.measureInWindow((x, y, width, height) => {
                setDownloadBtnLayout({ x, y, width, height });
              });
              setDownloadDropdownOpen(true);
            }}
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

  // 카드의 장바구니 아이콘 — 곧바로 담지 않고 SKU 옵션 선택 모달을 연다.
  // productsApi.getProductDetail 로 실제 SKU 리스트를 받아와 옵션 행을 채운다.
  const handleCardAddToCart = async (item: GroupedSellerProduct) => {
    setCartModalProduct(item);
    setCartModalSkus([]);
    setCartModalQtyMap({});
    setCartModalExpanded(false);
    setCartModalOpenSizeIdx(-1);
    setCartModalLoading(true);
    try {
      const offerId = item.offerId || item._id;
      const res = await productsApi.getProductDetail(offerId, '1688', locale);
      // productsApi.getProductDetail 의 반환 형식 — { success, data: response.data.data }
      // 그래서 product 는 res.data.product (또는 fallback 들).
      const apiProduct: any =
        (res.data as any)?.product ??
        (res.data as any)?.data?.product ??
        res.data;
      const galleryFirst: string =
        apiProduct?.productImage?.images?.[0] || thumbOf(item) || item.productUrl || '';
      const rawSkus: any[] = apiProduct?.productSkuInfos || [];
      if (__DEV__) {
        console.log(
          '[cartModal] getProductDetail',
          offerId,
          'productSkuInfos len =',
          rawSkus.length,
          'keys:',
          apiProduct ? Object.keys(apiProduct).slice(0, 20) : null,
        );
      }
      // SKU 를 '색상' 으로 그룹핑. 한 행 = 한 색상, 우측 알약 = 사이즈 드롭다운.
      // 1688 SKU 의 attribute 는 보통 [색상, 사이즈] 순서이므로:
      //   attrs[0] = 색상,  attrs[1] = 사이즈.  단일 attribute 면 그것만.
      const groupsMap = new Map<string, CartModalSku>();
      for (const sku of rawSkus) {
        const attrs: any[] = sku.skuAttributes || [];
        const color = String(attrs[0]?.valueTrans || attrs[0]?.value || '').trim();
        const size = String(attrs[1]?.valueTrans || attrs[1]?.value || '').trim();
        const groupKey = color || String(sku.skuId || sku.specId || '');
        const skuPrice = Number(sku.price ?? sku.consignPrice ?? item.unitPrice ?? 0);
        const variant: CartModalSizeVariant = {
          skuId: String(sku.skuId || ''),
          specId: String(sku.specId || ''),
          size,
          price: skuPrice,
          attributes: attrs,
        };
        const existing = groupsMap.get(groupKey);
        if (existing) {
          existing.sizes.push(variant);
        } else {
          const optionLabel =
            attrs[1]?.attributeNameTrans ||
            attrs[1]?.attributeName ||
            attrs[0]?.attributeNameTrans ||
            attrs[0]?.attributeName ||
            t('profile.productMgmt.cartModal.optionDefault');
          const image =
            attrs.find((a: any) => a.skuImageUrl)?.skuImageUrl || galleryFirst;
          groupsMap.set(groupKey, {
            skuId: String(sku.skuId || ''),
            specId: String(sku.specId || ''),
            name: color || item.productName,
            optionLabel: String(optionLabel),
            price: skuPrice,
            image,
            attributes: attrs,
            sizes: [variant],
            selectedSizeIdx: 0,
          });
        }
      }
      const skus: CartModalSku[] = Array.from(groupsMap.values());
      // SKU 가 하나도 없으면 SellerProduct 자체를 단일 SKU 로 fallback.
      if (skus.length === 0) {
        const fallbackVariant: CartModalSizeVariant = {
          skuId: String(item.skuId || ''),
          specId: String(item.specId || item.offerId || ''),
          size: '',
          price: Number(item.unitPrice ?? 0),
          attributes: [],
        };
        skus.push({
          skuId: String(item.skuId || ''),
          specId: String(item.specId || item.offerId || ''),
          name: item.productName,
          optionLabel: t('profile.productMgmt.cartModal.optionDefault'),
          price: Number(item.unitPrice ?? 0),
          image: galleryFirst,
          attributes: [],
          sizes: [fallbackVariant],
          selectedSizeIdx: 0,
        });
      }
      setCartModalSkus(skus);
    } catch {
      // 상세 조회 실패 → fallback 으로 카드 단일 SKU 사용.
      const fallbackVariant: CartModalSizeVariant = {
        skuId: String(item.skuId || ''),
        specId: String(item.specId || item.offerId || ''),
        size: '',
        price: Number(item.unitPrice ?? 0),
        attributes: [],
      };
      setCartModalSkus([
        {
          skuId: String(item.skuId || ''),
          specId: String(item.specId || item.offerId || ''),
          name: item.productName,
          optionLabel: t('profile.productMgmt.cartModal.optionDefault'),
          price: Number(item.unitPrice ?? 0),
          image: thumbOf(item) || item.productUrl || '',
          attributes: [],
          sizes: [fallbackVariant],
          selectedSizeIdx: 0,
        },
      ]);
    } finally {
      setCartModalLoading(false);
    }
  };

  // 모달의 '장바구니 추가' — 수량 > 0 인 (색상, 사이즈) variant 마다 addToCart.
  const confirmCartModal = () => {
    const item = cartModalProduct;
    if (!item) return;
    // 그룹 각각의 모든 사이즈 variant 를 평탄화해서 qty > 0 인 것만.
    const targets: { group: CartModalSku; variant: CartModalSizeVariant; qty: number }[] = [];
    for (const group of cartModalSkus) {
      for (const variant of group.sizes) {
        const qty = cartModalQtyMap[variant.skuId] ?? 0;
        if (qty > 0) targets.push({ group, variant, qty });
      }
    }
    if (targets.length === 0) {
      showToast(t('profile.productMgmt.cartModal.qtyRequired') || 'Please enter a quantity', 'error');
      return;
    }
    for (const { group, variant, qty } of targets) {
      const priceStr = String(variant.price ?? group.price ?? 0);
      addToCart(
        {
          offerId: parseInt(item.offerId || '0', 10) || 0,
          categoryName: '',
          subject: item.productName,
          subjectTrans: item.productName,
          imageUrl: group.image || thumbOf(item) || item.productUrl || '',
          skuInfo: {
            skuId: parseInt(variant.skuId || '0', 10) || 0,
            specId: variant.specId || String(item.offerId || ''),
            price: priceStr,
            amountOnSale: 999999,
            consignPrice: priceStr,
            skuAttributes: variant.attributes || group.attributes || [],
            fenxiaoPriceInfo: { onePiecePrice: priceStr, offerPrice: priceStr },
          },
          companyName: buildCompanyMultiLang(item.company),
          sellerOpenId: '',
          source: '1688',
          quantity: qty,
          minOrderQuantity: 1,
        },
        locale,
      );
    }
    setCartModalProduct(null);
    setCartModalSkus([]);
    setCartModalQtyMap({});
    setCartModalExpanded(false);
    setCartModalOpenSizeIdx(-1);
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

  const handleCardEdit = (item: GroupedSellerProduct) => {
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
  const renderProductItem = ({ item }: { item: GroupedSellerProduct }) => {
    const checked = selectedIds.includes(item.groupKey);
    const thumb = thumbOf(item);
    return (
      <TouchableOpacity
        // 선택된 카드에는 붉은 테두리가 표시되어 체크 상태가 카드 전체에서
        // 시각적으로 확실히 드러나게 한다 (작은 체크박스만으론 인지가 약함).
        style={[
          styles.productCard,
          viewMode === 'grid' && styles.productCardGrid,
          viewMode === 'grid' && { width: gridCardWidth },
          checked && styles.productCardSelected,
        ]}
        activeOpacity={0.8}
        onPress={() => toggleSelectOne(item.groupKey)}
      >
        {/* 좌상단 체크박스 — 선택 시 붉은 채움 + 흰색 체크마크.
            크기를 22 로 키우고 zIndex 를 명시해 이미지/액션 아이콘 위에 항상 노출. */}
        <View
          style={[
            styles.checkbox,
            styles.cardCheckbox,
            checked && styles.checkboxChecked,
          ]}
        >
          {checked && <Icon name="checkmark" size={14} color={COLORS.white} />}
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
        <View
          style={[
            styles.productInfo,
            viewMode === 'grid' && styles.productInfoGrid,
          ]}
        >
          <Text style={styles.productName} numberOfLines={2}>
            {item.productName}
          </Text>
          {!!item.offerId && (
            <Text style={styles.productMeta}>ID: {item.offerId}</Text>
          )}
          {item.variantCount > 1 && (
            <Text style={styles.productMeta}>
              {t('profile.productMgmt.skuOptions', { count: String(item.variantCount) })}
            </Text>
          )}
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
      <View
        style={styles.listMeasureWrap}
        onLayout={(e) => setListContainerWidth(e.nativeEvent.layout.width)}
      >
        <FlatList
          key={`${viewMode}-${gridCols}`}
          data={visibleProducts}
          keyExtractor={(item, index) => `${item.groupKey}::${index}`}
          renderItem={renderProductItem}
          numColumns={gridCols}
          columnWrapperStyle={
            gridCols > 1 ? [styles.gridRow, { gap: gridGap }] : undefined
          }
          contentContainerStyle={[
            styles.listContent,
            {
              paddingHorizontal: listContentPaddingH,
              paddingTop: listContentPaddingV,
              paddingBottom: listContentPaddingV,
            },
          ]}
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
      </View>
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

  // ─── 장바구니 담기 모달 ─────────────────────────────────────────
  // 상품 카드의 장바구니 아이콘에서 진입. 옵션을 선택해 장바구니에 담을
  // 상품을 구성하는 패널 — 스크린샷의 디자인을 따라 헤더 / 상품 정보 행 /
  // SKU 옵션 행(이미지 + 이름 + 옵션 셀렉터 + 가격 + 수량 컨트롤) /
  // '장바구니 추가' 확정 단추로 구성. SellerProduct 는 단일 SKU 라
  // 옵션 행은 1줄로 렌더된다.
  const renderCartModal = () => {
    const item = cartModalProduct;
    if (!item) return null;
    const mainThumb = thumbOf(item) || item.productUrl || '';
    // 기본 노출 SKU 수 — 그 이상은 '더보기 (N)' 으로 토글.
    const VISIBLE = 3;
    const hasMore = cartModalSkus.length > VISIBLE;
    const visibleSkus = cartModalExpanded ? cartModalSkus : cartModalSkus.slice(0, VISIBLE);
    const setQty = (skuId: string, next: number) =>
      setCartModalQtyMap((prev) => ({ ...prev, [skuId]: Math.max(0, next) }));
    const totalQty = Object.values(cartModalQtyMap).reduce((s, n) => s + (n || 0), 0);
    return (
      <Modal
        visible={!!cartModalProduct}
        transparent
        animationType="fade"
        onRequestClose={() => setCartModalProduct(null)}
      >
        {/* 백드롭 — TouchableWithoutFeedback 대신 단순 View 로 두고
            바깥 빈 영역에만 dismiss zone TouchableOpacity 를 깔아 둠으로써
            카드 내부의 ScrollView 제스처와 충돌하지 않게 함. */}
        <View style={styles.cartModalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setCartModalProduct(null)}
          />
          <View style={styles.cartModalCard}>
            {/* 헤더 — 좌측 주황 아이콘 박스 + 타이틀/설명, 우측 닫기 X */}
            <View style={styles.cartModalHeader}>
              <View style={styles.cartModalIconBox}>
                <Icon name="cart-outline" size={18} color={COLORS.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cartModalTitle}>
                  {t('profile.productMgmt.cartModal.title')}
                </Text>
                <Text style={styles.cartModalSubtitle} numberOfLines={1}>
                  {t('profile.productMgmt.cartModal.subtitle')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setCartModalProduct(null)} hitSlop={BACK_HIT_SLOP}>
                <Icon name="close" size={20} color={COLORS.text.secondary} />
              </TouchableOpacity>
            </View>

            {/* 상품 정보 — 이름 + 소스 배지 */}
            <View style={styles.cartModalProductRow}>
              <Text style={styles.cartModalProductName} numberOfLines={2}>
                {item.productName}
              </Text>
              <View style={styles.cartModalSourceBadge}>
                <Text style={styles.cartModalSourceText}>1688</Text>
              </View>
            </View>

            <View style={styles.cartModalDivider} />

            {/* SKU 옵션 영역 — 좌측 큰 썸네일 + 우측 SKU 행 리스트(스크롤 가능) */}
            <View style={styles.cartModalSkuRow}>
              {mainThumb ? (
                <Image
                  source={{ uri: mainThumb }}
                  style={styles.cartModalMainImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.cartModalMainImage, styles.cartModalMainImagePlaceholder]}>
                  <Icon name="image-outline" size={32} color={COLORS.gray[400]} />
                </View>
              )}

              {/* SKU 행 리스트 — SKU 가 많아 화면 밖으로 넘칠 때를 대비해
                  ScrollView 로 감싸 maxHeight 안에서 자체 스크롤.
                  scrollEnabled / keyboardShouldPersistTaps / removeClippedSubviews
                  설정으로 안드로이드에서 스크롤 제스처가 백드롭 TouchableOpacity
                  의 onPress 와 충돌해 잠기는 케이스를 차단. */}
              <ScrollView
                style={styles.cartModalSkuList}
                contentContainerStyle={styles.cartModalSkuListContent}
                showsVerticalScrollIndicator
                nestedScrollEnabled
                scrollEnabled
                keyboardShouldPersistTaps="handled"
                onStartShouldSetResponderCapture={() => false}
              >
                {cartModalLoading && (
                  // 로딩 중 — ActivityIndicator 대신 실제 SKU 행을 모방한
                  // skeleton 5줄. SkeletonBlock 은 useNativeDriver pulse 애니메이션.
                  <View>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <View key={i} style={styles.cartModalSkuBlock}>
                        <View style={styles.cartModalSkuLine}>
                          <SkeletonBlock width={32} height={32} borderRadius={6} />
                          <View style={{ flex: 1 }}>
                            <SkeletonBlock width={'70%' as any} height={12} borderRadius={3} />
                          </View>
                          <SkeletonBlock width={64} height={24} borderRadius={6} />
                        </View>
                        <View style={styles.cartModalSkuLine2}>
                          <SkeletonBlock width={56} height={14} borderRadius={3} />
                          <SkeletonBlock width={72} height={24} borderRadius={6} />
                        </View>
                      </View>
                    ))}
                  </View>
                )}
                {!cartModalLoading &&
                  visibleSkus.map((sku, gIdx) => {
                    // 한 행 = 한 색상 그룹. 현재 선택된 사이즈의 variant 정보를 추출.
                    const selectedVariant = sku.sizes[sku.selectedSizeIdx] || sku.sizes[0];
                    const variantSkuId = selectedVariant?.skuId || sku.skuId;
                    const qty = cartModalQtyMap[variantSkuId] ?? 0;
                    const price = selectedVariant?.price ?? sku.price;
                    const hasSizes = sku.sizes.length > 0 && sku.sizes.some((s) => s.size);
                    const sizeOpen = cartModalOpenSizeIdx === gIdx;
                    return (
                      <View
                        key={sku.skuId || sku.specId || sku.name}
                        style={styles.cartModalSkuBlock}
                      >
                        {/* 1행 — 썸네일 + 색상 이름 + 사이즈 알약 드롭다운 */}
                        <View style={styles.cartModalSkuLine}>
                          {sku.image ? (
                            <Image
                              source={{ uri: sku.image }}
                              style={styles.cartModalSkuThumb}
                              resizeMode="cover"
                            />
                          ) : (
                            <View
                              style={[
                                styles.cartModalSkuThumb,
                                styles.cartModalMainImagePlaceholder,
                              ]}
                            />
                          )}
                          <Text style={styles.cartModalSkuName} numberOfLines={2}>
                            {sku.name}
                          </Text>
                          {/* 사이즈 알약 — 탭하면 같은 행 아래로 사이즈 목록 펼침.
                              사이즈가 없거나 1개뿐이면 탭 비활성. */}
                          <TouchableOpacity
                            style={styles.cartModalOptionPill}
                            activeOpacity={hasSizes && sku.sizes.length > 1 ? 0.7 : 1}
                            onPress={() => {
                              if (!hasSizes || sku.sizes.length <= 1) return;
                              setCartModalOpenSizeIdx((prev) => (prev === gIdx ? -1 : gIdx));
                            }}
                          >
                            <Text style={styles.cartModalOptionText} numberOfLines={1}>
                              {selectedVariant?.size || sku.optionLabel}
                            </Text>
                            <Icon
                              name={sizeOpen ? 'chevron-up' : 'chevron-down'}
                              size={12}
                              color={COLORS.text.secondary}
                            />
                          </TouchableOpacity>
                        </View>
                        {/* 사이즈 드롭다운 — 알약 바로 아래에 inline 으로 펼침 */}
                        {sizeOpen && (
                          <View style={styles.cartModalSizeDropdown}>
                            {sku.sizes.map((variant, sIdx) => {
                              const isSel = sIdx === sku.selectedSizeIdx;
                              return (
                                <TouchableOpacity
                                  key={variant.skuId || `${sIdx}`}
                                  style={[
                                    styles.cartModalSizeOption,
                                    isSel && styles.cartModalSizeOptionSelected,
                                  ]}
                                  activeOpacity={0.7}
                                  onPress={() => {
                                    // 그룹의 selectedSizeIdx 갱신 + 드롭다운 닫기.
                                    setCartModalSkus((prev) =>
                                      prev.map((g, idx) =>
                                        idx === gIdx ? { ...g, selectedSizeIdx: sIdx } : g,
                                      ),
                                    );
                                    setCartModalOpenSizeIdx(-1);
                                  }}
                                >
                                  <Text
                                    style={[
                                      styles.cartModalSizeOptionText,
                                      isSel && styles.cartModalSizeOptionTextSelected,
                                    ]}
                                  >
                                    {variant.size || sku.optionLabel}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                        {/* 2행 — 우측 정렬, 가격 + 수량 컨트롤 */}
                        <View style={styles.cartModalSkuLine2}>
                          <Text style={styles.cartModalPrice}>¥ {price.toFixed(2)}</Text>
                          <View style={styles.cartModalQtyBox}>
                            <TouchableOpacity
                              style={styles.cartModalQtyBtn}
                              onPress={() => setQty(variantSkuId, qty - 1)}
                            >
                              <Icon name="remove" size={14} color={COLORS.text.primary} />
                            </TouchableOpacity>
                            <Text style={styles.cartModalQtyValue}>{qty}</Text>
                            <TouchableOpacity
                              style={styles.cartModalQtyBtn}
                              onPress={() => setQty(variantSkuId, qty + 1)}
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

            {/* 푸터 — 좌측 '더보기 (N) ▾' / 우측 '장바구니 추가' 단추 */}
            <View style={styles.cartModalFooter}>
              {hasMore ? (
                <TouchableOpacity
                  style={styles.cartModalMoreBtn}
                  onPress={() => setCartModalExpanded((v) => !v)}
                >
                  <Text style={styles.cartModalMoreText}>
                    {cartModalExpanded
                      ? t('profile.productMgmt.cartModal.collapse')
                      : `${t('profile.productMgmt.cartModal.more')} (${cartModalSkus.length - VISIBLE})`}
                  </Text>
                  <Icon
                    name={cartModalExpanded ? 'chevron-up' : 'chevron-down'}
                    size={12}
                    color={COLORS.text.secondary}
                  />
                </TouchableOpacity>
              ) : (
                <View />
              )}
              <TouchableOpacity
                style={[
                  styles.cartModalConfirmBtn,
                  totalQty <= 0 && styles.cartModalConfirmBtnDisabled,
                ]}
                disabled={totalQty <= 0 || isAddingToCart}
                onPress={confirmCartModal}
              >
                <Icon name="cart-outline" size={14} color={COLORS.white} />
                <Text style={styles.cartModalConfirmText}>
                  {isAddingToCart
                    ? t('product.addingToCart')
                    : t('profile.productMgmt.cartModal.confirm')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    <View style={[styles.root, embedded && styles.embeddedRoot]}>
      {!embedded && (
        <SafeAreaView style={styles.safeTop} edges={['top']}>
          {renderHeader()}
        </SafeAreaView>
      )}
      <TabletContent
        style={styles.body}
        fullWidth={responsive.isTabletLandscape}
        contentStyle={
          responsive.isTabletLandscape
            ? { paddingHorizontal: listPagePadding }
            : undefined
        }
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {renderFilters()}
          {renderToolbar()}
          {renderBody()}
        </ScrollView>
        {renderPickerModal()}
        {renderDateRangeModal()}
        {renderCartModal()}

        {/* 상품다운로드 드롭다운 — 상품다운로드 단추 바로 아래에 떠 있는
            anchored 팝오버. measureInWindow 결과로 단추 너비와 위치에 정확히
            정렬되며, 백드롭 탭으로 닫힘. 3개 옵션: 이미지 Excel 다운 /
            Excel 다운 / 식검 다운. */}
        <Modal
          visible={downloadDropdownOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setDownloadDropdownOpen(false)}
        >
          <TouchableOpacity
            style={styles.downloadDropdownBackdrop}
            activeOpacity={1}
            onPress={() => setDownloadDropdownOpen(false)}
          >
            <View
              style={[
                styles.downloadDropdownAnchor,
                downloadBtnLayout && {
                  top: downloadBtnLayout.y + downloadBtnLayout.height + 4,
                  // 단추가 작아 드롭다운 콘텐츠가 더 넓을 수 있으므로 최소 폭
                  // 보장. left 는 단추의 left 그대로 사용.
                  left: downloadBtnLayout.x,
                  minWidth: Math.max(downloadBtnLayout.width, 140),
                },
              ]}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.downloadDropdownCard}>
                {([
                  ['imageExcel', 'profile.productMgmt.downloadOptions.imageExcel'],
                  ['excel', 'profile.productMgmt.downloadOptions.excel'],
                  ['foodInspect', 'profile.productMgmt.downloadOptions.foodInspect'],
                ] as const).map(([key, i18nKey], idx) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.downloadDropdownItem,
                      idx > 0 && styles.downloadDropdownItemBorder,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => {
                      // 백엔드 다운로드 endpoint 도입 전까지는 드롭다운만 닫음.
                      setDownloadDropdownOpen(false);
                    }}
                  >
                    <Text style={styles.downloadDropdownItemText} numberOfLines={1}>
                      {t(i18nKey)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

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
      </TabletContent>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  embeddedRoot: {
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
  // ─── 상품다운로드 anchored 드롭다운 ───────────────────────────────
  // 백드롭은 전체 화면 — 바깥 탭으로 닫기. anchor 는 absolute 로 떠 있고
  // top/left/minWidth 는 인라인 스타일로 measureInWindow 결과 오버라이드.
  downloadDropdownBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  downloadDropdownAnchor: {
    position: 'absolute',
  },
  downloadDropdownCard: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    overflow: 'hidden',
    elevation: 4,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  downloadDropdownItem: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 10,
  },
  downloadDropdownItemBorder: {
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  downloadDropdownItemText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '500',
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
  listMeasureWrap: {
    width: '100%',
  },
  listContent: {
    padding: SPACING.md,
  },
  gridRow: {
    justifyContent: 'flex-start',
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
  },
  cardCheckbox: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    // 카드 이미지 / 액션 아이콘 위에 항상 노출되도록 z 우선순위를 올린다.
    zIndex: 5,
    elevation: 5,
    width: 22,
    height: 22,
    backgroundColor: COLORS.white,
  },
  // 선택된 카드의 시각적 강조 — 붉은 테두리 + 살짝 붉은 배경 틴트.
  productCardSelected: {
    borderWidth: 1.5,
    borderColor: COLORS.red,
    backgroundColor: 'rgba(255, 85, 0, 0.04)',
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
  productInfoGrid: {
    marginLeft: 0,
    marginTop: SPACING.xs,
    width: '100%',
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
  // ─── 장바구니 담기 모달 ─────────────────────────────────────────
  cartModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
  },
  cartModalCard: {
    // 멀티 SKU 행을 충분히 담도록 너비/높이를 늘림.
    width: '100%',
    maxWidth: 860,
    maxHeight: '90%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
  },
  cartModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  cartModalIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartModalTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '800',
    color: COLORS.text.primary,
  },
  cartModalSubtitle: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  cartModalProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.gray[50],
    borderRadius: 8,
    padding: SPACING.sm,
    marginTop: SPACING.xs,
    gap: SPACING.sm,
  },
  cartModalProductName: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  cartModalSourceBadge: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  cartModalSourceText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  cartModalDivider: {
    height: 1,
    backgroundColor: COLORS.gray[100],
    marginVertical: SPACING.sm,
  },
  cartModalSkuRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  cartModalMainImage: {
    width: 96,
    height: 96,
    borderRadius: 8,
    backgroundColor: COLORS.gray[100],
  },
  cartModalMainImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartModalSkuList: {
    flex: 1,
    // SKU 가 많아도 모달이 화면 밖으로 넘치지 않도록 리스트 자체의 높이를 제한.
    // 안에서 ScrollView 가 자체적으로 스크롤된다.
    maxHeight: 360,
  },
  cartModalSkuListContent: {
    gap: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  // SKU 상세 fetch 중 가운데 로딩 인디케이터.
  cartModalLoadingBox: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 각 SKU 한 블록 — 2줄(이미지+이름+옵션 / 가격+수량) 을 세로로 묶음.
  // 행 사이 구분이 잘 보이도록 옅은 회색 하단 보더를 둠.
  cartModalSkuBlock: {
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  cartModalSkuLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  // SKU 행의 두 번째 줄 — 우측 정렬, 가격 + 수량 컨트롤.
  cartModalSkuLine2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    marginTop: 6,
  },
  cartModalSkuThumb: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: COLORS.gray[100],
  },
  cartModalSkuName: {
    flex: 1,
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  cartModalOptionPill: {
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
  cartModalOptionText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  // 사이즈 드롭다운 — 사이즈 알약 바로 아래 인라인으로 펼침.
  // 가로 wrap 된 사이즈 칩들 (S/M/L/XL/…). 선택된 칩은 붉은 강조.
  cartModalSizeDropdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 38, // 좌측 32px 썸네일 + 6px gap 만큼 들여쓰기
  },
  cartModalSizeOption: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 40,
    alignItems: 'center',
  },
  cartModalSizeOptionSelected: {
    borderColor: COLORS.red,
    backgroundColor: 'rgba(255, 85, 0, 0.06)',
  },
  cartModalSizeOptionText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  cartModalSizeOptionTextSelected: {
    color: COLORS.red,
    fontWeight: '700',
  },
  cartModalPrice: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '800',
    color: COLORS.red,
    minWidth: 56,
    textAlign: 'right',
  },
  cartModalQtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 6,
  },
  cartModalQtyBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartModalQtyValue: {
    minWidth: 24,
    textAlign: 'center',
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  cartModalFooter: {
    flexDirection: 'row',
    // 좌측: '더보기 (N) ▾' (있을 때만) / 우측: '장바구니 추가' 단추.
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  cartModalMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 6,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  cartModalMoreText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  cartModalConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.red,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  cartModalConfirmBtnDisabled: {
    opacity: 0.5,
  },
  cartModalConfirmText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '800',
    color: COLORS.white,
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
