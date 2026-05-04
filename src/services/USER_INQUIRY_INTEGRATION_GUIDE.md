# User Inquiry Integration Guide

> **Hybrid Approach**: REST API for actions + Socket.io for real-time updates

This guide covers how to integrate the Order Inquiry system from the **user (customer)** perspective.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Quick Start](#quick-start)
3. [Authentication](#authentication)
4. [REST API Reference](#rest-api-reference)
5. [Socket.io Events](#socketio-events)
6. [Integration Patterns](#integration-patterns)
7. [Complete Client Example](#complete-client-example)
8. [Error Handling](#error-handling)
9. [Best Practices](#best-practices)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         USER INQUIRY - HYBRID APPROACH                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────┐              ┌───────────────────────┐          │
│  │      USER CLIENT      │              │        SERVER         │          │
│  │    (Web/Mobile App)   │              │                       │          │
│  └───────────┬───────────┘              └───────────┬───────────┘          │
│              │                                      │                       │
│              │                                      │                       │
│  ┌───────────┴───────────────────────────────────────┴───────────┐         │
│  │                                                               │         │
│  │   REST API (HTTP)                     Socket.io (WebSocket)   │         │
│  │   ══════════════                      ════════════════════    │         │
│  │                                                               │         │
│  │   USE FOR:                            USE FOR:                │         │
│  │   • Create inquiry                    • Receive new messages  │         │
│  │   • Send message (with files)         • Read receipts         │         │
│  │   • List inquiries                    • Status updates        │         │
│  │   • Get inquiry details               • Unread count updates  │         │
│  │   • Mark as read                      • New inquiry alerts    │         │
│  │   • Close inquiry                                             │         │
│  │   • Get unread counts                                         │         │
│  │                                                               │         │
│  └───────────────────────────────────────────────────────────────┘         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why Hybrid?

| Scenario | REST | Socket | Why |
|----------|------|--------|-----|
| Create inquiry with images | ✅ | ❌ | File upload via multipart/form-data |
| Send message with attachments | ✅ | ❌ | File upload support |
| Receive admin's message | ❌ | ✅ | Real-time push, no polling |
| Know when admin read your message | ❌ | ✅ | Instant feedback |
| List all inquiries | ✅ | ❌ | Cacheable, pagination |
| Works when socket disconnected | ✅ | ❌ | Reliability fallback |

---

## Quick Start

### Step 1: Setup REST API Client

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.todaymall.co.kr/api//inquiries',
  headers: {
    'Authorization': `Bearer ${userToken}`
  }
});
```

### Step 2: Setup Socket.io Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('https://api.todaymall.co.kr', {
  auth: {
    token: userToken  // JWT token
  }
});

socket.on('connect', () => {
  console.log('Connected to real-time updates');
});
```

### Step 3: Listen for Real-time Events

```javascript
// New message from admin
socket.on('user:inquiry:message:received', (data) => {
  showNotification(`New message: ${data.message.message}`);
  updateUnreadBadge(data.totalUnreadCount);
});

// Admin read your message
socket.on('user:inquiry:messages-read', (data) => {
  markMessagesAsRead(data.inquiryId);
});
```

---

## Authentication

### REST API Authentication

Include JWT token in the `Authorization` header:

```http
GET /api//inquiries HTTP/1.1
Host: api.todaymall.co.kr
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Socket.io Authentication

Pass token in the `auth` object during connection:

```javascript
const socket = io('https://api.todaymall.co.kr', {
  auth: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  }
});
```

---

## REST API Reference

### Base URL
```
https://api.todaymall.co.kr/api//inquiries
```

---

### 1. Create Inquiry

Create a new inquiry for an order.

```http
POST /api//inquiries
Content-Type: multipart/form-data
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| orderId | string | ✅ | MongoDB ObjectId of the order |
| message | string | ✅ | Initial message (1-5000 chars) |
| attachments | File[] | ❌ | Images or documents |

**Example:**
```javascript
const createInquiry = async (orderId, message, files = []) => {
  const formData = new FormData();
  formData.append('orderId', orderId);
  formData.append('message', message);
  files.forEach(file => formData.append('attachments', file));

  const response = await api.post('/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};
```

**Response:**
```json
{
  "success": true,
  "data": {
    "inquiry": {
      "_id": "507f1f77bcf86cd799439011",
      "order": {
        "_id": "507f1f77bcf86cd799439022",
        "orderNumber": "ORD-2024-001234"
      },
      "status": "open",
      "messages": [
        {
          "senderType": "user",
          "senderId": "507f1f77bcf86cd799439033",
          "senderName": "user123",
          "message": "I have a question about my order",
          "timestamp": "2024-12-14T10:00:00Z",
          "attachments": []
        }
      ],
      "createdAt": "2024-12-14T10:00:00Z"
    }
  },
  "message": "Inquiry created successfully"
}
```

---

### 2. List Inquiries

Get all inquiries for the current user.

```http
GET /api//inquiries?status=open
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | ❌ | Filter: `open`, `closed`, `resolved` |

**Example:**
```javascript
const getInquiries = async (status = null) => {
  const params = status ? { status } : {};
  const response = await api.get('/', { params });
  return response.data;
};
```

**Response:**
```json
{
  "success": true,
  "data": {
    "inquiries": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "order": {
          "_id": "507f1f77bcf86cd799439022",
          "orderNumber": "ORD-2024-001234"
        },
        "status": "open",
        "assignedAdmin": {
          "_id": "507f1f77bcf86cd799439044",
          "name": "Support Agent"
        },
        "lastMessageAt": "2024-12-14T11:30:00Z",
        "createdAt": "2024-12-14T10:00:00Z",
        "messageCount": 5
      }
    ]
  }
}
```

---

### 3. Get Inquiry Details

Get a specific inquiry with all messages.

```http
GET /api//inquiries/:inquiryId
```

**Example:**
```javascript
const getInquiry = async (inquiryId) => {
  const response = await api.get(`/${inquiryId}`);
  return response.data;
};
```

**Response:**
```json
{
  "success": true,
  "data": {
    "inquiry": {
      "_id": "507f1f77bcf86cd799439011",
      "order": {
        "_id": "507f1f77bcf86cd799439022",
        "orderNumber": "ORD-2024-001234"
      },
      "status": "open",
      "assignedAdmin": {
        "_id": "507f1f77bcf86cd799439044",
        "name": "Support Agent"
      },
      "messages": [
        {
          "senderType": "user",
          "senderId": "507f1f77bcf86cd799439033",
          "senderName": "user123",
          "message": "I have a question about my order",
          "timestamp": "2024-12-14T10:00:00Z",
          "readBy": ["507f1f77bcf86cd799439033", "507f1f77bcf86cd799439044"],
          "attachments": []
        },
        {
          "senderType": "admin",
          "senderId": "507f1f77bcf86cd799439044",
          "senderName": "Support Agent",
          "message": "Hello! How can I help you?",
          "timestamp": "2024-12-14T10:05:00Z",
          "readBy": ["507f1f77bcf86cd799439044"],
          "attachments": []
        }
      ],
      "lastMessageAt": "2024-12-14T10:05:00Z",
      "createdAt": "2024-12-14T10:00:00Z"
    }
  }
}
```

---

### 4. Get Inquiry by Order

Get inquiry for a specific order.

```http
GET /api//inquiries/order/:orderId
```

**Example:**
```javascript
const getInquiryByOrder = async (orderId) => {
  const response = await api.get(`/order/${orderId}`);
  return response.data;
};
```

---

### 5. Send Message

Send a message in an inquiry.

```http
POST /api//inquiries/:inquiryId/messages
Content-Type: multipart/form-data
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| message | string | ✅ | Message content (1-5000 chars) |
| attachments | File[] | ❌ | Images or documents |

**Example:**
```javascript
const sendMessage = async (inquiryId, message, files = []) => {
  const formData = new FormData();
  formData.append('message', message);
  files.forEach(file => formData.append('attachments', file));

  const response = await api.post(`/${inquiryId}/messages`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};
```

---

### 6. Mark Messages as Read

Mark admin's messages as read.

```http
POST /api//inquiries/:inquiryId/mark-read
```

**Example:**
```javascript
const markAsRead = async (inquiryId) => {
  const response = await api.post(`/${inquiryId}/mark-read`);
  return response.data;
};
```

> **Note:** This also emits a socket event to notify the admin that you've read their messages.

---

### 7. Close Inquiry

Close an inquiry when resolved.

```http
POST /api//inquiries/:inquiryId/close
```

**Example:**
```javascript
const closeInquiry = async (inquiryId) => {
  const response = await api.post(`/${inquiryId}/close`);
  return response.data;
};
```

---

### 8. Get Unread Count

Get total unread message count.

```http
GET /api//inquiries/unread-count
```

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 5
  }
}
```

---

### 9. Get Unread Counts by Inquiry

Get unread counts grouped by inquiry.

```http
GET /api//inquiries/unread-counts
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUnread": 5,
    "inquiries": [
      {
        "inquiryId": "507f1f77bcf86cd799439011",
        "orderId": "507f1f77bcf86cd799439022",
        "orderNumber": "ORD-2024-001234",
        "unreadCount": 3
      },
      {
        "inquiryId": "507f1f77bcf86cd799439055",
        "orderId": "507f1f77bcf86cd799439066",
        "orderNumber": "ORD-2024-005678",
        "unreadCount": 2
      }
    ]
  }
}
```

---

## Socket.io Events

### Connection Setup

```javascript
import { io } from 'socket.io-client';

