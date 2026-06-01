export type ProductShareChannel = 'twitter' | 'facebook' | 'kakao' | 'naver' | 'whatsapp';

const PRODUCT_SHARE_BASE_URL = 'https://todaymall.com/product';

export function buildProductSharePageUrl(params: {
  productId: string;
  source?: string;
  country?: string;
}): string {
  const id = encodeURIComponent(params.productId);
  const query = new URLSearchParams();
  if (params.source) query.set('source', params.source);
  if (params.country) query.set('country', params.country);
  const qs = query.toString();
  return qs ? `${PRODUCT_SHARE_BASE_URL}/${id}?${qs}` : `${PRODUCT_SHARE_BASE_URL}/${id}`;
}

export function buildProductShareChannelUrl(
  channel: ProductShareChannel,
  productUrl: string,
  title: string,
  message: string,
): string {
  const encodedUrl = encodeURIComponent(productUrl);
  const encodedTitle = encodeURIComponent(title);
  const encodedMessage = encodeURIComponent(message);
  const encodedMessageWithUrl = encodeURIComponent(`${message}\n${productUrl}`);

  switch (channel) {
    case 'twitter':
      return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedMessage}`;
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    case 'kakao':
      return `https://sharer.kakao.com/talk/friends/picker?url=${encodedUrl}`;
    case 'naver':
      return `https://share.naver.com/web/shareView?url=${encodedUrl}&title=${encodedTitle}`;
    case 'whatsapp':
      return `https://api.whatsapp.com/send?text=${encodedMessageWithUrl}`;
    default:
      return productUrl;
  }
}
