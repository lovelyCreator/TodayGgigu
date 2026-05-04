import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { socketService, GeneralInquiry, SocketMessage, BroadcastNote } from '../services/socketService';
import { useAuth } from './AuthContext';
import { getStoredToken } from '../services/authApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';

interface SocketContextType {
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  // Order Inquiry Socket methods
  subscribeToInquiry: (inquiryId: string) => void;
  unsubscribeFromInquiry: (inquiryId: string) => void;
  getUnreadCounts: () => void;
  createInquiry: (orderId: string, message: string, attachments?: any[]) => void;
  sendInquiryMessage: (inquiryId: string, message: string, attachments?: any[]) => void;
  markInquiryAsRead: (inquiryId: string) => void;
  closeInquiry: (inquiryId: string) => void;
  // General Inquiry Socket methods
  subscribeToGeneralInquiry: (inquiryId: string) => void;
  unsubscribeFromGeneralInquiry: (inquiryId: string) => void;
  getGeneralInquiryUnreadCounts: () => void;
  createGeneralInquiry: (data: { subject?: string; category?: 'general' | 'support' | 'complaint' | 'suggestion' | 'technical'; message: string; attachments?: { type: 'image' | 'file' | 'video'; url: string; name?: string }[] }) => void;
  sendGeneralInquiryMessage: (inquiryId: string, message: string, attachments?: any[]) => void;
  markGeneralInquiryAsRead: (inquiryId: string) => void;
  closeGeneralInquiry: (inquiryId: string) => void;
  // State
  inquiries: GeneralInquiry[];
  currentInquiry: GeneralInquiry | null;
  unreadCount: number;
  generalInquiries: GeneralInquiry[];
  currentGeneralInquiry: GeneralInquiry | null;
  generalInquiryUnreadCount: number;
  // Order Inquiry Event handlers
  onInquiryCreated: (callback: (inquiry: GeneralInquiry) => void) => void;
  onMessageReceived: (callback: (data: { message: SocketMessage; inquiryId: string; unreadCount?: number; totalUnreadCount?: number }) => void) => void;
  onInquiryUpdated: (callback: (inquiry: GeneralInquiry) => void) => void;
  onInquiryClosed: (callback: (inquiryId: string) => void) => void;
  onMessagesRead: (callback: (data: { inquiryId: string; readBy: string; readByType: string; readByName: string; readAt: string }) => void) => void;
  onUnreadCountUpdated: (callback: (count: number) => void) => void;
  // General Inquiry Event handlers
  onGeneralInquiryCreated: (callback: (inquiry: GeneralInquiry) => void) => void;
  onGeneralInquiryMessageReceived: (callback: (data: { message: SocketMessage; inquiryId: string; unreadCount?: number; totalUnreadCount?: number }) => void) => void;
  onGeneralInquiryUpdated: (callback: (inquiry: GeneralInquiry) => void) => void;
  onGeneralInquiryClosed: (callback: (inquiryId: string) => void) => void;
  onGeneralInquiryMessagesRead: (callback: (data: { inquiryId: string; readBy: string; readByType: string; readByName: string; readAt: string }) => void) => void;
  onGeneralInquiryUnreadCountUpdated: (callback: (count: number) => void) => void;
  // Note Broadcast
  notes: BroadcastNote[];
  onNoteReceived: (callback: (note: BroadcastNote) => void) => void;
  onNoteDeleted: (callback: (noteId: string) => void) => void;
  // Remove listeners
  removeListeners: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [inquiries, setInquiries] = useState<GeneralInquiry[]>([]);
  const [currentInquiry, setCurrentInquiry] = useState<GeneralInquiry | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [generalInquiries, setGeneralInquiries] = useState<GeneralInquiry[]>([]);
  const [currentGeneralInquiry, setCurrentGeneralInquiry] = useState<GeneralInquiry | null>(null);
  const [generalInquiryUnreadCount, setGeneralInquiryUnreadCount] = useState(0);
  const [notes, setNotes] = useState<BroadcastNote[]>([]);
  
  // Callback refs for note event handlers
  const onNoteReceivedCallbackRef = React.useRef<((note: BroadcastNote) => void) | null>(null);
  const onNoteDeletedCallbackRef = React.useRef<((noteId: string) => void) | null>(null);
  
