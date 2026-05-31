/** Marketplace source keys used by category tabs and product APIs. */
export type ProductPlatformKey = '1688' | 'taobao';

export const resolveProductPlatformKey = (raw?: string | null): ProductPlatformKey => {
  const s = String(raw ?? '1688').toLowerCase();
  if (s.includes('taobao') || s === 'tb') return 'taobao';
  return '1688';
};

/** CategoryTabScreen company tab labels (COMPANY_TABS). */
export const productPlatformToCompanyTab = (
  key: ProductPlatformKey,
): '1688' | 'Taobao' => (key === 'taobao' ? 'Taobao' : '1688');
