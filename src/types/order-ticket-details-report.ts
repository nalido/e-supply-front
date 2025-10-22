export type OrderTicketLot = {
  id: string;
  orderNumber: string;
  styleNumber: string;
  styleName: string;
  bedNumber: string;
  remark?: string;
  color: string;
  cuttingDate: string;
  quantity: number;
};

export type OrderTicketLotListParams = {
  page: number;
  pageSize: number;
  keyword?: string;
};

export type OrderTicketLotListResponse = {
  list: OrderTicketLot[];
  total: number;
};

export type OrderTicketRecordStatus = 'pending' | 'settled' | 'voided';

export type OrderTicketRecord = {
  id: string;
  ticketNo: string;
  orderNumber: string;
  styleNumber: string;
  styleName: string;
  bedNumber: string;
  color: string;
  size: string;
  processName: string;
  pieceRate: number;
  quantity: number;
  amount: number;
  worker: string;
  recordedAt: string;
  status: OrderTicketRecordStatus;
};

export type OrderTicketRecordListParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  lotId: string;
};

export type OrderTicketRecordListResponse = {
  list: OrderTicketRecord[];
  total: number;
  summary: {
    quantity: number;
    amount: number;
  };
};

