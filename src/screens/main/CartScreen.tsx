import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../../components/Icon';
import { COLORS, FONTS, SPACING } from '../../constants';
import {
  launchImageLibrary,
  MediaType,
  ImageLibraryOptions,
  ImagePickerResponse,
} from 'react-native-image-picker';
import { requestPhotoLibraryPermission } from '../../utils/permissions';
import { useTranslation } from '../../hooks/useTranslation';

interface ExtraService {
  id: string;
  name: string;
  icon?: string;
  price?: string;
  description?: string;
  required?: boolean;
}

interface ServiceCategory {
  id: string;
  title: string;
  required?: boolean;
  items: ExtraService[];
}

interface CartCard {
  id: string;
  index: string;
  companyName: string;
  productName: string;
  productImage: string | null;
  photoUri: string | null;
  color: string;
  size: string;
  quantity: number;
  unitPrice: number;
  checked: boolean;
  expanded: boolean;
  addedAt: number;
  remarks: string;
}

type TabKey = 'past' | 'bundles' | 'offline';

const TIME_PERIODS: Array<{ labelKey: 'all' | 'h1' | 'h24' | 'd7'; value: number }> = [
  { labelKey: 'all', value: 0 },
  { labelKey: 'h1', value: 60 * 60 * 1000 },
  { labelKey: 'h24', value: 24 * 60 * 60 * 1000 },
  { labelKey: 'd7', value: 7 * 24 * 60 * 60 * 1000 },
];

const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id: 'cat-origin',
    title: '원산지 작업',
    required: true,
    items: [
      { id: 'svc-bongje', name: '봉제', icon: 'cut-outline', price: '¥0.2/PCS', description: '원산지 라벨 봉제 작업' },
      { id: 'svc-hangtag', name: '행택', icon: 'pricetag-outline', price: '¥0.1/PCS', description: '행택 부착 작업' },
      { id: 'svc-sticker', name: '스티커', icon: 'pricetags-outline', price: '¥0.1/PCS', description: '스티커 부착 작업' },
      { id: 'svc-dojang', name: '도장', icon: 'ribbon-outline', price: '¥0.2/PCS', description: '도장 작업' },
    ],
  },
  {
    id: 'cat-package',
    title: '패키지 작업',
    items: [
      { id: 'svc-opp', name: 'OPP포장', icon: 'bag-outline', price: '¥0.3/PCS', description: '가로+세로 80cm 이상일 경우 0.5위안\n이 비용 표준은 참고일 뿐, 구체적인 비용은 견적을 기준으로 한다' },
      { id: 'svc-aircap', name: '에어캡/뽁뽁이 포장', icon: 'apps-outline', price: '¥0.5/PCS', description: '에어캡 포장 서비스' },
      { id: 'svc-jungpo', name: '중포포장', icon: 'file-tray-outline', price: '¥0.8/PCS', description: '중포 포장 서비스' },
      { id: 'svc-bundle', name: '번들포장', icon: 'layers-outline', price: '¥0.6/PCS', description: '번들 포장 서비스' },
      { id: 'svc-pkgmake', name: '패키지 제작', icon: 'cube-outline', price: '견적', description: '패키지 제작 (별도 견적)' },
      { id: 'svc-itemsticker', name: '상품스티커', icon: 'bookmark-outline', price: '¥0.1/PCS', description: '상품 스티커 부착' },
    ],
  },
  {
    id: 'cat-carton',
    title: '카톤박스 및 패킹',
    items: [
      { id: 'svc-carton-change', name: '카톤박스 갈이', icon: 'swap-horizontal-outline', price: '¥2/BOX', description: '카톤박스 교체' },
      { id: 'svc-pallet', name: '파렛트 작업', icon: 'grid-outline', price: '¥30/PLT', description: '파렛트 작업' },
      { id: 'svc-madae', name: '마대포장', icon: 'briefcase-outline', price: '¥3/BOX', description: '마대 포장' },
      { id: 'svc-carton-make', name: '카톤박스 제작', icon: 'construct-outline', price: '견적', description: '카톤박스 제작 (별도 견적)' },
    ],
  },
  {
    id: 'cat-inspect',
    title: '검수방식',
    items: [
      { id: 'svc-insp-full', name: '전수검수', icon: 'search-outline', price: '¥0.5/PCS', description: '모든 상품 1:1 검수' },
      { id: 'svc-insp-sample', name: '샘플검수', icon: 'eye-outline', price: '¥30/LOT', description: '샘플 단위 검수' },
    ],
  },
];

const ALL_SERVICES: ExtraService[] = SERVICE_CATEGORIES.flatMap((c) => c.items);

