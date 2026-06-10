import { io, Socket } from 'socket.io-client';
import { getStoredToken } from './authApi';

import { SERVER_BASE_URL } from '../constants';

const SOCKET_BASE_URL = SERVER_BASE_URL;

export interface SocketMessage {
  _id: string;
  senderType: 'user' | 'admin';
  senderId: string;
  senderName?: string;
  message: string;
  timestamp: string;
  readBy: string[];
  attachments?: Array<{
    type: 'image' | 'file' | 'video';
    url: string;
    name?: string;
  }>;
}

export interface GeneralInquiry {
  _id: string;
  subject?: string;
  category?: 'general' | 'support' | 'complaint' | 'suggestion' | 'technical';
  status: 'open' | 'closed' | 'resolved';
  messages: SocketMessage[];
  order?: {
    _id: string;
    orderNumber: string;
  };
  assignedAdmin?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  lastMessageAt?: string;
  messageCount?: number;
  unreadCount?: number;
}

/**
 * Order note — 주문 단위 메시지 라인.
 * Admin 이 메시지를 보내면 `user:order-note:received` 이벤트로 user 측에
 * 들어오고, user 가 확인(읽음) 처리하면 `user:order-note:confirmed` 로
 * admin / 다른 user 세션에 broadcast 된다.
 *
 * 백엔드의 OrderNoteLine 과 같은 구조 — 단순히 socket payload 용으로
 * 옵션 필드를 약간 더 느슨하게 잡아 둠.
 */
export interface OrderNoteEvent {
  orderId: string;
  orderNumber?: string;
  noteId?: string;
  value: string;             // 메시지 본문
  name?: string;             // 발신자 표시명 (예: 'admin', 사용자 이름)
  date?: string;             // ISO 타임스탬프
  senderType?: 'admin' | 'user' | string;
  isConfirmed?: 'yes' | 'no' | string;
}

/** user 가 확인 처리한 후 broadcast 되는 payload. */
export interface OrderNoteConfirmedEvent {
  orderId: string;
  orderNumber?: string;
  confirmedBy: 'user' | 'admin' | string;
  confirmedCount: number;
  rows?: any[]; // 확인된 note rows (백엔드가 전달하는 그대로)
  timestamp?: string;
}

export interface BroadcastNote {
  noteId: string;
  type: 'announcement' | 'maintenance' | 'update' | 'warning' | 'info' | 'promotion';
  content: string;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdByName: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  targetAudience: 'all' | 'users' | 'admins';
  createdAt: string;
  updatedAt?: string;
  expiresAt?: string;
}

class SocketService {
  private socket: Socket | null = null;
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private connectionFailed: boolean = false;
  private lastFailTime: number = 0;
  private readonly RETRY_COOLDOWN = 60000; // 60s cooldown after max retries