  // Callback refs for order inquiry event handlers
  const onInquiryCreatedCallbackRef = React.useRef<((inquiry: GeneralInquiry) => void) | null>(null);
  const onMessageReceivedCallbackRef = React.useRef<((data: { message: SocketMessage; inquiryId: string; unreadCount?: number; totalUnreadCount?: number }) => void) | null>(null);
  const onInquiryUpdatedCallbackRef = React.useRef<((inquiry: GeneralInquiry) => void) | null>(null);
  const onInquiryClosedCallbackRef = React.useRef<((inquiryId: string) => void) | null>(null);
  const onUnreadCountUpdatedCallbackRef = React.useRef<((count: number) => void) | null>(null);
  const onMessagesReadCallbackRef = React.useRef<((data: { inquiryId: string; readBy: string; readByType: string; readByName: string; readAt: string }) => void) | null>(null);
  
  // Callback refs for general inquiry event handlers
  const onGeneralInquiryCreatedCallbackRef = React.useRef<((inquiry: GeneralInquiry) => void) | null>(null);
  const onGeneralInquiryMessageReceivedCallbackRef = React.useRef<((data: { message: SocketMessage; inquiryId: string; unreadCount?: number; totalUnreadCount?: number }) => void) | null>(null);
  const onGeneralInquiryUpdatedCallbackRef = React.useRef<((inquiry: GeneralInquiry) => void) | null>(null);
  const onGeneralInquiryClosedCallbackRef = React.useRef<((inquiryId: string) => void) | null>(null);
  const onGeneralInquiryUnreadCountUpdatedCallbackRef = React.useRef<((count: number) => void) | null>(null);
  const onGeneralInquiryMessagesReadCallbackRef = React.useRef<((data: { inquiryId: string; readBy: string; readByType: string; readByName: string; readAt: string }) => void) | null>(null);

  // Connect socket when authenticated
  const connect = useCallback(async () => {
    if (!isAuthenticated || !user) {
      console.log('[Socket] Not authenticated, skipping socket connection');
      return;
    }

    if (socketService.isConnected()) {
      console.log('[Socket] Already connected');
      setIsConnected(true);
      return;
    }

    if (isConnecting) {
      console.log('[Socket] Connection already in progress');
      return;
    }

    try {
      setIsConnecting(true);
      console.log('[Socket] Connecting...');
      const token = await getStoredToken();

      if (!token) {
        console.warn('[Socket] No token available for socket connection');
        setIsConnecting(false);
        return;
      }

      await socketService.connect(token);
      const actuallyConnected = socketService.isConnected();
      setIsConnected(actuallyConnected);
      setIsConnecting(false);
      console.log('[Socket] connect() resolved, actuallyConnected:', actuallyConnected);

      // Set up event listeners (even if not connected yet, for auto-reconnect)
      setupEventListeners();
    } catch (error) {
      console.error('[Socket] Failed to connect:', error);
      setIsConnecting(false);
      setIsConnected(false);
    }
  }, [isAuthenticated, user]);

  // Disconnect socket
  const disconnect = useCallback(() => {
    socketService.disconnect();
    setIsConnected(false);
    setInquiries([]);
    setCurrentInquiry(null);
    setUnreadCount(0);
    setGeneralInquiries([]);
    setCurrentGeneralInquiry(null);
    setGeneralInquiryUnreadCount(0);
    setNotes([]);
  }, []);

  // ========== Order Inquiry Socket Methods ==========
  
  const subscribeToInquiry = useCallback((inquiryId: string) => {
    console.log('[Socket][OrderInquiry] Subscribing to inquiry:', inquiryId);
    socketService.subscribeToInquiry(inquiryId);
  }, []);

  const unsubscribeFromInquiry = useCallback((inquiryId: string) => {
    console.log('[Socket][OrderInquiry] Unsubscribing from inquiry:', inquiryId);
    socketService.unsubscribeFromInquiry(inquiryId);
  }, []);

  const getUnreadCounts = useCallback(() => {
    console.log('[Socket][OrderInquiry] Getting unread counts');
    socketService.getUnreadCounts();
  }, []);

