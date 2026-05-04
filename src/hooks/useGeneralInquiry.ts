import { useState, useCallback, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { socketService, GeneralInquiry, SocketMessage } from '../services/socketService';
import { useToast } from '../context/ToastContext';

interface UseGeneralInquiryOptions {
  inquiryId?: string;
  autoFetch?: boolean;
}

export const useGeneralInquiry = (options: UseGeneralInquiryOptions = {}) => {
  const { inquiryId, autoFetch = false } = options;
  const {
    isConnected,
    subscribeToGeneralInquiry,
    unsubscribeFromGeneralInquiry,
    getGeneralInquiryUnreadCounts,
    onGeneralInquiryMessageReceived,
    onGeneralInquiryCreated,
    onGeneralInquiryClosed,
    generalInquiryUnreadCount,
  } = useSocket();
  const { showToast } = useToast();
  
  const [inquiry, setInquiry] = useState<GeneralInquiry | null>(null);
  const [inquiries, setInquiries] = useState<GeneralInquiry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const hasSubscribedRef = useRef(false);

  // Create general inquiry
  const createInquiry = useCallback(async (data: {
    subject?: string;
    category?: 'general' | 'support' | 'complaint' | 'suggestion' | 'technical';
    message: string;
    attachments?: Array<{
      type: 'image' | 'file' | 'video';
      url: string;
      name?: string;
    }>;
  }): Promise<GeneralInquiry | null> => {
    return new Promise((resolve, reject) => {
      if (!isConnected) {
        showToast('Not connected to server. Please try again.', 'error');
        reject(new Error('Not connected'));
        return;
      }

      setIsLoading(true);
      
      // Set up one-time listener for success
      const successHandler = (response: { inquiry: GeneralInquiry }) => {
        socketService.getSocket()?.off('user:general-inquiry:create:success', successHandler);
        socketService.getSocket()?.off('user:general-inquiry:create:error', errorHandler);
        setInquiry(response.inquiry);
        setInquiries(prev => [response.inquiry, ...prev]);
        setIsLoading(false);
        showToast('Inquiry created successfully', 'success');
        resolve(response.inquiry);
      };

      const errorHandler = (error: { message: string; code: string }) => {
        socketService.getSocket()?.off('user:general-inquiry:create:success', successHandler);
        socketService.getSocket()?.off('user:general-inquiry:create:error', errorHandler);
        setIsLoading(false);
        showToast(error.message || 'Failed to create inquiry', 'error');
        reject(new Error(error.message));
      };

      socketService.getSocket()?.once('user:general-inquiry:create:success', successHandler);
      socketService.getSocket()?.once('user:general-inquiry:create:error', errorHandler);
      
      socketService.createGeneralInquiry(data);
    });
  }, [isConnected, showToast]);

  // Get single inquiry
  const getInquiry = useCallback(async (id: string): Promise<GeneralInquiry | null> => {
    return new Promise((resolve, reject) => {
      if (!isConnected) {
        showToast('Not connected to server. Please try again.', 'error');
        reject(new Error('Not connected'));
        return;
      }

      setIsLoading(true);
      
      const successHandler = (response: { inquiry: GeneralInquiry }) => {
        socketService.getSocket()?.off('user:general-inquiry:get:response', successHandler);
        socketService.getSocket()?.off('user:general-inquiry:get:error', errorHandler);
        setInquiry(response.inquiry);
        setIsLoading(false);
        resolve(response.inquiry);
      };

      const errorHandler = (error: { message: string; code: string }) => {
        socketService.getSocket()?.off('user:general-inquiry:get:response', successHandler);
        socketService.getSocket()?.off('user:general-inquiry:get:error', errorHandler);
        setIsLoading(false);
        showToast(error.message || 'Failed to fetch inquiry', 'error');
        reject(new Error(error.message));
      };

      socketService.getSocket()?.once('user:general-inquiry:get:response', successHandler);
      socketService.getSocket()?.once('user:general-inquiry:get:error', errorHandler);
      
      socketService.getGeneralInquiry(id);
    });
  }, [isConnected, showToast]);

  // Get inquiries list
  const getInquiriesList = useCallback(async (status?: 'open' | 'closed' | 'resolved'): Promise<GeneralInquiry[]> => {
    return new Promise((resolve, reject) => {
      if (!isConnected) {
        showToast('Not connected to server. Please try again.', 'error');
        reject(new Error('Not connected'));
        return;
      }

      setIsLoading(true);
      
      const successHandler = (response: { inquiries: GeneralInquiry[] }) => {
        socketService.getSocket()?.off('user:general-inquiry:list:response', successHandler);
        socketService.getSocket()?.off('user:general-inquiry:list:error', errorHandler);
        setInquiries(response.inquiries);
        setIsLoading(false);
        resolve(response.inquiries);
      };

      const errorHandler = (error: { message: string; code: string }) => {
        socketService.getSocket()?.off('user:general-inquiry:list:response', successHandler);
        socketService.getSocket()?.off('user:general-inquiry:list:error', errorHandler);
        setIsLoading(false);
        showToast(error.message || 'Failed to fetch inquiries', 'error');
        reject(new Error(error.message));
      };

      socketService.getSocket()?.once('user:general-inquiry:list:response', successHandler);
      socketService.getSocket()?.once('user:general-inquiry:list:error', errorHandler);
      
      socketService.getGeneralInquiryList(status);
    });
  }, [isConnected, showToast]);

  // Send message
  const sendMessage = useCallback(async (
    id: string,
    message: string,
    attachments?: Array<{
      type: 'image' | 'file' | 'video';
      url: string;
      name?: string;
    }>
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!isConnected) {
        showToast('Not connected to server. Please try again.', 'error');
        reject(new Error('Not connected'));
        return;
      }

      const successHandler = (response: { inquiry: GeneralInquiry }) => {
        socketService.getSocket()?.off('user:general-inquiry:message:success', successHandler);
        socketService.getSocket()?.off('user:general-inquiry:message:error', errorHandler);
        setInquiry(response.inquiry);
        setInquiries(prev => 
          prev.map(inq => inq._id === response.inquiry._id ? response.inquiry : inq)
        );
        resolve();
      };

      const errorHandler = (error: { message: string; code: string }) => {
        socketService.getSocket()?.off('user:general-inquiry:message:success', successHandler);
        socketService.getSocket()?.off('user:general-inquiry:message:error', errorHandler);
        showToast(error.message || 'Failed to send message', 'error');
        reject(new Error(error.message));
      };

      socketService.getSocket()?.once('user:general-inquiry:message:success', successHandler);
      socketService.getSocket()?.once('user:general-inquiry:message:error', errorHandler);
      
      socketService.sendGeneralInquiryMessage(id, message, attachments);
    });
  }, [isConnected, showToast]);

  // Mark as read
  const markAsRead = useCallback(async (id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!isConnected) {
        reject(new Error('Not connected'));
        return;
      }

      const successHandler = (response: { inquiryId: string; inquiry: GeneralInquiry }) => {
        socketService.getSocket()?.off('user:general-inquiry:mark-read:success', successHandler);
        setInquiry(response.inquiry);
        setInquiries(prev => 
          prev.map(inq => inq._id === response.inquiryId ? response.inquiry : inq)
        );
        resolve();
      };

      socketService.getSocket()?.once('user:general-inquiry:mark-read:success', successHandler);
      
      socketService.markGeneralInquiryRead(id);
    });
  }, [isConnected]);

  // Close inquiry
  const closeInquiry = useCallback(async (id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!isConnected) {
        showToast('Not connected to server. Please try again.', 'error');
        reject(new Error('Not connected'));
        return;
      }

      const successHandler = (response: { inquiry: GeneralInquiry }) => {
        socketService.getSocket()?.off('user:general-inquiry:close:success', successHandler);
        setInquiry(response.inquiry);
        setInquiries(prev => 
          prev.map(inq => inq._id === response.inquiry._id ? response.inquiry : inq)
        );
        showToast('Inquiry closed successfully', 'success');
        resolve();
      };

      socketService.getSocket()?.once('user:general-inquiry:close:success', successHandler);
      
      socketService.closeGeneralInquiry(id);
    });
  }, [isConnected, showToast]);

  // Subscribe to inquiry for real-time updates
  useEffect(() => {
    if (inquiryId && isConnected && !hasSubscribedRef.current) {
      subscribeToGeneralInquiry(inquiryId);
      setIsSubscribed(true);
      hasSubscribedRef.current = true;
    }

    return () => {
      if (inquiryId && hasSubscribedRef.current) {
        unsubscribeFromGeneralInquiry(inquiryId);
        setIsSubscribed(false);
        hasSubscribedRef.current = false;
      }
    };
  }, [inquiryId, isConnected, subscribeToGeneralInquiry, unsubscribeFromGeneralInquiry]);

  // Set up message received handler
  useEffect(() => {
    const handleMessageReceived = (data: {
      message: SocketMessage;
      inquiryId: string;
      unreadCount?: number;
      totalUnreadCount?: number;
    }) => {
      if (inquiryId && data.inquiryId === inquiryId) {
        setInquiry(prev => {
          if (!prev) return null;
          
          // Check if message already exists to prevent duplicates
          const messageExists = prev.messages.some(msg => msg._id === data.message._id);
          if (messageExists) {
            return prev;
          }
          
          return {
            ...prev,
            messages: [...prev.messages, data.message],
            lastMessageAt: data.message.timestamp,
          };
        });
      }
    };

    onGeneralInquiryMessageReceived(handleMessageReceived);

    return () => {
      onGeneralInquiryMessageReceived(() => {});
    };
  }, [inquiryId, onGeneralInquiryMessageReceived]);

  // Auto-fetch if enabled
  useEffect(() => {
    if (autoFetch && isConnected) {
      if (inquiryId) {
        getInquiry(inquiryId);
      } else {
        getInquiriesList();
      }
    }
  }, [autoFetch, inquiryId, isConnected, getInquiry, getInquiriesList]);

  // Fetch unread counts on mount
  useEffect(() => {
    if (isConnected) {
      getGeneralInquiryUnreadCounts();
    }
  }, [isConnected, getGeneralInquiryUnreadCounts]);

  return {
    inquiry,
    inquiries,
    isLoading,
    isSubscribed,
    unreadCount: generalInquiryUnreadCount,
    createInquiry,
    getInquiry,
    getInquiriesList,
    sendMessage,
    markAsRead,
    closeInquiry,
    refreshUnreadCounts: getGeneralInquiryUnreadCounts,
  };
};

