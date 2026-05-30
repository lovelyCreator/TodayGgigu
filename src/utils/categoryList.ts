type LocaleKey = 'en' | 'ko' | 'zh';

export function mapLocaleToCategoryLang(locale: string): LocaleKey {
  if (locale === 'kr') return 'ko';
  if (locale === 'en' || locale === 'zh' || locale === 'ko') return locale;
  return 'ko';
}

/** Resolve display label from categories-proxy item (L1/L2/L3) */
export function pickCategoryLabel(
  node: any,
  locale: string = 'ko',
): string {
  if (!node || typeof node !== 'object') return '';

  const loc = mapLocaleToCategoryLang(locale);

  const flatByLocale: Record<LocaleKey, string> = {
    en: 'nameEn',
    ko: 'nameKo',
    zh: 'nameZh',
  };
  const flatKey = flatByLocale[loc];
  if (typeof node[flatKey] === 'string' && node[flatKey].trim()) {
    return node[flatKey].trim();
  }

  if (typeof node.name === 'string' && node.name.trim()) {
    return node.name.trim();
  }

  if (node.name && typeof node.name === 'object') {
    const o = node.name as Record<string, string>;
    return (
      o[loc] ||
      o.ko ||
      o.en ||
      o.zh ||
      Object.values(o).find((v) => typeof v === 'string' && v.trim()) ||
      ''
    ).trim();
  }

  if (typeof node.nameTrans === 'string' && node.nameTrans.trim()) {
    return node.nameTrans.trim();
  }
  if (node.nameTrans && typeof node.nameTrans === 'object') {
    const o = node.nameTrans as Record<string, string>;
    return (o[loc] || o.ko || o.en || o.zh || '').trim();
  }

  if (node.nameMultiLang && typeof node.nameMultiLang === 'object') {
    const o = node.nameMultiLang as Record<string, string>;
    return (o[loc] || o.ko || o.en || o.zh || '').trim();
  }

  if (typeof node.title === 'string' && node.title.trim()) {
    return node.title.trim();
  }
  if (node.title && typeof node.title === 'object') {
    const o = node.title as Record<string, string>;
    return (o[loc] || o.ko || o.en || o.zh || '').trim();
  }

  if (typeof node.label === 'string' && node.label.trim()) {
    return node.label.trim();
  }

  if (typeof node.categoryName === 'string' && node.categoryName.trim()) {
    return node.categoryName.trim();
  }
  if (node.categoryName && typeof node.categoryName === 'object') {
    const o = node.categoryName as Record<string, string>;
    return (o[loc] || o.ko || o.en || o.zh || '').trim();
  }

  if (typeof node.displayName === 'string' && node.displayName.trim()) {
    return node.displayName.trim();
  }

  return '';
}

export function getCategoryNodeId(node: any): string {
  const id = node?._id ?? node?.id ?? node?.categoryId;
  if (id != null && String(id).trim() !== '') return String(id);
  if (node?.externalId != null && String(node.externalId).trim() !== '') {
    return String(node.externalId);
  }
  return '';
}

/** L1 list from GET .../categories-proxy?endpoint=top */
export function extractL1Categories(payload: any): any[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;

  const direct =
    payload.categories ??
    payload.items ??
    payload.list ??
    payload.tree ??
    payload.result ??
    payload.nodes ??
    payload.topCategories ??
    payload.categoryList;

  if (Array.isArray(direct)) return direct;
  if (direct && typeof direct === 'object' && Array.isArray((direct as any).categories)) {
    return (direct as any).categories;
  }

  if (payload.data != null) {
    const nested = extractL1Categories(payload.data);
    if (nested.length > 0) return nested;
  }

  return [];
}

/** L2 list from GET .../categories-proxy?endpoint=children */
export function extractL2Tree(payload: any): any[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;

  const direct =
    payload.tree ??
    payload.children ??
    payload.childCategories ??
    payload.child_categories ??
    payload.categories ??
    payload.items ??
    payload.list ??
    payload.subCategories ??
    payload.subcategories;

  if (Array.isArray(direct)) return direct;
  if (direct && typeof direct === 'object' && Array.isArray((direct as any).tree)) {
    return (direct as any).tree;
  }

  if (payload.data != null) {
    const nested = extractL2Tree(payload.data);
    if (nested.length > 0) return nested;
  }

  return [];
}

/** L2/L3 nodes embedded on a parent category item */
export function getEmbeddedL2Children(node: any): any[] {
  if (!node || typeof node !== 'object') return [];
  const kids =
    node.children ??
    node.childCategories ??
    node.child_categories ??
    node.subCategories ??
    node.subcategories;
  return Array.isArray(kids) ? kids : [];
}

/** Build L2 map when L1 items already include children (tree / top+children payload) */
export function buildL2MapFromL1List(l1List: any[]): Record<string, any[]> {
  const map: Record<string, any[]> = {};
  for (const l1 of l1List) {
    const id = getCategoryNodeId(l1);
    if (!id) continue;
    const kids = getEmbeddedL2Children(l1);
    if (kids.length > 0) map[id] = kids;
  }
  return map;
}

/** True when every L1 has embedded L2 children (skip per-L1 children API) */
export function l1ListHasEmbeddedL2(l1List: any[]): boolean {
  if (l1List.length === 0) return false;
  return l1List.every((l1) => getEmbeddedL2Children(l1).length > 0);
}

/** Parent id for children endpoint (_id preferred, externalId fallback) */
export function getCategoryParentId(node: any): string {
  if (node?._id != null && String(node._id).trim() !== '') {
    return String(node._id);
  }
  if (node?.id != null && String(node.id).trim() !== '') {
    return String(node.id);
  }
  if (node?.externalId != null && String(node.externalId).trim() !== '') {
    return String(node.externalId);
  }
  return '';
}