const CartScreen: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<number>(0);
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('past');
  const [now, setNow] = useState<number>(Date.now());
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [extraServices, setExtraServices] = useState<ExtraService[]>([]);
  const [pendingServices, setPendingServices] = useState<ExtraService[]>([]);
  const [detailService, setDetailService] = useState<ExtraService | null>(
    ALL_SERVICES.find((s) => s.id === 'svc-opp') || null,
  );
  const [otherRequests, setOtherRequests] = useState('');
  const [modalPhotoUri, setModalPhotoUri] = useState<string | null>(null);

  // Label modal state
  const [labelModalCardId, setLabelModalCardId] = useState<string | null>(null);
  const [labelType, setLabelType] = useState<'product' | 'foodInspect'>('product');
  const [labelFormat, setLabelFormat] = useState<'50x80' | '40x60'>('50x80');
  const [labelProductName, setLabelProductName] = useState('제품명 : 자석 선반 대형 2P');
  const [labelContent, setLabelContent] = useState(
    '수입원 : 빅멀티샵\n제조원 : 빅멀티샵 협력사\n제조일자 : 2025.12\n원산지 : 중국\n내용량 : 단품\n재질 : 탄소강',
  );
  const [labelBarcode, setLabelBarcode] = useState('S123456789');
  const [labelFileUri, setLabelFileUri] = useState<string | null>(null);

  // Order modal state
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [purchasePayment, setPurchasePayment] = useState<'manual' | 'auto'>('manual');
  const [shippingPayment, setShippingPayment] = useState<'manual' | 'auto'>('manual');
  const [showPaymentTooltip, setShowPaymentTooltip] = useState(false);
  const [logisticsCenter, setLogisticsCenter] = useState<'haerae' | 'guangzhou' | 'yiwu'>('haerae');
  const [applicationType, setApplicationType] = useState<'sea' | 'air' | 'rocket'>('rocket');
  const [customsMethod, setCustomsMethod] = useState<'business' | 'personal'>('business');
  const [shippingMethod, setShippingMethod] = useState<
    'rocketPallet' | 'rocketDelivery' | 'selfPallet' | 'selfDelivery'
  >('rocketPallet');
  const [businessInfoSelected, setBusinessInfoSelected] = useState('');
  const [recipientInfoSelected, setRecipientInfoSelected] = useState('');

  const svcKey = (id: string) => id.replace(/^svc-/, '').replace(/-/g, '');
  const catKey = (id: string) => id.replace(/^cat-/, '');
  const tServiceName = (id: string) => t(`cartOrder.serviceModal.services.${svcKey(id)}`);
  const tCategoryTitle = (id: string) => t(`cartOrder.serviceModal.categories.${catKey(id)}`);

  const [cards, setCards] = useState<CartCard[]>([
    {
      id: 'card-1',
      index: '001',
      companyName: '义乌市科桥日用品有限公司',
      productName: '꿀병',
      productImage: null,
      photoUri: null,
      color: '1',
      size: '30ml',
      quantity: 2,
      unitPrice: 30,
      checked: false,
      expanded: false,
      addedAt: Date.now() - 60 * 1000,
      remarks: '',
    },
  ]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const formatElapsed = (ms: number): string => {
    const sec = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const earliestAdd = cards.length > 0 ? Math.min(...cards.map((c) => c.addedAt)) : now;
  const elapsed = now - earliestAdd;

  const handleDeleteChecked = () => {
    const anyChecked = cards.some((c) => c.checked);
    if (!anyChecked) {
      Alert.alert(t('cartOrder.alerts.notice'), t('cartOrder.alerts.noItemsSelected'));
      return;
    }
    Alert.alert(t('cartOrder.alerts.confirm'), t('cartOrder.alerts.deletePrompt'), [
      { text: t('cartOrder.alerts.cancel'), style: 'cancel' },
      {
        text: t('cartOrder.alerts.delete'),
        style: 'destructive',
        onPress: () => setCards((prev) => prev.filter((c) => !c.checked)),
      },
    ]);
  };

  const handleDeleteOne = (id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  const toggleCheck = (id: string) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, checked: !c.checked } : c)));
  };

  const toggleExpand = (id: string) => {
    setCards((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, expanded: !c.expanded } : { ...c, expanded: false },
      ),
    );
  };

  const collapseAll = () => {
    setCards((prev) => prev.map((c) => (c.expanded ? { ...c, expanded: false } : c)));
  };

  const openServiceModal = () => {
    setPendingServices(extraServices);
    setShowServiceModal(true);
  };

  const closeServiceModal = () => {
    setShowServiceModal(false);
  };

  const confirmServiceModal = () => {
    setExtraServices(pendingServices);
    setShowServiceModal(false);
  };

  const togglePendingService = (svc: ExtraService) => {
    setDetailService(svc);
    setPendingServices((prev) => {
      const exists = prev.some((s) => s.id === svc.id);
      return exists ? prev.filter((s) => s.id !== svc.id) : [...prev, svc];
    });
  };

  const openLabelModal = (cardId: string) => {
    setLabelModalCardId(cardId);
  };

  const closeLabelModal = () => {
    setLabelModalCardId(null);
  };

  const saveLabel = () => {
    setLabelModalCardId(null);
  };

  const pickLabelFile = async () => {
    try {
      const granted = await requestPhotoLibraryPermission();
      if (!granted) {
        Alert.alert(t('cartOrder.alerts.permission'), t('cartOrder.alerts.photoPermission'));
        return;
      }
      const options: ImageLibraryOptions = { mediaType: 'photo' as MediaType, quality: 0.7 };
      launchImageLibrary(options, (res: ImagePickerResponse) => {
        if (res.didCancel || res.errorCode) return;
        const uri = res.assets?.[0]?.uri;
        if (uri) setLabelFileUri(uri);
      });
    } catch {
      Alert.alert(t('cartOrder.alerts.error'), t('cartOrder.alerts.galleryFailed'));
    }
  };

  const pickModalPhoto = async () => {
    try {
      const granted = await requestPhotoLibraryPermission();
      if (!granted) {
        Alert.alert(t('cartOrder.alerts.permission'), t('cartOrder.alerts.photoPermission'));
        return;
      }
      const options: ImageLibraryOptions = { mediaType: 'photo' as MediaType, quality: 0.7 };
      launchImageLibrary(options, (res: ImagePickerResponse) => {
        if (res.didCancel || res.errorCode) return;
        const uri = res.assets?.[0]?.uri;
        if (uri) setModalPhotoUri(uri);
      });
    } catch {
      Alert.alert(t('cartOrder.alerts.error'), t('cartOrder.alerts.galleryFailed'));
    }
  };

  const changeQty = (id: string, delta: number) => {
    setCards((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c,
      ),
    );
  };

  const updateUnitPrice = (id: string, text: string) => {
    const clean = text.replace(/[^0-9.]/g, '');
    const value = clean ? parseFloat(clean) : 0;
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unitPrice: isNaN(value) ? 0 : value } : c)),
    );
  };

  const pickPhoto = async (id: string) => {
    try {
      const granted = await requestPhotoLibraryPermission();
      if (!granted) {
        Alert.alert(t('cartOrder.alerts.permission'), t('cartOrder.alerts.photoPermission'));
        return;
      }
      const options: ImageLibraryOptions = { mediaType: 'photo' as MediaType, quality: 0.7 };
      launchImageLibrary(options, (res: ImagePickerResponse) => {
        if (res.didCancel || res.errorCode) return;
        const uri = res.assets?.[0]?.uri;
        if (uri) {
          setCards((prev) => prev.map((c) => (c.id === id ? { ...c, photoUri: uri } : c)));
        }
      });
    } catch {
      Alert.alert(t('cartOrder.alerts.error'), t('cartOrder.alerts.galleryFailed'));
    }
  };

  const updateRemarks = (id: string, text: string) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, remarks: text } : c)));
  };

  const toggleExtraService = (svc: ExtraService) => {
    setExtraServices((prev) => {
      const exists = prev.some((s) => s.id === svc.id);
      return exists ? prev.filter((s) => s.id !== svc.id) : [...prev, svc];
    });
  };

  const filteredCards = cards.filter((c) => {
    if (searchQuery && !c.productName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (selectedPeriod > 0 && now - c.addedAt > selectedPeriod) {
      return false;
    }
    return true;
  });

  const totalQty = filteredCards.reduce((s, c) => s + c.quantity, 0);
  const grandTotal = filteredCards.reduce((s, c) => s + c.quantity * c.unitPrice, 0);

  const renderCard = (card: CartCard) => {
    const subtotal = card.quantity * card.unitPrice;

    return (
      <TouchableOpacity
        key={card.id}
        style={styles.card}
        activeOpacity={1}
        onPress={() => {
          if (card.expanded) collapseAll();
        }}
      >
        {/* Accent strip */}
        <View style={styles.cardAccent} />

        {/* TOP — company name + checkbox + photo button */}
        <View style={styles.cardTop}>
          <TouchableOpacity style={styles.checkBtn} onPress={() => toggleCheck(card.id)}>
            <View style={[styles.checkBox, card.checked && styles.checkBoxChecked]}>
              {card.checked && <Icon name="checkmark" size={12} color={COLORS.white} />}
            </View>
          </TouchableOpacity>
          <View style={styles.companyWrap}>
            <Text style={styles.indexBadge}>{card.index}</Text>
            <Text style={styles.companyName} numberOfLines={1}>
              {card.companyName.length > 10
                ? `${card.companyName.slice(0, 10)}...`
                : card.companyName}
            </Text>
          </View>
          <TouchableOpacity style={styles.photoBtn} onPress={() => pickPhoto(card.id)}>
            {card.photoUri ? (
              <Image source={{ uri: card.photoUri }} style={styles.photoPreview} />
            ) : (
              <Icon name="camera-outline" size={14} color={COLORS.primary} />
            )}
          </TouchableOpacity>
        </View>

        {/* MIDDLE — product row */}
        <View style={styles.cardMiddle}>
          {/* Left: image + info */}
          <View style={styles.middleLeft}>
            {card.productImage ? (
              <Image source={{ uri: card.productImage }} style={styles.productImage} />
            ) : (
              <View style={[styles.productImage, styles.productImagePlaceholder]}>
                <Icon name="cube-outline" size={22} color={COLORS.gray[400]} />
              </View>
            )}
            <View style={styles.productInfo}>
              <View style={styles.productNameBox}>
                <Text style={styles.productName} numberOfLines={1}>
                  {card.productName}
                </Text>
                <Icon name="chevron-down" size={12} color={COLORS.gray[500]} />
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaTag}>{t('cartOrder.card.color')} {card.color}</Text>
                <Text style={styles.metaTag}>{card.size}</Text>
              </View>
            </View>
          </View>

          {/* Center: qty + unit price */}
          <View style={styles.middleCenter}>
            <View style={styles.qtyRow}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => changeQty(card.id, -1)}>
                <Icon name="remove" size={14} color={COLORS.white} />
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{card.quantity}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => changeQty(card.id, 1)}>
                <Icon name="add" size={14} color={COLORS.white} />
              </TouchableOpacity>
            </View>
            <View style={styles.unitPriceBox}>
              <Text style={styles.yenMark}>¥</Text>
              <TextInput
                style={styles.unitPriceInput}
                keyboardType="numeric"
                value={String(card.unitPrice)}
                onChangeText={(t) => updateUnitPrice(card.id, t)}
              />
            </View>
          </View>

          {/* Right: subtotal (상품금액) + View More */}
          <View style={styles.middleRight}>
            <Text style={styles.rightLabel}>{t('cartOrder.card.productAmount')}</Text>
            <Text style={styles.rightValue}>¥{subtotal.toFixed(2)}</Text>
            <TouchableOpacity
              style={styles.viewMoreBtn}
              onPress={() => toggleExpand(card.id)}
            >
              <Text style={styles.viewMoreText}>
                {card.expanded ? t('cartOrder.card.collapse') : t('cartOrder.card.viewMore')}
              </Text>
              <Icon
                name={card.expanded ? 'chevron-up' : 'chevron-down'}
                size={10}
                color={COLORS.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* BOTTOM — hidden remarks area */}
        {card.expanded && (
          <View style={styles.cardBottom}>
            <Text style={styles.remarksLabel}>{t('cartOrder.card.remarks')}</Text>
            <TextInput
              style={styles.remarksInput}
              multiline
              maxLength={200}
              placeholder={t('cartOrder.card.remarksPlaceholder')}
              placeholderTextColor={COLORS.gray[400]}
              value={card.remarks}
              onChangeText={(t) => updateRemarks(card.id, t)}
            />
            <Text style={styles.remarksCounter}>{card.remarks.length}/200</Text>
            <View style={styles.bottomActions}>
              <TouchableOpacity
                style={styles.labelRowBtn}
                onPress={() => openLabelModal(card.id)}
              >
                <Icon name="pricetag-outline" size={12} color={COLORS.white} />
                <Text style={styles.labelRowText}>{t('cartOrder.card.label')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteRowBtn}
                onPress={() => handleDeleteOne(card.id)}
              >
                <Icon name="trash-outline" size={12} color={COLORS.primary} />
                <Text style={styles.deleteRowText}>{t('cartOrder.card.delete')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* PAGE TITLE */}
      <View style={styles.pageHeader}>
        <Icon name="cart-outline" size={22} color={COLORS.red} />
        <Text style={styles.pageHeaderTitle}>{t('cart.title')}</Text>
      </View>

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Icon name="search" size={14} color={COLORS.gray[500]} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('cartOrder.search')}
            placeholderTextColor={COLORS.gray[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.periodWrap}>
          <TouchableOpacity
            style={styles.periodBtn}
            onPress={() => setShowPeriodMenu((v) => !v)}
          >
            <Icon name="calendar-outline" size={12} color={COLORS.text.primary} />
            <Text style={styles.periodText} numberOfLines={1}>
              {t('cartOrder.periodSelect')} · {formatElapsed(elapsed)}
            </Text>
            <Icon name="chevron-down" size={12} color={COLORS.text.primary} />
          </TouchableOpacity>
          {showPeriodMenu && (
            <View style={styles.periodMenu}>
              {TIME_PERIODS.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  style={styles.periodMenuItem}
                  onPress={() => {
                    setSelectedPeriod(p.value);
                    setShowPeriodMenu(false);
                  }}
                >
                  <Text
                    style={[
                      styles.periodMenuText,
                      selectedPeriod === p.value && styles.periodMenuTextActive,
                    ]}
                  >
                    {t(`cartOrder.periods.${p.labelKey}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteChecked}>
          <Icon name="trash-outline" size={14} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* 부가서비스 bar — directly under the header */}
      <View style={styles.extraBar}>
        <Text style={styles.extraLabel}>{t('cartOrder.extraServiceBar.title')}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.extraChipsScroll}
          contentContainerStyle={styles.extraChipsContent}
        >
          {extraServices.length === 0 ? (
            <Text style={styles.extraPlaceholder}>{t('cartOrder.extraServiceBar.placeholder')}</Text>
          ) : (
            extraServices.map((s) => (
              <View key={s.id} style={styles.extraChip}>
                <Text style={styles.extraChipText}>{tServiceName(s.id)}</Text>
                <TouchableOpacity onPress={() => toggleExtraService(s)}>
                  <Icon name="close" size={10} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
        <TouchableOpacity style={styles.extraSelectBtn} onPress={openServiceModal}>
          <Icon name="add" size={12} color={COLORS.white} />
          <Text style={styles.extraSelectBtnText}>{t('cartOrder.extraServiceBar.selectBtn')}</Text>
        </TouchableOpacity>
      </View>

      {/* BODY — see-through */}
      <View style={styles.body}>
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'past' && styles.tabBtnActive]}
            onPress={() => setActiveTab('past')}
          >
            <Text style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}>
              {t('cartOrder.tabs.past')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'bundles' && styles.tabBtnActive]}
            onPress={() => setActiveTab('bundles')}
          >
            <Text style={[styles.tabText, activeTab === 'bundles' && styles.tabTextActive]}>
              {t('cartOrder.tabs.bundles')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'offline' && styles.tabBtnActive]}
            onPress={() => setActiveTab('offline')}
          >
            <Text style={[styles.tabText, activeTab === 'offline' && styles.tabTextActive]}>
              {t('cartOrder.tabs.offline')}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.cardsList}
          contentContainerStyle={styles.cardsContent}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={() => collapseAll()}
        >
          {filteredCards.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>{t('cartOrder.empty')}</Text>
            </View>
          ) : (
            filteredCards.map(renderCard)
          )}
        </ScrollView>

        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>{t('cartOrder.summary.totalQty')} {totalQty}</Text>
          <Text style={styles.summaryTotal}>{t('cartOrder.summary.total')} ¥{grandTotal.toFixed(2)}</Text>
          <TouchableOpacity style={styles.orderBtn} onPress={() => setShowOrderModal(true)}>
            <Text style={styles.orderBtnText}>{t('cartOrder.summary.order')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 발주정보 작성 및 확인 MODAL */}
      <Modal
        visible={showOrderModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowOrderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('cartOrder.orderModal.title')}</Text>
              <TouchableOpacity onPress={() => setShowOrderModal(false)}>
                <Icon name="close" size={22} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              showsVerticalScrollIndicator={false}
            >
              {/* 예치금결제 */}
              <View style={styles.orderSection}>
                <View style={styles.orderSectionHead}>
                  <View style={styles.orderSectionBar} />
                  <Text style={styles.orderSectionTitle}>{t('cartOrder.orderModal.depositPayment')}</Text>
                </View>

                <View style={styles.orderFieldRow}>
                  <Text style={styles.orderFieldLabel}>{t('cartOrder.orderModal.purchasePayment')}</Text>
                  <View style={styles.pillGroup}>
                    <TouchableOpacity
                      style={[styles.pill, purchasePayment === 'manual' && styles.pillActive]}
                      onPress={() => setPurchasePayment('manual')}
                    >
                      <Text style={[styles.pillText, purchasePayment === 'manual' && styles.pillTextActive]}>{t('cartOrder.orderModal.manual')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.pill, purchasePayment === 'auto' && styles.pillActive]}
                      onPress={() => setPurchasePayment('auto')}
                    >
                      <Text style={[styles.pillText, purchasePayment === 'auto' && styles.pillTextActive]}>{t('cartOrder.orderModal.auto')}</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => setShowPaymentTooltip((v) => !v)} style={styles.helpBtn}>
                    <Icon name="help-circle-outline" size={16} color={COLORS.gray[500]} />
                  </TouchableOpacity>
                </View>

                <View style={styles.orderFieldRow}>
                  <Text style={styles.orderFieldLabel}>{t('cartOrder.orderModal.shippingPayment')}</Text>
                  <View style={styles.pillGroup}>
                    <TouchableOpacity
                      style={[styles.pill, shippingPayment === 'manual' && styles.pillActive]}
                      onPress={() => setShippingPayment('manual')}
                    >
                      <Text style={[styles.pillText, shippingPayment === 'manual' && styles.pillTextActive]}>{t('cartOrder.orderModal.manual')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.pill, shippingPayment === 'auto' && styles.pillActive]}
                      onPress={() => setShippingPayment('auto')}
                    >
                      <Text style={[styles.pillText, shippingPayment === 'auto' && styles.pillTextActive]}>{t('cartOrder.orderModal.auto')}</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => setShowPaymentTooltip((v) => !v)} style={styles.helpBtn}>
                    <Icon name="help-circle-outline" size={16} color={COLORS.gray[500]} />
                  </TouchableOpacity>
                </View>

                {showPaymentTooltip && (
                  <View style={styles.tooltipBox}>
                    <Text style={styles.tooltipText}>
                      {t('cartOrder.orderModal.paymentTooltip')}
                    </Text>
                  </View>
                )}
              </View>

              {/* 기본정보 */}
              <View style={styles.orderSection}>
                <View style={styles.orderSectionHead}>
                  <View style={styles.orderSectionBar} />
                  <Text style={styles.orderSectionTitle}>{t('cartOrder.orderModal.basicInfo')}</Text>
                </View>

                <View style={styles.orderFieldCol}>
                  <Text style={styles.orderFieldLabel}>{t('cartOrder.orderModal.logistics')}</Text>
                  <View style={styles.pillGroup}>
                    {(['haerae', 'guangzhou', 'yiwu'] as const).map((v) => (
                      <TouchableOpacity
                        key={v}
                        style={[styles.pill, logisticsCenter === v && styles.pillActive]}
                        onPress={() => setLogisticsCenter(v)}
                      >
                        <Text style={[styles.pillText, logisticsCenter === v && styles.pillTextActive]}>{t(`cartOrder.orderModal.${v}`)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.orderFieldCol}>
                  <Text style={styles.orderFieldLabel}>{t('cartOrder.orderModal.appType')}</Text>
                  <View style={styles.pillGroup}>
                    {(['sea', 'air', 'rocket'] as const).map((v) => (
                      <TouchableOpacity
                        key={v}
                        style={[styles.pill, applicationType === v && styles.pillActive]}
                        onPress={() => setApplicationType(v)}
                      >
                        <Text style={[styles.pillText, applicationType === v && styles.pillTextActive]}>{t(`cartOrder.orderModal.${v}`)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.orderFieldCol}>
                  <Text style={styles.orderFieldLabel}>{t('cartOrder.orderModal.customs')}</Text>
                  <View style={styles.pillGroup}>
                    {(['business', 'personal'] as const).map((v) => (
                      <TouchableOpacity
                        key={v}
                        style={[styles.pill, customsMethod === v && styles.pillActive]}
                        onPress={() => setCustomsMethod(v)}
                      >
                        <Text style={[styles.pillText, customsMethod === v && styles.pillTextActive]}>{t(`cartOrder.orderModal.${v}`)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.orderFieldCol}>
                  <Text style={styles.orderFieldLabel}>{t('cartOrder.orderModal.shippingMethod')}</Text>
                  <View style={styles.pillGroup}>
                    {(['rocketPallet', 'rocketDelivery', 'selfPallet', 'selfDelivery'] as const).map((v) => (
                      <TouchableOpacity
                        key={v}
                        style={[styles.pill, shippingMethod === v && styles.pillActive]}
                        onPress={() => setShippingMethod(v)}
                      >
                        <Text style={[styles.pillText, shippingMethod === v && styles.pillTextActive]}>{t(`cartOrder.orderModal.${v}`)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* 사업자/개인정보 & 수령정보 — placed at the bottom per spec */}
              <View style={styles.orderSection}>
                <View style={styles.orderFieldRow}>
                  <Text style={styles.orderFieldLabel}>{t('cartOrder.orderModal.businessInfo')}</Text>
                  <TouchableOpacity
                    style={styles.selectBtn}
                    onPress={() =>
                      setBusinessInfoSelected(businessInfoSelected ? '' : t('cartOrder.orderModal.defaultBusiness'))
                    }
                  >
                    <Text style={styles.selectBtnText} numberOfLines={1}>
                      {businessInfoSelected || t('cartOrder.orderModal.selectPlaceholder')}
                    </Text>
                    <Icon name="chevron-forward" size={14} color={COLORS.gray[500]} />
                  </TouchableOpacity>
                </View>

                <View style={styles.orderFieldRow}>
                  <Text style={styles.orderFieldLabel}>{t('cartOrder.orderModal.recipientInfo')}</Text>
                  <TouchableOpacity
                    style={styles.selectBtn}
                    onPress={() =>
                      setRecipientInfoSelected(recipientInfoSelected ? '' : t('cartOrder.orderModal.defaultRecipient'))
                    }
                  >
                    <Text style={styles.selectBtnText} numberOfLines={1}>
                      {recipientInfoSelected || t('cartOrder.orderModal.selectPlaceholder')}
                    </Text>
                    <Icon name="chevron-forward" size={14} color={COLORS.gray[500]} />
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalFooterBtn, styles.modalCancelBtn]}
                onPress={() => setShowOrderModal(false)}
              >
                <Text style={styles.modalCancelText}>{t('cartOrder.orderModal.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalFooterBtn, styles.modalConfirmBtn]}
                onPress={() => setShowOrderModal(false)}
              >
                <Text style={styles.modalConfirmText}>{t('cartOrder.orderModal.orderConfirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 라벨설정 MODAL */}
      <Modal
        visible={labelModalCardId !== null}
        animationType="slide"
        transparent
        onRequestClose={closeLabelModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('cartOrder.labelModal.title')}</Text>
              <TouchableOpacity onPress={closeLabelModal}>
                <Icon name="close" size={22} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              showsVerticalScrollIndicator={false}
            >
              {/* 라벨종류 */}
              <View style={styles.labelSection}>
                <Text style={styles.labelSectionLabel}>{t('cartOrder.labelModal.labelType')}</Text>
                <View style={styles.radioRow}>
                  <TouchableOpacity
                    style={styles.radioOption}
                    onPress={() => setLabelType('product')}
                  >
                    <View style={[styles.radioOuter, labelType === 'product' && styles.radioOuterOn]}>
                      {labelType === 'product' && <View style={styles.radioInner} />}
                    </View>
                    <Text style={styles.radioText}>{t('cartOrder.labelModal.productLabel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.radioOption}
                    onPress={() => setLabelType('foodInspect')}
                  >
                    <View style={[styles.radioOuter, labelType === 'foodInspect' && styles.radioOuterOn]}>
                      {labelType === 'foodInspect' && <View style={styles.radioInner} />}
                    </View>
                    <Text style={styles.radioText}>{t('cartOrder.labelModal.foodLabel')}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.labelHint}>
                  {t('cartOrder.labelModal.typeHint')}
                </Text>
              </View>

              {/* 라벨양식 */}
              <View style={styles.labelSection}>
                <Text style={styles.labelSectionLabel}>{t('cartOrder.labelModal.labelFormat')}</Text>
                <View style={styles.radioRow}>
                  <TouchableOpacity
                    style={styles.radioOption}
                    onPress={() => setLabelFormat('50x80')}
                  >
                    <View style={[styles.radioOuter, labelFormat === '50x80' && styles.radioOuterOn]}>
                      {labelFormat === '50x80' && <View style={styles.radioInner} />}
                    </View>
                    <Text style={styles.radioText}>{t('cartOrder.labelModal.format5080')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.radioOption}
                    onPress={() => setLabelFormat('40x60')}
                  >
                    <View style={[styles.radioOuter, labelFormat === '40x60' && styles.radioOuterOn]}>
                      {labelFormat === '40x60' && <View style={styles.radioInner} />}
                    </View>
                    <Text style={styles.radioText}>
                      {t('cartOrder.labelModal.format4060')}
                      {labelType === 'foodInspect' && labelFormat === '40x60' ? (
                        <Text style={styles.labelHintInline}> {t('cartOrder.labelModal.noBarcode')}</Text>
                      ) : null}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* PREVIEW — middle section on desktop, top on mobile per spec */}
              <View style={styles.labelSection}>
                <Text style={styles.labelSectionLabel}>{t('cartOrder.labelModal.preview')}</Text>
                <View style={styles.previewWrap}>
                  <View
                    style={[
                      styles.previewCard,
                      labelFormat === '50x80' ? styles.previewCard5080 : styles.previewCard4060,
                    ]}
                  >
                    {labelType === 'foodInspect' && (
                      <View style={styles.foodBadge}>
                        <Icon name="restaurant-outline" size={10} color={COLORS.text.primary} />
                        <Text style={styles.foodBadgeText}>{t('cartOrder.labelModal.foodBadge')}</Text>
                      </View>
                    )}
                    {!(labelType === 'foodInspect' && labelFormat === '40x60') && (
                      <Text style={styles.previewProductName}>{labelProductName}</Text>
                    )}
                    {!(labelType === 'product' && labelFormat === '40x60') && (
                      <Text style={styles.previewContent}>{labelContent}</Text>
                    )}
                    {!(labelType === 'foodInspect' && labelFormat === '40x60') && (
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
                        <Text style={styles.barcodeText}>{labelBarcode}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.dimensionLabel}>
                    <Text style={styles.dimensionText}>
                      {labelFormat === '50x80' ? t('cartOrder.labelModal.dim5080') : t('cartOrder.labelModal.dim4060')}
                    </Text>
                  </View>
                </View>
              </View>

              {/* INPUTS — right section on desktop, center on mobile per spec */}
              <View style={styles.labelSection}>
                <Text style={styles.labelSectionLabel}>{t('cartOrder.labelModal.labelContent')}</Text>
                <View style={styles.fontToolbar}>
                  <View style={styles.fontChip}><Text style={styles.fontChipText}>{t('cartOrder.labelModal.font')}</Text></View>
                  <View style={styles.fontChip}><Text style={styles.fontChipText}>9pt</Text></View>
                  <View style={styles.fontChip}><Text style={[styles.fontChipText, { fontWeight: '800' }]}>{t('cartOrder.labelModal.gaLetter')}</Text></View>
                  <View style={styles.fontChip}><Text style={[styles.fontChipText, { fontStyle: 'italic' }]}>{t('cartOrder.labelModal.gaLetter')}</Text></View>
                  <View style={styles.fontChip}><Text style={[styles.fontChipText, { textDecorationLine: 'underline' }]}>{t('cartOrder.labelModal.gaLetter')}</Text></View>
                </View>

                {!(labelType === 'foodInspect' && labelFormat === '40x60') && (
                  <>
                    <Text style={styles.labelInputLabel}>{t('cartOrder.labelModal.productName')}</Text>
                    <TextInput
                      style={styles.labelInput}
                      value={labelProductName}
                      onChangeText={setLabelProductName}
                      placeholder={t('cartOrder.labelModal.productNamePlaceholder')}
                      placeholderTextColor={COLORS.gray[400]}
                    />
                  </>
                )}

                {!(labelType === 'product' && labelFormat === '40x60') && (
                  <>
                    <Text style={styles.labelInputLabel}>{t('cartOrder.labelModal.contentInput')}</Text>
                    <TextInput
                      style={styles.labelContentInput}
                      value={labelContent}
                      onChangeText={setLabelContent}
                      multiline
                      placeholder={t('cartOrder.labelModal.contentPlaceholder')}
                      placeholderTextColor={COLORS.gray[400]}
                    />
                  </>
                )}

                {!(labelType === 'foodInspect' && labelFormat === '40x60') && (
                  <>
                    <Text style={styles.labelInputLabel}>{t('cartOrder.labelModal.barcodeNumber')}</Text>
                    <TextInput
                      style={styles.labelInput}
                      value={labelBarcode}
                      onChangeText={setLabelBarcode}
                      placeholder={t('cartOrder.labelModal.barcodePlaceholder')}
                      placeholderTextColor={COLORS.gray[400]}
                    />
                  </>
                )}

                {labelFileUri ? (
                  <View style={styles.labelFilePreviewWrap}>
                    <Image source={{ uri: labelFileUri }} style={styles.labelFilePreview} />
                    <TouchableOpacity
                      style={styles.uploadRemove}
                      onPress={() => setLabelFileUri(null)}
                    >
                      <Icon name="close" size={12} color={COLORS.white} />
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalFooterBtn, styles.modalCancelBtn]}
                onPress={pickLabelFile}
              >
                <Icon name="cloud-upload-outline" size={14} color={COLORS.text.primary} />
                <Text style={[styles.modalCancelText, { marginLeft: 4 }]}>{t('cartOrder.labelModal.fileUpload')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalFooterBtn, styles.modalConfirmBtn]}
                onPress={saveLabel}
              >
                <Text style={styles.modalConfirmText}>{t('cartOrder.labelModal.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 부가서비스선택 MODAL */}
      <Modal
        visible={showServiceModal}
        animationType="slide"
        transparent
        onRequestClose={closeServiceModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('cartOrder.serviceModal.title')}</Text>
              <TouchableOpacity onPress={closeServiceModal}>
                <Icon name="close" size={22} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              showsVerticalScrollIndicator={false}
            >
              {/* TOP — product/service detail (middle section) */}
              <View style={styles.detailSection}>
                <View style={styles.detailImageWrap}>
                  {detailService ? (
                    <Icon name={(detailService.icon as any) || 'cube-outline'} size={72} color={PRIMARY} />
                  ) : (
                    <Icon name="cube-outline" size={72} color={COLORS.gray[300]} />
                  )}
                </View>
                <Text style={styles.detailName}>
                  {detailService ? tServiceName(detailService.id) : t('cartOrder.serviceModal.selectPrompt')}
                </Text>
                {detailService?.price ? (
                  <Text style={styles.detailPriceRow}>
                    <Text style={styles.detailPriceLabel}>{t('cartOrder.serviceModal.feeLabel')}</Text>
                    <Text style={styles.detailPrice}>{detailService.price}</Text>
                  </Text>
                ) : null}
                {detailService?.description ? (
                  <Text style={styles.detailDescription}>
                    <Text style={styles.detailDescLabel}>{t('cartOrder.serviceModal.descLabel')}</Text>
                    {detailService.description}
                  </Text>
                ) : null}
              </View>

              {/* CENTER — other requests + photo upload (right section) */}
              <View style={styles.requestSection}>
                <Text style={styles.sectionLabel}>{t('cartOrder.serviceModal.otherRequests')}</Text>
                <TextInput
                  style={styles.requestInput}
                  multiline
                  maxLength={200}
                  placeholder={t('cartOrder.serviceModal.otherRequestsPlaceholder')}
                  placeholderTextColor={COLORS.gray[400]}
                  value={otherRequests}
                  onChangeText={setOtherRequests}
                />
                <Text style={styles.requestCounter}>{otherRequests.length}/200</Text>

                <Text style={[styles.sectionLabel, { marginTop: 12 }]}>{t('cartOrder.serviceModal.photoUpload')}</Text>
                <View style={styles.uploadRow}>
                  {modalPhotoUri ? (
                    <View style={styles.uploadPreviewWrap}>
                      <Image source={{ uri: modalPhotoUri }} style={styles.uploadPreview} />
                      <TouchableOpacity
                        style={styles.uploadRemove}
                        onPress={() => setModalPhotoUri(null)}
                      >
                        <Icon name="close" size={12} color={COLORS.white} />
                      </TouchableOpacity>
                    </View>
                  ) : null}
                  <TouchableOpacity style={styles.uploadBtn} onPress={pickModalPhoto}>
                    <Icon name="add" size={20} color={COLORS.gray[500]} />
                    <Text style={styles.uploadBtnText}>{t('cartOrder.serviceModal.upload')}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* BOTTOM — service categories (left section) */}
              <View style={styles.categoriesSection}>
                {SERVICE_CATEGORIES.map((cat) => (
                  <View key={cat.id} style={styles.categoryBlock}>
                    <Text style={styles.categoryTitle}>
                      {tCategoryTitle(cat.id)}
                      {cat.required ? (
                        <Text style={styles.categoryRequired}> {t('cartOrder.serviceModal.required')}</Text>
                      ) : null}
                    </Text>
                    <View style={styles.categoryGrid}>
                      {cat.items.map((svc) => {
                        const selected = pendingServices.some((s) => s.id === svc.id);
                        const focused = detailService?.id === svc.id;
                        return (
                          <TouchableOpacity
                            key={svc.id}
                            style={[
                              styles.serviceTile,
                              selected && styles.serviceTileSelected,
                              focused && !selected && styles.serviceTileFocused,
                            ]}
                            onPress={() => togglePendingService(svc)}
                          >
                            <Icon
                              name={(svc.icon as any) || 'cube-outline'}
                              size={24}
                              color={selected ? PRIMARY : COLORS.text.primary}
                            />
                            {selected && (
                              <View style={styles.serviceTileCheck}>
                                <Icon name="checkmark" size={10} color={COLORS.white} />
                              </View>
                            )}
                            <Text
                              style={[
                                styles.serviceTileText,
                                selected && styles.serviceTileTextSelected,
                              ]}
                              numberOfLines={2}
                            >
                              {tServiceName(svc.id)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* Footer actions */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalFooterBtn, styles.modalCancelBtn]}
                onPress={closeServiceModal}
              >
                <Text style={styles.modalCancelText}>{t('cartOrder.serviceModal.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalFooterBtn, styles.modalConfirmBtn]}
                onPress={confirmServiceModal}
              >
                <Text style={styles.modalConfirmText}>{t('cartOrder.serviceModal.confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const PRIMARY = COLORS.red;
const PRIMARY_SOFT = 'rgba(255, 85, 0, 0.10)';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // PAGE TITLE
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  pageHeaderTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.red,
    marginLeft: 8,
  },
  // HEADER
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
    zIndex: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[100],
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 36,
  },
  searchInput: {
    flex: 1,
    marginLeft: 6,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    padding: 0,
  },
  periodWrap: {
    marginHorizontal: 8,
    position: 'relative',
  },
  periodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 10,
    paddingHorizontal: 8,
    height: 36,
  },
  periodText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.primary,
    marginHorizontal: 4,
    fontWeight: '500',
  },
  periodMenu: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    paddingVertical: 4,
    zIndex: 20,
    minWidth: 100,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  periodMenuItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  periodMenuText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },
  periodMenuTextActive: {
    color: PRIMARY,
    fontWeight: '600',
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PRIMARY,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  // 부가서비스 bar (under header)
  extraBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
    zIndex: 9,
  },
  extraLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[600],
    fontWeight: '700',
    marginRight: 8,
  },
  extraChipsScroll: {
    flex: 1,
    maxHeight: 28,
  },
  extraChipsContent: {
    alignItems: 'center',
    paddingRight: 8,
  },
  extraPlaceholder: {
    fontSize: 11,
    color: COLORS.gray[400],
    fontStyle: 'italic',
  },
  extraChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY_SOFT,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
  },
  extraChipText: {
    fontSize: 11,
    color: PRIMARY,
    marginRight: 4,
    fontWeight: '600',
  },
  extraSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: PRIMARY,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  extraSelectBtnText: {
    fontSize: 11,
    color: COLORS.white,
    fontWeight: '700',
    marginLeft: 3,
  },
  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  modalTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '800',
    color: COLORS.text.primary,
  },
  modalBody: {
    maxHeight: '100%',
  },
  modalBodyContent: {
    paddingBottom: 12,
  },
  // Detail (top)
  detailSection: {
    padding: SPACING.md,
    backgroundColor: COLORS.gray[50],
    alignItems: 'flex-start',
  },
  detailImageWrap: {
    alignSelf: 'center',
    width: '100%',
    height: 160,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  detailName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '800',
    color: COLORS.text.primary,
    marginBottom: 6,
  },
  detailPriceRow: {
    marginBottom: 6,
  },
  detailPriceLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  detailPrice: {
    fontSize: FONTS.sizes.sm,
    color: PRIMARY,
    fontWeight: '700',
  },
  detailDescLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  detailDescription: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[600],
    lineHeight: 20,
  },
  // Requests (center)
  requestSection: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  sectionLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 6,
  },
  requestInput: {
    minHeight: 80,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    textAlignVertical: 'top',
  },
  requestCounter: {
    fontSize: 10,
    color: COLORS.gray[500],
    textAlign: 'right',
    marginTop: 2,
  },
  uploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  uploadPreviewWrap: {
    marginRight: 8,
    position: 'relative',
  },
  uploadPreview: {
    width: 64,
    height: 64,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  uploadRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBtn: {
    width: 64,
    height: 64,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gray[50],
  },
  uploadBtnText: {
    fontSize: 10,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  // Categories (bottom)
  categoriesSection: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  categoryBlock: {
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '800',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  categoryRequired: {
    fontSize: FONTS.sizes.xs,
    color: PRIMARY,
    fontWeight: '700',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  serviceTile: {
    width: '23%',
    aspectRatio: 1,
    margin: '1%',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    position: 'relative',
  },
  serviceTileSelected: {
    borderColor: PRIMARY,
    backgroundColor: PRIMARY_SOFT,
  },
  serviceTileFocused: {
    borderColor: PRIMARY,
  },
  serviceTileCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceTileText: {
    fontSize: 10,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  serviceTileTextSelected: {
    color: PRIMARY,
    fontWeight: '700',
  },
  // Footer
  modalFooter: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
    backgroundColor: COLORS.white,
  },
  modalFooterBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtn: {
    backgroundColor: COLORS.gray[100],
    marginRight: 8,
  },
  modalConfirmBtn: {
    backgroundColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  modalCancelText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '700',
  },
  modalConfirmText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    fontWeight: '800',
  },
  // BODY
  body: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  cardsList: {
    flex: 1,
  },
  cardsContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: 6,
    paddingBottom: SPACING.lg,
  },
  // CARD — stylish
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#1A1A2E',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  cardAccent: {
    height: 3,
    backgroundColor: PRIMARY,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  checkBtn: {
    padding: 2,
    marginRight: 8,
  },
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  checkBoxChecked: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  companyWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  indexBadge: {
    fontSize: 10,
    color: COLORS.white,
    fontWeight: '700',
    backgroundColor: PRIMARY,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
    overflow: 'hidden',
  },
  companyName: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  photoBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: PRIMARY_SOFT,
    borderWidth: 1,
    borderColor: 'rgba(255, 85, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPreview: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  // MIDDLE
  cardMiddle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  middleLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImage: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: COLORS.gray[100],
    marginRight: 10,
  },
  productImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productNameBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: COLORS.gray[50],
    marginBottom: 6,
  },
  productName: {
    flex: 1,
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metaTag: {
    fontSize: 10,
    color: COLORS.gray[600],
    backgroundColor: COLORS.gray[100],
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginRight: 4,
    marginBottom: 2,
    overflow: 'hidden',
  },
  middleCenter: {
    width: 100,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY_SOFT,
    borderRadius: 999,
    padding: 2,
    marginBottom: 6,
  },
  qtyBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: {
    width: 32,
    textAlign: 'center',
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  unitPriceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 6,
    backgroundColor: COLORS.white,
    paddingHorizontal: 8,
    height: 28,
    width: '100%',
    justifyContent: 'center',
  },
  yenMark: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.primary,
    marginRight: 2,
    fontWeight: '600',
  },
  unitPriceInput: {
    flex: 1,
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.primary,
    padding: 0,
    textAlign: 'center',
    fontWeight: '600',
  },
  middleRight: {
    width: 84,
    alignItems: 'flex-end',
    paddingLeft: 4,
  },
  rightLabel: {
    fontSize: 10,
    color: COLORS.gray[500],
    marginBottom: 2,
  },
  rightValue: {
    fontSize: FONTS.sizes.md,
    color: PRIMARY,
    fontWeight: '800',
    marginBottom: 8,
  },
  viewMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: PRIMARY_SOFT,
  },
  viewMoreText: {
    fontSize: 10,
    color: PRIMARY,
    fontWeight: '700',
    marginRight: 2,
  },
  // BOTTOM
  cardBottom: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
    backgroundColor: COLORS.gray[50],
  },
  remarksLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[600],
    fontWeight: '700',
    marginBottom: 4,
  },
  remarksInput: {
    minHeight: 52,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    textAlignVertical: 'top',
  },
  remarksCounter: {
    fontSize: 10,
    color: COLORS.gray[500],
    textAlign: 'right',
    marginTop: 2,
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
  },
  labelRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: PRIMARY,
    marginRight: 6,
  },
  labelRowText: {
    fontSize: 11,
    color: COLORS.white,
    fontWeight: '700',
    marginLeft: 3,
  },
  deleteRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: PRIMARY_SOFT,
  },
  deleteRowText: {
    fontSize: 11,
    color: PRIMARY,
    fontWeight: '700',
    marginLeft: 3,
  },
  emptyWrap: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.gray[500],
  },
  // Summary bar
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
  },
  summaryText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.primary,
    marginRight: 12,
    fontWeight: '500',
  },
  summaryTotal: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: PRIMARY,
    fontWeight: '800',
  },
  orderBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    shadowColor: PRIMARY,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  orderBtnText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    fontWeight: '800',
  },
  // Label modal
  labelSection: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  labelSectionLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '800',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  labelHint: {
    fontSize: 11,
    color: COLORS.gray[500],
    marginTop: 6,
  },
  labelHintInline: {
    fontSize: 11,
    color: COLORS.gray[500],
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  radioOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    backgroundColor: COLORS.white,
  },
  radioOuterOn: {
    borderColor: PRIMARY,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY,
  },
  radioText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  previewWrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  previewCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 6,
    padding: 10,
    position: 'relative',
  },
  previewCard5080: {
    width: 200,
    height: 320,
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
  previewProductName: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  previewContent: {
    fontSize: 10,
    color: COLORS.text.primary,
    lineHeight: 14,
    marginBottom: 8,
  },
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
  dimensionLabel: {
    marginTop: 8,
  },
  dimensionText: {
    fontSize: 11,
    color: COLORS.gray[500],
    fontWeight: '600',
  },
  fontToolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: COLORS.gray[50],
    borderRadius: 8,
    padding: 4,
    marginBottom: 10,
  },
  fontChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: COLORS.white,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    marginRight: 4,
    marginBottom: 4,
  },
  fontChipText: {
    fontSize: 11,
    color: COLORS.text.primary,
  },
  labelInputLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[600],
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  labelInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },
  labelContentInput: {
    minHeight: 100,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    textAlignVertical: 'top',
  },
  labelFilePreviewWrap: {
    marginTop: 10,
    width: 80,
    height: 80,
    position: 'relative',
  },
  labelFilePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  // Order modal
  orderSection: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  orderSectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderSectionBar: {
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: PRIMARY,
    marginRight: 6,
  },
  orderSectionTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '800',
    color: COLORS.text.primary,
  },
  orderFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderFieldCol: {
    marginBottom: 12,
  },
  orderFieldLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: COLORS.text.primary,
    width: 96,
    marginBottom: 4,
  },
  pillGroup: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    backgroundColor: COLORS.white,
    marginRight: 6,
    marginBottom: 6,
  },
  pillActive: {
    borderColor: PRIMARY,
    backgroundColor: PRIMARY_SOFT,
  },
  pillText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  pillTextActive: {
    color: PRIMARY,
    fontWeight: '800',
  },
  helpBtn: {
    padding: 4,
  },
  tooltipBox: {
    backgroundColor: PRIMARY_SOFT,
    borderWidth: 1,
    borderColor: PRIMARY,
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
  },
  tooltipText: {
    fontSize: 11,
    color: PRIMARY,
    lineHeight: 16,
  },
  selectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
  },
  selectBtnText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
});

export default CartScreen;
