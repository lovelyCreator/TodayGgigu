import { inquiryApi } from '../services/inquiryApi';
import { orderApi, type OrderNoteLine } from '../services/orderApi';

export interface OrderInquiryListItem {
  orderId: string;
  orderNumber: string;
  inquiryId: string;
  status: string;
  lastMessageAt: string;
  createdAt: string;
  unreadCount: number;
  messageCount: number;
  imageUrl?: string;
  progressStatus?: string;
  lastMessagePreview?: string;
}

export interface OrderInquiryChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  senderName?: string;
}

export function resolveInquiryOrderId(inq: {
  orderId?: string;
  order?: string | { _id?: string; id?: string; orderNumber?: string };
}): string {
  if (inq.orderId) return String(inq.orderId);
  if (typeof inq.order === 'string') return inq.order;
  if (inq.order?._id) return String(inq.order._id);
  if (inq.order?.id) return String(inq.order.id);
  return '';
}

export function resolveInquiryOrderNumber(inq: {
  orderNumber?: string;
  order?: string | { orderNumber?: string };
}): string {
  if (inq.orderNumber) return inq.orderNumber;
  if (typeof inq.order === 'object' && inq.order?.orderNumber) {
    return inq.order.orderNumber;
  }
  return '';
}

export function mergeUnreadCountMaps(
  ...maps: Array<Record<string, number>>
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const map of maps) {
    for (const [id, count] of Object.entries(map)) {
      if (count > (result[id] ?? 0)) {
        result[id] = count;
      }
    }
  }
  return result;
}

export function mapRawOrderInquiry(
  inq: Record<string, any>,
  unreadByInquiryId: Record<string, number> = {},
): OrderInquiryListItem {
  const inquiryId = String(inq._id ?? inq.inquiryId ?? '');
  const orderId = resolveInquiryOrderId(inq);
  const orderObj = typeof inq.order === 'object' && inq.order ? inq.order : null;

  return {
    orderId: orderId || inquiryId,
    orderNumber: resolveInquiryOrderNumber(inq) || orderObj?.orderNumber || '',
    inquiryId,
    status: inq.status || '',
    lastMessageAt: inq.lastMessageAt || inq.updatedAt || inq.createdAt || '',
    createdAt: inq.createdAt || '',
    unreadCount: unreadByInquiryId[inquiryId] ?? inq.unreadCount ?? 0,
    messageCount: inq.messageCount ?? inq.messages?.length ?? 0,
    imageUrl:
      inq.imageUrl ||
      orderObj?.imageUrl ||
      orderObj?.items?.[0]?.imageUrl ||
      '',
    // `/inquiries/orders` 응답은 `orderProgressStatus` 키를, 다른 경로는
    // `progressStatus` 를 쓰므로 양쪽 모두 받아들인다.
    progressStatus:
      inq.progressStatus ||
      inq.orderProgressStatus ||
      orderObj?.progressStatus ||
      orderObj?.status ||
      '',
    // `/inquiries/orders` 는 `lastMessage` 를, 다른 경로는 `lastMessagePreview` 를
    // 보내므로 fallback chain 으로 통합.
    lastMessagePreview:
      inq.lastMessagePreview || inq.lastMessage || undefined,
  };
}

export function orderNoteLinesToChatMessages(
  noteLines: OrderNoteLine[] | undefined,
): OrderInquiryChatMessage[] {
  if (!noteLines?.length) return [];

  return [...noteLines]
    .filter((note) => String(note.value ?? '').trim())
    .sort(
      (a, b) =>
        new Date(a.createDate || 0).getTime() - new Date(b.createDate || 0).getTime(),
    )
    .map((note, index) => ({
      id: note.noteId || `order-note-${index}-${note.createDate || ''}`,
      text: String(note.value).trim(),
      isUser: note.senderType === 'user',
      timestamp: new Date(note.createDate || Date.now()),
      senderName: note.name,
    }));
}

