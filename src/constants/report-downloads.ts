import type { ReportDownloadListParams, ReportDownloadType } from '../types/report-download-log'

export const REPORT_DOWNLOAD_LABELS: Record<ReportDownloadType, string> = {
  ORDER_PROGRESS: '订单进度明细',
  TICKET_RECORDS: '订单计菲明细',
  SEQUENTIAL_PROCESSES: '按序工序表',
  OUTSOURCING_ORDERS: '外发任务',
  OUTSOURCING_PRODUCTION: '委外生产报表',
  OUTSOURCING_CUTTING_DETAILS: '外发裁剪明细',
  FACTORY_ORDERS: '工厂订单',
  CUTTING_REPORT: '裁床报表',
  QUALITY_INSPECTIONS: '质检记录',
  SAMPLE_ORDERS: '样板单',
  SAMPLE_COSTING: '成本核价表',
  BULK_COST: '大货成本报表',
  SHIPMENT_PROFIT: '订单出货利润',
  MATERIAL_REQUIREMENT: '订单物料需求报表',
  CUSTOMER_RECEIPTS: '客户收款',
  SUPPLIER_PAYMENTS: '供应商付款',
  FACTORY_PAYMENTS: '加工厂付款',
  CUSTOMER_BUSINESS_DETAILS: '客户业务明细表',
  SUPPLIER_BUSINESS_DETAILS: '供应商业务明细表',
  FACTORY_BUSINESS_DETAILS: '加工厂业务明细表',
  RECONCILIATION_DETAILS: '对账明细表',
}

export const REPORT_DOWNLOAD_OPTIONS: Array<{
  label: string
  value: ReportDownloadListParams['reportType']
}> = [
  { label: '全部报表', value: 'ALL' },
  ...Object.entries(REPORT_DOWNLOAD_LABELS).map(([value, label]) => ({
    label,
    value: value as ReportDownloadType,
  })),
]
