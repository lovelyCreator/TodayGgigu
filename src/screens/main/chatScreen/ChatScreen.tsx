import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Platform,
  Modal,
  Dimensions,
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../../../components/Icon';
import { COLORS, FONTS, SHADOWS, SPACING } from '../../../constants';
import { RootStackParamList } from '../../../types';
import { launchCamera, launchImageLibrary, MediaType, ImagePickerResponse, CameraOptions, ImageLibraryOptions } from 'react-native-image-picker';
import { useAppSelector } from '../../../store/hooks';
import { requestCameraPermission, requestPhotoLibraryPermission } from '../../../utils/permissions';
import { useTranslation } from '../../../hooks/useTranslation';
import { useSocket } from '../../../context/SocketContext';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { SocketMessage, socketService } from '../../../services/socketService';
import { inquiryApi } from '../../../services/inquiryApi';
import { orderApi } from '../../../services/orderApi';

type ChatRouteProp = RouteProp<RootStackParamList, 'Chat'>;
type ChatScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Chat'>;

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  sentAt?: number; // Date.now() when user sent — for 30s recall window
  senderName?: string;
  senderId?: string;
  readBy?: string[];
  attachments?: Array<{
    type: 'image' | 'file' | 'video';
    url: string;
    name?: string;
  }>;
}

