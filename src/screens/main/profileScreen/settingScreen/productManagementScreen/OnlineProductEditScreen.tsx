/**
 * 온라인상품편집 — 상품관리 페지의 카드에서 편집(✏️) 아이콘을 눌렀을 때
 * 진입한다. 사용자 디자인의 두 번째 그림을 기준으로 기본정보 / 상품스펙
 * (옵션 리스트 + 단가/라벨/비고) 섹션을 갖는 폼 페지.
 *
 * 현재는 placeholder 수준의 폼 — 백엔드의 update endpoint 가 도입되면
 * 확인(Submit) 핸들러를 그 endpoint 로 연결하면 된다. 데이터는 route
 * params 의 productId 로 productListApi.getProducts 응답에서 찾아온다.
 */

import React, { useMemo, useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from '../../../../../components/Icon';
import { COLORS, FONTS, SPACING } from '../../../../../constants';
import { RootStackParamList } from '../../../../../types';
import { useTranslation } from '../../../../../hooks/useTranslation';
import { productsApi } from '../../../../../services/productsApi';

type Nav = StackNavigationProp<RootStackParamList, 'OnlineProductEdit'>;
type RouteParams = RouteProp<RootStackParamList, 'OnlineProductEdit'>;

const BACK_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

const OnlineProductEditScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteParams>();
  const { t, locale } = useTranslation();

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
  const [thumbUrl, setThumbUrl] = useState<string>(initial.thumbnailUrl ?? '');
  // GET /products/detail 응답 전체 — 추후 UI 확장을 위해 보관.
  // detailLoading 은 본문 위쪽에 작은 인디케이터로 표시된다.
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // ─── 진입 시 한 번 상품 상세 API 호출 ──────────────────────────────
  // URL: GET /v1/products/detail?productId=<offerId>&source=1688&country=<locale>
  useEffect(() => {
    const offerId = initial.offerId || initial.productId;
    if (!offerId) return;
    const source = initial.source || '1688';
    const country = locale || 'ko';
    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      setDetailError(null);
      try {
        const res = await productsApi.getProductDetail(offerId, source, country);
        if (cancelled) return;
        if (res.success && res.data?.product) {
          const p = res.data.product;
          setDetail(p);
          // 응답으로 폼을 한 번 더 보강 — route param 으로 받은 카드값 위에
          // 더 정확한/완전한 값으로 덮어쓴다.
          if (p.subjectTrans || p.subject) {
            const subj = String(p.subjectTrans || p.subject);
            setProductNameOrig(subj);
            setProductName(subj);
          }
          // 첫 번째 SKU 의 가격으로 unitPrice 채움 (route param 이 비어 있을 때만)
          const firstSku = p.productSkuInfos?.[0];
          if (firstSku?.fenxiaoPriceInfo?.offerPrice) {
            setUnitPrice(String(firstSku.fenxiaoPriceInfo.offerPrice));
          } else if (firstSku?.consignPrice) {
            setUnitPrice(String(firstSku.consignPrice));
          }
          // 첫 번째 SKU 의 첫 옵션 텍스트
          const firstAttr = firstSku?.skuAttributes?.[0];
          if (firstAttr?.valueTrans || firstAttr?.value) {
            setOptionLabel(String(firstAttr.valueTrans || firstAttr.value));
          }
          // 첫 번째 상품 이미지 — productImage.images[0] 또는 그 trans 버전.
          const firstImg =
            p.productImage?.images?.[0] || p.productImageTrans?.images?.[0];
          if (firstImg) setThumbUrl(String(firstImg));
        } else {
          setDetailError(res.message || 'Failed to load product detail');
        }
      } catch (e: any) {
        if (!cancelled) setDetailError(e?.message || 'Failed to load product detail');
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // initial 의 식별 필드만 deps — 화면이 같은 productId 로 mount 되어 있는 동안
    // 다시 호출되지 않게 한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.offerId, initial.productId, initial.source, locale]);

  const onConfirm = () => {
    // 백엔드 update endpoint 연결 전까지는 단순히 사용자에게 알림만.
    Alert.alert(
      t('profile.productMgmt.onlineEdit.title') || '온라인상품편집',
      t('profile.productMgmt.onlineEdit.savedHint') ||
        '저장되었습니다 (API 연결 대기 중).',
      [
        {
          text: t('profile.productMgmt.onlineEdit.confirm') || '확인',
          onPress: () => navigation.goBack(),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          hitSlop={BACK_HIT_SLOP}
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <View style={styles.backCircle}>
            <Icon name="chevron-back" size={18} color={COLORS.white} />
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('profile.productMgmt.onlineEdit.title') || '온라인상품편집'}
        </Text>
        <View style={styles.backButton} />
      </View>

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
            <View style={styles.formInputWrap}>
              <Text style={styles.formInputText} numberOfLines={1}>
                {initial.categoryName || t('profile.productMgmt.onlineEdit.uncategorized') || '미분류'}
              </Text>
              <Icon name="chevron-down" size={14} color={COLORS.gray[500]} />
            </View>
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>
              <Text style={styles.requiredMark}>*</Text>{' '}
              {t('profile.productMgmt.onlineEdit.thumbnail') || '썸네일'}
            </Text>
            <View style={styles.thumbnailGroup}>
              {thumbUrl ? (
                <Image source={{ uri: thumbUrl }} style={styles.thumbnailImage} />
              ) : (
                <View style={[styles.thumbnailImage, styles.thumbnailPlaceholder]}>
                  <Icon name="image-outline" size={20} color={COLORS.gray[400]} />
                </View>
              )}
              <View style={styles.thumbnailAddBox}>
                <Icon name="add" size={18} color={COLORS.red} />
              </View>
            </View>
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
            <View style={[styles.optionLabelCell, { flex: 1 }]}>
              <Icon name="pencil" size={14} color={COLORS.gray[500]} />
              <Icon name="eye-outline" size={14} color={COLORS.gray[500]} />
            </View>
            <TextInput
              style={[styles.optionCellInput, { flex: 1 }]}
              value={remark}
              onChangeText={setRemark}
              placeholderTextColor={COLORS.gray[400]}
            />
          </View>
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
          style={[styles.footerBtn, styles.confirmBtn]}
          onPress={onConfirm}
        >
          <Text style={styles.confirmBtnText}>
            {t('profile.productMgmt.onlineEdit.confirm') || '확인'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
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
    backgroundColor: COLORS.red,
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
  formInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 6,
    paddingHorizontal: SPACING.sm,
    height: 36,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },

  thumbnailGroup: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
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
  thumbnailHint: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.red,
    marginTop: 4,
    paddingLeft: 90,
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
  optionCellInput: {
    height: 30,
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  optionPriceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  yenMark: { fontSize: FONTS.sizes.xs, color: COLORS.text.primary, marginRight: 2 },
  optionPriceInput: { flex: 1, fontSize: FONTS.sizes.xs, color: COLORS.text.primary, padding: 0 },
  optionLabelCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
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