const socket = io('https://api.todaymall.co.kr', {
  auth: { token: userToken },
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});
```

### Events to Listen (Server → Client)

#### `user:inquiry:message:received`
New message from admin.

```javascript
socket.on('user:inquiry:message:received', (data) => {
  console.log('New message:', data);
  // {
  //   inquiryId: "507f1f77bcf86cd799439011",
  //   message: {
  //     senderType: "admin",
  //     senderId: "507f1f77bcf86cd799439044",
  //     senderName: "Support Agent",
  //     message: "Hello! How can I help?",
  //     timestamp: "2024-12-14T10:05:00Z",
  //     attachments: []
  //   },
  //   unreadCount: 3,        // Unread in this inquiry
  //   totalUnreadCount: 5    // Total unread across all
  // }
});
```

#### `user:inquiry:messages-read`
Admin read your messages (read receipt).

```javascript
socket.on('user:inquiry:messages-read', (data) => {
  console.log('Admin read your messages:', data);
  // {
  //   inquiryId: "507f1f77bcf86cd799439011",
  //   readBy: "507f1f77bcf86cd799439044",
  //   readByType: "admin",
  //   readByName: "Support Agent",
  //   readAt: "2024-12-14T10:06:00Z"
  // }
});
```

#### `user:inquiry:new`
Admin created an inquiry for you (proactive contact).

```javascript
socket.on('user:inquiry:new', (data) => {
  console.log('New inquiry from admin:', data);
  // {
  //   inquiry: {
  //     _id: "507f1f77bcf86cd799439011",
  //     order: { _id: "...", orderNumber: "ORD-2024-001234" },
  //     status: "open",
  //     messages: [...],
  //     createdAt: "2024-12-14T10:00:00Z"
  //   }
  // }
});
```

#### `user:inquiry:closed`
Inquiry was closed by admin.

```javascript
socket.on('user:inquiry:closed', (data) => {
  console.log('Inquiry closed:', data);
  // { inquiryId: "...", status: "closed" }
});
```

#### `user:inquiry:reopened`
Inquiry was reopened.

```javascript
socket.on('user:inquiry:reopened', (data) => {
  console.log('Inquiry reopened:', data);
  // { inquiryId: "...", status: "open" }
});
```

#### `inquiry:admin-assigned`
Admin was assigned to your inquiry.

```javascript
socket.on('inquiry:admin-assigned', (data) => {
  console.log('Admin assigned:', data);
  // {
  //   inquiryId: "...",
  //   assignedAdmin: { _id: "...", name: "Support Agent" }
  // }
});
```

### Events to Emit (Client → Server)

These are optional - you can use REST API instead. Socket events are useful for quick operations without file uploads.

#### `user:inquiry:subscribe`
Subscribe to real-time updates for a specific inquiry.

```javascript
socket.emit('user:inquiry:subscribe', { inquiryId: '507f1f77bcf86cd799439011' });
socket.on('user:inquiry:subscribe:success', (data) => {
  console.log('Subscribed to inquiry');
});
```

#### `user:inquiry:unsubscribe`
Unsubscribe from inquiry updates.

```javascript
socket.emit('user:inquiry:unsubscribe', { inquiryId: '507f1f77bcf86cd799439011' });
```

#### `user:inquiry:unread-counts`
Get unread counts (alternative to REST).

```javascript
socket.emit('user:inquiry:unread-counts');
socket.on('user:inquiry:unread-counts:response', (data) => {
  console.log('Unread counts:', data);
  // { totalUnread: 5, inquiries: [...] }
});
```

---

## Integration Patterns

### Pattern 1: Inquiry List Page

```javascript
// InquiryListPage.jsx
import { useEffect, useState } from 'react';