export function mergeChatMessages(
  ...groups: OrderInquiryChatMessage[][]
): OrderInquiryChatMessage[] {
  const seen = new Set<string>();
  const combined: OrderInquiryChatMessage[] = [];

  for (const group of groups) {
    for (const message of group) {
      const key = message.id || `${message.timestamp.getTime()}-${message.text}`;
      if (seen.has(key)) continue;
      seen.add(key);
      combined.push(message);
    }
  }

  return combined.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

function getOrderNoteMeta(order: Record<string, any>) {
  const noteLines: OrderNoteLine[] = Array.isArray(order.orderNoteLines)
    ? order.orderNoteLines
    : [];
  const lastNote = noteLines.length > 0 ? noteLines[noteLines.length - 1] : undefined;
  return { noteLines, lastNote, noteCount: noteLines.length };
}

function applyProxyOrderToInquiryItem(
  item: OrderInquiryListItem,
  order: Record<string, any>,
): OrderInquiryListItem {
  const { lastNote, noteCount } = getOrderNoteMeta(order);

  return {
    ...item,
    orderId: String(order._id ?? order.id ?? item.orderId),
    orderNumber: order.orderNumber || item.orderNumber,
    progressStatus: order.progressStatus || item.progressStatus,
    imageUrl: order.items?.[0]?.imageUrl || order.imageUrl || item.imageUrl,
    messageCount: Math.max(item.messageCount, noteCount),
    lastMessageAt: lastNote?.createDate || item.lastMessageAt,
    lastMessagePreview: lastNote?.value?.trim() || item.lastMessagePreview,
  };
}

export function proxyOrderToInquiryListItem(
  order: Record<string, any>,
  inquiry: Record<string, any> | undefined,
  unreadByInquiryId: Record<string, number> = {},
): OrderInquiryListItem | null {
  const orderId = String(order._id ?? order.id ?? '');
  if (!orderId || !order.orderNumber) return null;

  const { lastNote, noteCount } = getOrderNoteMeta(order);
  const inquiryId = inquiry ? String(inquiry._id ?? inquiry.inquiryId ?? '') : '';
  const lastInquiryMessage = inquiry?.messages?.[inquiry.messages.length - 1];

  return {
    orderId,
    orderNumber: order.orderNumber || '',
    inquiryId,
    status: inquiry?.status || (noteCount > 0 ? 'open' : ''),
    lastMessageAt:
      lastNote?.createDate ||
      inquiry?.lastMessageAt ||
      inquiry?.updatedAt ||
      order.updatedAt ||
      order.createdAt ||
      '',
    createdAt: inquiry?.createdAt || order.createdAt || '',
    unreadCount: inquiryId ? (unreadByInquiryId[inquiryId] ?? inquiry?.unreadCount ?? 0) : 0,
    messageCount: Math.max(
      inquiry?.messageCount ?? inquiry?.messages?.length ?? 0,
      noteCount,
    ),
    imageUrl: order.items?.[0]?.imageUrl || order.imageUrl || '',
    progressStatus: order.progressStatus || '',
    lastMessagePreview:
      lastNote?.value?.trim() ||
      lastInquiryMessage?.message?.trim() ||
      '',
  };
}

export async function enrichOrderInquiriesWithOrderDetails(
  items: OrderInquiryListItem[],
  locale: string,
): Promise<OrderInquiryListItem[]> {
  return Promise.all(
    items.map(async (item) => {
      try {
        const proxyRes = await orderApi.getOrderFromProxy(
          { orderNumber: item.orderNumber || undefined, orderId: item.orderId },
          locale,
        );
        const proxyOrder = proxyRes.success ? proxyRes.data?.order : undefined;
        if (proxyOrder) {
          return applyProxyOrderToInquiryItem(item, proxyOrder as Record<string, any>);
        }
      } catch {
        // skip failed enrichment
      }
      return item;
    }),
  );
}

export async function fetchOrderFromProxy(
  params: { orderNumber?: string; orderId?: string },
  locale: string,
): Promise<Record<string, any> | null> {
  const res = await orderApi.getOrderFromProxy(params, locale);
  if (res.success && res.data?.order) {
    return res.data.order as Record<string, any>;
  }
  return null;
}

/** Build order inquiry list from orders-proxy + inquiry API for all orders.
 *
 * 1) `/inquiries/orders` 가 성공하면 그 응답만으로 즉시 화면을 채움.
 *    이 endpoint 는 backend 에서 이미 inquiry + order metadata 를 join 해
 *    `orderProgressStatus / lastMessage / unreadCount` 까지 한 번에 반환하므로
 *    가장 가볍고 정확한 경로다. 미리보기/카드 텍스트가 부족하면 그 뒤에
 *    orders-proxy 로 enrich 한다.
 * 2) 실패 시 기존의 heavy merge 경로 (orders-proxy + getInquiries +
 *    getUnreadCounts) 로 fallback.
 */
export async function fetchOrderInquiryList(
  locale: string,
): Promise<OrderInquiryListItem[]> {
  // 1) fast path — `/inquiries/orders`
  try {
    const fast = await inquiryApi.getOrderInquiries();
    if (fast.success && fast.data?.orders?.length) {
      const items: OrderInquiryListItem[] = fast.data.orders.map((row) =>
        mapRawOrderInquiry(row as Record<string, any>),
      );
      // backend 가 imageUrl / messageCount / 풍부한 progressStatus 를 보내지
      // 않으므로 추가 enrich. 실패해도 기본 리스트는 그대로 노출.
      try {
        const enriched = await enrichOrderInquiriesWithOrderDetails(items, locale);
        return enriched.sort(
          (a, b) =>
            new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime(),
        );
      } catch {
        return items.sort(
          (a, b) =>
            new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime(),
        );
      }
    }
  } catch (e) {
    if (__DEV__) console.warn('[fetchOrderInquiryList] fast path failed, falling back:', e);
  }

  // 2) fallback — 기존 heavy merge 경로
  const [ordersRes, inquiriesRes, unreadRes] = await Promise.all([
    orderApi.getOrders({
      page: 1,
      pageSize: 50,
      lang: locale,
      datePeriod: 'last_6_months',
      viewFilter: 'all',
    }),
    inquiryApi.getInquiries().catch(() => ({ success: false as const })),
    inquiryApi.getUnreadCounts().catch(() => ({ success: false as const })),
  ]);

  const unreadMap: Record<string, number> = {};
  if (unreadRes.success && unreadRes.data?.inquiries) {
    for (const item of unreadRes.data.inquiries) {
      unreadMap[item.inquiryId] = item.unreadCount ?? 0;
    }
  }

  const inquiryByOrderId = new Map<string, Record<string, any>>();
  const orphanInquiries: Record<string, any>[] = [];

  if (inquiriesRes.success && inquiriesRes.data?.inquiries) {
    for (const inq of inquiriesRes.data.inquiries as Record<string, any>[]) {
      const orderId = resolveInquiryOrderId(inq);
      if (orderId) {
        inquiryByOrderId.set(orderId, inq);
      } else {
        orphanInquiries.push(inq);
      }
    }
  }

  const items: OrderInquiryListItem[] = [];
  const seenOrderIds = new Set<string>();

  if (ordersRes.success && ordersRes.data?.orders) {
    for (const order of ordersRes.data.orders) {
      const orderId = String(order.id ?? order._id ?? '');
      if (!orderId) continue;
      seenOrderIds.add(orderId);

      const inquiry = inquiryByOrderId.get(orderId);
      const item = proxyOrderToInquiryListItem(
        order as Record<string, any>,
        inquiry,
        unreadMap,
      );
      if (item) {
        items.push(item);
      }
      if (inquiry) {
        inquiryByOrderId.delete(orderId);
      }
    }
  }

  const remainingInquiries = [
    ...inquiryByOrderId.values(),
    ...orphanInquiries,
  ];
  if (remainingInquiries.length > 0) {
    const mapped = remainingInquiries.map((inq) => mapRawOrderInquiry(inq, unreadMap));
    const enriched = await enrichOrderInquiriesWithOrderDetails(mapped, locale);
    for (const item of enriched) {
      if (!seenOrderIds.has(item.orderId)) {
        items.push(item);
      }
    }
  }

  return items.sort(
    (a, b) =>
      new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime(),
  );
}

export function formatOrderDisplayNumber(orderNumber: string, orderId: string): string {
  if (orderNumber) return orderNumber;
  if (orderId && orderId.length > 6) return `#${orderId.slice(-6)}`;
  return orderId || '';
}
