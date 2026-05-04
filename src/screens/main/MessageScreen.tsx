import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import Text from '../../components/Text';
import Icon from '../../components/Icon';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { useGeneralInquiry } from '../../hooks/useGeneralInquiry';
import { useSocket } from '../../context/SocketContext';
import { GeneralInquiry } from '../../services/socketService';
import { inquiryApi } from '../../services/inquiryApi';
import { useAppSelector } from '../../store/hooks';
import { translations } from '../../i18n/translations';
import SearchIcon from '../../assets/icons/SearchIcon';
import ChatBubbleIcon from '../../assets/icons/ChatBubbleIcon';
import { API_BASE_URL } from '../../constants';
import { getStoredToken } from '../../services/authApi';
import { buildSignatureHeaders } from '../../services/signature';

type TabType = 'order' | 'general' | 'fileDownload';

// ─── Order Inquiry Item ──────────────────────────────────
interface OrderInquiryItem {
  orderId: string;
  orderNumber: string;
  inquiryId: string;
  status: string;
  lastMessageAt: string;
  createdAt: string;
  unreadCount: number;
  imageUrl?: string;
  progressStatus?: string;
}

// ─── Form File Item ──────────────────────────────────────
interface FormFile {
  _id: string;
  title: { en?: string; ko?: string; zh?: string };
  fileUrl: string;
  createdAt: string;
  updatedAt: string;
}

const MessageScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { isConnected, unreadCount: orderUnreadCount, generalInquiryUnreadCount, getUnreadCounts, getGeneralInquiryUnreadCounts, onMessageReceived, onGeneralInquiryMessageReceived } = useSocket();
  const locale = useAppSelector((s) => s.i18n.locale) as 'en' | 'ko' | 'zh';

  // Redirect to login if not authenticated
  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) {
        navigation.navigate('Auth', { screen: 'Login', params: { fromProfile: true } });
      }
    }, [isAuthenticated, navigation])
  );

  const t = (key: string) => {
    const keys = key.split('.');
    let value: any = translations[locale as keyof typeof translations];
    for (const k of keys) { value = value?.[k]; }
    if (typeof value === 'string') return value;
    return undefined;
  };

  const initialTab = route.params?.initialTab === 'general' ? 'general' : 'order';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // If navigated with orderId (from BuyList ? button), go directly to Chat
  useEffect(() => {
    const orderId = route.params?.orderId;
    const orderNumber = route.params?.orderNumber;
    if (orderId && orderNumber) {
      navigation.navigate('Chat', { orderId, orderNumber });
    }
  }, [route.params?.orderId, route.params?.orderNumber]);

  // ─── Order Inquiry state ──────────────────────────────
  const [orderInquiries, setOrderInquiries] = useState<OrderInquiryItem[]>([]);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderRefreshing, setOrderRefreshing] = useState(false);

  // ─── General (1:1) Inquiry state ──────────────────────
  const {
    inquiries: generalInquiries,
    isLoading: generalSocketLoading,
    unreadCount: generalUnreadCount,
    getInquiriesList,
    refreshUnreadCounts,
  } = useGeneralInquiry({ autoFetch: false });
  const [generalInquiriesLocal, setGeneralInquiriesLocal] = useState<any[]>([]);
  const [generalLoading, setGeneralLoading] = useState(false);

  // ─── File Download state ──────────────────────────────
  const [formFiles, setFormFiles] = useState<FormFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);

  // ─── Fetch Order Inquiries (GET /inquiries?status=confirmed) ──
  const fetchOrderInquiries = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setOrderLoading(true);
      console.log('[MessageScreen] Fetching order inquiries...');
      const response = await inquiryApi.getInquiries();
      console.log('[MessageScreen] Order inquiries response:', JSON.stringify(response).substring(0, 500));
      if (response.success && response.data?.inquiries) {
        console.log('[MessageScreen] Order inquiries count:', response.data.inquiries.length);
        const mapped = response.data.inquiries.map((inq: any) => ({
          orderId: inq.orderId || inq.order?._id || inq._id,
          orderNumber: inq.orderNumber || inq.order?.orderNumber || '',
          inquiryId: inq._id,
          status: inq.status || '',
          lastMessageAt: inq.lastMessageAt || inq.updatedAt || inq.createdAt || '',
          createdAt: inq.createdAt || '',
          unreadCount: inq.unreadCount || 0,
          imageUrl: inq.imageUrl || inq.order?.imageUrl || '',
          progressStatus: inq.progressStatus || inq.order?.progressStatus || inq.order?.status || '',
        }));
        console.log('[MessageScreen] Mapped order inquiries:', JSON.stringify(mapped).substring(0, 500));
        setOrderInquiries(mapped);
      } else {
        console.warn('[MessageScreen] Order inquiries failed or empty:', response.error);
      }
    } catch (e) {
      console.error('[MessageScreen] fetchOrderInquiries error:', e);
    } finally {
      setOrderLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch general (1:1) inquiries via REST API
  const fetchGeneralInquiries = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setGeneralLoading(true);
      console.log('[MessageScreen] Fetching general (1:1) inquiries...');
      const response = await inquiryApi.getGeneralInquiries();
      console.log('[MessageScreen] General inquiries response:', JSON.stringify(response).substring(0, 500));
      if (response.success && response.data) {
        const list = response.data.inquiries || response.data.generalInquiries || [];
        console.log('[MessageScreen] General inquiries count:', list.length, 'keys:', Object.keys(response.data));
        setGeneralInquiriesLocal(list);
      } else {
        console.warn('[MessageScreen] General inquiries failed or empty:', response.error);
      }
    } catch (e) {
      console.error('[MessageScreen] fetchGeneralInquiries error:', e);
    } finally {
      setGeneralLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch form files (GET /v1/form-files)
  const fetchFormFiles = useCallback(async () => {
    try {
      setFilesLoading(true);
      const token = await getStoredToken();
      const url = `${API_BASE_URL}/form-files`;
      const signatureHeaders = await buildSignatureHeaders('GET', url);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...signatureHeaders,
        },
      });
      const data = await response.json();
      if (data.status === 'success' && data.data?.formFiles) {
        setFormFiles(data.data.formFiles);
      }
    } catch (e) {
      // silent
    } finally {
      setFilesLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        fetchOrderInquiries();
        fetchGeneralInquiries();
        // Refresh unread counts from server so badges update after reading messages
        if (isConnected) {
          getUnreadCounts();
          getGeneralInquiryUnreadCounts();
        }
      }
      fetchFormFiles();
    }, [isAuthenticated, isConnected])
  );

  // Listen for real-time order inquiry messages and update per-item unread count
  useEffect(() => {
    onMessageReceived((data) => {
      if (data.inquiryId) {
        setOrderInquiries((prev) =>
          prev.map((inq) =>
            inq.inquiryId === data.inquiryId
              ? {
                  ...inq,
                  unreadCount: data.unreadCount !== undefined ? data.unreadCount : (inq.unreadCount || 0) + 1,
                  lastMessageAt: new Date().toISOString(),
                }
              : inq
          )
        );
      }
    });
    onGeneralInquiryMessageReceived((data) => {
      if (data.inquiryId) {
        setGeneralInquiriesLocal((prev: any[]) =>
          prev.map((inq: any) =>
            inq._id === data.inquiryId
              ? {
                  ...inq,
                  unreadCount: data.unreadCount !== undefined ? data.unreadCount : (inq.unreadCount || 0) + 1,
                  lastMessageAt: new Date().toISOString(),
                }
              : inq
          )
        );
      }
    });
  }, [onMessageReceived, onGeneralInquiryMessageReceived]);

  const handleOrderRefresh = useCallback(async () => {
    setOrderRefreshing(true);
    await fetchOrderInquiries();
    setOrderRefreshing(false);
  }, [fetchOrderInquiries]);

  const handleGeneralRefresh = useCallback(async () => {
    await fetchGeneralInquiries();
  }, [fetchGeneralInquiries]);

  // ─── Format date ──────────────────────────────────────
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}/${m}/${day}\n${h}:${min}`;
  };

  // ─── Status label ─────────────────────────────────────
  const getStatusLabel = (status: string) => {
    const statusKeyMap: Record<string, string> = {
      open: 'inquiry.status.open',
      closed: 'inquiry.status.closed',
      resolved: 'inquiry.status.resolved',
      in_progress: 'inquiry.status.inProgress',
      pending: 'inquiry.status.pending',
      confirmed: 'inquiry.status.confirmed',
    };
    const key = statusKeyMap[status];
    return (key && t(key)) || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
      case 'pending': return COLORS.red;
      case 'in_progress': return '#FF8C00';
      case 'closed':
      case 'resolved':
      case 'confirmed': return '#28A745';
      default: return COLORS.gray[500];
    }
  };

  const getProgressStatusLabel = (status?: string) => {
    if (!status) return '';
    const map: Record<string, string> = {
      'BUY_PAY_WAIT': 'message.progressStatus.paymentPending',
      'BUY_PAY_DONE': 'message.progressStatus.purchaseInProgress',
      'BUYING_MANUAL': 'message.progressStatus.buyingInProgress',
      'WH_ARRIVE_EXPECTED': 'message.progressStatus.shippingPending',
      'WH_IN_DONE': 'message.progressStatus.warehouseComplete',
      'INTERNATIONAL_SHIPPED': 'message.progressStatus.inTransit',
      'ORDER_RECEIVED': 'message.progressStatus.received',
    };
    const key = map[status];
    return (key && t(key)) || status;
  };

  // ═══════════════════════════════════════════════════════
  // ─── HEADER ────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════
  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top + SPACING.xs }]}>
      <Text style={styles.headerTitle}>{t('message')}</Text>
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.headerIcon}>
          <SearchIcon width={22} height={22} color={COLORS.black} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerIcon}>
          <ChatBubbleIcon width={22} height={22} color={COLORS.black} />
        </TouchableOpacity>
      </View>
    </View>
  );

  // ═══════════════════════════════════════════════════════
  // ─── TABS ──────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════
  const tabs: { key: TabType; label: string; icon: string; count?: number; unread?: number }[] = [
    { key: 'order', label: t('home.orderInquiry'), icon: '📋', count: orderInquiries.length, unread: orderUnreadCount },
    { key: 'general', label: t('home.oneToOne'), icon: '👤', unread: generalInquiryUnreadCount },
    { key: 'fileDownload', label: t('home.fileDownload'), icon: '📥' },
  ];

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <View>
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              {tab.unread != null && tab.unread > 0 && (
                <View style={styles.tabUnreadBadge}>
                  <Text style={styles.tabUnreadBadgeText}>
                    {tab.unread > 99 ? '99+' : tab.unread}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {tab.label}{tab.count != null && tab.count > 0 ? ` (${tab.count})` : ''}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // ═══════════════════════════════════════════════════════
  // ─── ORDER INQUIRY TAB ─────────────────────────────────
  // ═══════════════════════════════════════════════════════
  const renderOrderItem = ({ item }: { item: OrderInquiryItem }) => (
    <TouchableOpacity
      style={styles.orderItem}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('Chat', {
        orderId: item.orderId,
        orderNumber: item.orderNumber,
        inquiryId: item.inquiryId,
      })}
    >
      <View>
        <Image
          source={require('../../assets/icons/cart_empty.png')}
          style={styles.orderItemImage}
          resizeMode="contain"
        />
        {item.unreadCount > 0 && (
          <View style={styles.itemUnreadBadge}>
            <Text style={styles.itemUnreadBadgeText}>
              {item.unreadCount > 99 ? '99+' : item.unreadCount}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.orderItemInfo}>
        <Text style={styles.orderItemNumber}>{item.orderNumber}</Text>
        <Text style={styles.orderItemDate}>{formatDate(item.lastMessageAt || item.createdAt)}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        {item.progressStatus ? (
          <Text style={[styles.orderItemStatus, { color: COLORS.text.secondary }]}>
            {getProgressStatusLabel(item.progressStatus)}
          </Text>
        ) : null}
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '18' }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
          <Text style={[styles.statusBadgeText, { color: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderOrderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Image
        source={require('../../assets/icons/cart_empty.png')}
        style={styles.emptyImage}
        resizeMode="contain"
      />
      <Text style={styles.emptyText}>
        {t('home.noOrderInquiry')}
      </Text>
      <Text style={styles.emptySubtext}>
        {t('message.orderInquiryHint')}
      </Text>
    </View>
  );

  const renderOrderTab = () => {
    if (orderLoading && orderInquiries.length === 0) {
      return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.red} /></View>;
    }
    return (
      <FlatList
        data={orderInquiries}
        keyExtractor={(item) => item.inquiryId || item.orderId}
        renderItem={renderOrderItem}
        ListEmptyComponent={renderOrderEmptyState}
        contentContainerStyle={orderInquiries.length === 0 ? styles.emptyListContent : undefined}
        refreshControl={<RefreshControl refreshing={orderRefreshing} onRefresh={handleOrderRefresh} />}
      />
    );
  };

  // ═══════════════════════════════════════════════════════
  // ─── 1:1 INQUIRY TAB ──────────────────────────────────
  // ═══════════════════════════════════════════════════════
  const renderGeneralItem = ({ item }: { item: GeneralInquiry }) => {
    const isClosed = item.status === 'closed' || item.status === 'resolved';
    const unread = (item as any).unreadCount || 0;

    return (
      <TouchableOpacity
        style={[styles.generalItem, isClosed && styles.generalItemClosed]}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('GeneralInquiryChat', { inquiryId: item._id })}
      >
        <View style={styles.generalItemContent}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.generalItemSubject} numberOfLines={1}>
              {item.subject || t('home.noSubject')}
            </Text>
            {unread > 0 && (
              <View style={styles.itemUnreadBadge}>
                <Text style={styles.itemUnreadBadgeText}>
                  {unread > 99 ? '99+' : unread}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.generalItemDate}>{formatDate(item.lastMessageAt || item.createdAt)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '18' }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
            <Text style={[styles.statusBadgeText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>
        {item.status === 'resolved' && (
          <TouchableOpacity style={styles.generalItemClose}>
            <Icon name="close-circle-outline" size={18} color={COLORS.gray[400]} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderGeneralEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Image
        source={require('../../assets/icons/cart_empty.png')}
        style={styles.emptyImage}
        resizeMode="contain"
      />
      <Text style={styles.emptyText}>
        {t('home.noGeneralInquiry')}
      </Text>
      <Text style={styles.emptySubtext}>
        {t('home.generalInquiryHint')}
      </Text>
    </View>
  );

  const renderGeneralTab = () => {
    const data = generalInquiriesLocal;
    if (generalLoading && data.length === 0) {
      return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.red} /></View>;
    }
    return (
      <View style={{ flex: 1 }}>
        <FlatList
          data={data}
          keyExtractor={(item) => item._id}
          renderItem={renderGeneralItem}
          ListEmptyComponent={renderGeneralEmptyState}
          contentContainerStyle={data.length === 0 ? styles.emptyListContent : undefined}
          refreshControl={<RefreshControl refreshing={false} onRefresh={handleGeneralRefresh} />}
        />
        {/* New inquiry button */}
        <TouchableOpacity
          style={styles.newInquiryButton}
          onPress={() => navigation.navigate('GeneralInquiryChat', {})}
        >
          <Text style={styles.newInquiryButtonText}>+ {t('home.newInquiry')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ═══════════════════════════════════════════════════════
  // ─── FILE DOWNLOAD TAB ─────────────────────────────────
  // ═══════════════════════════════════════════════════════
  const getFileExtension = (url: string) => {
    const match = url.match(/\.(\w+)(?:\?|$)/);
    return match ? match[1].toUpperCase() : 'FILE';
  };

  const getFileIcon = (url: string) => {
    const ext = getFileExtension(url).toLowerCase();
    switch (ext) {
      case 'pdf': return 'document-text-outline';
      case 'doc': case 'docx': return 'document-outline';
      case 'xls': case 'xlsx': return 'grid-outline';
      case 'ppt': case 'pptx': return 'easel-outline';
      case 'zip': case 'rar': return 'archive-outline';
      case 'jpg': case 'jpeg': case 'png': case 'gif': return 'image-outline';
      default: return 'document-outline';
    }
  };

  const handleFileDownload = (file: FormFile) => {
    if (file.fileUrl) {
      Linking.openURL(file.fileUrl).catch(() => {});
    }
  };

  const renderFileItem = ({ item }: { item: FormFile }) => {
    const title = item.title?.[locale] || item.title?.en || item.title?.ko || item.title?.zh || 'Untitled';
    const ext = getFileExtension(item.fileUrl);
    const date = new Date(item.createdAt);
    const dateStr = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;

    return (
      <TouchableOpacity
        style={styles.fileItem}
        activeOpacity={0.7}
        onPress={() => handleFileDownload(item)}
      >
        <View style={styles.fileIconContainer}>
          <Icon name={getFileIcon(item.fileUrl)} size={28} color={COLORS.red} />
        </View>
        <View style={styles.fileInfo}>
          <Text style={styles.fileTitle} numberOfLines={2}>{title}</Text>
          <Text style={styles.fileMeta}>{ext} · {dateStr}</Text>
        </View>
        <TouchableOpacity style={styles.fileDownloadButton} onPress={() => handleFileDownload(item)}>
          <Icon name="download-outline" size={22} color={COLORS.red} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderFileDownloadTab = () => {
    if (filesLoading && formFiles.length === 0) {
      return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.red} /></View>;
    }
    return (
      <FlatList
        data={formFiles}
        keyExtractor={(item) => item._id}
        renderItem={renderFileItem}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="folder-open-outline" size={64} color={COLORS.gray[300]} />
            <Text style={styles.emptyText}>
              {t('message.noFiles')}
            </Text>
          </View>
        }
        contentContainerStyle={formFiles.length === 0 ? styles.emptyListContent : undefined}
        refreshControl={<RefreshControl refreshing={false} onRefresh={fetchFormFiles} />}
      />
    );
  };

  // ═══════════════════════════════════════════════════════
  // ─── MAIN RENDER ───────────────────────────────────────
  // ═══════════════════════════════════════════════════════
  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderTabs()}
      <View style={styles.content}>
        {activeTab === 'order' && renderOrderTab()}
        {activeTab === 'general' && renderGeneralTab()}
        {activeTab === 'fileDownload' && renderFileDownloadTab()}
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════
// ─── STYLES ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.white,
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerIcon: {
    padding: SPACING.xs,
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
    backgroundColor: COLORS.white,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs / 2,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.red,
  },
  tabIcon: {
    fontSize: 14,
  },
  tabUnreadBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#FF0000',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  tabUnreadBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  tabText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    color: COLORS.gray[500],
  },
  tabTextActive: {
    fontWeight: '700',
    color: COLORS.red,
  },

  // Content
  content: {
    flex: 1,
  },

  // Order inquiry item
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.smmd,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  orderItemImage: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.sm,
    marginRight: SPACING.sm,
    backgroundColor: COLORS.gray[100],
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemNumber: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  orderItemDate: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  orderItemStatus: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    textAlign: 'right',
  },
  itemUnreadBadge: {
    backgroundColor: '#FF0000',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 5,
  },
  itemUnreadBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700' as const,
  },
  statusBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
    alignSelf: 'flex-end' as const,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusBadgeText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600' as const,
  },

  // General inquiry item
  generalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.smmd,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
    backgroundColor: COLORS.white,
  },
  generalItemClosed: {
    backgroundColor: COLORS.gray[50],
  },
  generalItemContent: {
    flex: 1,
  },
  generalItemSubject: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  generalItemDate: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
  },
  generalItemStatus: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    marginTop: 2,
  },
  generalItemClose: {
    padding: SPACING.xs,
    marginLeft: SPACING.xs,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyImage: {
    width: 100,
    height: 100,
    marginBottom: SPACING.md,
    opacity: 0.7,
  },
  emptyText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[400],
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  emptyListContent: {
    flexGrow: 1,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // New inquiry button
  newInquiryButton: {
    backgroundColor: COLORS.red,
    borderRadius: BORDER_RADIUS.full,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  newInquiryButtonText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.white,
  },

  // File download item
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.smmd,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  fileIconContainer: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: '#FFF0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  fileInfo: {
    flex: 1,
  },
  fileTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  fileMeta: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  fileDownloadButton: {
    padding: SPACING.sm,
  },
});

export default MessageScreen;