function InquiryListPage() {
  const [inquiries, setInquiries] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});

  useEffect(() => {
    // Load inquiries via REST
    loadInquiries();
    loadUnreadCounts();

    // Listen for real-time updates
    socket.on('user:inquiry:message:received', handleNewMessage);
    socket.on('user:inquiry:new', handleNewInquiry);

    return () => {
      socket.off('user:inquiry:message:received', handleNewMessage);
      socket.off('user:inquiry:new', handleNewInquiry);
    };
  }, []);

  const loadInquiries = async () => {
    const response = await api.get('/');
    setInquiries(response.data.data.inquiries);
  };

  const loadUnreadCounts = async () => {
    const response = await api.get('/unread-counts');
    const counts = {};
    response.data.data.inquiries.forEach(item => {
      counts[item.inquiryId] = item.unreadCount;
    });
    setUnreadCounts(counts);
  };

  const handleNewMessage = (data) => {
    // Update unread count for specific inquiry
    setUnreadCounts(prev => ({
      ...prev,
      [data.inquiryId]: data.unreadCount
    }));
    
    // Move inquiry to top of list
    setInquiries(prev => {
      const updated = prev.filter(i => i._id !== data.inquiryId);
      const target = prev.find(i => i._id === data.inquiryId);
      if (target) {
        target.lastMessageAt = new Date().toISOString();
        return [target, ...updated];
      }
      return prev;
    });
  };

  const handleNewInquiry = (data) => {
    setInquiries(prev => [data.inquiry, ...prev]);
  };

  return (
    <div>
      {inquiries.map(inquiry => (
        <InquiryCard 
          key={inquiry._id}
          inquiry={inquiry}
          unreadCount={unreadCounts[inquiry._id] || 0}
        />
      ))}
    </div>
  );
}
```

### Pattern 2: Chat Room Page

```javascript
// InquiryChatPage.jsx
import { useEffect, useState, useRef } from 'react';

