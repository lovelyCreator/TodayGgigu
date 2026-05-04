import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from '../../../components/Icon';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../../constants';
import { RootStackParamList } from '../../../types';
import { useTranslation } from '../../../hooks/useTranslation';
import { useNotes } from '../../../hooks/useNotes';
import { useGeneralInquiry } from '../../../hooks/useGeneralInquiry';
import { useSocket } from '../../../context/SocketContext';
import { useAuth } from '../../../context/AuthContext';
import { BroadcastNote } from '../../../services/socketService';
import { GeneralInquiry } from '../../../services/socketService';
import NoteBroadcastModal from '../../../components/NoteBroadcastModal';

type NoteScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Note'>;

const NoteScreen: React.FC = () => {
  const navigation = useNavigation<NoteScreenNavigationProp>();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { isConnected } = useSocket();
  const { notes: broadcastNotes, dismissNote } = useNotes();
  const {
    inquiries: generalInquiries,
    isLoading: isLoadingInquiries,
    getInquiriesList,
    refreshUnreadCounts,
  } = useGeneralInquiry({ autoFetch: true });

  const [selectedNote, setSelectedNote] = useState<BroadcastNote | null>(null);
  const [isNoteModalVisible, setIsNoteModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'notes' | 'inquiries'>('all');

  // Refresh data
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await getInquiriesList();
      await refreshUnreadCounts();
    } catch (error) {
      // console.error('Failed to refresh:', error);
    } finally {
      setRefreshing(false);
    }
  }, [getInquiriesList, refreshUnreadCounts]);

  // Load inquiries on focus
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated && isConnected) {
        getInquiriesList();
        refreshUnreadCounts();
      }
    }, [isAuthenticated, isConnected, getInquiriesList, refreshUnreadCounts])
  );

  // Handle note press - show modal
  const handleNotePress = (note: BroadcastNote) => {
    setSelectedNote(note);
    setIsNoteModalVisible(true);
  };

  // Handle inquiry press - navigate to chat
  const handleInquiryPress = (inquiry: GeneralInquiry) => {
    navigation.navigate('GeneralInquiryChat', { inquiryId: inquiry._id });
  };

  // Handle add button - create new inquiry
  const handleAddInquiry = () => {
    navigation.navigate('CreateGeneralInquiry');
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('common.justNow') || 'Just now';
    if (diffMins < 60) {
      const template = t('common.minutesAgo') || '{count}m ago';
      return template.replace('{count}', diffMins.toString());
    }
    if (diffHours < 24) {
      const template = t('common.hoursAgo') || '{count}h ago';
      return template.replace('{count}', diffHours.toString());
    }
    if (diffDays < 7) {
      const template = t('common.daysAgo') || '{count}d ago';
      return template.replace('{count}', diffDays.toString());
    }
    return date.toLocaleDateString();
  };

  // Get note type icon
  const getNoteTypeIcon = (type: BroadcastNote['type']) => {
    switch (type) {
      case 'announcement':
        return 'megaphone';
      case 'maintenance':
        return 'construct';
      case 'update':
        return 'refresh';
      case 'warning':
        return 'warning';
      case 'info':
        return 'information-circle';
      case 'promotion':
        return 'gift';
      default:
        return 'notifications';
    }
  };

  // Get note type color
  const getNoteTypeColor = (type: BroadcastNote['type']) => {
    switch (type) {
      case 'announcement':
        return COLORS.primary;
      case 'maintenance':
        return COLORS.warning;
      case 'update':
        return COLORS.info;
      case 'warning':
        return COLORS.error;
      case 'info':
        return COLORS.info;
      case 'promotion':
        return COLORS.primary;
      default:
        return COLORS.primary;
    }
  };

  // Get note type label
  const getNoteTypeLabel = (type: BroadcastNote['type']) => {
    switch (type) {
      case 'announcement':
        return t('note.type.announcement') || 'Announcement';
      case 'maintenance':
        return t('note.type.maintenance') || 'Maintenance';
      case 'update':
        return t('note.type.update') || 'Update';
      case 'warning':
        return t('note.type.warning') || 'Warning';
      case 'info':
        return t('note.type.info') || 'Information';
      case 'promotion':
        return t('note.type.promotion') || 'Promotion';
      default:
        return t('note.type.announcement') || 'Announcement';
    }
  };

  // Get priority label
  const getPriorityLabel = (priority: BroadcastNote['priority']) => {
    switch (priority) {
      case 'urgent':
        return t('note.priority.urgent') || 'URGENT';
      case 'high':
        return t('note.priority.high') || 'HIGH';
      case 'normal':
        return t('note.priority.normal') || 'NORMAL';
      case 'low':
        return t('note.priority.low') || 'LOW';
      default:
        return String(priority).toUpperCase();
    }
  };

  // Render broadcast note item
  const renderNoteItem = (note: BroadcastNote) => {
    const typeIcon = getNoteTypeIcon(note.type);
    const typeColor = getNoteTypeColor(note.type);
    const typeLabel = getNoteTypeLabel(note.type);
    const isUrgent = note.priority === 'urgent' || (note.type === 'maintenance' && note.priority === 'high');

    return (
      <TouchableOpacity
        style={styles.itemCard}
        onPress={() => handleNotePress(note)}
        activeOpacity={0.7}
      >
        <View style={[styles.noteIconContainer, { backgroundColor: typeColor + '20' }]}>
          <Icon name={typeIcon as any} size={24} color={typeColor} />
        </View>
        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {typeLabel}
            </Text>
            {isUrgent && (
              <View style={[styles.priorityBadge, { backgroundColor: COLORS.error }]}>
                <Text style={styles.priorityText}>{getPriorityLabel(note.priority)}</Text>
              </View>
            )}
          </View>
          <Text style={styles.itemPreview} numberOfLines={2}>
            {note.content}
          </Text>
          <Text style={styles.itemDate}>{formatDate(note.createdAt)}</Text>
        </View>
        <Icon name="chevron-forward" size={20} color={COLORS.gray[400]} />
      </TouchableOpacity>
    );
  };

  // Render general inquiry item
  const renderInquiryItem = (inquiry: GeneralInquiry) => {
    const lastMessage = inquiry.messages && inquiry.messages.length > 0 
      ? inquiry.messages[inquiry.messages.length - 1] 
      : null;
    const lastMessageText = lastMessage?.message || t('inquiry.noMessages') || 'No messages yet';
    const lastMessageTime = inquiry.lastMessageAt || inquiry.createdAt;

    return (
      <TouchableOpacity
        style={styles.itemCard}
        onPress={() => handleInquiryPress(inquiry)}
        activeOpacity={0.7}
      >
        <View style={[styles.inquiryIconContainer, { backgroundColor: COLORS.primary + '20' }]}>
          <Icon name="chatbubbles" size={24} color={COLORS.primary} />
        </View>
        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {inquiry.subject || t('inquiry.noSubject') || 'No Subject'}
            </Text>
            {inquiry.unreadCount && inquiry.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{inquiry.unreadCount}</Text>
              </View>
            )}
          </View>
          <Text style={styles.itemPreview} numberOfLines={2}>
            {lastMessageText || t('inquiry.noMessages') || 'No messages yet'}
          </Text>
          <View style={styles.itemFooter}>
            <Text style={styles.itemDate}>{formatDate(lastMessageTime)}</Text>
            {inquiry.assignedAdmin && (
              <Text style={styles.assignedText}>
                {t('inquiry.assignedTo') || 'Assigned to'} {inquiry.assignedAdmin.name}
              </Text>
            )}
          </View>
        </View>
        <Icon name="chevron-forward" size={20} color={COLORS.gray[400]} />
      </TouchableOpacity>
    );
  };

  // Render section header
  const renderSectionHeader = (title: string, count?: number) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {count !== undefined && count > 0 && (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      )}
    </View>
  );

  // Render empty state
  const renderEmptyState = (message: string) => (
    <View style={styles.emptyState}>
      <Icon name="document-text-outline" size={64} color={COLORS.gray[300]} />
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );

  // Filter items based on active tab
  const getFilteredNotes = () => {
    if (activeTab === 'notes' || activeTab === 'all') {
      return broadcastNotes;
    }
    return [];
  };

  const getFilteredInquiries = () => {
    if (activeTab === 'inquiries' || activeTab === 'all') {
      return generalInquiries;
    }
    return [];
  };

  const filteredNotes = getFilteredNotes();
  const filteredInquiries = getFilteredInquiries();

  // Render filter tabs
  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            {t('notes.all') || 'All'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'notes' && styles.activeTab]}
          onPress={() => setActiveTab('notes')}
        >
          <Text style={[styles.tabText, activeTab === 'notes' && styles.activeTabText]}>
            {t('notes.broadcastNotes') || 'Notes'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'inquiries' && styles.activeTab]}
          onPress={() => setActiveTab('inquiries')}
        >
          <Text style={[styles.tabText, activeTab === 'inquiries' && styles.activeTabText]}>
            {t('notes.inquiries') || 'Inquiries'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerNoteLabel}>{t('notes.noteLabel') || 'Note'}</Text>
        </View>
        <Text style={styles.headerTitle}>{t('notes.title') || 'Notes & Inquiries'}</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddInquiry}>
          <Icon name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      {renderTabs()}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Broadcast Notes Section */}
        {(activeTab === 'all' || activeTab === 'notes') && (
          <View style={styles.section}>
            {renderSectionHeader(
              t('notes.broadcastNotes') || 'Broadcast Notes',
              filteredNotes.length
            )}
            {filteredNotes.length > 0 ? (
              filteredNotes.map((note) => (
                <View key={note.noteId}>{renderNoteItem(note)}</View>
              ))
            ) : (
              activeTab === 'notes' && renderEmptyState(t('notes.noNotes') || 'No notes yet')
            )}
          </View>
        )}

        {/* General Inquiries Section */}
        {(activeTab === 'all' || activeTab === 'inquiries') && (
          <View style={styles.section}>
            {renderSectionHeader(
              t('notes.inquiries') || '1:1 Inquiries',
              filteredInquiries.length
            )}
            {isLoadingInquiries ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : filteredInquiries.length > 0 ? (
              filteredInquiries.map((inquiry) => (
                <View key={inquiry._id}>{renderInquiryItem(inquiry)}</View>
              ))
            ) : (
              activeTab === 'inquiries' && renderEmptyState(t('notes.noInquiries') || 'No inquiries yet')
            )}
          </View>
        )}

        {/* Combined Empty State */}
        {activeTab === 'all' &&
          filteredNotes.length === 0 &&
          filteredInquiries.length === 0 &&
          !isLoadingInquiries && (
            <View style={styles.emptyState}>
              <Icon name="document-text-outline" size={80} color={COLORS.gray[300]} />
              <Text style={styles.emptyText}>
                {t('notes.noMessages') || 'No notes or inquiries yet'}
              </Text>
              <Text style={styles.emptySubtext}>
                {t('notes.createFirst') || 'Create your first inquiry to get started'}
              </Text>
            </View>
          )}
      </ScrollView>

      {/* Note Broadcast Modal */}
      <NoteBroadcastModal
        note={selectedNote}
        visible={isNoteModalVisible}
        centered={true}
        onClose={() => {
          setIsNoteModalVisible(false);
          setSelectedNote(null);
        }}
        onDismiss={(noteId) => {
          dismissNote(noteId);
          setIsNoteModalVisible(false);
          setSelectedNote(null);
        }}
      />
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    width: 60,
  },
  headerNoteLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  headerTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  tabsContainer: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabsContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  tab: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.gray[100],
    marginRight: SPACING.sm,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  activeTabText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  countBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    minWidth: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.white,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  noteIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.lg,
  },
  inquiryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.lg,
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  itemTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text.primary,
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  priorityText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    minWidth: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },
  unreadBadgeText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
  },
  itemPreview: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
    lineHeight: 22,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  itemDate: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  assignedText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING['3xl'],
    paddingTop: SPACING['3xl'] * 2,
    paddingHorizontal: SPACING.xl,
  },
  emptyText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default NoteScreen;
