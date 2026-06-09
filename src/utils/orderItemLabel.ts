import type { OrderItem, OrderItemBarcodeInfo } from '../services/orderApi';

export type ResolvedOrderItemLabel = {
  labelType: 'product' | 'foodInspect';
  labelFormat: '50x80' | '40x60';
  productName: string;
  content: string;
  barcode: string;
  imageUrl?: string;
};

const hasText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export const hasOrderItemLabel = (info?: OrderItemBarcodeInfo | null): boolean => {
  if (!info || typeof info !== 'object') return false;
  return Boolean(
    hasText(info.barcodeLabelType) ||
    hasText(info.barcodeIdeFormat) ||
    hasText(info.barcodeProductName) ||
    hasText(info.barcodeContent) ||
    hasText(info.barcodeIdeContent) ||
    hasText(info.barcodeNumber) ||
    hasText(info.barcodeImageUrl) ||
    hasText(info.labelProductName) ||
    hasText(info.labelContent) ||
    hasText(info.labelBarcode) ||
    hasText(info.labelFileUri),
  );
};

export const resolveOrderItemLabel = (
  item: Pick<OrderItem, 'barcodeInfo'>,
  productTitle: string,
): ResolvedOrderItemLabel | null => {
  const info = item.barcodeInfo;
  if (!hasOrderItemLabel(info)) return null;

  const labelType =
    info?.barcodeLabelType === 'foodInspect' ? 'foodInspect' : 'product';
  const labelFormat = info?.barcodeIdeFormat === '40x60' ? '40x60' : '50x80';

  return {
    labelType,
    labelFormat,
    productName:
      info?.barcodeProductName?.trim() ||
      info?.labelProductName?.trim() ||
      productTitle ||
      '',
    content:
      info?.barcodeContent?.trim() ||
      info?.barcodeIdeContent?.trim() ||
      info?.labelContent?.trim() ||
      '',
    barcode: info?.barcodeNumber?.trim() || info?.labelBarcode?.trim() || '',
    imageUrl: info?.barcodeImageUrl || info?.labelFileUri || undefined,
  };
};

export const resolveOrderItemProductStatusLabel = (
  status: string | undefined,
  translate: (key: string) => string,
): string => {
  const raw = String(status ?? '').trim();
  if (!raw) return '';

  const key = `profile.orderDetailPage.productStatus.${raw}`;
  const translated = translate(key);
  if (translated !== key) return translated;

  return raw.replace(/_/g, ' ');
};

export const resolveOrderItemNote = (item: OrderItem): string => {
  const note =
    item.notes?.trim() ||
    (item as { note?: string }).note?.trim() ||
    (item as { usermemo?: string }).usermemo?.trim() ||
    '';
  return note;
};