function InquiryChatPage({ inquiryId }) {
  const [inquiry, setInquiry] = useState(null);
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Load inquiry details via REST
    loadInquiry();

    // Subscribe to real-time updates
    socket.emit('user:inquiry:subscribe', { inquiryId });

    // Listen for new messages
    socket.on('user:inquiry:message:received', handleNewMessage);
    socket.on('user:inquiry:messages-read', handleMessagesRead);

    // Mark as read when entering chat
    markAsRead();

    return () => {
      socket.emit('user:inquiry:unsubscribe', { inquiryId });
      socket.off('user:inquiry:message:received', handleNewMessage);
      socket.off('user:inquiry:messages-read', handleMessagesRead);
    };
  }, [inquiryId]);

  const loadInquiry = async () => {
    const response = await api.get(`/${inquiryId}`);
    const data = response.data.data.inquiry;
    setInquiry(data);
    setMessages(data.messages);
  };

  const markAsRead = async () => {
    await api.post(`/${inquiryId}/mark-read`);
  };

  const handleNewMessage = (data) => {
    if (data.inquiryId === inquiryId) {
      setMessages(prev => [...prev, data.message]);
      scrollToBottom();
      // Mark as read since user is viewing
      markAsRead();
    }
  };

  const handleMessagesRead = (data) => {
    if (data.inquiryId === inquiryId) {
      // Update UI to show "Read ✓✓"
      setMessages(prev => prev.map(msg => ({
        ...msg,
        isRead: true
      })));
    }
  };

  const sendMessage = async (text, files = []) => {
    const formData = new FormData();
    formData.append('message', text);
    files.forEach(file => formData.append('attachments', file));

    const response = await api.post(`/${inquiryId}/messages`, formData);
    // Message will be added via socket event
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg, idx) => (
          <MessageBubble 
            key={idx}
            message={msg}
            isOwn={msg.senderType === 'user'}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <MessageInput onSend={sendMessage} />
    </div>
  );
}
```

### Pattern 3: Notification Badge

```javascript
// NotificationBadge.jsx
import { useEffect, useState } from 'react';

