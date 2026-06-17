/**
 * 온라인상품편집 — 상품관리 페지의 카드에서 편집(✏️) 아이콘을 눌렀을 때
 * 진입한다. 사용자 디자인의 두 번째 그림을 기준으로 기본정보 / 상품스펙
 * (옵션 리스트 + 단가/라벨/비고) 섹션을 갖는 폼 페지.
 *
 * 현재는 placeholder 수준의 폼 — 백엔드의 update endpoint 가 도입되면
 * 확인(Submit) 핸들러를 그 endpoint 로 연결하면 된다. 데이터는 route
 * params 의 productId 로 productListApi.getProducts 응답에서 찾아온다.
 */

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  launchCamera,
  launchImageLibrary,
  MediaType,
  ImagePickerResponse,
  CameraOptions,
  ImageLibraryOptions,
} from 'react-native-image-picker';
import Icon from '../../../../../components/Icon';
import { SkeletonBlock } from '../../../../../components/Skeleton';
import { COLORS, FONTS, SPACING } from '../../../../../constants';
import { RootStackParamList } from '../../../../../types';
import { useTranslation } from '../../../../../hooks/useTranslation';
import { productsApi } from '../../../../../services/productsApi';
import {
  productListApi,
  type UpdateSellerProductPayload,
} from '../../../../../services/productListApi';
import { useToast } from '../../../../../context/ToastContext';
import {
  createEmptySkuLabel,
  isSkuLabelConfigured,
  loadOnlineProductEditDraft,
  saveOnlineProductEditDraft,
  type SkuLabelSettings,
} from '../../../../../utils/onlineProductEditDraft';
import {
  requestCameraPermission,
  requestPhotoLibraryPermission,
} from '../../../../../utils/permissions';
import { TabletContent } from '../../../../../components/TabletContent';
import { useResponsive } from '../../../../../hooks/useResponsive';

type Nav = StackNavigationProp<RootStackParamList, 'OnlineProductEdit'>;
type RouteParams = RouteProp<RootStackParamList, 'OnlineProductEdit'>;

const BACK_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };
const MAX_THUMB_COUNT = 9;

// 카테고리 드롭다운에서 사용 가능한 옵션들.
// 'uncategorized' 만 별도 처리(저장 시 빈 문자열) 하고 나머지는 라벨을
// 그대로 categoryName 으로 저장한다. labelKey 는 i18n 키, fallback 은
// 키 미존재 시 보여줄 한국어 라벨.
const CATEGORY_OPTIONS: {
  key: string;
  labelKey: string;
  fallback: string;
}[] = [
  { key: 'uncategorized', labelKey: 'profile.productMgmt.onlineEdit.uncategorized', fallback: '미분류' },
  { key: 'apparel', labelKey: 'profile.productMgmt.onlineEdit.catApparel', fallback: '의류' },
  { key: 'accessory', labelKey: 'profile.productMgmt.onlineEdit.catAccessory', fallback: '잡화/액세서리' },
  { key: 'home', labelKey: 'profile.productMgmt.onlineEdit.catHome', fallback: '생활/주방' },
  { key: 'beauty', labelKey: 'profile.productMgmt.onlineEdit.catBeauty', fallback: '뷰티/화장품' },
  { key: 'toy', labelKey: 'profile.productMgmt.onlineEdit.catToy', fallback: '완구/취미' },
  { key: 'digital', labelKey: 'profile.productMgmt.onlineEdit.catDigital', fallback: '디지털/가전' },
  { key: 'other', labelKey: 'profile.productMgmt.onlineEdit.catOther', fallback: '기타' },
];

const OnlineProductEditScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteParams>();
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const responsive = useResponsive();

  // route param 으로 받은 초기값 — 호출자(ProductManagementScreen)가 카드의
  // 현재 데이터를 함께 넘기면 폼이 즉시 채워진다. 없으면 빈 폼.
  const initial = useMemo(
    () => route.params ?? ({} as NonNullable<RouteParams['params']>),
    [route.params],
  );

  const [productNameOrig, setProductNameOrig] = useState(initial.productName ?? '');
  const [productName, setProductName] = useState(initial.productName ?? '');
  const [unitPrice, setUnitPrice] = useState(
    initial.unitPrice != null ? String(initial.unitPrice) : '',
  );
  const [optionLabel, setOptionLabel] = useState(initial.option1 ?? '');
  const [remark, setRemark] = useState('');
  // 옵션1·2 의 각 그룹에서 선택된 값. 그룹별 '값' 문자열을 저장한다.
  // 옵션 그리드(색상/사이즈 카드)에서 카드 탭 시 갱신됨.
  const [selectedOptionValues, setSelectedOptionValues] = useState<Record<string, string>>({});
  // SKU 행별 단가 / 비고 / 라벨 — skuId 키로 보관. API 의 SKU 가격을 초기값으로
  // 채우고, 사용자가 행 안의 TextInput 으로 덮어쓸 수 있다.
  const [skuPriceMap, setSkuPriceMap] = useState<Record<string, string>>({});
  const [skuRemarkMap, setSkuRemarkMap] = useState<Record<string, string>>({});
  /** SKU 행별 라벨 설정 — 저장 후 해당 행 👁 아이콘 활성화. */
  const [skuLabelMap, setSkuLabelMap] = useState<Record<string, SkuLabelSettings>>({});
  const [labelModalRowId, setLabelModalRowId] = useState<string | null>(null);
  const [labelModalDraft, setLabelModalDraft] = useState<SkuLabelSettings>(
    createEmptySkuLabel(),
  );
  const [barcodeViewerRowId, setBarcodeViewerRowId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const draftLoadedRef = useRef(false);
  /** AsyncStorage 드래프트 — 상세 API 응답보다 우선 적용. */
  const savedDraftRef = useRef<Awaited<ReturnType<typeof loadOnlineProductEditDraft>>>(null);
  const [thumbUrls, setThumbUrls] = useState<string[]>(
    initial.thumbnailUrl ? [initial.thumbnailUrl] : [],
  );
  // 썸네일 추가 단추 → 카메라 / 갤러리 선택 모달 노출.
  const [thumbPickerOpen, setThumbPickerOpen] = useState(false);
  // 카테고리 드롭다운 — 카테고리 행 바로 아래 anchored 팝오버.
  // categoryName 은 현재 선택된 항목 (초기엔 initial.categoryName 또는 '미분류').
  // categoryRowRef.measureInWindow 로 행의 화면 좌표를 잡아 그 바로 아래에
  // 드롭다운을 표시한다 (BuyListScreen 의 발주관리 칩 패턴과 동일).
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [categoryName, setCategoryName] = useState<string>(
    initial.categoryName || '',
  );
  const [categoryRowLayout, setCategoryRowLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const categoryRowRef = useRef<View>(null);
  // GET /products/detail 응답 전체 — 추후 UI 확장을 위해 보관.
  // detailLoading 은 본문 위쪽에 작은 인디케이터로 표시된다.
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const applyDraftToForm = useCallback((draft: NonNullable<typeof savedDraftRef.current>) => {
    if (draft.productName) setProductName(draft.productName);
    if (draft.categoryName != null) setCategoryName(draft.categoryName);
    if (draft.thumbUrls?.length) setThumbUrls(draft.thumbUrls);
    if (draft.optionLabel) setOptionLabel(draft.optionLabel);
    if (draft.remark) setRemark(draft.remark);
    if (draft.selectedOptionValues) {
      setSelectedOptionValues(draft.selectedOptionValues);
    }
    if (draft.skuPriceMap) {
      setSkuPriceMap((prev) => ({ ...prev, ...draft.skuPriceMap }));
    }
    if (draft.skuRemarkMap) {
      setSkuRemarkMap((prev) => ({ ...prev, ...draft.skuRemarkMap }));
    }
    if (draft.skuLabelMap) {
      setSkuLabelMap((prev) => ({ ...prev, ...draft.skuLabelMap }));
    }
  }, []);

  // ─── 진입 시 드래프트 복원 → 상세 API + 상품리스트 API 병렬 호출 ─────
  // URL: GET /v1/products/detail?productId=<offerId>&source=1688&country=<locale>
  useEffect(() => {
    const offerId = initial.offerId || initial.productId;
    if (!offerId) return;
    const source = initial.source || '1688';
    const country = locale || 'ko';
    let cancelled = false;
    const draftFallback = setTimeout(() => {
      if (!cancelled) draftLoadedRef.current = true;
    }, 2000);

    (async () => {
      setDetailLoading(true);
      setDetailError(null);
      try {
        const draft = await loadOnlineProductEditDraft(offerId);
        if (cancelled) return;
        savedDraftRef.current = draft;
        draftLoadedRef.current = true;
        clearTimeout(draftFallback);
        if (draft) applyDraftToForm(draft);

        const [detailRes, listRes] = await Promise.all([
          productsApi.getProductDetail(offerId, source, country),
          productListApi.getProducts({ lang: country }),
        ]);
        if (cancelled) return;

        if (detailRes.success && detailRes.data?.product) {
          const p = detailRes.data.product;
          setDetail(p);
          const draftNow = savedDraftRef.current;
          if (p.subjectTrans || p.subject) {
            const subj = String(p.subjectTrans || p.subject);
            setProductNameOrig(subj);
            if (!draftNow?.productName) setProductName(subj);
          }
          const firstSku = p.productSkuInfos?.[0];
          if (!draftNow?.skuPriceMap && firstSku?.fenxiaoPriceInfo?.offerPrice) {
            setUnitPrice(String(firstSku.fenxiaoPriceInfo.offerPrice));
          } else if (!draftNow?.skuPriceMap && firstSku?.consignPrice) {
            setUnitPrice(String(firstSku.consignPrice));
          }
          const firstAttr = firstSku?.skuAttributes?.[0];
          if (!draftNow?.optionLabel && (firstAttr?.valueTrans || firstAttr?.value)) {
            setOptionLabel(String(firstAttr.valueTrans || firstAttr.value));
          }
          const detailImgs = [
            ...(p.productImage?.images || []),
            ...(p.productImageTrans?.images || []),
          ]
            .map((img: string) => String(img).trim())
            .filter(Boolean);
          const uniqueDetailImgs = [...new Set(detailImgs)].slice(0, MAX_THUMB_COUNT);
          if (!draftNow?.thumbUrls?.length && uniqueDetailImgs.length) {
            setThumbUrls(uniqueDetailImgs);
          }

          const seededPrices: Record<string, string> = {};
          (p.productSkuInfos || []).forEach((sku: any) => {
            const id = String(sku.skuId || sku.specId || '');
            if (!id) return;
            const price =
              sku?.fenxiaoPriceInfo?.offerPrice ?? sku?.consignPrice ?? sku?.price ?? '';
            seededPrices[id] = String(price);
          });
          setSkuPriceMap((prev) => ({
            ...seededPrices,
            ...prev,
            ...(draftNow?.skuPriceMap ?? {}),
          }));

          if (!draftNow?.selectedOptionValues) {
            const seededSelected: Record<string, string> = {};
            (firstSku?.skuAttributes || []).forEach((attr: any) => {
              const name = String(attr.attributeNameTrans || attr.attributeName || '');
              const val = String(attr.valueTrans || attr.value || '');
              if (name && val) seededSelected[name] = val;
            });
            setSelectedOptionValues(seededSelected);
          }

          const offerKey = String(initial.offerId || '');
          const sellerRows = (listRes.data?.products || []).filter(
            (row) =>
              (offerKey && String(row.offerId ?? '') === offerKey) ||
              row._id === initial.productId,
          );
          if (sellerRows.length) {
            const sellerPrices: Record<string, string> = {};
            const seededRemarks: Record<string, string> = {};
            const seededLabels: Record<string, SkuLabelSettings> = {};
            const nameSeed = draftNow?.productName || initial.productName || '';
            sellerRows.forEach((row) => {
              const id = String(row.skuId || row.sku || '');
              if (!id) return;
              const price = row.userPrice ?? row.unitPrice;
              if (price != null && !draftNow?.skuPriceMap?.[id]) {
                sellerPrices[id] = String(price);
              }
              const rowLabel = (row as { label?: SkuLabelSettings }).label;
              if (rowLabel && typeof rowLabel === 'object') {
                seededLabels[id] = { ...createEmptySkuLabel(), ...rowLabel, configured: true };
              } else if (row.labelName) {
                const isFood = /식검|food/i.test(row.labelName);
                seededLabels[id] = {
                  ...createEmptySkuLabel(nameSeed),
                  labelType: isFood ? 'foodInspect' : 'product',
                  labelProductName: row.productName || nameSeed,
                  configured: true,
                };
              }
              const rowRemark = (row as { remark?: string }).remark;
              if (rowRemark) seededRemarks[id] = rowRemark;
            });
            setSkuPriceMap((prev) => ({ ...prev, ...sellerPrices }));
            setSkuRemarkMap((prev) => ({
              ...prev,
              ...seededRemarks,
              ...(draftNow?.skuRemarkMap ?? {}),
            }));
            setSkuLabelMap((prev) => ({
              ...prev,
              ...seededLabels,
              ...(draftNow?.skuLabelMap ?? {}),
            }));
            const savedThumbs = sellerRows
              .flatMap((row) => row.thumbnails?.map((th) => th.url) || [])
              .map((url) => String(url).trim())
              .filter(Boolean);
            const uniqueSavedThumbs = [...new Set(savedThumbs)].slice(0, MAX_THUMB_COUNT);
            if (!draftNow?.thumbUrls?.length && uniqueSavedThumbs.length) {
              setThumbUrls(uniqueSavedThumbs);
            }
          }
        } else {
          setDetailError(detailRes.message || 'Failed to load product detail');
        }
      } catch (e: any) {
        if (!cancelled) setDetailError(e?.message || 'Failed to load product detail');
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(draftFallback);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.offerId, initial.productId, initial.source, locale, applyDraftToForm]);

  const offerIdKey = String(initial.offerId || initial.productId || '');

  const persistDraft = useCallback(async () => {
    if (!offerIdKey) return;
    await saveOnlineProductEditDraft(offerIdKey, {
      productName,
      categoryName,
      thumbUrls,
      optionLabel,
      remark,
      selectedOptionValues,
      skuPriceMap,
      skuRemarkMap,
      skuLabelMap,
    });
  }, [
    offerIdKey,
    productName,
    categoryName,
    thumbUrls,
    optionLabel,
    remark,
    selectedOptionValues,
    skuPriceMap,
    skuRemarkMap,
    skuLabelMap,
  ]);

  useEffect(() => {
    if (!offerIdKey || !draftLoadedRef.current) return;
    const timer = setTimeout(() => {
      persistDraft();
    }, 600);
    return () => clearTimeout(timer);
  }, [offerIdKey, persistDraft]);

  const buildUpdatePayload = useCallback((): UpdateSellerProductPayload => {
    const skus = (detail?.productSkuInfos || []).map((sku: any) => {
      const id = String(sku.skuId || sku.specId || '');
      const label = skuLabelMap[id];
      const price = parseFloat(skuPriceMap[id] ?? '');
      return {
        skuId: id,
        specId: String(sku.specId || ''),
        unitPrice: Number.isFinite(price) ? price : undefined,
        userPrice: Number.isFinite(price) ? price : undefined,
        remark: skuRemarkMap[id] || '',
        labelName: label?.configured
          ? label.labelType === 'foodInspect'
            ? t('cartOrder.labelModal.foodLabel')
            : t('cartOrder.labelModal.productLabel')
          : undefined,
        label: label?.configured
          ? {
              labelType: label.labelType,
              labelFormat: label.labelFormat,
              labelProductName: label.labelProductName,
              labelContent: label.labelContent,
              labelBarcode: label.labelBarcode,
              labelFileUri: label.labelFileUri,
            }
          : undefined,
      };
    });
    return {
      productName,
      categoryName: categoryName || undefined,
      productUrl: thumbUrls[0] || undefined,
      thumbnails: thumbUrls.length
        ? thumbUrls.map((url, index) => ({
            url,
            isThumbnail: index === 0,
          }))
        : undefined,
      skus,
    };
  }, [
    detail,
    skuLabelMap,
    skuPriceMap,
    skuRemarkMap,
    productName,
    categoryName,
    thumbUrls,
    t,
  ]);

  // ─── 상품스펙: 옵션 그룹 & SKU 행 가공 ─────────────────────────────
  // detail.productSkuInfos 의 skuAttributes 를 그룹별로 모아 (옵션1, 옵션2 …)
  // {name, values:[{value, image}]} 로 변환. 그리드 카드 렌더링에 사용.
  // SKU 그 자체는 표 행으로 그대로 펼친다.
  const optionGroups = useMemo(() => {
    const skus: any[] = detail?.productSkuInfos || [];
    if (!skus.length) return [] as { name: string; values: { value: string; image?: string }[] }[];
    // 그룹 이름(예: '색상', 'Size') 별로 값들을 dedup. 값마다 첫 이미지를 보관.
    const groups: Map<string, Map<string, string | undefined>> = new Map();
    skus.forEach((sku: any) => {
      const attrs: any[] = sku.skuAttributes || [];
      attrs.forEach((attr: any) => {
        const name = String(attr.attributeNameTrans || attr.attributeName || '').trim();
        const value = String(attr.valueTrans || attr.value || '').trim();
        if (!name || !value) return;
        if (!groups.has(name)) groups.set(name, new Map());
        const m = groups.get(name)!;
        if (!m.has(value)) m.set(value, attr.skuImageUrl);
      });
    });
    return Array.from(groups.entries()).map(([name, valMap]) => ({
      name,
      values: Array.from(valMap.entries()).map(([value, image]) => ({ value, image })),
    }));
  }, [detail]);

  const skuRows = useMemo(() => {
    const skus: any[] = detail?.productSkuInfos || [];
    // 옵션 표에는 '크기(사이즈)' 만 노출하도록 사용자 요청.
    // 색상은 위쪽 옵션1 그리드에서 이미 골랐으므로 표에선 마지막 attribute
    // (대부분 사이즈 — S/M/L/XL/…) 만 보여준다.
    // 같은 사이즈가 색상 수만큼 반복되는 문제를 막기 위해 name 으로 dedup.
    const seen = new Set<string>();
    const rows: { id: string; name: string }[] = [];
    for (const sku of skus) {
      const attrs: any[] = sku.skuAttributes || [];
      const lastAttr = attrs[attrs.length - 1];
      const name = lastAttr
        ? String(lastAttr.valueTrans || lastAttr.value || '')
        : '';
      if (!name || seen.has(name)) continue;
      seen.add(name);
      rows.push({
        id: String(sku.skuId || sku.specId || name),
        name,
      });
    }
    return rows;
  }, [detail]);

  const appendThumbUri = useCallback(
    (uri: string) => {
      setThumbUrls((prev) => {
        if (prev.length >= MAX_THUMB_COUNT) return prev;
        return [...prev, uri];
      });
    },
    [],
  );

  const openThumbPicker = () => {
    if (thumbUrls.length >= MAX_THUMB_COUNT) {
      showToast(
        t('profile.productMgmt.onlineEdit.thumbnailMax') ||
          `최대 ${MAX_THUMB_COUNT}장까지 업로드할 수 있습니다`,
        'error',
      );
      return;
    }
    setThumbPickerOpen(true);
  };

  // ─── 썸네일 추가 단추 → 카메라 / 갤러리 선택 ────────────────────────
  // PersonalInformationScreen 의 아바타 픽커와 동일한 패턴.
  // 권한 거절 / 사용자 취소 / 응답 오류는 모두 picker 닫기로 일관 처리.
  const handleTakeThumbPhoto = async () => {
    const granted = await requestCameraPermission();
    if (!granted) {
      setThumbPickerOpen(false);
      Alert.alert(t('common.error'), t('profile.cameraPermissionRequired'));
      return;
    }
    const options: CameraOptions = {
      mediaType: 'photo' as MediaType,
      quality: 0.7,
      saveToPhotos: false,
    };
    launchCamera(options, (response: ImagePickerResponse) => {
      setThumbPickerOpen(false);
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert(
          t('common.error'),
          response.errorMessage || t('profile.failedToTakePhoto'),
        );
        return;
      }
      const uri = response.assets?.[0]?.uri;
      if (uri) appendThumbUri(uri);
    });
  };

  const handleChooseThumbFromGallery = async () => {
    const granted = await requestPhotoLibraryPermission();
    if (!granted) {
      setThumbPickerOpen(false);
      Alert.alert(t('common.error'), t('profile.photoLibraryPermissionRequired'));
      return;
    }
    const options: ImageLibraryOptions = {
      mediaType: 'photo' as MediaType,
      quality: 0.7,
      selectionLimit: 1,
    };
    launchImageLibrary(options, (response: ImagePickerResponse) => {
      setThumbPickerOpen(false);
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert(
          t('common.error'),
          response.errorMessage || t('profile.failedToPickImage'),
        );
        return;
      }
      const uri = response.assets?.[0]?.uri;
      if (uri) appendThumbUri(uri);
    });
  };

  const openLabelModal = (rowId: string) => {
    const existing = skuLabelMap[rowId];
    setLabelModalDraft(
      existing
        ? { ...existing }
        : createEmptySkuLabel(productName),
    );
    setLabelModalRowId(rowId);
  };

  const openBarcodeViewer = (rowId: string) => {
    const label = skuLabelMap[rowId];
    if (!isSkuLabelConfigured(label)) {
      showToast(
        t('profile.productMgmt.onlineEdit.labelRequired') || '라벨을 먼저 설정하세요',
        'error',
      );
      return;
    }
    setBarcodeViewerRowId(rowId);
  };

  const closeLabelModal = () => setLabelModalRowId(null);

  const saveLabelModal = async () => {
    if (!labelModalRowId) return;
    const saved: SkuLabelSettings = { ...labelModalDraft, configured: true };
    setSkuLabelMap((prev) => ({ ...prev, [labelModalRowId]: saved }));
    setLabelModalRowId(null);
    await persistDraft();
    showToast(t('cartOrder.labelModal.save') || '저장', 'success');
  };

  const viewerLabel = barcodeViewerRowId ? skuLabelMap[barcodeViewerRowId] : null;
  // 라벨 이미지 업로드 — 갤러리에서 1장 선택.
  const pickLabelFile = async () => {
    const granted = await requestPhotoLibraryPermission();
    if (!granted) {
      Alert.alert(t('common.error'), t('profile.photoLibraryPermissionRequired'));
      return;
    }
    const options: ImageLibraryOptions = {
      mediaType: 'photo' as MediaType,
      quality: 0.7,
      selectionLimit: 1,
    };
    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert(t('common.error'), response.errorMessage || t('profile.failedToPickImage'));
        return;
      }
      const uri = response.assets?.[0]?.uri;
      if (uri) setLabelModalDraft((prev) => ({ ...prev, labelFileUri: uri }));
    });
  };

  const renderLabelActions = (rowId: string) => {
    const labelConfigured = isSkuLabelConfigured(skuLabelMap[rowId]);
    return (
      <View style={[styles.optionLabelCell, { flex: 1 }]}>
        <TouchableOpacity
          onPress={() => openLabelModal(rowId)}
          hitSlop={BACK_HIT_SLOP}
          style={labelConfigured ? styles.optionLabelIconBtnActive : undefined}
        >
          <Icon
            name="pencil"
            size={14}
            color={labelConfigured ? COLORS.red : COLORS.gray[500]}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => openBarcodeViewer(rowId)}
          hitSlop={BACK_HIT_SLOP}
          disabled={!labelConfigured}
          style={labelConfigured ? styles.optionLabelIconBtnActive : undefined}
        >
          <Icon
            name={labelConfigured ? 'eye' : 'eye-outline'}
            size={14}
            color={labelConfigured ? COLORS.red : COLORS.gray[400]}
          />
        </TouchableOpacity>
      </View>
    );
  };

  const onConfirm = async () => {
    if (!initial.productId) {
      await persistDraft();
      navigation.goBack();
      return;
    }
    setSaving(true);
    try {
      await persistDraft();
      const res = await productListApi.updateProduct(
        initial.productId,
        buildUpdatePayload(),
        locale,
      );
      if (res.success) {
        showToast(
          t('profile.productMgmt.onlineEdit.saved') || '저장되었습니다',
          'success',
        );
        navigation.goBack();
        return;
      }
      Alert.alert(
        t('profile.productMgmt.onlineEdit.title') || '온라인상품편집',
        res.message ||
          t('profile.productMgmt.onlineEdit.savedHint') ||
          '로컬에 저장되었습니다',
        [
          {
            text: t('profile.productMgmt.onlineEdit.confirm') || '확인',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    // 헤더 위쪽 상태바 인셋 영역까지 흰색이 되도록 SafeAreaView 를
    // 흰색 safeTop 으로 두고, 그 아래에 회색 배경 본문 컨테이너를 둔다.
    // (PaymentHistoryScreen 과 동일한 split 패턴 — container 가 회색이면
    // 상태바 영역이 회색으로 나와 헤더의 흰색과 분리되어 보이는 문제 해결.)
    <View style={styles.root}>
      <SafeAreaView style={styles.safeTop} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
        <TouchableOpacity
          hitSlop={BACK_HIT_SLOP}
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <View style={styles.backCircle}>
            <Icon name="chevron-back" size={18} color={COLORS.text.primary} />
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('profile.productMgmt.onlineEdit.title') || '온라인상품편집'}
        </Text>
        <View style={styles.backButton} />
        </View>
      </SafeAreaView>
      {/* 본문 컨테이너 — 회색 배경(원래 container 가 갖던 색)을 여기로 옮김.
          기존 ScrollView 가 styles.body 를 이미 쓰고 있어 충돌을 피하려고
          여기는 styles.bodyWrap 로 둠. */}
      <TabletContent style={styles.bodyWrap} fullWidth={responsive.isTablet}>

      {/* 수기입력 tab */}
      <View style={styles.tabBar}>
        <View style={styles.tabActive}>
          <Text style={styles.tabActiveText}>
            {t('profile.productMgmt.onlineEdit.manualInput') || '수기입력'}
          </Text>
        </View>
        {/* GET /products/detail 진행 인디케이터 — 응답이 오기 전 잠깐 보임 */}
        {detailLoading && (
          <View style={styles.detailLoadingBox}>
            <ActivityIndicator size="small" color={COLORS.red} />
          </View>
        )}
      </View>

      {/* 에러 배너 — API 호출 실패 시 폼 위에 한 줄로 표시 */}
      {detailError && !detailLoading && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText} numberOfLines={2}>
            {detailError}
          </Text>
        </View>
      )}

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* 기본정보 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBar} />
            <Text style={styles.sectionTitle}>
              {t('profile.productMgmt.onlineEdit.basicInfo') || '기본정보'}
            </Text>
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>
              {t('profile.productMgmt.onlineEdit.productNameOrig') || '상품명(기존)'}
            </Text>
            <View style={[styles.formInputWrap, styles.formInputDisabled]}>
              <Text style={styles.formInputDisabledText} numberOfLines={1}>
                {productNameOrig || '-'}
              </Text>
            </View>
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>
              {t('profile.productMgmt.onlineEdit.productNameEdit') || '상품명(수정)'}
            </Text>
            <TextInput
              style={styles.formInput}
              value={productName}
              onChangeText={setProductName}
              placeholderTextColor={COLORS.gray[400]}
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>
              {t('profile.productMgmt.onlineEdit.category') || '카테고리'}
            </Text>
            {/* 카테고리 선택자 — 탭하면 행 바로 아래에 드롭다운 모달이 떠서
                카테고리 옵션 중 하나를 고를 수 있다. ref + measureInWindow 로
                행의 화면 좌표를 잡아 드롭다운 위치를 동기화. */}
            <TouchableOpacity
              ref={categoryRowRef as any}
              style={styles.formInputWrap}
              activeOpacity={0.7}
              onPress={() => {
                categoryRowRef.current?.measureInWindow((x, y, width, height) => {
                  setCategoryRowLayout({ x, y, width, height });
                });
                setCategoryDropdownOpen(true);
              }}
            >
              <Text style={styles.formInputText} numberOfLines={1}>
                {categoryName || t('profile.productMgmt.onlineEdit.uncategorized') || '미분류'}
              </Text>
              <Icon name="chevron-down" size={14} color={COLORS.gray[500]} />
            </TouchableOpacity>
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>
              <Text style={styles.requiredMark}>*</Text>{' '}
              {t('profile.productMgmt.onlineEdit.thumbnail') || '썸네일'}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.thumbnailScroll}
              contentContainerStyle={styles.thumbnailGroup}
            >
              {thumbUrls.map((url, index) => (
                <Image
                  key={`${url}-${index}`}
                  source={{ uri: url }}
                  style={styles.thumbnailImage}
                />
              ))}
              {thumbUrls.length < MAX_THUMB_COUNT && (
                <TouchableOpacity
                  style={styles.thumbnailAddBox}
                  activeOpacity={0.7}
                  onPress={openThumbPicker}
                  hitSlop={BACK_HIT_SLOP}
                >
                  <Icon name="add" size={18} color={COLORS.red} />
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          <Text style={styles.thumbnailHint}>
            {t('profile.productMgmt.onlineEdit.thumbnailHint') ||
              '최대 9장 사진 업로드 가능하며 400pi 이상 1:1 비율 사이즈를 권장합니다. 첫 번째 이미지 썸네일 설정'}
          </Text>
        </View>

        {/* 상품스펙 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBar} />
            <Text style={styles.sectionTitle}>
              {t('profile.productMgmt.onlineEdit.productSpec') || '상품스펙'}
            </Text>
            {/* 응답으로 받은 SKU 수 — 상품에 옵션이 몇 개인지 시각 단서 */}
            {detail?.productSkuInfos?.length ? (
              <Text style={styles.skuCountHint}>
                · {detail.productSkuInfos.length} SKU
              </Text>
            ) : null}
          </View>

          {/* 로딩 중에는 옵션 그리드 + SKU 표 모양의 skeleton 을 보여줘
              사용자가 화면이 무엇으로 채워질지 미리 파악할 수 있게 함.
              SkeletonBlock 은 useNativeDriver pulse 애니메이션 (0.4 ↔ 1 opacity).
              상품 상세 응답이 도착하면 (detailLoading=false) 실제 카드/표로 교체. */}
          {detailLoading ? (
            <View style={styles.specSkeletonWrap}>
              {/* 옵션 그리드 skeleton — 1행: 라벨 + 카드 6개 (2줄 × 3개) */}
              <View style={styles.specSkelGroupRow}>
                <SkeletonBlock width={40} height={14} borderRadius={4} />
                <View style={styles.specSkelCards}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <View key={i} style={styles.specSkelCard}>
                      <SkeletonBlock width={28} height={28} borderRadius={4} />
                      <SkeletonBlock width={'60%' as any} height={10} borderRadius={3} />
                    </View>
                  ))}
                </View>
              </View>
              {/* SKU 표 헤더 skeleton */}
              <View style={styles.specSkelTableHeader}>
                <SkeletonBlock width={'18%' as any} height={12} borderRadius={3} />
                <SkeletonBlock width={'15%' as any} height={12} borderRadius={3} />
                <SkeletonBlock width={'10%' as any} height={12} borderRadius={3} />
                <SkeletonBlock width={'15%' as any} height={12} borderRadius={3} />
              </View>
              {/* SKU 표 행 skeleton — 5줄 */}
              {Array.from({ length: 5 }).map((_, i) => (
                <View key={i} style={styles.specSkelTableRow}>
                  <SkeletonBlock width={'30%' as any} height={28} borderRadius={4} />
                  <SkeletonBlock width={'18%' as any} height={28} borderRadius={4} />
                  <SkeletonBlock width={'15%' as any} height={28} borderRadius={4} />
                  <SkeletonBlock width={'25%' as any} height={28} borderRadius={4} />
                </View>
              ))}
            </View>
          ) : null}

          {/* 옵션 그룹별 그리드 — 1열에 옵션 라벨(옵션1, 옵션2 …) +
              그 옆에 값들의 카드 그리드 (썸네일 + 이름). 선택된 카드는
              붉은 테두리 + 옅은 붉은 배경으로 강조. 카드 탭 → 그 그룹의
              selectedOptionValues[그룹명] 갱신.
              옵션2(사이즈) 는 사용자 요청으로 노출하지 않음 — slice(0, 1)
              로 첫 번째 그룹(색상) 만 렌더. */}
          {!detailLoading && optionGroups.slice(0, 1).map((group, gIdx) => (
            <View key={group.name + gIdx} style={styles.optionGroupRow}>
              <Text style={styles.optionGroupLabel}>
                {`${t('profile.productMgmt.onlineEdit.option') || '옵션'}${gIdx + 1}`}
              </Text>
              <View style={styles.optionGroupCards}>
                {group.values.map((v) => {
                  const isSelected = selectedOptionValues[group.name] === v.value;
                  return (
                    <TouchableOpacity
                      key={v.value}
                      style={[
                        styles.optionGroupCard,
                        isSelected && styles.optionGroupCardSelected,
                      ]}
                      activeOpacity={0.7}
                      onPress={() =>
                        setSelectedOptionValues((prev) => ({ ...prev, [group.name]: v.value }))
                      }
                    >
                      {v.image ? (
                        <Image
                          source={{ uri: v.image }}
                          style={styles.optionGroupCardImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={[
                            styles.optionGroupCardImage,
                            styles.optionGroupCardImagePlaceholder,
                          ]}
                        />
                      )}
                      <Text
                        style={[
                          styles.optionGroupCardText,
                          isSelected && styles.optionGroupCardTextSelected,
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {v.value}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

          {/* SKU 표 — 헤더 + SKU 당 한 행 (옵션 이름 / 단가 / 라벨 / 비고).
              로딩 중엔 위 skeleton 이 자리잡고 있으므로 이중 노출을 피해 hidden. */}
          {!detailLoading && (
            <View style={styles.optionTableHeader}>
              <Text style={[styles.optionCellHeader, { flex: 2 }]}>
                {t('profile.productMgmt.onlineEdit.option') || '옵션'}
              </Text>
              <Text style={[styles.optionCellHeader, { flex: 1 }]}>
                {t('profile.productMgmt.onlineEdit.unitPrice') || '단가'}
              </Text>
              <Text style={[styles.optionCellHeader, { flex: 1 }]}>
                {t('profile.productMgmt.onlineEdit.label') || '라벨'}
              </Text>
              <Text style={[styles.optionCellHeader, { flex: 1 }]}>
                {t('profile.productMgmt.onlineEdit.remark') || '비고'}
              </Text>
            </View>
          )}

          {!detailLoading && skuRows.length === 0 && (
            // SKU 가 아직 안 들어왔으면 (또는 비어 있으면) 기존 단일 행으로 fallback.
            <View style={styles.optionTableRow}>
              <TextInput
                style={[styles.optionCellInput, { flex: 2 }]}
                value={optionLabel}
                onChangeText={setOptionLabel}
                placeholderTextColor={COLORS.gray[400]}
              />
              <View style={[styles.optionPriceWrap, { flex: 1 }]}>
                <Text style={styles.yenMark}>¥</Text>
                <TextInput
                  style={styles.optionPriceInput}
                  value={unitPrice}
                  onChangeText={setUnitPrice}
                  keyboardType="decimal-pad"
                />
              </View>
              {renderLabelActions('fallback')}
              <TextInput
                style={[styles.optionCellInput, { flex: 1 }]}
                value={remark}
                onChangeText={setRemark}
                placeholderTextColor={COLORS.gray[400]}
              />
            </View>
          )}
          {!detailLoading && skuRows.length > 0 && skuRows.map((row) => (
            <View key={row.id} style={styles.optionTableRow}>
              <TextInput
                style={[styles.optionCellInput, { flex: 2 }]}
                value={row.name}
                editable={false}
                placeholderTextColor={COLORS.gray[400]}
              />
              <View style={[styles.optionPriceWrap, { flex: 1 }]}>
                <Text style={styles.yenMark}>¥</Text>
                <TextInput
                  style={styles.optionPriceInput}
                  value={skuPriceMap[row.id] ?? ''}
                  onChangeText={(txt) =>
                    setSkuPriceMap((prev) => ({ ...prev, [row.id]: txt }))
                  }
                  keyboardType="decimal-pad"
                />
              </View>
              {renderLabelActions(row.id)}
              <TextInput
                style={[styles.optionCellInput, { flex: 1 }]}
                value={skuRemarkMap[row.id] ?? ''}
                onChangeText={(txt) =>
                  setSkuRemarkMap((prev) => ({ ...prev, [row.id]: txt }))
                }
                placeholder={t('profile.productMgmt.onlineEdit.remark') || '비고'}
                placeholderTextColor={COLORS.gray[400]}
              />
            </View>
          ))}

        </View>
      </ScrollView>

      {/* Footer — 취소 / 확인 */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerBtn, styles.cancelBtn]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelBtnText}>
            {t('profile.productMgmt.onlineEdit.cancel') || '취소'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.footerBtn, styles.confirmBtn, saving && styles.confirmBtnDisabled]}
          onPress={onConfirm}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.confirmBtnText}>
              {t('profile.productMgmt.onlineEdit.confirm') || '확인'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
      </TabletContent>

      {/* 썸네일 추가 시 노출되는 카메라/갤러리 선택 모달 —
          PersonalInformationScreen 의 아바타 픽커 스타일을 따른다. */}
      <Modal
      supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']}
        visible={thumbPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setThumbPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.thumbPickerOverlay}
          activeOpacity={1}
          onPress={() => setThumbPickerOpen(false)}
        >
          <View
            style={styles.thumbPickerSheet}
            onStartShouldSetResponder={() => true}
          >
            <TouchableOpacity
              style={styles.thumbPickerItem}
              activeOpacity={0.7}
              onPress={handleTakeThumbPhoto}
            >
              <Icon name="camera-outline" size={18} color={COLORS.text.primary} />
              <Text style={styles.thumbPickerItemText}>
                {t('profile.personalInfoScreen.takePhoto')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.thumbPickerItem, styles.thumbPickerItemBorder]}
              activeOpacity={0.7}
              onPress={handleChooseThumbFromGallery}
            >
              <Icon name="image-outline" size={18} color={COLORS.text.primary} />
              <Text style={styles.thumbPickerItemText}>
                {t('profile.personalInfoScreen.chooseFromGallery')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.thumbPickerItem, styles.thumbPickerItemBorder, styles.thumbPickerCancel]}
              activeOpacity={0.7}
              onPress={() => setThumbPickerOpen(false)}
            >
              <Text style={styles.thumbPickerCancelText}>
                {t('profile.personalInfoScreen.cancel') || '취소'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 카테고리 드롭다운 — 카테고리 행 바로 아래 떠 있는 anchored 팝오버.
          top/left/width 모두 categoryRowLayout (행의 measureInWindow 결과) 로
          인라인 오버라이드해 드롭다운이 행 너비와 정확히 일치하도록 한다.
          백드롭 탭으로 닫힘. */}
      <Modal
      supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']}
        visible={categoryDropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryDropdownOpen(false)}
      >
        <TouchableOpacity
          style={styles.categoryDropdownBackdrop}
          activeOpacity={1}
          onPress={() => setCategoryDropdownOpen(false)}
        >
          <View
            style={[
              styles.categoryDropdownAnchor,
              categoryRowLayout && {
                top: categoryRowLayout.y + categoryRowLayout.height + 4,
                left: categoryRowLayout.x,
                width: categoryRowLayout.width,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.categoryDropdownCard}>
              {CATEGORY_OPTIONS.map((opt, idx) => {
                const label =
                  opt.key === 'uncategorized'
                    ? t('profile.productMgmt.onlineEdit.uncategorized') || '미분류'
                    : t(opt.labelKey) || opt.fallback;
                const isSelected =
                  (categoryName || '미분류') === label ||
                  (!categoryName && opt.key === 'uncategorized');
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.categoryDropdownItem,
                      idx > 0 && styles.categoryDropdownItemBorder,
                      isSelected && styles.categoryDropdownItemSelected,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setCategoryName(opt.key === 'uncategorized' ? '' : label);
                      setCategoryDropdownOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.categoryDropdownItemText,
                        isSelected && styles.categoryDropdownItemTextSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {label}
                    </Text>
                    {isSelected && (
                      <Icon name="checkmark" size={14} color={COLORS.red} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 라벨설정 모달 — 상품스펙 표의 ✏️ 아이콘에서 진입.
          CartScreen 의 라벨모달과 동일 패턴 + 좌측 하단에 '라벨 이미지 업로드' 단추 추가.
          입력값(라벨종류 / 양식 / 상품명 / 라벨 내용 / 바코드 / 이미지) 은
          state 로 보관되어 다음 열기 때도 유지됨. */}
      <Modal
      supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']}
        visible={labelModalRowId !== null}
        transparent
        animationType="fade"
        onRequestClose={closeLabelModal}
      >
        <View style={styles.labelModalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeLabelModal}
          />
          <View
            style={[
              styles.labelModalCard,
              responsive.isTablet && { maxWidth: responsive.modalMaxWidth },
            ]}
          >
            {/* 헤더 — 좌측 타이틀, 우측 닫기 X */}
            <View style={styles.labelModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.labelModalTitle}>
                  {t('cartOrder.labelModal.title')}
                </Text>
                <Text style={styles.labelModalSubtitle} numberOfLines={1}>
                  {t('cartOrder.labelModal.titleHint') || '상품/식검 라벨을 설정하고 미리 확인하세요.'}
                </Text>
              </View>
              <TouchableOpacity onPress={closeLabelModal} hitSlop={BACK_HIT_SLOP}>
                <Icon name="close" size={20} color={COLORS.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.labelModalBody}
              contentContainerStyle={styles.labelModalBodyContent}
              showsVerticalScrollIndicator
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {/* 라벨종류 — 상품라벨 / 식검라벨 두 칩 */}
              <Text style={styles.labelSectionLabel}>
                {t('cartOrder.labelModal.labelType')}
              </Text>
              <View style={styles.labelChipsRow}>
                {(['product', 'foodInspect'] as const).map((k) => (
                  <TouchableOpacity
                    key={k}
                    style={[
                      styles.labelChip,
                      labelModalDraft.labelType === k && styles.labelChipActive,
                    ]}
                    activeOpacity={0.7}
                    onPress={() =>
                      setLabelModalDraft((prev) => ({ ...prev, labelType: k }))
                    }
                  >
                    <Text
                      style={[
                        styles.labelChipText,
                        labelModalDraft.labelType === k && styles.labelChipTextActive,
                      ]}
                    >
                      {k === 'product'
                        ? t('cartOrder.labelModal.productLabel')
                        : t('cartOrder.labelModal.foodLabel')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 라벨양식 — 50×80 / 40×60 */}
              <Text style={styles.labelSectionLabel}>
                {t('cartOrder.labelModal.labelFormat')}
              </Text>
              <View style={styles.labelChipsRow}>
                {(['50x80', '40x60'] as const).map((k) => (
                  <TouchableOpacity
                    key={k}
                    style={[
                      styles.labelChip,
                      labelModalDraft.labelFormat === k && styles.labelChipActive,
                    ]}
                    activeOpacity={0.7}
                    onPress={() =>
                      setLabelModalDraft((prev) => ({ ...prev, labelFormat: k }))
                    }
                  >
                    <Text
                      style={[
                        styles.labelChipText,
                        labelModalDraft.labelFormat === k && styles.labelChipTextActive,
                      ]}
                    >
                      {k === '50x80'
                        ? t('cartOrder.labelModal.format5080')
                        : t('cartOrder.labelModal.format4060')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 상품명 입력 */}
              <Text style={styles.labelSectionLabel}>
                {t('cartOrder.labelModal.productName')}
              </Text>
              <TextInput
                style={styles.labelInputBox}
                value={labelModalDraft.labelProductName}
                onChangeText={(text) =>
                  setLabelModalDraft((prev) => ({ ...prev, labelProductName: text }))
                }
                placeholder={t('cartOrder.labelModal.productNamePlaceholder')}
                placeholderTextColor={COLORS.gray[400]}
              />

              {/* 라벨 내용 입력 */}
              <Text style={styles.labelSectionLabel}>
                {t('cartOrder.labelModal.contentInput')}
              </Text>
              <TextInput
                style={styles.labelContentBox}
                value={labelModalDraft.labelContent}
                onChangeText={(text) =>
                  setLabelModalDraft((prev) => ({ ...prev, labelContent: text }))
                }
                placeholder={t('cartOrder.labelModal.contentPlaceholder')}
                placeholderTextColor={COLORS.gray[400]}
                multiline
              />

              {/* 바코드 번호 */}
              <Text style={styles.labelSectionLabel}>
                {t('cartOrder.labelModal.barcodeNumber')}
              </Text>
              <TextInput
                style={styles.labelInputBox}
                value={labelModalDraft.labelBarcode}
                onChangeText={(text) =>
                  setLabelModalDraft((prev) => ({ ...prev, labelBarcode: text }))
                }
                placeholder={t('cartOrder.labelModal.barcodePlaceholder')}
                placeholderTextColor={COLORS.gray[400]}
              />

              {/* 라벨 업로드 단추 — '라벨 이미지 업로드' 에서 사용자 요청으로 이름 변경 */}
              <TouchableOpacity
                style={styles.labelUploadBtn}
                activeOpacity={0.7}
                onPress={pickLabelFile}
              >
                <Icon name="arrow-up" size={14} color={COLORS.text.primary} />
                <Text style={styles.labelUploadText}>
                  {t('cartOrder.labelModal.labelUpload')}
                </Text>
              </TouchableOpacity>
              {labelModalDraft.labelFileUri ? (
                <View style={styles.labelFilePreviewWrap}>
                  <Image
                    source={{ uri: labelModalDraft.labelFileUri }}
                    style={styles.labelFilePreview}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.labelFileRemove}
                    onPress={() =>
                      setLabelModalDraft((prev) => ({ ...prev, labelFileUri: null }))
                    }
                  >
                    <Icon name="close" size={12} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* 라벨 미리보기 — 라벨양식에 따라 크기 변경 (50×80 → 세로 / 40×60 → 가로).
                  실시간으로 상품명, 라벨 내용, 바코드가 반영된다.
                  우상단에 크기 배지 (예: '50 × 80 mm'). 식검라벨이면 좌상단에 식검 배지.
                  CartScreen 의 라벨모달과 동일한 시각 구성을 따른다. */}
              <View style={styles.previewHeaderRow}>
                <Text style={styles.labelSectionLabel}>
                  {t('cartOrder.labelModal.preview') || '라벨 미리보기'}
                </Text>
                <View style={styles.previewDimBadge}>
                  <Text style={styles.previewDimBadgeText}>
                    {labelModalDraft.labelFormat === '50x80'
                      ? t('cartOrder.labelModal.dim5080') || '50 × 80 mm'
                      : t('cartOrder.labelModal.dim4060') || '40 × 60 mm'}
                  </Text>
                </View>
              </View>
              <View style={styles.previewWrap}>
                <View
                  style={[
                    styles.previewCard,
                    labelModalDraft.labelFormat === '50x80'
                      ? styles.previewCard5080
                      : styles.previewCard4060,
                  ]}
                >
                  {labelModalDraft.labelType === 'foodInspect' && (
                    <View style={styles.foodBadge}>
                      <Text style={styles.foodBadgeIcon}>🍴</Text>
                      <Text style={styles.foodBadgeText}>
                        {t('cartOrder.labelModal.foodBadge') || '식품용'}
                      </Text>
                    </View>
                  )}
                  {!(
                    labelModalDraft.labelType === 'foodInspect' &&
                    labelModalDraft.labelFormat === '40x60'
                  ) && (
                    <Text style={styles.previewProductName}>
                      {(t('cartOrder.labelModal.productName') || '상품명')}:{' '}
                      {labelModalDraft.labelProductName}
                    </Text>
                  )}
                  {!(
                    labelModalDraft.labelType === 'product' &&
                    labelModalDraft.labelFormat === '40x60'
                  ) &&
                    !!labelModalDraft.labelContent && (
                      <Text style={styles.previewContent}>{labelModalDraft.labelContent}</Text>
                    )}
                  {!(
                    labelModalDraft.labelType === 'foodInspect' &&
                    labelModalDraft.labelFormat === '40x60'
                  ) && (
                    <View style={styles.barcodePreview}>
                      <View style={styles.barcodeLines}>
                        {Array.from({ length: 28 }).map((_, i) => (
                          <View
                            key={i}
                            style={[
                              styles.barcodeBar,
                              { width: (i % 3) + 1 },
                              i % 2 === 0 && styles.barcodeBarThick,
                            ]}
                          />
                        ))}
                      </View>
                      <Text style={styles.barcodeText}>{labelModalDraft.labelBarcode}</Text>
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>

            {/* Footer — 취소 / 저장 */}
            <View style={styles.labelModalFooter}>
              <TouchableOpacity
                style={[styles.labelModalFooterBtn, styles.labelModalCancelBtn]}
                activeOpacity={0.7}
                onPress={closeLabelModal}
              >
                <Text style={styles.labelModalCancelText}>
                  {t('profile.productMgmt.onlineEdit.cancel') || '취소'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.labelModalFooterBtn, styles.labelModalSaveBtn]}
                activeOpacity={0.7}
                onPress={saveLabelModal}
              >
                <Text style={styles.labelModalSaveText}>
                  {t('cartOrder.labelModal.save') || '저장'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 바코드 이미지 확인 모달 — 라벨 컬럼의 👁 아이콘에서 진입.
          라벨 미리보기 카드만 단독으로 보여주는 read-only 뷰어. 라벨설정 모달의
          state(라벨 종류 / 양식 / 상품명 / 내용 / 바코드)를 그대로 미리보기에
          반영. 닫기 / 확인 두 단추로 종료. */}
      <Modal
      supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']}
        visible={barcodeViewerRowId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setBarcodeViewerRowId(null)}
      >
        <View style={styles.labelModalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setBarcodeViewerRowId(null)}
          />
          <View
            style={[
              styles.labelModalCard,
              responsive.isTablet && { maxWidth: responsive.modalMaxWidth },
            ]}
          >
            {/* 헤더 — 좌측 타이틀, 우측 닫기 X */}
            <View style={styles.barcodeViewerHeader}>
              <Text style={styles.labelModalTitle}>
                {t('cartOrder.labelModal.barcodeImageCheck') || '바코드 이미지 확인'}
              </Text>
              <TouchableOpacity
                onPress={() => setBarcodeViewerRowId(null)}
                hitSlop={BACK_HIT_SLOP}
              >
                <Icon name="close" size={20} color={COLORS.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.labelModalBody}
              contentContainerStyle={styles.labelModalBodyContent}
              showsVerticalScrollIndicator
              nestedScrollEnabled
            >
              {/* 라벨 미리보기 — 라벨설정 모달의 미리보기와 동일한 카드 */}
              <View style={styles.previewHeaderRow}>
                <Text style={styles.labelSectionLabel}>
                  {t('cartOrder.labelModal.preview') || '라벨 미리보기'}
                </Text>
                <View style={styles.previewDimBadge}>
                  <Text style={styles.previewDimBadgeText}>
                    {viewerLabel?.labelFormat === '50x80'
                      ? t('cartOrder.labelModal.dim5080') || '50 × 80 mm'
                      : t('cartOrder.labelModal.dim4060') || '40 × 60 mm'}
                  </Text>
                </View>
              </View>
              <View style={styles.previewWrap}>
                <View
                  style={[
                    styles.previewCard,
                    viewerLabel?.labelFormat === '50x80'
                      ? styles.previewCard5080
                      : styles.previewCard4060,
                  ]}
                >
                  {viewerLabel?.labelType === 'foodInspect' && (
                    <View style={styles.foodBadge}>
                      <Text style={styles.foodBadgeIcon}>🍴</Text>
                      <Text style={styles.foodBadgeText}>
                        {t('cartOrder.labelModal.foodBadge') || '식품용'}
                      </Text>
                    </View>
                  )}
                  {!(
                    viewerLabel?.labelType === 'foodInspect' &&
                    viewerLabel?.labelFormat === '40x60'
                  ) && (
                    <Text style={styles.previewProductName}>
                      {(t('cartOrder.labelModal.productName') || '상품명')}:{' '}
                      {viewerLabel?.labelProductName}
                    </Text>
                  )}
                  {!(
                    viewerLabel?.labelType === 'product' &&
                    viewerLabel?.labelFormat === '40x60'
                  ) &&
                    !!viewerLabel?.labelContent && (
                      <Text style={styles.previewContent}>{viewerLabel.labelContent}</Text>
                    )}
                  {!(
                    viewerLabel?.labelType === 'foodInspect' &&
                    viewerLabel?.labelFormat === '40x60'
                  ) && (
                    <View style={styles.barcodePreview}>
                      <View style={styles.barcodeLines}>
                        {Array.from({ length: 28 }).map((_, i) => (
                          <View
                            key={i}
                            style={[
                              styles.barcodeBar,
                              { width: (i % 3) + 1 },
                              i % 2 === 0 && styles.barcodeBarThick,
                            ]}
                          />
                        ))}
                      </View>
                      <Text style={styles.barcodeText}>{viewerLabel?.labelBarcode}</Text>
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>

            {/* Footer — 닫기 / 확인 */}
            <View style={styles.labelModalFooter}>
              <TouchableOpacity
                style={[styles.labelModalFooterBtn, styles.labelModalCancelBtn]}
                activeOpacity={0.7}
                onPress={() => setBarcodeViewerRowId(null)}
              >
                <Text style={styles.labelModalCancelText}>
                  {t('cartOrder.labelModal.close') || '닫기'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.labelModalFooterBtn, styles.labelModalSaveBtn]}
                activeOpacity={0.7}
                onPress={() => setBarcodeViewerRowId(null)}
              >
                <Text style={styles.labelModalSaveText}>
                  {t('profile.productMgmt.onlineEdit.confirm') || '확인'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  // ─── 헤더 상태바 인셋 흰색 처리용 split ───────────────────────────
  // root: 전체 화면. safeTop 만 흰색 → 상태바 인셋 영역이 흰색이 됨.
  // bodyWrap: 헤더 아래 본문 영역 — 원래 container 가 갖던 회색 배경.
  root: { flex: 1, backgroundColor: COLORS.background },
  safeTop: { backgroundColor: COLORS.white },
  bodyWrap: { flex: 1, backgroundColor: COLORS.background },
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
  backButton: { width: 32, height: 32, justifyContent: 'center', alignItems: 'flex-start' },
  backCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text.primary },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  tabActive: {
    paddingVertical: SPACING.sm,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.red,
  },
  tabActiveText: { fontSize: FONTS.sizes.sm, color: COLORS.red, fontWeight: '700' },

  body: { flex: 1, padding: SPACING.md },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  sectionBar: {
    width: 3,
    height: 14,
    backgroundColor: COLORS.red,
    borderRadius: 2,
  },
  sectionTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text.primary },

  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  formLabel: {
    width: 90,
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[700],
  },
  requiredMark: { color: COLORS.red, fontWeight: '700' },
  formInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 6,
    paddingHorizontal: SPACING.sm,
    height: 36,
  },
  formInputDisabled: { backgroundColor: COLORS.gray[100] },
  formInputDisabledText: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.gray[500] },
  formInputText: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.text.primary },
  // TextInput: 안드로이드에서 height/minHeight + paddingVertical 조합이
  // 한글의 윗부분(자모 머리)을 잘라먹는 케이스가 있다. 첫 번째 그림처럼
  // 글자가 통째로 보이게 하려면 (1) padding 만으로 행 높이를 만들고,
  // (2) includeFontPadding 을 그대로 두어 안드로이드가 내장 line metric
  // 으로 글자 위/아래 여백을 자동 확보하게 해야 한다. height/minHeight 를
  // 모두 제거하고, 폰트와 동일한 sm 로 되돌려 disabled 행과 글자 크기 일관성 확보.
  formInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 6,
    paddingHorizontal: SPACING.sm,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: FONTS.sizes.sm,
    lineHeight: FONTS.sizes.sm * 1.5,
    color: COLORS.text.primary,
  },

  thumbnailScroll: { flex: 1 },
  thumbnailGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingRight: SPACING.xs,
  },
  thumbnailImage: {
    width: 56,
    height: 56,
    borderRadius: 6,
    backgroundColor: COLORS.gray[100],
  },
  thumbnailPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  thumbnailAddBox: {
    width: 56,
    height: 56,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ─── 썸네일 추가 단추 → 카메라/갤러리 선택 모달 ────────────────────
  thumbPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  thumbPickerSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingVertical: SPACING.sm,
  },
  thumbPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  thumbPickerItemBorder: {
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  thumbPickerItemText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  thumbPickerCancel: {
    justifyContent: 'center',
  },
  thumbPickerCancelText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.red,
    fontWeight: '700',
  },
  // ─── 라벨설정 모달 ────────────────────────────────────────────────
  labelModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
  },
  labelModalCard: {
    width: '100%',
    maxWidth: 760,
    maxHeight: '92%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
  },
  labelModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: 'rgba(255, 85, 0, 0.04)',
  },
  // 바코드 이미지 확인 모달 — read-only 뷰어용. 라벨설정 모달과 달리 살구색
  // 강조 배경 없이 깔끔한 흰색 + 하단 보더만.
  barcodeViewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  labelModalTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '800',
    color: COLORS.text.primary,
  },
  labelModalSubtitle: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  labelModalBody: {
    paddingHorizontal: SPACING.md,
  },
  labelModalBodyContent: {
    paddingVertical: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  labelSectionLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '700',
    marginTop: SPACING.sm,
    marginBottom: 6,
  },
  labelChipsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  labelChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  labelChipActive: {
    borderColor: COLORS.red,
    backgroundColor: 'rgba(255, 85, 0, 0.06)',
  },
  labelChipText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  labelChipTextActive: {
    color: COLORS.red,
    fontWeight: '700',
  },
  labelInputBox: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 6,
    paddingHorizontal: SPACING.sm,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: FONTS.sizes.sm,
    lineHeight: FONTS.sizes.sm * 1.5,
    color: COLORS.text.primary,
  },
  labelContentBox: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 6,
    paddingHorizontal: SPACING.sm,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: FONTS.sizes.sm,
    lineHeight: FONTS.sizes.sm * 1.5,
    color: COLORS.text.primary,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  labelUploadBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 6,
  },
  labelUploadText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  labelFilePreviewWrap: {
    marginTop: SPACING.sm,
    width: 120,
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  labelFilePreview: {
    width: '100%',
    height: '100%',
  },
  labelFileRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ─── 라벨 미리보기 ─────────────────────────────────────────────────
  // 헤더 행 (제목 + 크기 배지) + 중앙 정렬된 라벨 카드.
  previewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  previewDimBadge: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  previewDimBadgeText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  previewWrap: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  // CartScreen 의 미리보기 카드와 동일한 비율 — 흰 배경 + 옅은 테두리.
  previewCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 6,
    padding: 12,
    position: 'relative',
  },
  previewCard5080: {
    width: 220,
    height: 350,
  },
  previewCard4060: {
    width: 280,
    height: 180,
  },
  foodBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  foodBadgeText: {
    fontSize: 9,
    color: COLORS.text.primary,
    marginLeft: 2,
    fontWeight: '600',
  },
  // 🍴 이모지 사이즈 — Text 의 fontSize 가 그대로 이모지 글리프 크기를 결정.
  foodBadgeIcon: {
    fontSize: 10,
    lineHeight: 12,
  },
  previewProductName: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
    lineHeight: 16,
  },
  previewContent: {
    fontSize: 10,
    color: COLORS.text.primary,
    lineHeight: 14,
    marginBottom: 8,
  },
  // 바코드 시각화 — 마지막에 위치, 자동으로 카드 하단에 붙음.
  barcodePreview: {
    marginTop: 'auto',
    alignItems: 'center',
  },
  barcodeLines: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 40,
  },
  barcodeBar: {
    height: '100%',
    backgroundColor: '#000',
    marginRight: 1,
  },
  barcodeBarThick: {
    backgroundColor: '#000',
  },
  barcodeText: {
    fontSize: 10,
    color: '#000',
    marginTop: 2,
    letterSpacing: 1,
  },
  labelModalFooter: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
    justifyContent: 'flex-end',
  },
  labelModalFooterBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 72,
    alignItems: 'center',
  },
  labelModalCancelBtn: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    backgroundColor: COLORS.white,
  },
  labelModalCancelText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  labelModalSaveBtn: {
    backgroundColor: COLORS.red,
  },
  labelModalSaveText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    fontWeight: '800',
  },
  // ─── 카테고리 드롭다운 (행 바로 아래 anchored 팝오버) ──────────────
  // 백드롭은 전체 화면 — 바깥 탭으로 닫기. anchor 는 absolute 로 떠 있고
  // top/left/width 는 인라인 스타일로 매번 오버라이드된다 (measureInWindow).
  categoryDropdownBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  categoryDropdownAnchor: {
    position: 'absolute',
  },
  categoryDropdownCard: {
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
  categoryDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 10,
  },
  categoryDropdownItemBorder: {
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  categoryDropdownItemSelected: {
    backgroundColor: 'rgba(255, 85, 0, 0.06)',
  },
  categoryDropdownItemText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },
  categoryDropdownItemTextSelected: {
    color: COLORS.red,
    fontWeight: '700',
  },
  thumbnailHint: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.red,
    marginTop: 4,
    paddingLeft: 90,
  },

  // ─── 상품스펙 로딩 skeleton ────────────────────────────────────────
  // 실제 옵션 그리드 + SKU 표 모양을 흉내내는 placeholder.
  specSkeletonWrap: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  specSkelGroupRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  specSkelCards: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  specSkelCard: {
    width: '31%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  specSkelTableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: SPACING.xs,
    marginTop: SPACING.xs,
  },
  specSkelTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 6,
    gap: 4,
  },
  // ─── 옵션 그룹 그리드 (색상/사이즈 카드들) ─────────────────────────
  // 한 줄에 라벨('옵션1') + 카드들이 wrap 으로 흐른다.
  optionGroupRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  optionGroupLabel: {
    width: 40,
    paddingTop: 8,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  // 카드들을 한 줄에 여러 개씩 wrap. 각 카드는 폭이 정확히 같도록 percent
  // width 사용 (한 줄 4개 = 25% - gap 보정 → 23%). gap 으로 자연스러운 여백.
  optionGroupCards: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  // 카드 크기를 고정해 행/렬 정렬이 깔끔하게 맞도록.
  // width: 약 31% → 한 줄에 3개씩 (gap 빼고). minWidth 제거.
  optionGroupCard: {
    width: '31%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  optionGroupCardSelected: {
    borderColor: COLORS.red,
    backgroundColor: 'rgba(255, 85, 0, 0.06)',
  },
  optionGroupCardImage: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: COLORS.gray[100],
  },
  optionGroupCardImagePlaceholder: {
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  // 이름이 카드 폭을 넘어가면 … 으로 잘리도록 flex: 1 + numberOfLines=1
  // 조합. flexShrink: 1 은 부모 row 안에서 텍스트가 줄어들도록 보장.
  optionGroupCardText: {
    flex: 1,
    flexShrink: 1,
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.primary,
  },
  optionGroupCardTextSelected: {
    color: COLORS.red,
    fontWeight: '700',
  },
  optionTableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray[100],
    paddingVertical: 6,
    paddingHorizontal: SPACING.xs,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  optionCellHeader: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[600],
    paddingHorizontal: 4,
  },
  optionTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderTopWidth: 0,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    gap: 4,
  },
  // SKU 표의 TextInput — 한글 자모가 위/아래로 잘리는 문제 해결.
  // 고정 height 대신 padding 만으로 행 높이를 만들고, lineHeight 명시.
  // (formInput 과 동일한 패턴)
  optionCellInput: {
    fontSize: FONTS.sizes.xs,
    lineHeight: FONTS.sizes.xs * 1.6,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 6,
  },
  optionPriceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 32,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  yenMark: { fontSize: FONTS.sizes.xs, color: COLORS.text.primary, marginRight: 2 },
  // 단가 입력칸도 동일하게 lineHeight + padding 확보.
  optionPriceInput: {
    flex: 1,
    fontSize: FONTS.sizes.xs,
    lineHeight: FONTS.sizes.xs * 1.6,
    color: COLORS.text.primary,
    padding: 0,
    paddingVertical: 2,
  },
  optionLabelCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  optionLabelIconBtnActive: {
    backgroundColor: 'rgba(255, 85, 0, 0.08)',
    borderRadius: 4,
    padding: 2,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  footerBtn: {
    paddingHorizontal: SPACING.xl,
    height: 40,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    backgroundColor: COLORS.white,
  },
  cancelBtnText: { fontSize: FONTS.sizes.sm, color: COLORS.gray[700], fontWeight: '600' },
  confirmBtn: { backgroundColor: COLORS.red },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { fontSize: FONTS.sizes.sm, color: COLORS.white, fontWeight: '700' },
  // GET /products/detail 진행 인디케이터 (수기입력 탭 우측)
  detailLoadingBox: {
    marginLeft: 'auto',
    paddingHorizontal: SPACING.md,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // API 호출 실패 시 폼 위에 표시되는 한 줄 배너
  errorBanner: {
    backgroundColor: '#FFE9E0',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  errorBannerText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.red,
  },
  // 상품스펙 헤더 옆에 붙는 SKU 수 힌트
  skuCountHint: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
    marginLeft: SPACING.xs,
  },
});

export default OnlineProductEditScreen;
