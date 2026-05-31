import type {
  CenterManageApplicationCategory,
  CenterManageCategoryTree,
  CenterManageMeta,
} from '../services/centerManageApi';

/** API may return plain strings or objects like { customsClearanceMethod, shippingRateRuleId }. */
export const metaOptionLabel = (value: unknown): string => {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.customsClearanceMethod === 'string') return obj.customsClearanceMethod;
    if (typeof obj.name === 'string') return obj.name;
    if (typeof obj.label === 'string') return obj.label;
    if (typeof obj.value === 'string') return obj.value;
  }
  return '';
};

export const normalizeStringArray = (items: unknown): string[] => {
  if (!Array.isArray(items)) return [];
  return items.map(metaOptionLabel).filter((s) => s.length > 0);
};

const normalizeApplicationCategories = (
  items: unknown,
): CenterManageApplicationCategory[] => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (typeof item === 'string') {
        return { name: item, parentParameter: '' };
      }
      if (item && typeof item === 'object') {
        const row = item as Record<string, unknown>;
        const name = metaOptionLabel(row.name ?? row);
        const parentParameter = metaOptionLabel(row.parentParameter) || String(row.parentParameter ?? '');
        if (!name) return null;
        return { name, parentParameter };
      }
      return null;
    })
    .filter((row): row is CenterManageApplicationCategory => row != null);
};

export const normalizeCategoryTree = (raw: unknown): CenterManageCategoryTree => {
  const tree: CenterManageCategoryTree = {};
  if (!raw || typeof raw !== 'object') return tree;

  for (const [businessType, level1] of Object.entries(raw as Record<string, unknown>)) {
    if (!level1 || typeof level1 !== 'object') continue;
    tree[businessType] = {};
    for (const [logistics, level2] of Object.entries(level1 as Record<string, unknown>)) {
      if (!level2 || typeof level2 !== 'object') continue;
      tree[businessType][logistics] = {};
      for (const [transport, level3] of Object.entries(level2 as Record<string, unknown>)) {
        if (!level3 || typeof level3 !== 'object') continue;
        tree[businessType][logistics][transport] = {};
        for (const [appCat, leaf] of Object.entries(level3 as Record<string, unknown>)) {
          tree[businessType][logistics][transport][appCat] = Array.isArray(leaf)
            ? leaf.map(metaOptionLabel).filter((s) => s.length > 0)
            : [];
        }
      }
    }
  }
  return tree;
};

/** Normalize API payload so UI always renders strings, not objects. */
export const normalizeCenterManageMeta = (raw: CenterManageMeta): CenterManageMeta => ({
  ...raw,
  businessType: normalizeStringArray(raw.businessType),
  logisticsCenter: normalizeStringArray(raw.logisticsCenter),
  shippingMethod: normalizeStringArray(raw.shippingMethod),
  customsClearanceMethod: normalizeStringArray(raw.customsClearanceMethod),
  applicationCategory: normalizeApplicationCategories(raw.applicationCategory),
  category: normalizeCategoryTree(raw.category),
});

export type CenterManageSelections = {
  businessType: string;
  logisticsCenter: string;
  transportMethod: string;
  applicationCategory: string;
  customsClearance: string;
};

export const getLogisticsCentersForBusiness = (
  meta: CenterManageMeta,
  businessType: string,
): string[] => {
  const branch = meta.category[businessType];
  if (!branch) return meta.logisticsCenter;
  const fromTree = Object.keys(branch);
  const centers = normalizeStringArray(meta.logisticsCenter);
  return centers.filter((lc) => fromTree.includes(lc));
};

/** 운송방식 — independent list (all methods defined for this business type in category tree). */
export const getTransportMethodsForBusiness = (
  meta: CenterManageMeta,
  businessType: string,
): string[] => {
  const branch = meta.category[businessType];
  const allMethods = normalizeStringArray(meta.shippingMethod);
  if (!branch) return allMethods;
  const available = new Set<string>();
  Object.values(branch).forEach((byLogistics) => {
    Object.keys(byLogistics).forEach((sm) => available.add(sm));
  });
  return allMethods.filter((sm) => available.has(sm));
};

export const getApplicationCategories = (
  meta: CenterManageMeta,
  businessType: string,
  logisticsCenter: string,
  transportMethod: string,
): string[] => {
  const level = meta.category[businessType]?.[logisticsCenter]?.[transportMethod];
  if (!level || typeof level !== 'object') return [];
  return Object.keys(level);
};

export const getCustomsClearanceOptions = (
  meta: CenterManageMeta,
  businessType: string,
  logisticsCenter: string,
  transportMethod: string,
  applicationCategory: string,
): string[] => {
  const list =
    meta.category[businessType]?.[logisticsCenter]?.[transportMethod]?.[applicationCategory];
  return Array.isArray(list) ? list.map(metaOptionLabel).filter((s) => s.length > 0) : [];
};