  const createInquiry = useCallback((orderId: string, message: string, attachments?: any[]) => {
    console.log('[Socket][OrderInquiry] Creating inquiry via socket:', { orderId, message: message.substring(0, 50) });
    socketService.createInquiry(orderId, message, attachments);
  }, []);

  const sendInquiryMessage = useCallback((inquiryId: string, message: string, attachments?: any[]) => {
    console.log('[Socket][OrderInquiry] Sending message:', { inquiryId, message: message.substring(0, 50), socketConnected: socketService.isConnected() });
    socketService.sendMessage(inquiryId, message, attachments);
  }, []);

  const markInquiryAsRead = useCallback((inquiryId: string) => {
    console.log('[Socket][OrderInquiry] Marking as read:', inquiryId);
    socketService.markInquiryAsRead(inquiryId);
  }, []);

  const closeInquiry = useCallback((inquiryId: string) => {
    console.log('[Socket][OrderInquiry] Closing inquiry:', inquiryId);
    socketService.closeInquiry(inquiryId);
  }, []);

  // ========== General Inquiry Socket Methods ==========

  const subscribeToGeneralInquiry = useCallback((inquiryId: string) => {
    socketService.subscribeToGeneralInquiry(inquiryId);
  }, []);

  const unsubscribeFromGeneralInquiry = useCallback((inquiryId: string) => {
    socketService.unsubscribeFromGeneralInquiry(inquiryId);
  }, []);

  const getGeneralInquiryUnreadCounts = useCallback(() => {
    socketService.getGeneralInquiryUnreadCounts();
  }, []);

  const createGeneralInquiry = useCallback((data: { subject?: string; category?: 'general' | 'support' | 'complaint' | 'suggestion' | 'technical'; message: string; attachments?: { type: 'image' | 'file' | 'video'; url: string; name?: string }[] }) => {
    socketService.createGeneralInquiry(data);
  }, []);

  const sendGeneralInquiryMessage = useCallback((inquiryId: string, message: string, attachments?: any[]) => {
    socketService.sendGeneralInquiryMessage(inquiryId, message, attachments);
  }, []);

  const markGeneralInquiryAsRead = useCallback((inquiryId: string) => {
    socketService.markGeneralInquiryAsRead(inquiryId);
  }, []);

  const closeGeneralInquiry = useCallback((inquiryId: string) => {
    socketService.closeGeneralInquiry(inquiryId);
  }, []);

