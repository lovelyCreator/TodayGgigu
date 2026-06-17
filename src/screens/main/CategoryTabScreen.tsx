import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../../components/Icon';
import { launchCamera, launchImageLibrary, MediaType, ImagePickerResponse, CameraOptions, ImageLibraryOptions } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { requestCameraPermission, requestPhotoLibraryPermission } from '../../utils/permissions';
import { StackNavigationProp } from '@react-navigation/stack';

import { COLORS, FONTS, SPACING, BORDER_RADIUS, IMAGE_CONFIG } from '../../constants';

const BACK_NAVIGATION_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };
import { RootStackParamList } from '../../types';
import { SearchButton, NotificationBadge, ImagePickerModal } from '../../components';
import NotificationIcon from '../../assets/icons/NotificationIcon';

import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { usePlatformStore } from '../../store/platformStore';
import { useAppSelector } from '../../store/hooks';
import { translations } from '../../i18n/translations';
import { useTopCategoriesMutation } from '../../hooks/useTopCategoriesMutation';
import { productsApi } from '../../services/productsApi';
import {
  buildL2MapFromL1List,
  extractL1Categories,
  extractL2Tree,
  getCategoryNodeId,
  getCategoryParentId,
  getEmbeddedL2Children,
  l1ListHasEmbeddedL2,
  mapLocaleToCategoryLang,
  pickCategoryLabel,
} from '../../utils/categoryList';
import { useResponsive } from '../../hooks/useResponsive';
import { SkeletonBlock } from '../../components/Skeleton';

type CategoryTabScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Category'>;

const COMPANY_TABS = ['All', '1688', 'Taobao'] as const;

// Fixed heights make `getItemLayout` exact, which is the only way `scrollToLocation`
// reliably lands on a section that hasn't been rendered yet (taps to far-away L1s).
const ROW_HEIGHT = 44;
const SECTION_HEADER_HEIGHT = 40;

type CategoryTabScreenProps = {
  hideHeader?: boolean;
  embedded?: boolean;
  /** Home header category button — 1688/Taobao tabs only (no All). */
  asHomeModal?: boolean;
  onModalClose?: () => void;
};

/**
 * scrollToIndex + viewPosition fights RN's max scroll at the list end; bottom rows
 * should align toward the bottom of the viewport to avoid overscroll/bounce glitches.
 */
function getLeftListViewPosition(index: number, length: number): number {
  if (length <= 1) return 0;
  // Short lists fit on screen — don't bother snapping to top/bottom; let RN keep them in place.
  if (length <= 4) return 0;
  if (index <= 1) return 0;
  if (index >= length - 2) return 1;
  return 0.5;
}