  /**
   * Connect to Socket.IO server
   */
  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        console.log('[SocketService] Already connected, id:', this.socket.id);
        resolve();
        return;
      }

      if (this.isConnecting) {
        console.log('[SocketService] Connection already in progress');
        resolve();
        return;
      }

      // If connection recently failed, don't retry immediately
      if (this.connectionFailed && Date.now() - this.lastFailTime < this.RETRY_COOLDOWN) {
        console.log('[SocketService] Connection on cooldown, skipping (retry in', Math.round((this.RETRY_COOLDOWN - (Date.now() - this.lastFailTime)) / 1000), 's)');
        resolve();
        return;
      }

      // Clean up old socket if exists
      if (this.socket) {
        console.log('[SocketService] Cleaning up old socket before reconnect');
        this.socket.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
      }

      this.isConnecting = true;
      this.connectionFailed = false;
      this.reconnectAttempts = 0;
      console.log('[SocketService] Connecting to:', SOCKET_BASE_URL, 'path: /socket.io');
      const authToken = token || localStorage.getItem('token') || '';

      try {
        this.socket = io(SOCKET_BASE_URL, {
          path: '/socket.io',
          auth: {
            token: token,
          },
          extraHeaders: {
            Authorization: `Bearer ${authToken}`,
          },
          transports: ['websocket', 'polling'],
          upgrade: true,
          reconnection: true,
          reconnectionDelay: 2000,
          reconnectionDelayMax: 15000,
          reconnectionAttempts: this.maxReconnectAttempts,
        });

        this.socket.on('connect', () => {
          console.log('[SocketService] Connected, id:', this.socket?.id);
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.connectionFailed = false;
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          this.reconnectAttempts++;
          console.warn(`[SocketService] Connection error (${this.reconnectAttempts}/${this.maxReconnectAttempts}):`, error.message);
          this.isConnecting = false;

          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.connectionFailed = true;
            this.lastFailTime = Date.now();
            console.warn('[SocketService] Max retries reached. Cooldown for', this.RETRY_COOLDOWN / 1000, 's. App will use REST API.');
            // Disconnect to stop socket.io's own reconnection
            if (this.socket) {
              this.socket.disconnect();
            }
            reject(new Error('Failed to connect to server after multiple attempts'));
          }
        });

        // Resolve the promise after a timeout if not connected yet
        // (so callers aren't stuck waiting forever)
        const connectTimeout = setTimeout(() => {
          if (this.isConnecting) {
            console.warn('[SocketService] Connect timeout, resolving promise (will keep retrying in background)');
            this.isConnecting = false;
            resolve();
          }
        }, 10000);

        this.socket.on('connect', () => {
          clearTimeout(connectTimeout);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('[SocketService] Disconnected, reason:', reason);
          this.isConnecting = false;
        });

        this.socket.on('reconnect', (attemptNumber: number) => {
          console.log('[SocketService] Reconnected after', attemptNumber, 'attempts');
          this.reconnectAttempts = 0;
          this.connectionFailed = false;
        });

        this.socket.on('reconnect_error', (error) => {
          // Only log once every few attempts to reduce spam
          if (this.reconnectAttempts % 3 === 0) {
            console.warn('[SocketService] Reconnection error:', error.message);
          }
        });

        this.socket.on('reconnect_failed', () => {
          console.warn('[SocketService] Reconnection failed after max attempts. App will use REST API.');
          this.connectionFailed = true;
          this.lastFailTime = Date.now();
        });
      } catch (error) {
        console.warn('[SocketService] Error creating connection:', error);
        this.isConnecting = false;
        this.connectionFailed = true;
        this.lastFailTime = Date.now();
        reject(error);
      }
    });
  }

  /**
   * Disconnect from Socket.IO server
   */
  disconnect(): void {
    if (this.socket) {
      // console.log('🔌 Disconnecting socket...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnecting = false;
      this.reconnectAttempts = 0;
    }
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Emit an event
   */
  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      console.log('[SocketService] Emitting:', event, data ? JSON.stringify(data).substring(0, 100) : '');
      this.socket.emit(event, data);
    } else {
      console.warn('[SocketService] Socket not connected! Cannot emit:', event);
    }
  }

  /**
   * Listen to an event
   */
  on(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  /**
   * Remove event listener
   */
  off(event: string, callback?: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event: string): void {
    if (this.socket) {
      this.socket.removeAllListeners(event);
    }
  }

  // ========== Inquiry Socket Methods ==========

  /**
   * Send a message via socket
   */
  sendMessage(inquiryId: string, message: string, attachments?: any[]): void {
    this.emit('user:inquiry:send-message', {
      inquiryId,
      message,
      attachments: attachments || [],
    });
  }

  /**
   * Subscribe to an inquiry for real-time updates
   */
  subscribeToInquiry(inquiryId: string): void {
    this.emit('user:inquiry:subscribe', { inquiryId });
  }

  /**
   * Unsubscribe from an inquiry
   */
  unsubscribeFromInquiry(inquiryId: string): void {
    this.emit('user:inquiry:unsubscribe', { inquiryId });
  }

  /**
   * Get unread counts by inquiry (alternative to REST)
   */
  getUnreadCounts(): void {
    this.emit('user:inquiry:unread-counts');
  }

  // ========== Order Note Socket Methods ==========
  // 주문 단위 메시지(orderNoteLines) 의 실시간 양방향 채널.
  // - Admin 이 send 하면 backend → user 측에 `user:order-note:received` 로 push.
  // - User 가 send 하면 emit `user:order-note:send` → backend 가 admin 측에 push.
  // - User 가 확인(읽음) 처리하면 emit `user:order-note:confirm` → backend 가
  //   `user:order-note:confirmed` broadcast.

  /** 특정 주문의 note 채널 구독 (admin 이 보낼 때 자동으로 받기 위함). */
  subscribeToOrderNotes(orderId: string): void {
    this.emit('user:order-note:subscribe', { orderId });
  }

  /** 구독 해제 — 화면을 벗어날 때 호출. */
  unsubscribeFromOrderNotes(orderId: string): void {
    this.emit('user:order-note:unsubscribe', { orderId });
  }

  /** User → admin: 새 order note 송신. */
  sendOrderNote(
    orderId: string,
    value: string,
    extra?: { orderNumber?: string; name?: string },
  ): void {
    this.emit('user:order-note:send', {
      orderId,
      orderNumber: extra?.orderNumber,
      value,
      name: extra?.name,
      senderType: 'user',
      date: new Date().toISOString(),
      isConfirmed: 'no',
    });
  }

  /** Admin 이 보낸 note 들을 user 가 확인 처리(읽음) 했음을 broadcast. */
  confirmOrderNotes(
    orderId: string,
    extra?: { orderNumber?: string; noteIds?: string[] },
  ): void {
    this.emit('user:order-note:confirm', {
      orderId,
      orderNumber: extra?.orderNumber,
      noteIds: extra?.noteIds,
      confirmedBy: 'user',
    });
  }

  // ========== General Inquiry Socket Methods ==========

  /**
   * Create a general inquiry
   */
  createGeneralInquiry(data: {
    subject?: string;
    category?: 'general' | 'support' | 'complaint' | 'suggestion' | 'technical';
    message: string;
    attachments?: Array<{
      type: 'image' | 'file' | 'video';
      url: string;
      name?: string;
    }>;
  }): void {
    this.emit('user:general-inquiry:create', data);
  }

  /**
   * Send a message in a general inquiry
   */
  sendGeneralInquiryMessage(inquiryId: string, message: string, attachments?: any[]): void {
    this.emit('user:general-inquiry:send-message', {
      inquiryId,
      message,
      attachments: attachments || [],
    });
  }

  /**
   * Get list of general inquiries
   */
  getGeneralInquiryList(status?: 'open' | 'closed' | 'resolved'): void {
    this.emit('user:general-inquiry:list', status ? { status } : {});
  }

  /**
   * Get a single general inquiry
   */
  getGeneralInquiry(inquiryId: string): void {
    this.emit('user:general-inquiry:get', { inquiryId });
  }

  /**
   * Subscribe to a general inquiry for real-time updates
   */
  subscribeToGeneralInquiry(inquiryId: string): void {
    this.emit('user:general-inquiry:subscribe', { inquiryId });
  }

  /**
   * Unsubscribe from a general inquiry
   */
  unsubscribeFromGeneralInquiry(inquiryId: string): void {
    this.emit('user:general-inquiry:unsubscribe', { inquiryId });
  }

  /**
   * Mark messages as read in a general inquiry
   */
  markGeneralInquiryRead(inquiryId: string): void {
    this.emit('user:general-inquiry:mark-read', { inquiryId });
  }

  /**
   * Alias for markGeneralInquiryRead
   */
  markGeneralInquiryAsRead(inquiryId: string): void {
    this.markGeneralInquiryRead(inquiryId);
  }

  /**
   * Mark messages as read in an order inquiry
   */
  markInquiryAsRead(inquiryId: string): void {
    this.emit('user:inquiry:mark-read', { inquiryId });
  }

  /**
   * Create an order inquiry
   */
  createInquiry(orderId: string, message: string, attachments?: any[]): void {
    this.emit('user:inquiry:create', {
      orderId,
      message,
      attachments: attachments || [],
    });
  }

  /**
   * Close an order inquiry
   */
  closeInquiry(inquiryId: string): void {
    this.emit('user:inquiry:close', { inquiryId });
  }

  /**
   * Close a general inquiry
   */
  closeGeneralInquiry(inquiryId: string): void {
    this.emit('user:general-inquiry:close', { inquiryId });
  }

  /**
   * Get total unread count for general inquiries
   */
  getGeneralInquiryUnreadCount(): void {
    this.emit('user:general-inquiry:unread-count');
  }

  /**
   * Get unread counts by general inquiry
   */
  getGeneralInquiryUnreadCounts(): void {
    this.emit('user:general-inquiry:unread-counts');
  }
}

// Export singleton instance
export const socketService = new SocketService();