  // Set up event listeners
  const setupEventListeners = useCallback(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    // Connection status
    socket.on('connect', () => {
      console.log('[Socket] Connected in context');
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected in context, reason:', reason);
      setIsConnected(false);
    });

    // Socket Events - Real-time updates (Server → Client)
    // Note: Create, send, list, get, mark-read, close should use REST API

    // Subscribe/Unsubscribe success
    socket.on('user:inquiry:subscribe:success', (data: { inquiryId: string; message: string }) => {
      console.log('[Socket][OrderInquiry] Subscribe success:', data.inquiryId);
    });

    socket.on('user:inquiry:unsubscribe:success', (data: { inquiryId: string; message: string }) => {
      console.log('[Socket][OrderInquiry] Unsubscribe success:', data.inquiryId);
    });

    // Unread counts response
    socket.on('user:inquiry:unread-counts:response', (data: { totalUnread: number; inquiries: Array<{ inquiryId: string; unreadCount: number }> }) => {
      // console.log('Unread counts:', data);
      setUnreadCount(data.totalUnread);
      if (onUnreadCountUpdatedCallbackRef.current) {
        onUnreadCountUpdatedCallbackRef.current(data.totalUnread);
      }
    });

    // Real-time events - User receives from server
    socket.on('user:inquiry:message:received', (data: {
      message: SocketMessage;
      inquiryId: string;
      unreadCount?: number;
      totalUnreadCount?: number;
    }) => {
      console.log('[Socket][OrderInquiry] Message received:', {
        inquiryId: data.inquiryId,
        messageId: data.message?._id,
        messageText: data.message?.message?.substring(0, 50) || 'N/A',
        senderType: data.message?.senderType,
        unreadCount: data.unreadCount,
        totalUnreadCount: data.totalUnreadCount,
      });
      
      if (data.totalUnreadCount !== undefined) {
        // console.log(`📊 SocketContext: Updating total unread count to ${data.totalUnreadCount}`);
        setUnreadCount(data.totalUnreadCount);
      }
      
      // Save unread count for this inquiry to AsyncStorage (even when BuyListScreen is not open)
      if (data.inquiryId && data.unreadCount !== undefined) {
        AsyncStorage.getItem(STORAGE_KEYS.INQUIRY_UNREAD_COUNTS)
          .then((savedData) => {
            const savedCounts: { [inquiryId: string]: number } = savedData ? JSON.parse(savedData) : {};
            savedCounts[data.inquiryId] = data.unreadCount!;
            return AsyncStorage.setItem(STORAGE_KEYS.INQUIRY_UNREAD_COUNTS, JSON.stringify(savedCounts));
          })
          .then(() => {
            // console.log(`💾 SocketContext: Saved unread count for inquiry ${data.inquiryId} to AsyncStorage`);
          })
          .catch((error) => {
            // console.error('SocketContext: Failed to save unread count:', error);
          });
      }
      
      if (onMessageReceivedCallbackRef.current) {
        // console.log('✅ SocketContext: Calling onMessageReceived callback');
        onMessageReceivedCallbackRef.current({
          message: data.message,
          inquiryId: data.inquiryId,
          unreadCount: data.unreadCount,
          totalUnreadCount: data.totalUnreadCount,
        });
      } else {
        // console.warn('⚠️ SocketContext: No onMessageReceived callback registered');
      }
    });

    socket.on('user:inquiry:messages-read', (data: {
      inquiryId: string;
      readBy: string;
      readByType: string;
      readByName: string;
      readAt: string;
    }) => {
      console.log('[Socket][OrderInquiry] Messages read:', { inquiryId: data.inquiryId, readBy: data.readByName });
      if (onMessagesReadCallbackRef.current) {
        onMessagesReadCallbackRef.current(data);
      }
    });

    // Create order inquiry success (user-initiated)
    socket.on('user:inquiry:create:success', (data: { inquiry: GeneralInquiry }) => {
      console.log('[Socket][OrderInquiry] Create success:', { inquiryId: data.inquiry?._id, orderId: data.inquiry?.order?._id });
      setInquiries(prev => [data.inquiry, ...prev]);
      if (onInquiryCreatedCallbackRef.current) {
        onInquiryCreatedCallbackRef.current(data.inquiry);
      }
    });

    socket.on('user:inquiry:new', (data: { inquiry: GeneralInquiry }) => {
      console.log('[Socket][OrderInquiry] New inquiry from admin:', { inquiryId: data.inquiry?._id });
      setInquiries(prev => [data.inquiry, ...prev]);
      if (onInquiryCreatedCallbackRef.current) {
        onInquiryCreatedCallbackRef.current(data.inquiry);
      }
    });

    socket.on('user:inquiry:closed', (data: { inquiryId: string; status: string }) => {
      console.log('[Socket][OrderInquiry] Inquiry closed:', data.inquiryId);
      setInquiries(prev => 
        prev.map(inq => inq._id === data.inquiryId ? { ...inq, status: 'closed' as const } : inq)
      );
      if (onInquiryClosedCallbackRef.current) {
        onInquiryClosedCallbackRef.current(data.inquiryId);
      }
    });

    socket.on('user:inquiry:reopened', (data: { inquiryId: string; status: string }) => {
      // console.log('Inquiry reopened:', data.inquiryId);
      setInquiries(prev => 
        prev.map(inq => inq._id === data.inquiryId ? { ...inq, status: 'open' as const } : inq)
      );
    });

    socket.on('inquiry:admin-assigned', (data: { 
      inquiryId: string; 
      assignedAdmin: { _id: string; name: string };
    }) => {
      // console.log('Admin assigned to inquiry:', data);
      setInquiries(prev => 
        prev.map(inq => inq._id === data.inquiryId ? { 
          ...inq, 
          assignedAdmin: { 
            _id: data.assignedAdmin._id,
            name: data.assignedAdmin.name,
            email: inq.assignedAdmin?.email || '' 
          } 
        } : inq)
      );
    });

    // ========== General Inquiry Events ==========
    
    // Subscribe/Unsubscribe success
    socket.on('user:general-inquiry:subscribe:success', (data: { inquiryId: string; message: string }) => {
      // console.log('Subscribed to general inquiry:', data.inquiryId);
    });

    socket.on('user:general-inquiry:unsubscribe:success', (data: { inquiryId: string; message: string }) => {
      // console.log('Unsubscribed from general inquiry:', data.inquiryId);
    });

    // Unread counts response
    socket.on('user:general-inquiry:unread-counts:response', (data: { totalUnread: number; inquiries: Array<{ inquiryId: string; unreadCount: number }> }) => {
      // console.log('General inquiry unread counts:', data);
      setGeneralInquiryUnreadCount(data.totalUnread);
      if (onGeneralInquiryUnreadCountUpdatedCallbackRef.current) {
        onGeneralInquiryUnreadCountUpdatedCallbackRef.current(data.totalUnread);
      }
    });

    socket.on('user:general-inquiry:unread-count:response', (data: { count: number }) => {
      // console.log('General inquiry total unread count:', data.count);
      setGeneralInquiryUnreadCount(data.count);
      if (onGeneralInquiryUnreadCountUpdatedCallbackRef.current) {
        onGeneralInquiryUnreadCountUpdatedCallbackRef.current(data.count);
      }
    });

    // Create inquiry success
    socket.on('user:general-inquiry:create:success', (data: { inquiry: GeneralInquiry }) => {
      // console.log('General inquiry created:', data.inquiry);
      setGeneralInquiries(prev => [data.inquiry, ...prev]);
      if (onGeneralInquiryCreatedCallbackRef.current) {
        onGeneralInquiryCreatedCallbackRef.current(data.inquiry);
      }
    });

    // Send message success
    socket.on('user:general-inquiry:message:success', (data: { inquiry: GeneralInquiry }) => {
      // console.log('General inquiry message sent:', data.inquiry);
      setGeneralInquiries(prev => 
        prev.map(inq => inq._id === data.inquiry._id ? data.inquiry : inq)
      );
      if (currentGeneralInquiry?._id === data.inquiry._id) {
        setCurrentGeneralInquiry(data.inquiry);
      }
    });

    // Get inquiry response
    socket.on('user:general-inquiry:get:response', (data: { inquiry: GeneralInquiry }) => {
      // console.log('General inquiry fetched:', data.inquiry);
      setCurrentGeneralInquiry(data.inquiry);
      setGeneralInquiries(prev => {
        const existing = prev.find(inq => inq._id === data.inquiry._id);
        if (existing) {
          return prev.map(inq => inq._id === data.inquiry._id ? data.inquiry : inq);
        }
        return [data.inquiry, ...prev];
      });
    });

    // Get inquiries list response
    socket.on('user:general-inquiry:list:response', (data: { inquiries: GeneralInquiry[] }) => {
      // console.log('General inquiries list:', data.inquiries);
      setGeneralInquiries(data.inquiries);
    });

    // Mark read success
    socket.on('user:general-inquiry:mark-read:success', (data: { inquiryId: string; inquiry: GeneralInquiry }) => {
      // console.log('General inquiry marked as read:', data.inquiryId);
      setGeneralInquiries(prev => 
        prev.map(inq => inq._id === data.inquiryId ? data.inquiry : inq)
      );
      if (currentGeneralInquiry?._id === data.inquiryId) {
        setCurrentGeneralInquiry(data.inquiry);
      }
    });

    // Close inquiry success
    socket.on('user:general-inquiry:close:success', (data: { inquiry: GeneralInquiry }) => {
      // console.log('General inquiry closed:', data.inquiry._id);
      setGeneralInquiries(prev => 
        prev.map(inq => inq._id === data.inquiry._id ? data.inquiry : inq)
      );
      if (onGeneralInquiryClosedCallbackRef.current) {
        onGeneralInquiryClosedCallbackRef.current(data.inquiry._id);
      }
    });

    // Real-time events - User receives from server
    socket.on('user:general-inquiry:message:received', (data: { 
      message: SocketMessage; 
      inquiryId: string; 
      unreadCount?: number; 
      totalUnreadCount?: number;
    }) => {
      // console.log('🔔 General inquiry message received:', {
      //   inquiryId: data.inquiryId,
      //   messageId: data.message?._id,
      //   messageText: data.message?.message || 'N/A',
      //   senderType: data.message?.senderType,
      //   unreadCount: data.unreadCount,
      //   totalUnreadCount: data.totalUnreadCount,
      // });
      
      if (data.totalUnreadCount !== undefined) {
        setGeneralInquiryUnreadCount(data.totalUnreadCount);
      }
      
      // Update inquiry with new message
      setGeneralInquiries(prev => 
        prev.map(inq => {
          if (inq._id === data.inquiryId) {
            return {
              ...inq,
              messages: [...inq.messages, data.message],
              lastMessageAt: data.message.timestamp,
              unreadCount: data.unreadCount,
            };
          }
          return inq;
        })
      );
      
      if (currentGeneralInquiry?._id === data.inquiryId) {
        setCurrentGeneralInquiry(prev => prev ? {
          ...prev,
          messages: [...prev.messages, data.message],
          lastMessageAt: data.message.timestamp,
        } : null);
      }
      
      if (onGeneralInquiryMessageReceivedCallbackRef.current) {
        onGeneralInquiryMessageReceivedCallbackRef.current({
          message: data.message,
          inquiryId: data.inquiryId,
          unreadCount: data.unreadCount,
          totalUnreadCount: data.totalUnreadCount,
        });
      }
    });

    socket.on('user:general-inquiry:messages-read', (data: { 
      inquiryId: string; 
      readBy: string; 
      readByType: string; 
      readByName: string; 
      readAt: string;
    }) => {
      // console.log('Admin read general inquiry messages:', data);
      if (onGeneralInquiryMessagesReadCallbackRef.current) {
        onGeneralInquiryMessagesReadCallbackRef.current(data);
      }
    });

    socket.on('user:general-inquiry:new', (data: { inquiry: GeneralInquiry }) => {
      // console.log('New general inquiry created by admin:', data.inquiry);
      setGeneralInquiries(prev => [data.inquiry, ...prev]);
      if (onGeneralInquiryCreatedCallbackRef.current) {
        onGeneralInquiryCreatedCallbackRef.current(data.inquiry);
      }
    });

    socket.on('user:general-inquiry:closed', (data: { inquiryId: string; status: string }) => {
      // console.log('General inquiry closed:', data.inquiryId);
      setGeneralInquiries(prev => 
        prev.map(inq => inq._id === data.inquiryId ? { ...inq, status: 'closed' as const } : inq)
      );
      if (onGeneralInquiryClosedCallbackRef.current) {
        onGeneralInquiryClosedCallbackRef.current(data.inquiryId);
      }
    });

    socket.on('user:general-inquiry:reopened', (data: { inquiryId: string; status: string }) => {
      // console.log('General inquiry reopened:', data.inquiryId);
      setGeneralInquiries(prev => 
        prev.map(inq => inq._id === data.inquiryId ? { ...inq, status: 'open' as const } : inq)
      );
    });

    socket.on('general-inquiry:admin-assigned', (data: { 
      inquiryId: string; 
      assignedAdmin: { _id: string; name: string };
    }) => {
      // console.log('Admin assigned to general inquiry:', data);
      setGeneralInquiries(prev => 
        prev.map(inq => inq._id === data.inquiryId ? { 
          ...inq, 
          assignedAdmin: { 
            _id: data.assignedAdmin._id,
            name: data.assignedAdmin.name,
            email: inq.assignedAdmin?.email || '' 
          } 
        } : inq)
      );
    });

    // ========== Note Broadcast Events ==========
    
    // Receive note broadcast
    socket.on('note:broadcast', (note: BroadcastNote) => {
      // console.log('📢 Note broadcast received:', note);
      
      // Check if note is for users (targetAudience is 'all' or 'users')
      if (note.targetAudience === 'all' || note.targetAudience === 'users') {
        // Check if note has expired
        if (note.expiresAt) {
          const expiresAt = new Date(note.expiresAt);
          const now = new Date();
          if (now > expiresAt) {
            // console.log('Note has expired, ignoring:', note.noteId);
            return;
          }
        }
        
        // Add note to state (replace if exists)
        setNotes(prev => {
          const existingIndex = prev.findIndex(n => n.noteId === note.noteId);
          if (existingIndex >= 0) {
            // Update existing note
            const updated = [...prev];
            updated[existingIndex] = note;
            return updated;
          } else {
            // Add new note
            return [note, ...prev];
          }
        });
        
        // Call callback if registered
        if (onNoteReceivedCallbackRef.current) {
          onNoteReceivedCallbackRef.current(note);
        }
      }
    });

    // Receive note deletion notification
    socket.on('note:deleted', (data: { noteId: string }) => {
      // console.log('🗑️ Note deleted:', data.noteId);
      
      // Remove note from state
      setNotes(prev => prev.filter(n => n.noteId !== data.noteId));
      
      // Call callback if registered
      if (onNoteDeletedCallbackRef.current) {
        onNoteDeletedCallbackRef.current(data.noteId);
      }
    });

    // Error events
    socket.on('user:inquiry:create:error', (data: { message: string; code: string }) => {
      console.error('[Socket][OrderInquiry] Create error:', data);
    });

    socket.on('user:general-inquiry:create:error', (data: { message: string; code: string }) => {
      // console.error('General inquiry create error:', data);
    });

    socket.on('user:general-inquiry:message:error', (data: { message: string; code: string }) => {
      // console.error('General inquiry message error:', data);
    });

    socket.on('user:general-inquiry:list:error', (data: { message: string; code: string }) => {
      // console.error('General inquiry list error:', data);
    });

    socket.on('user:general-inquiry:get:error', (data: { message: string; code: string }) => {
      // console.error('General inquiry get error:', data);
    });
  }, []);

  // Remove all listeners
  const removeListeners = useCallback(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    socket.removeAllListeners('connect');
    socket.removeAllListeners('disconnect');
    // Order inquiry listeners
    socket.removeAllListeners('user:inquiry:subscribe:success');
    socket.removeAllListeners('user:inquiry:unsubscribe:success');
    socket.removeAllListeners('user:inquiry:unread-counts:response');
    socket.removeAllListeners('user:inquiry:message:received');
    socket.removeAllListeners('user:inquiry:messages-read');
    socket.removeAllListeners('user:inquiry:create:success');
    socket.removeAllListeners('user:inquiry:create:error');
    socket.removeAllListeners('user:inquiry:new');
    socket.removeAllListeners('user:inquiry:closed');
    socket.removeAllListeners('user:inquiry:reopened');
    socket.removeAllListeners('inquiry:admin-assigned');
    // General inquiry listeners
    socket.removeAllListeners('user:general-inquiry:subscribe:success');
    socket.removeAllListeners('user:general-inquiry:unsubscribe:success');
    socket.removeAllListeners('user:general-inquiry:unread-counts:response');
    socket.removeAllListeners('user:general-inquiry:unread-count:response');
    socket.removeAllListeners('user:general-inquiry:create:success');
    socket.removeAllListeners('user:general-inquiry:message:success');
    socket.removeAllListeners('user:general-inquiry:get:response');
    socket.removeAllListeners('user:general-inquiry:list:response');
    socket.removeAllListeners('user:general-inquiry:mark-read:success');
    socket.removeAllListeners('user:general-inquiry:close:success');
    socket.removeAllListeners('user:general-inquiry:message:received');
    socket.removeAllListeners('user:general-inquiry:messages-read');
    socket.removeAllListeners('user:general-inquiry:new');
    socket.removeAllListeners('user:general-inquiry:closed');
    socket.removeAllListeners('user:general-inquiry:reopened');
    socket.removeAllListeners('general-inquiry:admin-assigned');
    socket.removeAllListeners('user:general-inquiry:create:error');
    socket.removeAllListeners('user:general-inquiry:message:error');
    socket.removeAllListeners('user:general-inquiry:list:error');
    socket.removeAllListeners('user:general-inquiry:get:error');
    // Note broadcast listeners
    socket.removeAllListeners('note:broadcast');
    socket.removeAllListeners('note:deleted');
  }, []);

  // Connect on mount and when auth state changes
  useEffect(() => {
    if (isAuthenticated && user) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      if (!isAuthenticated) {
        disconnect();
        removeListeners();
      }
    };
  }, [isAuthenticated, user, connect, disconnect, removeListeners]);


  // Event handler registration (for custom callbacks)
  const onInquiryCreated = useCallback((callback: (inquiry: GeneralInquiry) => void) => {
    onInquiryCreatedCallbackRef.current = callback;
  }, []);

  const onMessageReceived = useCallback((callback: (data: { message: SocketMessage; inquiryId: string; unreadCount?: number; totalUnreadCount?: number }) => void) => {
    onMessageReceivedCallbackRef.current = callback;
  }, []);

  const onInquiryUpdated = useCallback((callback: (inquiry: GeneralInquiry) => void) => {
    onInquiryUpdatedCallbackRef.current = callback;
  }, []);

  const onInquiryClosed = useCallback((callback: (inquiryId: string) => void) => {
    onInquiryClosedCallbackRef.current = callback;
  }, []);

  const onMessagesRead = useCallback((callback: (data: { inquiryId: string; readBy: string; readByType: string; readByName: string; readAt: string }) => void) => {
    onMessagesReadCallbackRef.current = callback;
  }, []);

  const onUnreadCountUpdated = useCallback((callback: (count: number) => void) => {
    onUnreadCountUpdatedCallbackRef.current = callback;
  }, []);

  // General Inquiry Event handler registration
  const onGeneralInquiryCreated = useCallback((callback: (inquiry: GeneralInquiry) => void) => {
    onGeneralInquiryCreatedCallbackRef.current = callback;
  }, []);

  const onGeneralInquiryMessageReceived = useCallback((callback: (data: { message: SocketMessage; inquiryId: string; unreadCount?: number; totalUnreadCount?: number }) => void) => {
    onGeneralInquiryMessageReceivedCallbackRef.current = callback;
  }, []);

  const onGeneralInquiryUpdated = useCallback((callback: (inquiry: GeneralInquiry) => void) => {
    onGeneralInquiryUpdatedCallbackRef.current = callback;
  }, []);

  const onGeneralInquiryClosed = useCallback((callback: (inquiryId: string) => void) => {
    onGeneralInquiryClosedCallbackRef.current = callback;
  }, []);

  const onGeneralInquiryMessagesRead = useCallback((callback: (data: { inquiryId: string; readBy: string; readByType: string; readByName: string; readAt: string }) => void) => {
    onGeneralInquiryMessagesReadCallbackRef.current = callback;
  }, []);

  const onGeneralInquiryUnreadCountUpdated = useCallback((callback: (count: number) => void) => {
    onGeneralInquiryUnreadCountUpdatedCallbackRef.current = callback;
  }, []);

  // Note Broadcast Event handlers
  const onNoteReceived = useCallback((callback: (note: BroadcastNote) => void) => {
    onNoteReceivedCallbackRef.current = callback;
  }, []);

  const onNoteDeleted = useCallback((callback: (noteId: string) => void) => {
    onNoteDeletedCallbackRef.current = callback;
  }, []);

  const value: SocketContextType = {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    subscribeToInquiry,
    unsubscribeFromInquiry,
    getUnreadCounts,
    createInquiry,
    sendInquiryMessage,
    markInquiryAsRead,
    closeInquiry,
    subscribeToGeneralInquiry,
    unsubscribeFromGeneralInquiry,
    getGeneralInquiryUnreadCounts,
    createGeneralInquiry,
    sendGeneralInquiryMessage,
    markGeneralInquiryAsRead,
    closeGeneralInquiry,
    inquiries,
    currentInquiry,
    unreadCount,
    generalInquiries,
    currentGeneralInquiry,
    generalInquiryUnreadCount,
    onInquiryCreated,
    onMessageReceived,
    onInquiryUpdated,
    onInquiryClosed,
    onMessagesRead,
    onUnreadCountUpdated,
    onGeneralInquiryCreated,
    onGeneralInquiryMessageReceived,
    onGeneralInquiryUpdated,
    onGeneralInquiryClosed,
    onGeneralInquiryMessagesRead,
    onGeneralInquiryUnreadCountUpdated,
    notes,
    onNoteReceived,
    onNoteDeleted,
    removeListeners,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