function NotificationBadge() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Initial load
    loadUnreadCount();

    // Real-time updates
    socket.on('user:inquiry:message:received', (data) => {
      setUnreadCount(data.totalUnreadCount);
    });

    return () => {
      socket.off('user:inquiry:message:received');
    };
  }, []);

  const loadUnreadCount = async () => {
    const response = await api.get('/unread-count');
    setUnreadCount(response.data.data.count);
  };

  if (unreadCount === 0) return null;

  return (
    <span className="badge">{unreadCount}</span>
  );
}
```

---

## Complete Client Example

```javascript
// InquiryClient.js
import axios from 'axios';
import { io } from 'socket.io-client';

class InquiryClient {
  constructor(baseURL, token) {
    // REST API client
    this.api = axios.create({
      baseURL: `${baseURL}/api//inquiries`,
      headers: { 'Authorization': `Bearer ${token}` }
    });

    // Socket.io client
    this.socket = io(baseURL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
    });

    this.listeners = new Map();
    this.setupSocketListeners();
  }

  // ===================
  // REST API Methods
  // ===================

  async createInquiry(orderId, message, files = []) {
    const formData = new FormData();
    formData.append('orderId', orderId);
    formData.append('message', message);
    files.forEach(f => formData.append('attachments', f));
    return this.api.post('/', formData);
  }

  async getInquiries(status = null) {
    return this.api.get('/', { params: status ? { status } : {} });
  }

  async getInquiry(inquiryId) {
    return this.api.get(`/${inquiryId}`);
  }

  async getInquiryByOrder(orderId) {
    return this.api.get(`/order/${orderId}`);
  }

  async sendMessage(inquiryId, message, files = []) {
    const formData = new FormData();
    formData.append('message', message);
    files.forEach(f => formData.append('attachments', f));
    return this.api.post(`/${inquiryId}/messages`, formData);
  }

  async markAsRead(inquiryId) {
    return this.api.post(`/${inquiryId}/mark-read`);
  }

  async closeInquiry(inquiryId) {
    return this.api.post(`/${inquiryId}/close`);
  }

  async getUnreadCount() {
    return this.api.get('/unread-count');
  }

  async getUnreadCounts() {
    return this.api.get('/unread-counts');
  }

  // ===================
  // Socket Methods
  // ===================

  setupSocketListeners() {
    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.emit('connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.emit('disconnected');
    });

    this.socket.on('user:inquiry:message:received', (data) => {
      this.emit('newMessage', data);
    });

    this.socket.on('user:inquiry:messages-read', (data) => {
      this.emit('messagesRead', data);
    });

    this.socket.on('user:inquiry:new', (data) => {
      this.emit('newInquiry', data);
    });

    this.socket.on('user:inquiry:closed', (data) => {
      this.emit('inquiryClosed', data);
    });

    this.socket.on('user:inquiry:reopened', (data) => {
      this.emit('inquiryReopened', data);
    });

    this.socket.on('inquiry:admin-assigned', (data) => {
      this.emit('adminAssigned', data);
    });
  }

  subscribeToInquiry(inquiryId) {
    this.socket.emit('user:inquiry:subscribe', { inquiryId });
  }

  unsubscribeFromInquiry(inquiryId) {
    this.socket.emit('user:inquiry:unsubscribe', { inquiryId });
  }

  // ===================
  // Event Emitter
  // ===================

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => cb(data));
    }
  }

  // ===================
  // Cleanup
  // ===================

  disconnect() {
    this.socket.disconnect();
  }
}

