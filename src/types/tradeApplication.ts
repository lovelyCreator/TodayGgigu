export type TradeApplicationType = 'PRICE_SURVEY' | 'OEM';

export type TradeApplicationStatus =
  | 'SUBMITTED'
  | 'RECEIVED'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED';

export interface TradeApplicationProductInfo {
  imageUrl?: string;
  referenceLink?: string;
  name?: string;
  option?: string;
  quantity?: number;
  expectedUnitPriceCNY?: number;
}

export interface TradeApplicationAttachment {
  url: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
  uploadedAt?: string;
}

export interface TradeApplicationCostEstimate {
  amountKRW?: number;
  note?: string;
  setAt?: string;
  setBy?: string;
}

export interface TradeApplicationStatusHistoryEntry {
  fromStatus: TradeApplicationStatus | null;
  toStatus: TradeApplicationStatus;
  by?: string;
  byType?: string;
  at?: string;
  note?: string;
}

export interface TradeApplicationExtraRequest {
  logoRequired?: boolean;
  barcodeRequired?: boolean;
  packagingMethod?: string;
  memo?: string;
}

export interface TradeApplication {
  _id: string;
  user?: string;
  type: TradeApplicationType;
  productInfo?: TradeApplicationProductInfo;
  extraRequest?: TradeApplicationExtraRequest;
  attachments?: TradeApplicationAttachment[];
  contact?: { phone?: string; email?: string };
  status: TradeApplicationStatus;
  costEstimate?: TradeApplicationCostEstimate | null;
  payment?: unknown;
  statusHistory?: TradeApplicationStatusHistoryEntry[];
  applicationNumber?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TradeApplicationsPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface GetMyTradeApplicationsParams {
  page?: number;
  pageSize?: number;
  type: TradeApplicationType;
  search?: string;
  periodFrom?: string;
  periodTo?: string;
}

export interface GetMyTradeApplicationsResponse {
  applications: TradeApplication[];
  pagination: TradeApplicationsPagination;
}

export interface PickedLocalFile {
  /** Local file path from image picker (React Native). */
  uri: string;
  fileName?: string;
  type?: string;
}

export interface SubmitTradeApplicationInput {
  type: TradeApplicationType;
  /** Local picked file — use `uri` (not server `url`). */
  productImage?: PickedLocalFile;
  /** @deprecated Use productImage.uri instead. */
  productImageUri?: string;
  referenceLinks: string[];
  productName: string;
  productOption: string;
  quantity: number;
  expectedUnitPriceCNY: number;
  logoRequired: boolean;
  barcodeRequired: boolean;
  packagingMethod?: string;
  memo?: string;
  attachmentFiles?: PickedLocalFile[];
  /** @deprecated Use attachmentFiles instead. */
  attachmentUris?: string[];
  phone?: string;
  email?: string;
}

export interface SubmitTradeApplicationPayload {
  type: TradeApplicationType;
  productInfo: {
    imageUrl: string;
    referenceLink: string;
    name: string;
    option: string;
    quantity: number;
    expectedUnitPriceCNY: number;
  };
  extraRequest: TradeApplicationExtraRequest;
  contact: {
    phone: string;
    email: string;
  };
  attachments: TradeApplicationAttachment[];
}

export interface SubmitTradeApplicationResponse {
  application: TradeApplication;
}

export interface GetTradeApplicationDetailResponse {
  application: TradeApplication;
}
