import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from '../../../components/Icon';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../../constants';
import { RootStackParamList } from '../../../types';
import { useGeneralInquiry } from '../../../hooks/useGeneralInquiry';
import { useSocket } from '../../../context/SocketContext';
import { GeneralInquiry } from '../../../services/socketService';
import { useTranslation } from '../../../hooks/useTranslation';
import { useAuth } from '../../../context/AuthContext';

type GeneralInquiryListScreenNavigationProp = StackNavigationProp<RootStackParamList, 'GeneralInquiryList'>;

const GeneralInquiryListScreen: React.FC = () => {
  const navigation = useNavigation<GeneralInquiryListScreenNavigationProp>();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { isConnected } = useSocket();
  const {
    inquiries,
    isLoading,
    unreadCount,
    getInquiriesList,
    refreshUnreadCounts,
  } = useGeneralInquiry({ autoFetch: true });

  const [selectedStatus, setSelectedStatus] = useState<'all' | 'open' | 'closed' | 'resolved'>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Filter inquiries by status
  const filteredInquiries = inquiries.filter(inq => {
    if (selectedStatus === 'all') return true;
    return inq.status === selectedStatus;
  });

  // Refresh inquiries list
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await getInquiriesList(selectedStatus === 'all' ? undefined : selectedStatus);
      await refreshUnreadCounts();
    } catch (error) {
      // console.error('Failed to refresh inquiries:', error);
    } finally {
      setRefreshing(false);
    }
  }, [selectedStatus, getInquiriesList, refreshUnreadCounts]);

  // Load inquiries on focus
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated && isConnected) {
        getInquiriesList(selectedStatus === 'all' ? undefined : selectedStatus);
        refreshUnreadCounts();
      }
    }, [isAuthenticated, isConnected, selectedStatus, getInquiriesList, refreshUnreadCounts])
  );

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return COLORS.primary;
      case 'closed':
        return COLORS.gray[600];
      case 'resolved':
        return COLORS.success;
      default:
        return COLORS.gray[600];
    }
  };

  // Get category label
  const getCategoryLabel = (category?: string) => {
    switch (category) {
      case 'general':
        return t('inquiry.category.general') || 'General';
      case 'support':
        return t('inquiry.category.support') || 'Support';
      case 'complaint':
        return t('inquiry.category.complaint') || 'Complaint';
      case 'suggestion':
        return t('inquiry.category.suggestion') || 'Suggestion';
      case 'technical':
        return t('inquiry.category.technical') || 'Technical';
      default:
        return t('inquiry.category.general') || 'General';
    }
  };

  // Render inquiry item
  const renderInquiryItem = ({ item }: { item: GeneralInquiry }) => {
    const lastMessage = item.messages && item.messages.length > 0 
      ? item.messages[item.messages.length - 1] 
      : null;
    const lastMessageText = lastMessage?.message || 'No messages yet';
    const lastMessageTime = item.lastMessageAt || item.createdAt;

    return (
      <TouchableOpacity
        style={styles.inquiryItem}
        onPress={() => {
          navigation.navigate('GeneralInquiryChat', { inquiryId: item._id });
        }}
        activeOpacity={0.7}
      >
        <View style={styles.inquiryHeader}>
          <View style={styles.inquiryTitleRow}>
            <Text style={styles.inquirySubject} numberOfLines={1}>
              {item.subject || t('inquiry.noSubject') || 'No Subject'}
            </Text>
            {item.unreadCount && item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
          <View style={styles.inquiryMetaRow}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {item.status.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.categoryText}>{getCategoryLabel(item.category)}</Text>
          </View>
        </View>

        {lastMessage && (
          <View style={styles.messagePreview}>
            <Text style={styles.messageText} numberOfLines={2}>
              {lastMessageText}
            </Text>
            <Text style={styles.messageTime}>{formatDate(lastMessageTime)}</Text>
          </View>
        )}

        {item.assignedAdmin && (
          <View style={styles.adminInfo}>
            <Icon name="person" size={14} color={COLORS.gray[600]} />
            <Text style={styles.adminText}>
              {t('inquiry.assignedTo') || 'Assigned to'} {item.assignedAdmin.name}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon name="chatbubbles-outline" size={64} color={COLORS.gray[400]} />
      <Text style={styles.emptyText}>
        {t('inquiry.noInquiries') || 'No inquiries yet'}
      </Text>
      <Text style={styles.emptySubtext}>
        {t('inquiry.createFirst') || 'Create your first inquiry to get started'}
      </Text>
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => navigation.navigate('CreateGeneralInquiry')}
      >
        <Text style={styles.createButtonText}>
          {t('inquiry.createNew') || 'Create New Inquiry'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Render status filter tabs
  const renderStatusTabs = () => (
    <View style={styles.statusTabs}>
      {(['all', 'open', 'closed', 'resolved'] as const).map((status) => (
        <TouchableOpacity
          key={status}
          style={[
            styles.statusTab,
            selectedStatus === status && styles.statusTabActive,
          ]}
          onPress={() => {
            setSelectedStatus(status);
            getInquiriesList(status === 'all' ? undefined : status);
          }}
        >
          <Text
            style={[
              styles.statusTabText,
              selectedStatus === status && styles.statusTabTextActive,
            ]}
          >
            {t(`inquiry.status.${status}`) || status.toUpperCase()}
          </Text>
          {status === 'all' && unreadCount > 0 && (
            <View style={styles.tabUnreadBadge}>
              <Text style={styles.tabUnreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t('inquiry.generalInquiries') || 'General Inquiries'}
          </Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {t('home.pleaseLogin') || 'Please login to view inquiries'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('inquiry.generalInquiries') || 'General Inquiries'}
        </Text>
        <TouchableOpacity
          style={styles.headerRight}
          onPress={() => navigation.navigate('CreateGeneralInquiry')}
        >
          <Icon name="add" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {renderStatusTabs()}

      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredInquiries}
          renderItem={renderInquiryItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
            />
          }
        />
      )}
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
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
    ...SHADOWS.small,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  statusTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  statusTab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.sm,
    marginHorizontal: SPACING.xs,
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  statusTabActive: {
    backgroundColor: COLORS.primary + '20',
  },
  statusTabText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[600],
    fontWeight: '500',
  },
  statusTabTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  tabUnreadBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xs,
  },
  tabUnreadBadgeText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  listContent: {
    padding: SPACING.md,
    flexGrow: 1,
  },
  inquiryItem: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  inquiryHeader: {
    marginBottom: SPACING.sm,
  },
  inquiryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  inquirySubject: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.primary,
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  unreadBadgeText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  inquiryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  categoryText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[600],
  },
  messagePreview: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  messageText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  messageTime: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
  },
  adminInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  adminText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[600],
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  emptySubtext: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  createButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  createButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default GeneralInquiryListScreen;