export default InquiryClient;
```

**Usage:**
```javascript
const client = new InquiryClient('https://api.todaymall.co.kr', userToken);

// Listen for events
client.on('newMessage', (data) => {
  console.log('New message:', data.message);
  updateBadge(data.totalUnreadCount);
});

client.on('messagesRead', (data) => {
  console.log('Admin read your messages');
});

// Create inquiry
await client.createInquiry(orderId, 'Question about my order', [imageFile]);

// Get inquiries
const { data } = await client.getInquiries('open');

// Send message
await client.sendMessage(inquiryId, 'Thanks for your help!');
```

---

## Error Handling

### REST API Errors

```javascript
try {
  await api.post('/', formData);
} catch (error) {
  if (error.response) {
    // Server responded with error
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        // Validation error
        console.error('Validation:', data.message);
        break;
      case 401:
        // Not authenticated
        redirectToLogin();
        break;
      case 403:
        // No permission
        console.error('Access denied:', data.message);
        break;
      case 404:
        // Not found
        console.error('Not found:', data.message);
        break;
      case 500:
        // Server error
        console.error('Server error');
        break;
    }
  } else {
    // Network error
    console.error('Network error');
  }
}
```

### Socket Error Events

```javascript
socket.on('user:inquiry:create:error', (error) => {
  console.error('Create error:', error.message, error.code);
});

socket.on('user:inquiry:message:error', (error) => {
  console.error('Message error:', error.message, error.code);
});
```

---

## Best Practices

### 1. Always Use REST for File Uploads
```javascript
// ✅ Correct
await api.post('/messages', formData);

// ❌ Don't send files via socket
socket.emit('send-message', { file: base64 });
```

### 2. Subscribe When Entering Chat Room
```javascript
useEffect(() => {
  socket.emit('user:inquiry:subscribe', { inquiryId });
  return () => {
    socket.emit('user:inquiry:unsubscribe', { inquiryId });
  };
}, [inquiryId]);
```

### 3. Mark as Read When User Views Messages
```javascript
// When user opens chat room
await api.post(`/${inquiryId}/mark-read`);

// When new message arrives and user is viewing
socket.on('user:inquiry:message:received', (data) => {
  if (isCurrentChat(data.inquiryId)) {
    api.post(`/${data.inquiryId}/mark-read`);
  }
});
```

### 4. Handle Socket Reconnection
```javascript
socket.on('reconnect', () => {
  // Re-subscribe to inquiries
  if (currentInquiryId) {
    socket.emit('user:inquiry:subscribe', { inquiryId: currentInquiryId });
  }
  // Refresh data
  loadInquiries();
  loadUnreadCounts();
});
```

### 5. Optimistic UI Updates
```javascript
const sendMessage = async (text) => {
  // Optimistically add message to UI
  const tempMessage = {
    senderType: 'user',
    message: text,
    timestamp: new Date().toISOString(),
    pending: true
  };
  setMessages(prev => [...prev, tempMessage]);

  try {
    await api.post(`/${inquiryId}/messages`, { message: text });
    // Real message will arrive via socket
  } catch (error) {
    // Remove optimistic message on error
    setMessages(prev => prev.filter(m => m !== tempMessage));
    showError('Failed to send message');
  }
};
```

---

## Summary

| Action | Method | Endpoint/Event |
|--------|--------|----------------|
| Create inquiry | REST | `POST /api//inquiries` |
| Send message | REST | `POST /api//inquiries/:id/messages` |
| List inquiries | REST | `GET /api//inquiries` |
| Get inquiry | REST | `GET /api//inquiries/:id` |
| Mark as read | REST | `POST /api//inquiries/:id/mark-read` |
| Close inquiry | REST | `POST /api//inquiries/:id/close` |
| Get unread counts | REST | `GET /api//inquiries/unread-counts` |
| Receive messages | Socket | `user:inquiry:message:received` |
| Read receipts | Socket | `user:inquiry:messages-read` |
| Status updates | Socket | `user:inquiry:closed`, `user:inquiry:reopened` |

