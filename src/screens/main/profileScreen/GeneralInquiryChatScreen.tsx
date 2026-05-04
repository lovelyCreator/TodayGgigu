import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { useRoute, useNavigation, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../../../components/Icon';
import { COLORS, FONTS, SHADOWS, SPACING, BORDER_RADIUS } from '../../../constants';
import { RootStackParamList } from '../../../types';
import { launchCamera, launchImageLibrary, MediaType, ImagePickerResponse, CameraOptions, ImageLibraryOptions } from 'react-native-image-picker';
import { requestCameraPermission, requestPhotoLibraryPermission } from '../../../utils/permissions';
import { useGeneralInquiry } from '../../../hooks/useGeneralInquiry';
import { useSocket } from '../../../context/SocketContext';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { useTranslation } from '../../../hooks/useTranslation';
import { SocketMessage, socketService } from '../../../services/socketService';
import { inquiryApi } from '../../../services/inquiryApi';
import AttachmantIcon from '../../../assets/icons/AttachmantIcon';

type GeneralInquiryChatRouteProp = RouteProp<RootStackParamList, 'GeneralInquiryChat'>;
type GeneralInquiryChatScreenNavigationProp = StackNavigationProp<RootStackParamList, 'GeneralInquiryChat'>;

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  sentAt?: number;
  senderName?: string;
  senderId?: string;
  readBy?: string[];
  attachments?: Array<{
    type: 'image' | 'file' | 'video';
    url: string;
    name?: string;
  }>;
}

const GeneralInquiryChatScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<GeneralInquiryChatScreenNavigationProp>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  const {
    isConnected,
    connect, 
    isConnecting,
    subscribeToGeneralInquiry,
    unsubscribeFromGeneralInquiry,
    sendGeneralInquiryMessage,
    markGeneralInquiryAsRead,
    createGeneralInquiry,
    getGeneralInquiryUnreadCounts,
    onGeneralInquiryMessageReceived,
    onGeneralInquiryMessagesRead,
    onGeneralInquiryClosed,
  } = useSocket();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [currentInquiryId, setCurrentInquiryId] = useState<string | null>(route.params?.inquiryId || null);
  const isCreateMode = !currentInquiryId;

  const {
    inquiry,
    isLoading: socketLoading,
    sendMessage: sendInquiryMessage,
    createInquiry,
    markAsRead,
    getInquiry,
  } = useGeneralInquiry({ inquiryId: currentInquiryId || undefined, autoFetch: false });

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [titleText, setTitleText] = useState('');
  const [showTitleError, setShowTitleError] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Array<{ uri: string; type: string; name: string }>>([]);
  const [showMoreModal, setShowMoreModal] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const hasMarkedReadRef = useRef(false);
  const messageCallbackSetRef = useRef(false);

  // Convert socket messages to local message format
  const convertSocketMessage = (socketMsg: SocketMessage): Message => {
    return {
      id: socketMsg._id,
      text: socketMsg.message,
      isUser: socketMsg.senderType === 'user',
      timestamp: new Date(socketMsg.timestamp),
      senderName: socketMsg.senderName,
      senderId: socketMsg.senderId,
      readBy: socketMsg.readBy,
      attachments: socketMsg.attachments,
    };
  };

  // Load inquiry and messages — try socket first, fall back to REST
  useEffect(() => {
    if (!currentInquiryId) return;

    const fetchViaRest = async () => {
      try {
        setLocalLoading(true);
        const { inquiryApi } = require('../../../services/inquiryApi');
        console.log('[GeneralInquiryChat] Fetching inquiry via REST, id:', currentInquiryId);
        const response = await inquiryApi.getGeneralInquiry(currentInquiryId);
        console.log('[GeneralInquiryChat] REST response:', JSON.stringify(response).substring(0, 300));
        if (response.success && response.data?.inquiry) {
          const inq = response.data.inquiry;
          if (inq.messages && inq.messages.length > 0) {
            const sorted = [...inq.messages].sort((a: any, b: any) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
            setMessages(sorted.map(convertSocketMessage));
          }
        } else {
          console.warn('[GeneralInquiryChat] REST fetch failed:', response.error);
        }
      } catch (e) {
        console.error('[GeneralInquiryChat] REST fetch error:', e);
      } finally {
        setLocalLoading(false);
      }
    };

    if (isConnected) {
      console.log('[GeneralInquiryChat] Fetching inquiry via socket, id:', currentInquiryId);
      getInquiry(currentInquiryId);
    }
    // Always also fetch via REST as fallback
    fetchViaRest();
  }, [currentInquiryId, isConnected, getInquiry]);

  // Update messages when inquiry changes - this is the single source of truth
  useEffect(() => {
    if (inquiry?.messages) {
      const sortedMessages = [...inquiry.messages].sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeA - timeB;
      });
      const convertedMessages = sortedMessages.map(convertSocketMessage);
      
      // Deduplicate messages by ID to prevent duplicates
      const uniqueMessages = convertedMessages.reduce((acc, msg) => {
        if (!acc.find(m => m.id === msg.id)) {
          acc.push(msg);
        }
        return acc;
      }, [] as Message[]);
      
      setMessages(uniqueMessages);
      
      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [inquiry]);

  // Mark as read when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      if (currentInquiryId && !hasMarkedReadRef.current) {
        markAsRead(currentInquiryId).then(() => {
          hasMarkedReadRef.current = true;
        }).catch(err => {/* silent */});
        // Also mark as read via socket
        markGeneralInquiryAsRead(currentInquiryId);
      }
      return () => {
        hasMarkedReadRef.current = false;
      };
    }, [currentInquiryId, markAsRead, markGeneralInquiryAsRead])
  );

  // Set up socket listeners for real-time updates
  useEffect(() => {
    if (!messageCallbackSetRef.current) {
      messageCallbackSetRef.current = true;

      // Listen for inquiry creation success
      const handleInquiryCreated = (newInquiry: any) => {
        if (isCreateMode && newInquiry._id) {
          setCurrentInquiryId(newInquiry._id);
          subscribeToGeneralInquiry(newInquiry._id);
          markGeneralInquiryAsRead(newInquiry._id);
          showToast(t('inquiry.inquiryCreated'), 'success');
        }
      };

      // Listen for new messages
      const handleMessageReceived = (data: {
        message: SocketMessage;
        inquiryId: string;
        unreadCount?: number;
        totalUnreadCount?: number;
      }) => {
        if (data.inquiryId === currentInquiryId) {
          const newMessage = convertSocketMessage(data.message);
          setMessages(prev => {
            const messageExists = prev.some(msg => msg.id === newMessage.id);
            if (messageExists) {
              return prev;
            }
            return [...prev, newMessage];
          });
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      };

      // Listen for messages read
      const handleMessagesRead = (data: {
        inquiryId: string;
        readBy: string;
        readByType: string;
        readByName: string;
        readAt: string;
      }) => {
        if (data.inquiryId === currentInquiryId) {
          showToast(t('inquiry.readMessages').replace('{name}', data.readByName), 'info');
        }
      };

      // Listen for inquiry closure
      const handleInquiryClosed = (closedInquiryId: string) => {
        if (closedInquiryId === currentInquiryId) {
          showToast(t('inquiry.inquiryClosed'), 'info');
        }
      };

      onGeneralInquiryMessageReceived(handleMessageReceived);
      onGeneralInquiryMessagesRead(handleMessagesRead);
      onGeneralInquiryClosed(handleInquiryClosed);
    }

    // Ensure socket is connected and subscribe to inquiry
    const ensureSocketConnected = async () => {
      if (!isConnected && !isConnecting && currentInquiryId) {
        try {
          await connect();
          subscribeToGeneralInquiry(currentInquiryId);
        } catch (error) {
          // silent
        }
      }
    };

    ensureSocketConnected();

    // Cleanup
    return () => {
      if (currentInquiryId) {
        unsubscribeFromGeneralInquiry(currentInquiryId);
      }
      // Refresh unread counts so badges update when navigating back
      getGeneralInquiryUnreadCounts();
    };
  }, [
    currentInquiryId,
    isConnected,
    isConnecting,
    isCreateMode,
    connect,
    subscribeToGeneralInquiry,
    unsubscribeFromGeneralInquiry,
    markGeneralInquiryAsRead,
    getGeneralInquiryUnreadCounts,
    onGeneralInquiryMessageReceived,
    onGeneralInquiryMessagesRead,
    onGeneralInquiryClosed,
    showToast,
  ]);

  // Pick files from gallery (mixed media — images, videos, documents)
  const openFilePicker = async () => {
    try {
      const granted = await requestPhotoLibraryPermission();
      if (!granted) {
        Alert.alert(t('permissions.required'), t('permissions.galleryPermission'));
        return;
      }
      const options: ImageLibraryOptions = {
        mediaType: 'mixed' as MediaType,
        selectionLimit: 5,
      };
      launchImageLibrary(options, (response: ImagePickerResponse) => {
        if (response.didCancel || response.errorCode) {
          if (response.errorCode) Alert.alert(t('permissions.error'), response.errorMessage || t('permissions.failedPickImage'));
          return;
        }
        if (response.assets) {
          const newAttachments = response.assets
            .filter((asset) => asset.uri)
            .map((asset) => ({
              uri: asset.uri!,
              type: asset.type || 'application/octet-stream',
              name: asset.fileName || `file_${Date.now()}`,
            }));
          setPendingAttachments((prev) => [...prev, ...newAttachments]);
        }
      });
    } catch (error) {
      Alert.alert(t('permissions.error'), t('permissions.failedOpenGallery'));
    }
  };

  // Pick images from gallery
  const openGallery = async () => {
    try {
      const granted = await requestPhotoLibraryPermission();
      if (!granted) {
        Alert.alert(t('permissions.required'), t('permissions.galleryPermission'));
        return;
      }
      const options: ImageLibraryOptions = {
        mediaType: 'photo' as MediaType,
        quality: 0.7,
        selectionLimit: 5,
      };
      launchImageLibrary(options, (response: ImagePickerResponse) => {
        if (response.didCancel || response.errorCode) {
          if (response.errorCode) Alert.alert(t('permissions.error'), response.errorMessage || t('permissions.failedPickImage'));
          return;
        }
        if (response.assets) {
          const newAttachments = response.assets
            .filter((asset) => asset.uri)
            .map((asset) => ({
              uri: asset.uri!,
              type: asset.type || 'image/jpeg',
              name: asset.fileName || `image_${Date.now()}.jpg`,
            }));
          setPendingAttachments((prev) => [...prev, ...newAttachments]);
        }
      });
    } catch (error) {
      Alert.alert(t('permissions.error'), t('permissions.failedOpenGallery'));
    }
  };

  const openCamera = async () => {
    try {
      const granted = await requestCameraPermission();
      if (!granted) {
        Alert.alert(t('permissions.required'), t('permissions.cameraPermission'));
        return;
      }
      const options: CameraOptions = {
        mediaType: 'photo' as MediaType,
        quality: 0.7,
        saveToPhotos: false,
      };
      launchCamera(options, (response: ImagePickerResponse) => {
        if (response.didCancel || response.errorCode) {
          if (response.errorCode) Alert.alert(t('permissions.error'), response.errorMessage || t('permissions.failedTakePhoto'));
          return;
        }
        if (response.assets && response.assets[0]) {
          const asset = response.assets[0];
          if (asset.uri) {
            setPendingAttachments((prev) => [...prev, {
              uri: asset.uri!,
              type: asset.type || 'image/jpeg',
              name: asset.fileName || `photo_${Date.now()}.jpg`,
            }]);
          }
        }
      });
    } catch (error) {
      Alert.alert(t('permissions.error'), t('permissions.failedOpenCamera'));
    }
  };

  const handleMoreOptions = () => setShowMoreModal(true);
  const handleCloseMoreModal = () => setShowMoreModal(false);
  const handleMoreOptionPress = async (option: string) => {
    setShowMoreModal(false);
    if (option === 'Gallery') await openGallery();
    else if (option === 'Camera') await openCamera();
  };

  // Send message
  const handleSendMessage = async () => {
    if ((!inputText.trim() && pendingAttachments.length === 0) || isSending) return;

    const messageText = inputText.trim() || (pendingAttachments.length > 0 ? ' ' : '');
    const attachmentsToSend = [...pendingAttachments];

    console.log('[GeneralInquiryChat] handleSendMessage, isCreateMode:', isCreateMode, 'currentInquiryId:', currentInquiryId, 'attachments:', attachmentsToSend.length);

    // Create mode: need title + first message
    if (isCreateMode) {
      if (!titleText.trim()) {
        setShowTitleError(true);
        return;
      }

      setIsSending(true);
      const subjectText = titleText.trim();

      // Add optimistic message
      const optimisticMsg: Message = {
        id: `temp-${Date.now()}`,
        text: messageText,
        isUser: true,
        timestamp: new Date(),
        sentAt: Date.now(),
        senderName: (user as any)?.user_id || user?.email || 'You',
        senderId: (user as any)?._id || (user as any)?.id,
        readBy: [],
        attachments: attachmentsToSend.map((a) => ({ type: 'image' as const, url: a.uri, name: a.name })),
      };
      setMessages(prev => [...prev, optimisticMsg]);
      setInputText('');
      setTitleText('');
      setPendingAttachments([]);
      setShowTitleError(false);

      try {
        const response = await inquiryApi.createGeneralInquiry({
          subject: subjectText,
          message: messageText,
          category: 'general',
        }, attachmentsToSend);

        if (response.success && response.data?.inquiry) {
          const newInquiry = response.data.inquiry;
          setCurrentInquiryId(newInquiry._id);

          if (newInquiry.messages && newInquiry.messages.length > 0) {
            const serverMessages = [...newInquiry.messages]
              .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
              .map(convertSocketMessage);
            setMessages(serverMessages);
          }

          if (isConnected || socketService.isConnected()) {
            subscribeToGeneralInquiry(newInquiry._id);
            markGeneralInquiryAsRead(newInquiry._id);
          }
          showToast(t('inquiry.inquiryCreated'), 'success');
        } else {
          setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
          showToast(response.error || t('inquiry.failedToCreate'), 'error');
        }
      } catch (error) {
        setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
        showToast(t('inquiry.failedToCreateRetry'), 'error');
      } finally {
        setIsSending(false);
      }
      return;
    }

    // Normal mode: send to existing inquiry
    if (!currentInquiryId) return;

    setInputText('');
    setPendingAttachments([]);
    setIsSending(true);

    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      text: messageText,
      isUser: true,
      timestamp: new Date(),
      sentAt: Date.now(),
      senderName: (user as any)?.user_id || user?.email || 'You',
      senderId: (user as any)?._id || (user as any)?.id,
      readBy: [],
      attachments: attachmentsToSend.map((a) => ({ type: 'image' as const, url: a.uri, name: a.name })),
    };
    setMessages(prev => [...prev, optimisticMsg]);

    await sendViaRest(currentInquiryId, messageText, optimisticMsg.id, attachmentsToSend);

    setIsSending(false);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // REST fallback for sending messages
  const sendViaRest = async (inquiryId: string, messageText: string, optimisticId: string, attachments: Array<{ uri: string; type: string; name: string }> = []) => {
    try {
      const response = await inquiryApi.sendGeneralInquiryMessage(inquiryId, messageText, attachments);
      if (!response.success) {
        setMessages(prev => prev.filter(m => m.id !== optimisticId));
        showToast(response.error || t('inquiry.failedToSend'), 'error');
      }
    } catch (error) {
      console.error('[GeneralInquiryChat] REST sendMessage error:', error);
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      showToast(t('inquiry.failedToSendRetry'), 'error');
    }
  };

  const formatMessageTimestamp = (date: Date): string => {
    const y = String(date.getFullYear()).slice(2);
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}/${m}/${d} ${h}:${min}`;
  };

  const renderMessage = (message: Message, index: number) => {
    const isUser = message.isUser;
    return (
      <View
        key={message.id || `msg-${index}`}
        style={isUser ? styles.userMessageContainer : styles.adminMessageContainer}
      >
        <Text style={styles.messageMeta}>
          {formatMessageTimestamp(message.timestamp)} {isUser ? (t('chat.customer') || '고객') : (message.senderName || t('chat.admin') || '관리자')}
        </Text>
        <View style={styles.messageRow}>
          {!isUser && (
            <View style={styles.adminAvatar}>
              <Icon name="person" size={16} color={COLORS.white} />
            </View>
          )}
          <View style={isUser ? styles.userBubble : styles.adminBubble}>
            {message.attachments && message.attachments.length > 0 && (
              <View style={{ marginBottom: message.text?.trim() ? 6 : 0 }}>
                {message.attachments.map((attachment, idx) => (
                  <View key={`att-${idx}`} style={{ marginBottom: 4 }}>
                    {attachment.type === 'image' ? (
                      <Image source={{ uri: attachment.url }} style={styles.attachmentImage} resizeMode="cover" />
                    ) : (
                      <View style={styles.attachmentFile}>
                        <Icon name="document" size={20} color={COLORS.primary} />
                        <Text style={styles.attachmentFileName} numberOfLines={1}>{attachment.name || 'File'}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
            {message.text?.trim() ? (
              <Text style={isUser ? styles.userMessageText : styles.adminMessageText}>
                {message.text}
              </Text>
            ) : null}
          </View>
          {isUser && (
            (user as any)?.avatar ? (
              <Image source={typeof (user as any).avatar === 'string' ? { uri: (user as any).avatar } : (user as any).avatar} style={styles.userAvatarImage} />
            ) : (
              <View style={styles.userAvatar}>
                <Icon name="person" size={16} color={COLORS.white} />
              </View>
            )
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={16} color={COLORS.black} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {isCreateMode ? t('inquiry.oneToOne') : (inquiry?.subject || t('inquiry.generalInquiry'))}
          </Text>
          {!isCreateMode && inquiry?.assignedAdmin && (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {t('inquiry.assignedTo')} {inquiry.assignedAdmin.name}
            </Text>
          )}
        </View>
      </View>

      {localLoading && messages.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={[styles.flex, { paddingBottom: Platform.OS === 'android' && keyboardHeight > 0 ? keyboardHeight + insets.bottom : 0 }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {t('inquiry.noMessages')}
                </Text>
              </View>
            ) : (
              messages.map((message, index) => renderMessage(message, index))
            )}
          </ScrollView>

          {/* Title input — only in create mode */}
          {isCreateMode && (
            <View style={styles.titleInputContainer}>
              {showTitleError && (
                <Text style={styles.titleErrorText}>*{t('inquiry.titleRequired')}</Text>
              )}
              <TextInput
                style={styles.titleInput}
                value={titleText}
                onChangeText={(v) => { setTitleText(v); setShowTitleError(false); }}
                placeholder={t('inquiry.titlePlaceholder')}
                placeholderTextColor={COLORS.gray[400]}
                maxLength={200}
              />
            </View>
          )}

          {/* Pending Attachments Preview */}
          {pendingAttachments.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.white }}>
              {pendingAttachments.map((att, idx) => (
                <View key={`pending-${idx}`} style={{ marginRight: 8, position: 'relative' }}>
                  <Image source={{ uri: att.uri }} style={{ width: 60, height: 60, borderRadius: 8 }} resizeMode="cover" />
                  <TouchableOpacity
                    style={{ position: 'absolute', top: -6, right: -6, backgroundColor: COLORS.red || '#FF0000', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}
                    onPress={() => setPendingAttachments((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <Icon name="close" size={12} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Message input */}
          <View style={[styles.inputContainer, { paddingBottom: keyboardHeight > 0 ? 10 : 10 + insets.bottom }]}>
            <TouchableOpacity style={styles.attachIconBtn} onPress={handleMoreOptions}>
              <Icon name="image-outline" size={22} color={COLORS.gray[500]} />
            </TouchableOpacity>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder={t('inquiry.typeMessage')}
                placeholderTextColor={COLORS.gray[400]}
                multiline
                maxLength={5000}
              />
            </View>
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() && pendingAttachments.length === 0 || isSending) && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={(!inputText.trim() && pendingAttachments.length === 0) || isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.sendButtonText}>{t('inquiry.send')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* More Options Modal */}
      <Modal
        visible={showMoreModal}
        statusBarTranslucent={true}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseMoreModal}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={handleCloseMoreModal} />
          <View style={{ backgroundColor: COLORS.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: SPACING.lg }}>
            <Text style={{ fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text.primary, marginBottom: SPACING.md }}>{t('chat.more')}</Text>
            <View style={{ flexDirection: 'row', gap: SPACING.lg }}>
              <TouchableOpacity style={{ alignItems: 'center' }} onPress={() => handleMoreOptionPress('Gallery')}>
                <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.gray[100], alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="images-outline" size={24} color={COLORS.text.primary} />
                </View>
                <Text style={{ fontSize: 12, color: COLORS.text.primary, marginTop: 6 }}>{t('chat.gallery')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ alignItems: 'center' }} onPress={() => handleMoreOptionPress('Camera')}>
                <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.gray[100], alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="camera-outline" size={24} color={COLORS.text.primary} />
                </View>
                <Text style={{ fontSize: 12, color: COLORS.text.primary, marginTop: 6 }}>{t('chat.camera')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.black,
  },
  headerSubtitle: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.white + 'CC',
    marginTop: 2,
  },
  headerRight: {
    width: 36,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
    marginBottom: SPACING.md,
  },
  adminMessageContainer: {
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  messageMeta: {
    fontSize: 11,
    color: COLORS.gray[500],
    marginBottom: 4,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    maxWidth: '85%',
  },
  adminAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary || '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.gray[400],
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  userAvatarImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginLeft: 8,
  },
  userBubble: {
    backgroundColor: '#FFF3ED',
    borderRadius: 16,
    borderTopRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexShrink: 1,
  },
  adminBubble: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexShrink: 1,
  },
  userMessageText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  adminMessageText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  attachmentImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  attachmentFile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    backgroundColor: COLORS.gray[100],
    borderRadius: 8,
  },
  attachmentFileName: {
    marginLeft: SPACING.xs,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    flex: 1,
  },
  attachIconBtn: {
    padding: 4,
    justifyContent: 'center',
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.sm,
    paddingBottom: 10,
    paddingTop: 4,
    backgroundColor: COLORS.white,
  },
  inputWrapper: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginHorizontal: 6,
    minHeight: 40,
    justifyContent: 'center',
  },
  input: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    maxHeight: 80,
    padding: 0,
  },
  sendButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.primary || '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.gray[300],
  },
  sendButtonText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.white,
  },
  titleInputContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.white,
  },
  titleErrorText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.red,
    marginBottom: 4,
  },
  titleInput: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    backgroundColor: COLORS.white,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.gray[500],
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  errorText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.error,
  },
});

export default GeneralInquiryChatScreen;