export const getInitialCenterManageSelections = (
  meta: CenterManageMeta,
): CenterManageSelections => {
  const businessType = meta.businessType[0] ?? '구매대행';
  const logisticsList = getLogisticsCentersForBusiness(meta, businessType);
  const logisticsCenter = logisticsList[0] ?? meta.logisticsCenter[0] ?? '위해';
  const transportList = getTransportMethodsForBusiness(meta, businessType);
  const transportMethod = transportList[0] ?? meta.shippingMethod[0] ?? '해운배송';
  const appCats = getApplicationCategories(
    meta,
    businessType,
    logisticsCenter,
    transportMethod,
  );
  const applicationCategory = appCats[0] ?? '';
  const customsList = applicationCategory
    ? getCustomsClearanceOptions(
        meta,
        businessType,
        logisticsCenter,
        transportMethod,
        applicationCategory,
      )
    : [];
  const customsClearance =
    customsList[0] ?? meta.customsClearanceMethod[0] ?? '사업자';

  return {
    businessType,
    logisticsCenter,
    transportMethod,
    applicationCategory,
    customsClearance,
  };
};

/** Keep selections valid after any field change (cascade from category tree). */
export const reconcileCenterManageSelections = (
  meta: CenterManageMeta,
  current: Partial<CenterManageSelections>,
  changed: keyof CenterManageSelections,
): CenterManageSelections => {
  const businessType =
    current.businessType ?? meta.businessType[0] ?? '구매대행';

  let logisticsCenter = current.logisticsCenter ?? '';
  let transportMethod = current.transportMethod ?? '';
  let applicationCategory = current.applicationCategory ?? '';
  let customsClearance = current.customsClearance ?? '';

  const logisticsList = getLogisticsCentersForBusiness(meta, businessType);
  const transportList = getTransportMethodsForBusiness(meta, businessType);

  if (changed === 'businessType') {
    logisticsCenter = logisticsList[0] ?? '';
    transportMethod = transportList[0] ?? '';
  } else {
    if (!logisticsList.includes(logisticsCenter)) {
      logisticsCenter = logisticsList[0] ?? logisticsCenter;
    }
    // 물류센터·운송방식은 서로 독립 — logistics 변경 시 transportMethod 유지
    if (changed !== 'logisticsCenter' && !transportList.includes(transportMethod)) {
      transportMethod = transportList[0] ?? transportMethod;
    }
  }

  const appCats = getApplicationCategories(
    meta,
    businessType,
    logisticsCenter,
    transportMethod,
  );
  if (
    changed === 'businessType' ||
    changed === 'logisticsCenter' ||
    changed === 'transportMethod'
  ) {
    applicationCategory = appCats[0] ?? '';
  } else if (!appCats.includes(applicationCategory)) {
    applicationCategory = appCats[0] ?? '';
  }

  const customsList = applicationCategory
    ? getCustomsClearanceOptions(
        meta,
        businessType,
        logisticsCenter,
        transportMethod,
        applicationCategory,
      )
    : [];
  if (
    changed === 'businessType' ||
    changed === 'logisticsCenter' ||
    changed === 'transportMethod' ||
    changed === 'applicationCategory'
  ) {
    customsClearance = customsList[0] ?? meta.customsClearanceMethod[0] ?? '사업자';
  } else if (!customsList.includes(customsClearance)) {
    customsClearance = customsList[0] ?? customsClearance;
  }

  return {
    businessType,
    logisticsCenter,
    transportMethod,
    applicationCategory,
    customsClearance,
  };
};

export const isRocketTransportMethod = (transportMethod: string): boolean => {
  const t = transportMethod.trim().toLowerCase();
  return t.includes('로켓') || t.includes('rocket');
};

export const inferCenterManageFlowType = (
  transportMethod: string,
  applicationCategory: string,
): 'sea' | 'air' | 'rocket' => {
  if (isRocketTransportMethod(transportMethod)) return 'rocket';
  const combined = `${transportMethod}${applicationCategory}`.toLowerCase();
  if (combined.includes('항공') || combined.includes('air')) return 'air';
  return 'sea';
};

/**
 * orderMainInfo.requestType (orders-proxy) — matches web 발주정보 modal:
 * - 로켓배송 → `rocket` (English, backend enum)
 * - 해운배송 / 항공배송 → 신청구분 (businessType, e.g. 구매대행)
 */
export const resolveOrderMainRequestType = (
  transportMethod: string,
  businessType: string,
): string => {
  if (isRocketTransportMethod(transportMethod)) {
    return 'rocket';
  }
  return businessType.trim();
};

/** Top-level orderType for backend validation alongside requestType. */
export const resolveOrdersProxyOrderType = (
  transportMethod: string,
): 'General' | 'Rocket' =>
  isRocketTransportMethod(transportMethod) ? 'Rocket' : 'General';

export const deriveOrderTypeFromCenterMeta = (
  transportMethod: string,
  _applicationCategory?: string,
): 'General' | 'Rocket' => resolveOrdersProxyOrderType(transportMethod);

export const profileClearanceToMetaLabel = (isBusiness: boolean): string =>
  isBusiness ? '사업자' : '개인';