const CategoryTabScreen: React.FC<CategoryTabScreenProps> = ({
  hideHeader = false,
  embedded = false,
  asHomeModal = false,
  onModalClose,
}) => {
  const navigation = useNavigation<CategoryTabScreenNavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'Category'>>();
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const isTabletLandscape = Math.min(winWidth, winHeight) >= 600 && winWidth > winHeight;
  const isEmbeddedLandscapeHeader =
    hideHeader && isTabletLandscape && !embedded && !asHomeModal;
  // Responsive layout helper. We only enable the L3 panel for the
  // tablet-landscape bucket — phones and tablet-portrait keep the
  // original 2-column layout exactly as before.
  const responsive = useResponsive();
  // Zustand store
  const {
    selectedCategory,
    setSelectedPlatform,
    setSelectedCategory,
  } = usePlatformStore();
  
  // i18n
  const locale = useAppSelector((s) => s.i18n.locale);
  const { showToast } = useToast();

  const t = (key: string) => {
    const keys = key.split('.');
    let value: any = translations[locale as keyof typeof translations];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };

  const getCategoryImage = useCallback((category: any): string => {
    if (!category) return '';
    return (
      category.imageUrl ||
      category.image ||
      category.mainImage ||
      category.main_image_url ||
      category.thumbnail ||
      category.thumbnailUrl ||
      category.thumbUrl ||
      category.iconUrl ||
      category.icon ||
      ''
    );
  }, []);

  // Map company name to platform/source parameter
  const getPlatformFromCompany = (company: string): string => {
    if (company === 'All') {
      return '1688';
    }
    // Convert company name to lowercase for API (e.g., "Taobao" -> "taobao")
    return company.toLowerCase();
  };
  
  const { isAuthenticated } = useAuth();
  const {
    unreadCount: orderMessageUnread,
    generalInquiryUnreadCount,
    getUnreadCounts,
    getGeneralInquiryUnreadCounts,
    isConnected,
  } = useSocket();
  const messageUnreadCount = isAuthenticated
    ? orderMessageUnread + generalInquiryUnreadCount
    : 0;

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated || !isConnected) return;
      getUnreadCounts();
      getGeneralInquiryUnreadCounts();
    }, [
      isAuthenticated,
      isConnected,
      getUnreadCounts,
      getGeneralInquiryUnreadCounts,
    ]),
  );

  const [refreshing, setRefreshing] = useState(false);
  const [imagePickerModalVisible, setImagePickerModalVisible] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string>(
    asHomeModal ? '1688' : 'All',
  );
  useEffect(() => {
    if (asHomeModal) {
      setSelectedPlatform('1688');
    }
  }, [asHomeModal, setSelectedPlatform]);
  const [topCategories, setTopCategories] = useState<any[]>([]);
  // L2 categories grouped by parent L1 id; the right column reads from this
  // to render every L1's L2 list as one continuous SectionList.
  const [allL2ByL1, setAllL2ByL1] = useState<Record<string, any[]>>({});
  const [isLoadingAllL2, setIsLoadingAllL2] = useState(false);

  const hasFetchedRef = useRef<string | null>(null);
  // Bumped to invalidate in-flight batch fetches (company/locale switch, refresh).
  const fetchTokenRef = useRef(0);
  const sectionListRef = useRef<SectionList<any> | null>(null);
  const leftCategoryListRef = useRef<FlatList<any> | null>(null);
  const isProgrammaticRightScrollRef = useRef(false);
  /** After an L1 tap, re-run scrollToLocation when `sections` grows (L2 streaming) so the right list stays aligned. */
  const tapAlignCategoryIdRef = useRef<string | null>(null);
  /** After the user drags the right SectionList, do not auto scrollToLocation on L2 batch updates (preserves manual position). */
  const skipRightAutoAlignRef = useRef(false);
  const topCategoriesLenRef = useRef(0);
  topCategoriesLenRef.current = topCategories.length;
  const programmaticScrollUnlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (programmaticScrollUnlockTimerRef.current) {
        clearTimeout(programmaticScrollUnlockTimerRef.current);
      }
    };
  }, []);

  const [isLoadingTopCategories, setIsLoadingTopCategories] = useState(false);

  // L3 panel state (tablet-landscape only). `selectedL2` holds the
  // currently highlighted L2 row whose L3 children should appear in the
  // right-most panel that spans ~60% of the screen width on landscape
  // tablets. `isLoadingL3` drives the skeleton-screen effect while the
  // L3 data is being prepared.
  const [selectedL2, setSelectedL2] = useState<any | null>(null);
  const [isLoadingL3, setIsLoadingL3] = useState(false);

  // L1 mutation — fetches top-level categories from the API.
  const { mutate: refetchTopCategories, isLoading: isMutationLoading } = useTopCategoriesMutation({
    onSuccess: (data) => {
      const categories = extractL1Categories(data);
      setTopCategories(categories);
      if (categories.length > 0) {
        const firstId = getCategoryNodeId(categories[0]);
        const sel = usePlatformStore.getState().selectedCategory;
        const selValid = sel && categories.some((c: any) => getCategoryNodeId(c) === sel);
        if (!selValid) {
          setSelectedCategory(firstId);
        }
        if (l1ListHasEmbeddedL2(categories)) {
          setAllL2ByL1(buildL2MapFromL1List(categories));
          setIsLoadingAllL2(false);
        }
      }
    },
    onError: (error) => {
      setTopCategories([]);
      hasFetchedRef.current = null;
      showToast(error || t('category.failedToLoadCategories'), 'error');
    },
  });

  const appliedInitialCompanyRef = useRef<string | null>(null);

  // Deep link from product detail: open the matching top-level platform tab (1688 / Taobao).
  useFocusEffect(
    useCallback(() => {
      const initialCompany = route.params?.initialCompany;
      if (!initialCompany || initialCompany === 'All') return;
      if (!(COMPANY_TABS as readonly string[]).includes(initialCompany)) return;
      if (appliedInitialCompanyRef.current === initialCompany) return;
      appliedInitialCompanyRef.current = initialCompany;
      const platform = getPlatformFromCompany(initialCompany);
      fetchTokenRef.current++;
      hasFetchedRef.current = null;
      setTopCategories([]);
      setAllL2ByL1({});
      setSelectedCategory('');
      setSelectedPlatform(platform);
      setSelectedCompany(initialCompany);
    }, [route.params?.initialCompany, setSelectedPlatform, setSelectedCategory]),
  );

  // Fetch L1 categories when the selected company/platform changes (and on mount).
  // hasFetchedRef key includes locale so a language switch re-fetches with the new lang.
  useEffect(() => {
    if (!selectedCompany) return;
    const platform = getPlatformFromCompany(selectedCompany);
    const lang = mapLocaleToCategoryLang(locale || 'ko');
    const fetchKey = `${platform}|${lang}`;
    if (hasFetchedRef.current === fetchKey && topCategoriesLenRef.current > 0) return;
    setIsLoadingTopCategories(true);
    refetchTopCategories(platform, lang).finally(() => {
      setIsLoadingTopCategories(false);
      hasFetchedRef.current = fetchKey;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompany, locale]);
  void isMutationLoading;

  // Batch-fetch L2 for every L1 once topCategories are known. The right
  // column shows a single continuous SectionList grouped by L1, so we need
  // every L1's L2 data; processes the selected L1 first then fans out with
  // bounded concurrency.
  useEffect(() => {
    if (topCategories.length === 0 || !selectedCompany) {
      setAllL2ByL1({});
      setIsLoadingAllL2(false);
      return;
    }
    const platform = getPlatformFromCompany(selectedCompany);
    const lang = mapLocaleToCategoryLang(locale || 'ko');

    if (l1ListHasEmbeddedL2(topCategories)) {
      setAllL2ByL1(buildL2MapFromL1List(topCategories));
      setIsLoadingAllL2(false);
      return;
    }

    const token = ++fetchTokenRef.current;
    setIsLoadingAllL2(true);
    setAllL2ByL1({});

    (async () => {
      let queue: typeof topCategories = [...topCategories];
      const selId = usePlatformStore.getState().selectedCategory;
      const selPos = queue.findIndex((l1: any) => getCategoryNodeId(l1) === selId);
      if (selPos > 0) {
        const picked = queue.splice(selPos, 1)[0];
        queue = [picked, ...queue];
      }
      const pending = queue;
      const CONCURRENCY = 4;
      const fetchOne = async (l1: any) => {
        if (token !== fetchTokenRef.current) return;
        const l1Id = getCategoryNodeId(l1);
        const parentId = getCategoryParentId(l1);
        if (!l1Id || !parentId) return;
        let tree: any[] = [];
        try {
          const resp = await productsApi.getChildCategories(platform, parentId, lang);
          if (token !== fetchTokenRef.current) return;
          if (resp?.success && resp?.data) {
            tree = extractL2Tree(resp.data);
          }
          if (
            tree.length === 0 &&
            l1.externalId != null &&
            String(l1.externalId) !== parentId
          ) {
            const retry = await productsApi.getChildCategories(
              platform,
              String(l1.externalId),
              lang,
            );
            if (token !== fetchTokenRef.current) return;
            if (retry?.success && retry?.data) {
              tree = extractL2Tree(retry.data);
            }
          }
        } catch {
          if (token !== fetchTokenRef.current) return;
        }
        setAllL2ByL1((prev) => ({ ...prev, [l1Id]: tree }));
      };

      if (pending.length > 0 && getCategoryNodeId(pending[0]) === selId) {
        await fetchOne(pending.shift());
        if (token !== fetchTokenRef.current) return;
      }

      let cursor = 0;
      const workers = Array.from({ length: Math.min(CONCURRENCY, pending.length) }, async () => {
        while (true) {
          if (token !== fetchTokenRef.current) return;
          const i = cursor++;
          if (i >= pending.length) return;
          await fetchOne(pending[i]);
        }
      });
      await Promise.all(workers);
      if (token !== fetchTokenRef.current) return;
      setIsLoadingAllL2(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topCategories, selectedCompany, locale]);

  // Top categories for the left column.
  const categoryLang = mapLocaleToCategoryLang(locale);
  const categoriesToDisplay = useMemo(
    () =>
      topCategories
        .map((cat: any) => ({
          id: getCategoryNodeId(cat),
          name:
            pickCategoryLabel(cat, categoryLang) ||
            (cat.externalId != null ? String(cat.externalId) : '') ||
            'Category',
          image: getCategoryImage(cat),
        }))
        .filter((cat) => cat.id),
    [topCategories, categoryLang, getCategoryImage],
  );

  /**
   * Right column: one SectionList section per L1, in the same order as `topCategories`.
   * Each section shows that L1’s title (header) and its L2 rows; the next L1 follows below.
   */
  const sections = useMemo(() => {
    return topCategories.map((l1: any) => {
      const l1Id = getCategoryNodeId(l1);
      const l1Name =
        pickCategoryLabel(l1, categoryLang) ||
        (l1.externalId != null ? String(l1.externalId) : '') ||
        'Category';
      const tree = allL2ByL1[l1Id] || [];
      const hasL2Loaded = Object.prototype.hasOwnProperty.call(allL2ByL1, l1Id);
      const data = tree.map((level2: any) => {
        const level3Children = getEmbeddedL2Children(level2);
        const level2Name = pickCategoryLabel(level2, categoryLang);
        return {
          id: getCategoryNodeId(level2),
          name: level2Name || (level2.externalId != null ? String(level2.externalId) : '') || 'Category',
          l1Id,
          l1Name,
          subsubcategories: level3Children.map((level3: any) => ({
            id: getCategoryNodeId(level3),
            name: pickCategoryLabel(level3, categoryLang) || 'Category',
            externalId: level3.externalId,
            image: getCategoryImage(level3) || '',
          })),
        };
      });

      if (!hasL2Loaded) {
        return {
          l1Id,
          title: l1Name,
          data: [
            { id: `${l1Id}-placeholder-1`, isPlaceholder: true, l1Id, l1Name },
            { id: `${l1Id}-placeholder-2`, isPlaceholder: true, l1Id, l1Name },
            { id: `${l1Id}-placeholder-3`, isPlaceholder: true, l1Id, l1Name },
          ],
        };
      }

      if (data.length === 0 && hasL2Loaded) {
        return {
          l1Id,
          title: l1Name,
          data: [{ id: `${l1Id}-empty`, isEmpty: true, l1Id, l1Name }],
        };
      }

      return { l1Id, title: l1Name, data };
    });
  }, [topCategories, allL2ByL1, selectedCategory, categoryLang, getCategoryImage]);

  /**
   * Map each section's flat-index entry to a precise pixel offset/length so
   * `scrollToLocation` works for sections that haven't been rendered yet.
   * SectionList visits each section as: [header, ...items, footer]; index 0 is
   * section 0's header, then its items, then its (zero-height) footer, then
   * section 1's header, and so on.
   */
  const getItemLayout = useMemo(() => {
    const sectionOffsets: number[] = [];
    let runningOffset = 0;
    for (const sec of sections) {
      sectionOffsets.push(runningOffset);
      // header + items + footer (footer is 0 here)
      runningOffset += SECTION_HEADER_HEIGHT + sec.data.length * ROW_HEIGHT;
    }

    return (
      _data: any,
      index: number,
    ): { length: number; offset: number; index: number } => {
      // Walk the flat index across [header, items, footer] groups.
      let cursor = 0;
      for (let s = 0; s < sections.length; s++) {
        const itemCount = sections[s].data.length;
        // header
        if (index === cursor) {
          return { length: SECTION_HEADER_HEIGHT, offset: sectionOffsets[s], index };
        }
        cursor += 1;
        // items
        if (index < cursor + itemCount) {
          const itemPos = index - cursor;
          return {
            length: ROW_HEIGHT,
            offset: sectionOffsets[s] + SECTION_HEADER_HEIGHT + itemPos * ROW_HEIGHT,
            index,
          };
        }
        cursor += itemCount;
        // footer (zero height, but counted in flat indexing)
        if (index === cursor) {
          return {
            length: 0,
            offset: sectionOffsets[s] + SECTION_HEADER_HEIGHT + itemCount * ROW_HEIGHT,
            index,
          };
        }
        cursor += 1;
      }
      // Trailing list-end entry.
      return { length: 0, offset: runningOffset, index };
    };
  }, [sections]);

  const openProductDiscoveryForL2 = useCallback(
    (l2Item: any, initialL3Id?: string) => {
      if (asHomeModal) {
        onModalClose?.();
      }
      const platform = getPlatformFromCompany(selectedCompany);
      const localizedSubSubs = (l2Item.subsubcategories || []).map((subSubCat: any) => {
        if (subSubCat.name && typeof subSubCat.name === 'object') {
          return {
            ...subSubCat,
            name: subSubCat.name[locale] || subSubCat.name.en || subSubCat.name,
          };
        }
        return subSubCat;
      });
      navigation.navigate('ProductDiscovery', {
        subCategoryName: l2Item.name,
        // Each L2 carries the parent L1 it actually belongs to (set in the
        // sections memo). Don't fall back to selectedCategory — that tracks
        // the visible section and may differ from the tapped row's parent
        // during scroll.
        categoryId: l2Item.l1Id,
        categoryName: l2Item.l1Name,
        subcategoryId: l2Item.id,
        subsubcategories: localizedSubSubs,
        source: platform,
        ...(initialL3Id ? { initialSubSubCategoryId: initialL3Id } : {}),
      });
    },
    [asHomeModal, onModalClose, selectedCompany, locale, navigation],
  );

  const onRefresh = async () => {
    if (!selectedCompany) return;
    skipRightAutoAlignRef.current = false;
    setRefreshing(true);
    const platform = getPlatformFromCompany(selectedCompany);
    setAllL2ByL1({});
    // Re-trigger the top-categories fetch which in turn re-runs the
    // batch L2 effect (its dependency on `topCategories` reference fires).
    hasFetchedRef.current = null;
    try {
      await refetchTopCategories(platform, mapLocaleToCategoryLang(locale || 'ko'));
    } finally {
      setRefreshing(false);
    }
  };

  const performTargetScroll = useCallback((sectionIndex: number) => {
    if (!sectionListRef.current) return false;
    try {
      isProgrammaticRightScrollRef.current = true;
      sectionListRef.current.scrollToLocation({
        sectionIndex,
        itemIndex: 0,
        animated: false,
        viewOffset: 0,
        viewPosition: 0,
      });
      // Hold the lockout long enough that any viewability callbacks emitted *because of*
      // this scroll don't fight the user's tap intent. ~1 RAF wasn't enough — visibility
      // events can land a few frames later, especially when sections have variable height.
      if (programmaticScrollUnlockTimerRef.current) {
        clearTimeout(programmaticScrollUnlockTimerRef.current);
      }
      programmaticScrollUnlockTimerRef.current = setTimeout(() => {
        isProgrammaticRightScrollRef.current = false;
        programmaticScrollUnlockTimerRef.current = null;
      }, 220);
      return true;
    } catch {
      isProgrammaticRightScrollRef.current = false;
      return false;
    }
  }, []);

  const scrollLeftRowIntoView = useCallback((categoryId: string) => {
    const index = categoriesToDisplay.findIndex((c) => c.id === categoryId);
    if (index < 0 || !leftCategoryListRef.current) return;
    const n = categoriesToDisplay.length;
    const viewPosition = getLeftListViewPosition(index, n);
    try {
      // Non-animated avoids stacked scroll animations clashing with RefreshControl /
      // end-of-list clamping when several deferred scrollLeftRowIntoView ran back-to-back.
      leftCategoryListRef.current.scrollToIndex({
        index,
        animated: false,
        viewPosition,
      });
    } catch {
      /* layout may not be ready */
    }
  }, [categoriesToDisplay]);

  const handleCategoryPress = useCallback(
    (categoryId: string) => {
      const idx = topCategories.findIndex((t: any) => getCategoryNodeId(t) === categoryId);
      if (idx < 0) return;
      const isResnap = categoryId === usePlatformStore.getState().selectedCategory;
      // Always re-arm: a tap is an explicit user intent to align both columns,
      // so override any prior skip-flag set by an incidental drag.
      skipRightAutoAlignRef.current = false;
      tapAlignCategoryIdRef.current = categoryId;
      // Scroll right column. SectionList without `getItemLayout` measures lazily;
      // run once now (often hits) and once after a frame so the second call sees
      // the freshly-committed layout when the first miscalculated.
      performTargetScroll(idx);
      requestAnimationFrame(() => performTargetScroll(idx));
      if (!isResnap) {
        scrollLeftRowIntoView(categoryId);
        setSelectedCategory(categoryId);
      }
    },
    [topCategories, performTargetScroll, scrollLeftRowIntoView, setSelectedCategory],
  );

  const rightViewabilityConfigRef = useRef({
    itemVisiblePercentThreshold: 15,
    minimumViewTime: 40,
  });

  const onRightViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: any[] }) => {
    if (isProgrammaticRightScrollRef.current) return;
    if (!Array.isArray(viewableItems) || viewableItems.length === 0) return;

    const firstVisible = viewableItems.find((v: any) => v?.isViewable && v?.section?.l1Id);
    const visibleL1Id = firstVisible?.section?.l1Id;
    if (!visibleL1Id) return;
    if (visibleL1Id === usePlatformStore.getState().selectedCategory) return;

    setSelectedCategory(visibleL1Id);
    scrollLeftRowIntoView(visibleL1Id);
  });

  /** If the global selection is not in the current company’s top list (stale id), snap to the first L1. */
  useEffect(() => {
    if (topCategories.length === 0 || !selectedCategory) return;
    const exists = topCategories.some((t: any) => getCategoryNodeId(t) === selectedCategory);
    if (!exists) {
      const firstId = getCategoryNodeId(topCategories[0]);
      tapAlignCategoryIdRef.current = null;
      skipRightAutoAlignRef.current = false;
      setSelectedCategory(firstId);
    }
  }, [topCategories, selectedCategory, setSelectedCategory]);

  /** Re-allow auto-align when switching company tab so the right column follows the new tree. */
  useEffect(() => {
    skipRightAutoAlignRef.current = false;
  }, [selectedCompany]);

  /**
   * Snap the right column to the selected L1 **before paint** for non-tap selection changes
   * (initial hydration, stale-id recovery, company-tab switch). Tap-driven changes are
   * handled imperatively in handleCategoryPress and would double-fire here, so skip them.
   * Section indices match `topCategories` even while L2 is still placeholders — do **not**
   * re-subscribe to `allL2ByL1` here or each batch fetch will fire scroll again.
   */
  useLayoutEffect(() => {
    if (!selectedCategory || topCategories.length === 0) return;
    if (skipRightAutoAlignRef.current) return;
    if (tapAlignCategoryIdRef.current === selectedCategory) return;
    const idx = topCategories.findIndex((t: any) => getCategoryNodeId(t) === selectedCategory);
    if (idx < 0) return;
    performTargetScroll(idx);
    scrollLeftRowIntoView(selectedCategory);
  }, [selectedCategory, topCategories, performTargetScroll, scrollLeftRowIntoView]);

  /**
   * Re-snap the right column once the tapped L1's L2 rows arrive. After a tap we record
   * the target id; when its data lands the section grows from 3 placeholder rows to N
   * real rows, drifting the snapped position. Re-run scroll exactly once for that id,
   * then clear the ref to avoid cascading on later batch updates.
   */
  useLayoutEffect(() => {
    const targetId = tapAlignCategoryIdRef.current;
    if (!targetId) return;
    if (skipRightAutoAlignRef.current) return;
    if (!Object.prototype.hasOwnProperty.call(allL2ByL1, targetId)) return;
    const idx = topCategories.findIndex((t: any) => getCategoryNodeId(t) === targetId);
    if (idx < 0) return;
    performTargetScroll(idx);
    tapAlignCategoryIdRef.current = null;
  }, [allL2ByL1, topCategories, performTargetScroll]);

  // Helper function to convert image URI to base64
  const convertUriToBase64 = async (uri: string): Promise<string | null> => {
    try {
      // Remove file:// prefix if present
      const fileUri = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
      const base64 = await RNFS.readFile(fileUri, 'base64');
      return base64;
    } catch (error) {
      // console.error('Error converting URI to base64:', error);
      return null;
    }
  };

  const handleImageSearch = async () => {
    // Navigate to camera screen
    navigation.navigate('ImageSearchCamera' as never);
  };

  const handleTakePhoto = async () => {
    // Request camera permission
    const granted = await requestCameraPermission();
    if (!granted) {
      Alert.alert(t('home.permissionRequired'), t('home.grantCameraPermission'));
      return;
    }

    const options: CameraOptions = {
      mediaType: 'photo' as MediaType,
      quality: IMAGE_CONFIG.QUALITY,
      saveToPhotos: false,
      includeBase64: true,
    };

    launchCamera(options, async (response: ImagePickerResponse) => {
      if (response.didCancel) {
        return;
      }
      if (response.errorCode) {
        Alert.alert(t('common.error'), response.errorMessage || t('home.failedToTakePhoto'));
        return;
      }
      if (response.assets && response.assets[0]) {
        setImagePickerModalVisible(false);
        let base64Data = response.assets[0].base64;
        
        // Then compressImageForSearch uses IMAGE_CONFIG.QUALITY (may step down for size)
        // Only compress if base64 is not available (fallback case)
        if (!base64Data && response.assets[0].uri) {
          const { compressImageForSearch } = require('../../utils/imageCompression');
          const compressedBase64 = await compressImageForSearch(response.assets[0].uri);
          if (compressedBase64) {
            base64Data = compressedBase64;
          } else {
            const convertedBase64 = await convertUriToBase64(response.assets[0].uri);
            base64Data = convertedBase64 || undefined;
          }
        }
        
        if (!base64Data) {
          showToast(t('home.imageDataUnavailable'), 'error');
          return;
        }
        
        navigation.navigate('ImageSearch', { 
          imageUri: response.assets[0].uri || '',
          imageBase64: base64Data,
        });
      }
    });
  };

  const handleChooseFromGallery = async () => {
    // Request media library permission
    const granted = await requestPhotoLibraryPermission();
    if (!granted) {
      Alert.alert(t('home.permissionRequired'), t('home.grantPhotoLibraryPermission'));
      return;
    }

    const options: ImageLibraryOptions = {
      mediaType: 'photo' as MediaType,
      quality: IMAGE_CONFIG.QUALITY,
      selectionLimit: 1,
      includeBase64: true,
    };

    launchImageLibrary(options, async (response: ImagePickerResponse) => {
      if (response.didCancel) {
        return;
      }
      if (response.errorCode) {
        Alert.alert(t('common.error'), response.errorMessage || t('home.failedToPickImage'));
        return;
      }
      if (response.assets && response.assets[0]) {
        setImagePickerModalVisible(false);
        let base64Data = response.assets[0].base64;
        
        // Then compressImageForSearch uses IMAGE_CONFIG.QUALITY (may step down for size)
        // Only compress if base64 is not available (fallback case)
        if (!base64Data && response.assets[0].uri) {
          const { compressImageForSearch } = require('../../utils/imageCompression');
          const compressedBase64 = await compressImageForSearch(response.assets[0].uri);
          if (compressedBase64) {
            base64Data = compressedBase64;
          } else {
            const convertedBase64 = await convertUriToBase64(response.assets[0].uri);
            base64Data = convertedBase64 || undefined;
          }
        }
        
        if (!base64Data) {
          showToast(t('home.imageDataUnavailable'), 'error');
          return;
        }
        
        navigation.navigate('ImageSearch', { 
          imageUri: response.assets[0].uri || '',
          imageBase64: base64Data,
        });
      }
    });
  };

  // Render company filter tabs
  const renderCompanyTabs = (options?: { hideAllTab?: boolean; compactSpacing?: boolean }) => {
    const tabs = options?.hideAllTab ? COMPANY_TABS.filter((tab) => tab !== 'All') : COMPANY_TABS;
    return (
      <View style={[styles.companyTabsContainer, options?.compactSpacing && styles.companyTabsContainerCompact]}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.companyTabs}
        >
          {tabs.map((company, index) => {
            const isSelected = selectedCompany === company;
            
            return (
              <TouchableOpacity hitSlop={BACK_NAVIGATION_HIT_SLOP}
                key={`company-${company}-${index}`}
                style={[
                  styles.companyTab,
                  index === tabs.length - 1 && { marginRight: SPACING.md },
                  index === 0 && { marginLeft: SPACING.md }
                ]}
                onPress={() => {
                  if (company === selectedCompany) return;
                  const platform = getPlatformFromCompany(company);
                  setSelectedPlatform(platform);
                  // Cancel in-flight L2 batch and clear staged state in one render.
                  fetchTokenRef.current++;
                  hasFetchedRef.current = null;
                  setTopCategories([]);
                  setAllL2ByL1({});
                  // Stale-recovery effect snaps selectedCategory to the first L1 of the new list.
                  setSelectedCategory('');
                  setSelectedCompany(company);
                }}
              >
                <Text style={[
                  styles.companyTabText,
                  isSelected && styles.companyTabTextSelected
                ]}>
                  {company}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <View style={styles.headerRow}>
        <TouchableOpacity hitSlop={BACK_NAVIGATION_HIT_SLOP}
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Icon name="arrow-back" size={22} color={COLORS.text.primary} />
        </TouchableOpacity>

        <SearchButton
          placeholder={t('category.searchPlaceholder')}
          onPress={() => navigation.navigate('Search' as never)}
          onCameraPress={handleImageSearch}
          style={styles.searchButton}
          isHomepage={false}
        />

        <NotificationBadge
          customIcon={<NotificationIcon width={28} height={28} color={COLORS.text.primary} />}
          count={messageUnreadCount}
          badgeColor={COLORS.red}
          onPress={() => {
            navigation.navigate('Message' as never);
          }}
        />
      </View>
      {/* {renderCompanyTabs()} */}
      {renderCompanyTabs()}
    </View>
  );

  
  const renderLevel1CategoryItem = useCallback(({ item }: { item: any }) => {
    const isSelected = selectedCategory === item.id;
    return (
      <TouchableOpacity
        style={[
          styles.categoryItem,
          isSelected && styles.categoryItemActive
        ]}
        onPress={() => handleCategoryPress(item.id)}
      >
        <Text style={[
          styles.categoryName,
          isSelected && styles.categoryNameActive
        ]}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  }, [selectedCategory, handleCategoryPress]);

  // Tap behaviour for an L2 row:
  //   * Tablet landscape → fill the right-most L3 panel in place
  //     (no navigation). A short loading window drives the L3 skeleton.
  //   * Everywhere else → keep the original behaviour of navigating to
  //     the product discovery screen.
  const handleL2RowTap = useCallback(
    (item: any) => {
      if (responsive.isTabletLandscape) {
        setIsLoadingL3(true);
        setSelectedL2(item);
        // L3 children are already embedded in the L2 object (see
        // `sections` memo); a brief loading flash matches the rest of
        // the app's skeleton patterns and gives the user feedback that
        // the panel is being repopulated when they switch L2 rows.
        const timer = setTimeout(() => setIsLoadingL3(false), 150);
        return () => clearTimeout(timer);
      }
      openProductDiscoveryForL2(item);
    },
    [responsive.isTabletLandscape, openProductDiscoveryForL2],
  );

  const renderL2Row = useCallback(({ item }: { item: any }) => {
    if (item?.isPlaceholder) {
      return (
        <View style={styles.browseSubcatRow}>
          <View style={styles.browseSubcatSkelText} />
        </View>
      );
    }
    if (item?.isEmpty) {
      return (
        <View style={styles.browseSubcatRow}>
          <Text style={styles.browseSubcatEmpty} numberOfLines={1}>
            {t('category.noItemsAvailableForCategory')}
          </Text>
        </View>
      );
    }
    const isActive = responsive.isTabletLandscape && selectedL2?.id === item.id;
    return (
      <TouchableOpacity
        style={[styles.browseSubcatRow, isActive && styles.browseSubcatRowActive]}
        activeOpacity={0.75}
        onPress={() => handleL2RowTap(item)}
      >
        <Text
          style={[styles.browseSubcatName, isActive && styles.browseSubcatNameActive]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {item.name}
        </Text>
        <Icon name="chevron-forward" size={20} color={COLORS.text.secondary} />
      </TouchableOpacity>
    );
  }, [handleL2RowTap, locale, responsive.isTabletLandscape, selectedL2?.id]);

  /** Per-L1 block header on the right (title row), then L2 rows in that section. */
  const renderL1SectionHeader = useCallback(({ section }: { section: any }) => (
    <View style={styles.browseSectionHeader}>
      <Text
        style={styles.browseSectionHeaderText}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {section.title}
      </Text>
    </View>
  ), []);

  // L3 panel — tablet-landscape only. Width is 60% of screen as
  // requested. Shows skeleton blocks while `isLoadingL3` is true so
  // the user gets feedback when switching L2 rows.
  const renderL3Panel = () => {
    const panelWidth = Math.floor(winWidth * 0.6);
    const items: any[] = selectedL2?.subsubcategories || [];

    if (isLoadingL3) {
      return (
        <View style={[styles.l3Panel, { width: panelWidth }]}>
          <View style={styles.l3PanelHeader}>
            <SkeletonBlock width={160} height={18} />
          </View>
          <View style={styles.l3PanelContent}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <View key={`l3-skel-${i}`} style={styles.l3SkeletonRow}>
                <SkeletonBlock width={48} height={48} borderRadius={8} />
                <SkeletonBlock
                  width="60%"
                  height={14}
                  style={{ marginLeft: SPACING.sm }}
                />
              </View>
            ))}
          </View>
        </View>
      );
    }

    if (!selectedL2) {
      return (
        <View style={[styles.l3Panel, { width: panelWidth }]}>
          <View style={styles.l3PanelEmpty}>
            <Text style={styles.l3PanelEmptyText}>
              {t('category.selectSubcategoryHint') || 'Select a subcategory'}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.l3Panel, { width: panelWidth }]}>
        <View style={styles.l3PanelHeader}>
          <Text style={styles.l3PanelHeaderText} numberOfLines={1}>
            {selectedL2.name}
          </Text>
        </View>
        {items.length === 0 ? (
          <View style={styles.l3PanelEmpty}>
            <Text style={styles.l3PanelEmptyText}>
              {t('category.noItemsAvailableForCategory')}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.l3PanelScroll}
            contentContainerStyle={styles.l3PanelContent}
            showsVerticalScrollIndicator={false}
          >
            {items.map((l3: any) => (
              <TouchableOpacity
                key={`l3-${l3.id}`}
                style={styles.l3Row}
                activeOpacity={0.75}
                onPress={() => openProductDiscoveryForL2(selectedL2, l3.id)}
              >
                {l3.image ? (
                  <View style={styles.l3Thumb}>
                    {/* eslint-disable-next-line react-native/no-inline-styles */}
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        backgroundColor: COLORS.gray[100],
                      }}
                    />
                  </View>
                ) : (
                  <View style={styles.l3ThumbPlaceholder} />
                )}
                <Text style={styles.l3Name} numberOfLines={2}>
                  {l3.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  const renderCategoryBody = () => (
    <View style={styles.mainContent}>
      <View style={styles.leftColumn}>
        {isLoadingTopCategories && categoriesToDisplay.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingText}>{t('loading.categories')}</Text>
          </View>
        ) : (
          <FlatList
            ref={leftCategoryListRef}
            data={categoriesToDisplay}
            renderItem={renderLevel1CategoryItem}
            keyExtractor={(item) => `category-${item.id || item.name}`}
            extraData={selectedCategory}
            scrollEnabled
            showsVerticalScrollIndicator={false}
            style={styles.leftCategoryList}
            {...(Platform.OS === 'android' ? { overScrollMode: 'never' as const } : {})}
            onScrollToIndexFailed={(info) => {
              const idx = info.index;
              const n = categoriesToDisplay.length;
              const viewPosition = getLeftListViewPosition(idx, n);
              setTimeout(() => {
                try {
                  leftCategoryListRef.current?.scrollToIndex({
                    index: idx,
                    animated: false,
                    viewPosition,
                  });
                } catch {
                  /* retry once after measurement */
                }
              }, 120);
            }}
          />
        )}
      </View>

      <View style={styles.rightColumn}>
        {sections.length === 0 && isLoadingAllL2 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingText}>{t('loading.categories')}</Text>
          </View>
        ) : (
          <View style={styles.rightColumnInner}>
            <View style={styles.rightSectionListWrap}>
              <SectionList
                ref={sectionListRef}
                style={styles.rightSectionList}
                sections={sections}
                keyExtractor={(item: any) => `l2-${item.l1Id ?? 'x'}-${item.id}`}
                renderItem={renderL2Row}
                renderSectionHeader={renderL1SectionHeader}
                stickySectionHeadersEnabled
                showsVerticalScrollIndicator={false}
                getItemLayout={getItemLayout as any}
                viewabilityConfig={rightViewabilityConfigRef.current}
                onViewableItemsChanged={onRightViewableItemsChanged.current}
                onScrollToIndexFailed={() => {
                  const id = tapAlignCategoryIdRef.current ?? selectedCategory;
                  if (!id) return;
                  const idx = topCategories.findIndex((t: any) => getCategoryNodeId(t) === id);
                  if (idx < 0) return;
                  setTimeout(() => performTargetScroll(idx), 80);
                }}
                onScrollBeginDrag={() => {
                  tapAlignCategoryIdRef.current = null;
                  skipRightAutoAlignRef.current = true;
                }}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                contentContainerStyle={styles.browseSectionListContent}
              />
            </View>
          </View>
        )}
      </View>
      {/* L3 panel — only on tablet landscape. Width 60% of screen. */}
      {responsive.isTabletLandscape && renderL3Panel()}
    </View>
  );

  const categoryContent = (
    <>
      {!embedded && !hideHeader && renderHeader()}
      {isEmbeddedLandscapeHeader && (
        <View style={styles.embeddedModalHeaderWrap}>
          <View style={styles.embeddedModalHeader}>
            <Text style={styles.embeddedModalTitle}>{t('navigation.category')}</Text>
            <TouchableOpacity
              hitSlop={BACK_NAVIGATION_HIT_SLOP}
              onPress={onModalClose}
              style={styles.embeddedModalClose}
            >
              <Icon name="close" size={22} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          {renderCompanyTabs({ hideAllTab: true, compactSpacing: true })}
        </View>
      )}
      {asHomeModal && (
        <View style={styles.homeCategoryModalHeaderWrap}>
          <TouchableOpacity
            hitSlop={BACK_NAVIGATION_HIT_SLOP}
            onPress={onModalClose}
            style={styles.homeCategoryModalCloseBtn}
            activeOpacity={0.8}
          >
            <Icon name="close" size={22} color={COLORS.text.primary} />
          </TouchableOpacity>
          {renderCompanyTabs({ hideAllTab: true, compactSpacing: true })}
        </View>
      )}
      {embedded && renderCompanyTabs({ compactSpacing: true })}
      {renderCategoryBody()}

      <ImagePickerModal
        visible={imagePickerModalVisible}
        onClose={() => setImagePickerModalVisible(false)}
        onTakePhoto={handleTakePhoto}
        onChooseFromGallery={handleChooseFromGallery}
      />
    </>
  );

  if (embedded) {
    return <View style={[styles.container, styles.profileEmbeddedContainer]}>{categoryContent}</View>;
  }

  if (asHomeModal) {
    return <View style={[styles.container, styles.homeModalContainer]}>{categoryContent}</View>;
  }

  return <SafeAreaView style={styles.container}>{categoryContent}</SafeAreaView>;
};

const styles = StyleSheet.create({
  profileEmbeddedContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    backgroundColor: COLORS.white,
    paddingTop: SPACING.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  searchButton: {
    borderRadius: BORDER_RADIUS.full,
    flex: 1,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBackButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    paddingBottom: SPACING.lg,
  },
  leftColumn: {
    width: 140,
    minHeight: 0,
    backgroundColor: COLORS.gray[100],
  },
  leftCategoryList: {
    flex: 1,
  },
  rightColumn: {
    flex: 1,
    minHeight: 0,
  },
  rightColumnInner: {
    flex: 1,
    minHeight: 0,
  },
  rightSectionListWrap: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
  },
  rightSectionList: {
    flex: 1,
  },
  categoryItem: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.gray[100],
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  categoryItemActive: {
    backgroundColor: COLORS.white,
  },
  categoryName: {
    fontSize: FONTS.sizes.sm ,
    color: COLORS.text.primary,
    textAlign: 'left',
    fontWeight: '500',
  },
  categoryNameActive: {
    fontWeight: '600',
    color: COLORS.red,
  },
  browseSubcatSection: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
    minHeight: 0,
  },
  browseListHeaderOuter: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  browseSubcatHeader: {
    marginBottom: SPACING.sm,
  },
  browseSubcatTitle: {
    fontSize: FONTS.sizes.lg ,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  browseSubcatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ROW_HEIGHT,
    paddingHorizontal: SPACING.sm,
    gap: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.gray[200],
  },
  browseSubcatName: {
    flex: 1,
    fontSize: FONTS.sizes.md ,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  browseSubcatRowActive: {
    backgroundColor: COLORS.gray[100],
  },
  browseSubcatNameActive: {
    color: COLORS.red,
    fontWeight: '700',
  },
  // L3 panel — only rendered on tablet landscape. Width is set inline
  // (60% of `winWidth`) so it tracks rotation changes.
  l3Panel: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: COLORS.gray[200],
    backgroundColor: COLORS.white,
  },
  l3PanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.gray[200],
    backgroundColor: COLORS.gray[50],
  },
  l3PanelHeaderText: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.red,
  },
  l3PanelScroll: {
    flex: 1,
  },
  l3PanelContent: {
    paddingVertical: SPACING.sm,
  },
  l3PanelEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
  },
  l3PanelEmptyText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
  },
  l3Row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.gray[200],
  },
  l3SkeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  l3Thumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: COLORS.gray[100],
  },
  l3ThumbPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: COLORS.gray[100],
  },
  l3Name: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  browseSubcatSkelText: {
    flex: 1,
    height: 14,
    backgroundColor: COLORS.gray[200],
    borderRadius: 4,
  },
  browseSubcatEmpty: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    fontStyle: 'italic',
  },
  browseQuickJumpWrap: {
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.gray[200],
  },
  browseQuickJumpTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  browseQuickJumpHint: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
  },
  browseQuickJumpScroll: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.xs,
    paddingRight: SPACING.md,
  },
  browseQuickJumpChip: {
    maxWidth: 200,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.gray[100],
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  browseQuickJumpChipText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  browseSectionListContent: {
    paddingBottom: SPACING.xl,
  },
  browseSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    height: SECTION_HEADER_HEIGHT,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.gray[50],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.gray[200],
    gap: SPACING.sm,
  },
  browseSectionHeaderText: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.red,
  },
  browseLevel3Row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.gray[200],
  },
  browseLevel3RowText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '400',
  },
  browseSectionSeparator: {
    height: SPACING.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  loadingText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  companyTabsContainer: {
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.md,
  },
  companyTabsContainerCompact: {
    // 10% of default spacing for tighter title-to-tabs gap in modal header.
    paddingVertical: Math.max(1, Math.round(SPACING.md * 0.1)),
  },
  homeModalContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  homeCategoryModalHeaderWrap: {
    position: 'relative',
    backgroundColor: COLORS.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.gray[200],
    paddingRight: SPACING.xl + SPACING.sm,
  },
  homeCategoryModalCloseBtn: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.sm,
    zIndex: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gray[100],
  },
  embeddedModalHeaderWrap: {
    backgroundColor: COLORS.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.gray[200],
  },
  embeddedModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.red,
    backgroundColor: 'rgb(255, 88, 3)',
  },
  embeddedModalTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.white,
  },
  embeddedModalClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  companyTabs: {
    alignItems: 'center',
  },
  companyTab: {
    paddingHorizontal: SPACING.smmd,
    paddingVertical: SPACING.xs,
  },
  companyTabText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.black,
    fontWeight: '700',
  },
  companyTabTextSelected: {
    color: COLORS.text.red,
    fontWeight: '600',
  },
});

export default CategoryTabScreen;