const ChatScreen: React.FC = () => {
  const route = useRoute<ChatRouteProp>();
  const navigation = useNavigation<ChatScreenNavigationProp>();
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
    isConnecting,
    connect,
    subscribeToInquiry,
    unsubscribeFromInquiry,
    sendInquiryMessage,
    markInquiryAsRead,
    createInquiry,
    getUnreadCounts,
    onInquiryCreated,
    onMessageReceived,
    onMessagesRead,
    onInquiryClosed,
  } = useSocket();
  const { showToast } = useToast();
  const { user } = useAuth();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [showMoreModal, setShowMoreModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [inquiryId, setInquiryId] = useState<string | null>(route.params?.inquiryId || null);
  const [orderNumber, setOrderNumber] = useState<string | null>(route.params?.orderNumber || null);
  const [orderData, setOrderData] = useState<any>(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Array<{ uri: string; type: string; name: string }>>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const hasFetchedInquiryRef = useRef(false);
  const messageCallbackSetRef = useRef(false);

  // Convert socket messages to local message format
  const convertSocketMessage = (socketMsg: SocketMessage): Message => {
    return {
      id: socketMsg._id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      text: socketMsg.message,
      isUser: socketMsg.senderType === 'user',
      timestamp: new Date(socketMsg.timestamp),
      senderName: socketMsg.senderName,
      senderId: socketMsg.senderId,
      readBy: socketMsg.readBy,
      attachments: socketMsg.attachments,
    };
  };

  // Note: Messages are now loaded via REST API, not from currentInquiry

  // Fetch chat history via REST API on mount
  useEffect(() => {
    console.log('[ChatScreen] Mount effect - params:', { inquiryId: route.params?.inquiryId, orderId: route.params?.orderId, orderNumber: route.params?.orderNumber });
    const fetchChatHistory = async () => {
      // If we have an inquiryId in route params, fetch that inquiry details (only once)
      if (route.params?.inquiryId && !hasFetchedInquiryRef.current) {
        hasFetchedInquiryRef.current = true;
        setIsLoading(true);
        try {
          const response = await inquiryApi.getInquiry(route.params.inquiryId);
          console.log('[ChatScreen] getInquiry response:', JSON.stringify(response).substring(0, 500));
          if (response.success && response.data?.inquiry) {
            const inquiry = response.data.inquiry;
            console.log('[ChatScreen] Inquiry loaded, id:', inquiry._id, 'messages:', inquiry.messages?.length || 0);
            setInquiryId(inquiry._id);

            // Store order data from inquiry
            if (inquiry.order) {
              setOrderData(inquiry.order);
              if (inquiry.order.orderNumber) {
                setOrderNumber(inquiry.order.orderNumber);
              }
            }

            // Convert and set messages
            if (inquiry.messages && inquiry.messages.length > 0) {
              // Sort messages by timestamp (oldest first) and convert
              const sortedMessages = [...inquiry.messages].sort((a, b) => {
                const timeA = new Date(a.timestamp).getTime();
                const timeB = new Date(b.timestamp).getTime();
                return timeA - timeB;
              });
              const convertedMessages = sortedMessages.map(convertSocketMessage);
              setMessages(convertedMessages);
              
              // Scroll to bottom after messages are loaded
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: false });
              }, 100);
            }
            
            // Subscribe to socket for new messages
            if (isConnected) {
              subscribeToInquiry(inquiry._id);
              // Mark as read via REST API
              await inquiryApi.markAsRead(inquiry._id);
            }
          } else {
            showToast(response.error || 'Failed to load chat history', 'error');
          }
        } catch (error) {
          // console.error('Error fetching inquiry:', error);
          showToast('Failed to load chat history', 'error');
        } finally {
          setIsLoading(false);
        }
      } else if (route.params?.orderId && !hasFetchedInquiryRef.current) {
        // No inquiry yet, but try to fetch existing inquiry for this order
        hasFetchedInquiryRef.current = true;
        try {
          const response = await inquiryApi.getInquiryDetailByOrderId(route.params.orderId);
          if (response.success && response.data) {
            if (response.data.order) {
              setOrderData(response.data.order);
            }
            if (response.data.inquiry) {
              setInquiryId(response.data.inquiry._id);
              if (response.data.inquiry.messages?.length > 0) {
                const sortedMessages = [...response.data.inquiry.messages].sort((a: any, b: any) =>
                  new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
                setMessages(sortedMessages.map(convertSocketMessage));
              }
            }
          }
        } catch (e) {
          console.log('[ChatScreen] No existing inquiry for order, ready to create');
        }
      }
    };

    fetchChatHistory();
  }, [route.params?.inquiryId, route.params?.orderId, isConnected, inquiryId, subscribeToInquiry, showToast]);

  // Fetch order detail data
  useEffect(() => {
    const fetchOrderDetail = async () => {
      const orderId = route.params?.orderId;
      if (!orderId || orderData) return;
      try {
        const response = await orderApi.getOrderById(orderId);
        console.log('[ChatScreen] Order detail API response:', JSON.stringify(response).substring(0, 500));
        if (response.success && response.data) {
          const order = response.data.order || response.data;
          console.log('[ChatScreen] Order detail loaded, keys:', Object.keys(order), 'items:', order.items?.length);
          setOrderData(order);
          if (order.orderNumber && !orderNumber) {
            setOrderNumber(order.orderNumber);
          }
        }
      } catch (e) {
        console.log('[ChatScreen] Failed to fetch order detail');
      }
    };
    fetchOrderDetail();
  }, [route.params?.orderId]);

  // Try socket connection once on mount
  const socketAttemptedRef = useRef(false);
  useEffect(() => {
    if (socketAttemptedRef.current) return;
    socketAttemptedRef.current = true;

    const ensureSocketConnected = async () => {
      console.log('[ChatScreen] Initial socket check - isConnected:', isConnected, 'socketService.isConnected:', socketService.isConnected());
      if (!isConnected && !isConnecting) {
        try {
          console.log('[ChatScreen] Attempting socket connection...');
          await connect();
          console.log('[ChatScreen] Socket connect() resolved, actuallyConnected:', socketService.isConnected());
        } catch (error) {
          console.warn('[ChatScreen] Socket connection failed, will use REST API:', (error as Error).message);
        }
      }
    };

    ensureSocketConnected();
  }, []);

  // Subscribe to inquiry when socket becomes connected
  useEffect(() => {
    if (isConnected && inquiryId) {
      console.log('[ChatScreen] Socket connected, subscribing to inquiry:', inquiryId);
      subscribeToInquiry(inquiryId);
      markInquiryAsRead(inquiryId);
    }
  }, [isConnected, inquiryId, subscribeToInquiry, markInquiryAsRead]);

  // Set up socket listeners for new messages
  useEffect(() => {
    if (!messageCallbackSetRef.current) {
      messageCallbackSetRef.current = true;

      // Listen for inquiry creation success
      const handleInquiryCreated = (inquiry: any) => {
        if (!inquiryId && inquiry._id) {
          setInquiryId(inquiry._id);
          setOrderNumber(inquiry.order?.orderNumber || null);
          subscribeToInquiry(inquiry._id);
          markInquiryAsRead(inquiry._id);
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
        if (data.inquiryId === inquiryId) {
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
        if (data.inquiryId === inquiryId) {
          showToast(`${data.readByName} read your messages`, 'info');
        }
      };

      // Listen for inquiry closure
      const handleInquiryClosed = (closedInquiryId: string) => {
        if (closedInquiryId === inquiryId) {
          showToast('Inquiry has been closed', 'info');
        }
      };

      onInquiryCreated(handleInquiryCreated);
      onMessageReceived(handleMessageReceived);
      onMessagesRead(handleMessagesRead);
      onInquiryClosed(handleInquiryClosed);
    }

    // Cleanup
    return () => {
      if (inquiryId) {
        unsubscribeFromInquiry(inquiryId);
      }
      // Refresh unread counts so badges update when navigating back
      getUnreadCounts();
    };
  }, [
    inquiryId,
    isConnected,
    isConnecting,
    subscribeToInquiry,
    unsubscribeFromInquiry,
    markInquiryAsRead,
    getUnreadCounts,
    onInquiryCreated,
    onMessageReceived,
    onMessagesRead,
    onInquiryClosed,
    showToast,
  ]);

  // REST API fallback for sending messages when socket is not connected
  const sendMessageViaRest = async (targetInquiryId: string, messageText: string, optimisticMessageId: string, attachments: Array<{ uri: string; type: string; name: string }> = []) => {
    try {
      console.log('[ChatScreen] Sending message via REST API, inquiryId:', targetInquiryId, 'attachments:', attachments.length);
      const response = await inquiryApi.sendMessage(targetInquiryId, messageText, attachments);
      console.log('[ChatScreen] REST sendMessage response:', JSON.stringify(response).substring(0, 300));
      if (!response.success) {
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessageId));
        showToast(response.error || t('inquiry.failedToSend'), 'error');
      }
    } catch (error) {
      console.error('[ChatScreen] REST sendMessage error:', error);
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessageId));
      showToast(t('inquiry.failedToSendRetry'), 'error');
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() && pendingAttachments.length === 0) return;

    const messageText = inputText.trim() || (pendingAttachments.length > 0 ? ' ' : '');
    const attachmentsToSend = [...pendingAttachments];

    console.log('[ChatScreen] handleSendMessage called, inquiryId:', inquiryId, 'orderId:', route.params?.orderId, 'attachments:', attachmentsToSend.length);

    // Send message to existing inquiry
    if (inquiryId) {
      setInputText('');
      setPendingAttachments([]);

      // Create optimistic message
      const optimisticMessage: Message = {
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

      setMessages(prev => [...prev, optimisticMessage]);

      // Always use REST API for reliability
      await sendMessageViaRest(inquiryId, messageText, optimisticMessage.id, attachmentsToSend);

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } else if (route.params?.orderId) {
      // No inquiry yet — create one via REST API
      setInputText('');
      setPendingAttachments([]);
      console.log('[ChatScreen] Creating new inquiry via REST API, orderId:', route.params.orderId);

      const sentMessage: Message = {
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
      setMessages(prev => [...prev, sentMessage]);

      try {
        const response = await inquiryApi.createInquiry(route.params.orderId, messageText, attachmentsToSend);
        console.log('[ChatScreen] Create inquiry REST response:', JSON.stringify(response).substring(0, 300));
        if (response.success && response.data?.inquiry) {
          const newInquiry = response.data.inquiry;
          setInquiryId(newInquiry._id);
          setOrderNumber(newInquiry.order?.orderNumber || orderNumber);
          if (newInquiry.order) {
            setOrderData(newInquiry.order);
          }

          if (newInquiry.messages && newInquiry.messages.length > 0) {
            const serverMessages = [...newInquiry.messages]
              .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
              .map(convertSocketMessage);
            setMessages(serverMessages);
          }

          if (!isConnected) {
            try { await connect(); } catch (_) {}
          }
          if (isConnected || socketService.isConnected()) {
            subscribeToInquiry(newInquiry._id);
            markInquiryAsRead(newInquiry._id);
          }
          showToast(t('inquiry.inquiryCreated'), 'success');
        } else {
          setMessages(prev => prev.filter(msg => msg.id !== sentMessage.id));
          showToast(response.error || t('inquiry.failedToCreate'), 'error');
        }
      } catch (error) {
        setMessages(prev => prev.filter(msg => msg.id !== sentMessage.id));
        showToast(t('inquiry.failedToCreateRetry'), 'error');
      }
    } else {
      showToast(t('inquiry.failedToCreateRetry'), 'error');
    }
  };

  const handleMoreOptions = () => {
    setShowMoreModal(true);
  };

  const handleCloseMoreModal = () => {
    setShowMoreModal(false);
  };

  const handleMoreOptionPress = async (option: string) => {
    // console.log(`${option} option pressed`);
    setShowMoreModal(false);
    
    if (option === 'Gallery') {
      await openGallery();
    } else if (option === 'Camera') {
      await openCamera();
    }
  };

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

  // Format date for grouping (YYYY-MM-DD)
  const formatDateForGrouping = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Format date for display (e.g., "Today", "Yesterday", "Dec 15, 2024")
  const formatDateForDisplay = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const dateStr = date.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (dateStr === todayStr) {
      return 'Today';
    } else if (dateStr === yesterdayStr) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  // Format time for display (e.g., "10:30 AM")
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Check if message is read (for user messages, check if admin has read it)
  const isMessageRead = (message: Message): boolean => {
    if (!message.isUser || !message.readBy || !user) {
      return false;
    }
    // For user messages, check if any admin has read it (readBy contains admin IDs, not user ID)
    // If readBy array has items and user's ID is not in it, it means admin has read it
    const userId = (user as any)?._id || (user as any)?.id;
    return message.readBy.length > 0 && userId && !message.readBy.includes(userId);
  };

  // Group messages by date
  const groupMessagesByDate = (messages: Message[]): Array<{ date: string; messages: Message[] }> => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach((message) => {
      const dateKey = formatDateForGrouping(message.timestamp);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });
    
    // Convert to array and sort by date (oldest first)
    return Object.keys(groups)
      .sort()
      .map((dateKey) => ({
        date: dateKey,
        messages: groups[dateKey],
      }));
  };

  const renderDateHeader = (date: string) => {
    const dateObj = new Date(date);
    return (
      <View key={`date-${date}`} style={styles.dateHeaderContainer}>
        <View style={styles.dateHeaderLine} />
        <Text style={styles.dateHeaderText}>{formatDateForDisplay(dateObj)}</Text>
        <View style={styles.dateHeaderLine} />
      </View>
    );
  };

  const formatMessageTimestamp = (date: Date): string => {
    const y = String(date.getFullYear()).slice(2);
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}/${m}/${d} ${h}:${min}`;
  };

  const renderMessage = (message: Message, showName: boolean = false) => {
    const isUser = message.isUser;
    return (
      <View key={message.id} style={isUser ? styles.userMessageContainer : styles.adminMessageContainer}>
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
                {message.attachments.map((att, idx) => (
                  <View key={`att-${idx}`} style={{ marginBottom: 4 }}>
                    {att.type === 'image' ? (
                      <Image source={{ uri: att.url }} style={{ width: 180, height: 180, borderRadius: 8 }} resizeMode="cover" />
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 6, backgroundColor: COLORS.gray[100], borderRadius: 6 }}>
                        <Icon name="document-outline" size={18} color={COLORS.gray[600]} />
                        <Text style={{ marginLeft: 6, fontSize: 12, color: COLORS.text.primary }} numberOfLines={1}>{att.name || 'File'}</Text>
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <Icon name="arrow-back" size={16} color={COLORS.black} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {t('chat.orderInquiry') || '주문문의'}{messages.length > 0 ? ` (${messages.length})` : ''}
          </Text>
        </View>
      </View>

      {/* Order Info Bar */}
      {orderNumber ? (
        <View>
          <TouchableOpacity
            style={styles.orderInfoBar}
            activeOpacity={0.7}
            onPress={() => setShowOrderDetail(!showOrderDetail)}
          >
            {(orderData?.items?.[0]?.imageUrl || orderData?.items?.[0]?.image) ? (
              <Image source={{ uri: orderData.items[0].imageUrl || orderData.items[0].image }} style={styles.orderInfoImage} />
            ) : (
              <View style={styles.orderInfoIcon}>
                <Icon name="receipt-outline" size={20} color={COLORS.primary} />
              </View>
            )}
            <View style={styles.orderInfoContent}>
              <Text style={styles.orderInfoNumber} numberOfLines={1}>{orderNumber}</Text>
              {orderData?.progressStatus ? (
                <Text style={styles.orderInfoStatus}>{orderData.progressStatus}</Text>
              ) : null}
            </View>
            <Icon name={showOrderDetail ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.gray[400]} />
          </TouchableOpacity>

          {/* Order Detail Dropdown */}
          {showOrderDetail && orderData ? (
            <View style={styles.orderDetailDropdown}>
              {orderData.items?.map((item: any, idx: number) => (
                <View key={`item-${idx}`} style={styles.orderDetailItem}>
                  {(item.imageUrl || item.image) ? (
                    <Image source={{ uri: item.imageUrl || item.image }} style={styles.orderDetailItemImage} />
                  ) : null}
                  <View style={styles.orderDetailItemInfo}>
                    <Text style={styles.orderDetailItemName} numberOfLines={2}>{item.subjectTrans || item.subject || item.productName || item.name || ''}</Text>
                    <Text style={styles.orderDetailItemMeta}>
                      {item.quantity ? `x${item.quantity}` : ''}{item.price ? `  ₩${Number(item.price).toLocaleString()}` : ''}
                    </Text>
                  </View>
                </View>
              ))}
              {orderData.totalAmount ? (
                <View style={styles.orderDetailRow}>
                  <Text style={styles.orderDetailLabel}>{t('chat.totalAmount') || '합계'}</Text>
                  <Text style={styles.orderDetailValue}>₩{Number(orderData.totalAmount).toLocaleString()}</Text>
                </View>
              ) : null}
              {/* {orderData.progressStatus ? (
                <View style={styles.orderDetailRow}>
                  <Text style={styles.orderDetailLabel}>{t('chat.orderStatus') || '주문상태'}</Text>
                  <Text style={[styles.orderDetailValue, { color: COLORS.primary }]}>{orderData.progressStatus}</Text>
                </View>
              ) : null}
              {orderData.createdAt ? (
                <View style={styles.orderDetailRow}>
                  <Text style={styles.orderDetailLabel}>{t('chat.orderDate') || '주문일'}</Text>
                  <Text style={styles.orderDetailValue}>{new Date(orderData.createdAt).toLocaleDateString()}</Text>
                </View>
              ) : null} */}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Messages + Input */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1, paddingBottom: Platform.OS === 'android' && keyboardHeight > 0 ? keyboardHeight + insets.bottom : 0 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  {inquiryId ? t('chat.noMessages') || 'No messages yet.' : t('chat.sendToCreateInquiry') || '문의할 내용을 자세히 입력해 주세요.'}
                </Text>
              </View>
            ) : (
              messages.map((message, index) => renderMessage(message))
            )}
          </ScrollView>

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

          {/* Input Area */}
          <View style={[styles.inputContainer, { paddingBottom: keyboardHeight > 0 ? 10 : 10 + insets.bottom }]}>
            <TouchableOpacity style={styles.attachIconBtn} onPress={handleMoreOptions}>
              <Icon name="image-outline" size={22} color={COLORS.gray[500]} />
            </TouchableOpacity>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder={t('chat.typeMessage')}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
                placeholderTextColor={COLORS.gray[400]}
              />
            </View>
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() && pendingAttachments.length === 0) && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() && pendingAttachments.length === 0}
            >
              <Text style={styles.sendButtonText}>
                {t('chat.send') || '전송'}
              </Text>
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
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={handleCloseMoreModal}
          >
            <View style={styles.stickbar} />
          </TouchableOpacity>
          <View style={styles.modalContainer}>
            {/* <View style={styles.modalHandle} /> */}
            <Text style={styles.modalTitle}>{t('chat.more')}</Text>
            
            <View style={styles.optionsGrid}>
              <TouchableOpacity 
                style={styles.optionButton} 
                onPress={() => handleMoreOptionPress('Gallery')}
              >
                <View style={styles.optionIcon}>
                  <Icon name="images-outline" size={24} color={COLORS.text.primary} />
                </View>
                <Text style={styles.optionText}>{t('chat.gallery')}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.optionButton} 
                onPress={() => handleMoreOptionPress('Camera')}
              >
                <View style={styles.optionIcon}>
                  <Icon name="camera-outline" size={24} color={COLORS.text.primary} />
                </View>
                <Text style={styles.optionText}>{t('chat.camera')}</Text>
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
  orderInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  orderInfoIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFF3ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  orderInfoContent: {
    flex: 1,
  },
  orderInfoImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: COLORS.gray[100],
    marginRight: 10,
  },
  orderInfoNumber: {
    fontSize: FONTS.sizes.base,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  orderInfoStatus: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.primary,
    marginTop: 2,
    fontWeight: '500',
  },
  orderDetailDropdown: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  orderDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  orderDetailItemImage: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: COLORS.gray[100],
    marginRight: 10,
  },
  orderDetailItemInfo: {
    flex: 1,
  },
  orderDetailItemName: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    lineHeight: 18,
  },
  orderDetailItemMeta: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  orderDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  orderDetailLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
  },
  orderDetailValue: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  messagesList: {
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
  attachIconBtn: {
    padding: 4,
    justifyContent: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.sm,
    paddingBottom: 10,
    paddingTop: 6,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end'
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 34, // Space for home indicator
    paddingHorizontal: SPACING.lg,
    maxHeight: '50%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.gray[300],
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  optionButton: {
    width: '24%',
    aspectRatio: 1,
    backgroundColor: COLORS.gray[50],
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    // marginBottom: SPACING.md,
    paddingVertical: SPACING.md,
  },
  optionIcon: {
    marginBottom: SPACING.sm,
  },
  optionText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  recallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.gray[100],
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  recallButtonText: {
    fontSize: 11,
    color: COLORS.gray[600],
    marginLeft: 4,
    fontWeight: '500',
  },
  stickbar: {
    width: '10%',
    height: 15,
    borderTopColor: COLORS.white,
    borderTopWidth: 3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.text.secondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyStateText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  // Date header styles
  dateHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  dateHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.gray[300],
  },
  dateHeaderText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
    marginHorizontal: SPACING.sm,
    fontWeight: '500',
  },
  // Message footer styles
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  messageFooterSeller: {
    justifyContent: 'flex-start',
  },
  messageTime: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
    marginRight: SPACING.xs,
  },
  readIcon: {
    marginLeft: SPACING.xs,
  },
});

export default ChatScreen;