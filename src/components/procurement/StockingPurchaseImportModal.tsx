import { useEffect, useState } from 'react';
import { Alert, App as AntdApp, Button, Modal, Space, Table, Typography, Upload } from 'antd';
import { DownloadOutlined, InboxOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import * as XLSX from 'xlsx';
import { stockingPurchaseInboundService } from '../../api/procurement';
import type { StockingImportRow } from '../../types/stocking-purchase-inbound';

const { Text } = Typography;
const headers = [
  '采购单号', '供应商', '仓库', '采购日期', '预计到货日期', '整单备注',
  '物料编号', '最小规格编码', '颜色', '规格', '幅宽', '克重', '采购数量', '采购单价', '明细备注',
] as const;
const requiredHeaders = ['采购单号', '供应商', '仓库', '采购日期', '物料编号', '采购数量'];
const maxRows = 500;
const maxFileSize = 5 * 1024 * 1024;

type Props = {
  open: boolean;
  materialType: 'fabric' | 'accessory';
  onClose: () => void;
  onImported: () => void;
};

const parseDate = (value: string | number | Date, rowNumber: number, label: string) => {
  if (!value) return undefined;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new Error(`第 ${rowNumber} 行：${label}不是有效日期`);
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
  }
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) throw new Error(`第 ${rowNumber} 行：${label}不是有效日期`);
    return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
  }
  const match = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(value);
  if (!match) throw new Error(`第 ${rowNumber} 行：${label}须填写为 YYYY-MM-DD`);
  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error(`第 ${rowNumber} 行：${label}不是有效日期`);
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const parseNumber = (value: string, rowNumber: number, label: string, required: boolean) => {
  if (!value && !required) return undefined;
  const number = Number(value);
  if (!value || !Number.isFinite(number) || number < 0 || (required && number === 0)) {
    throw new Error(`第 ${rowNumber} 行：${label}须为${required ? '大于 0' : '不小于 0'}的数字`);
  }
  if (required && !/^\d+(\.\d{1,4})?$/.test(value)) {
    throw new Error(`第 ${rowNumber} 行：采购数量最多 4 位小数`);
  }
  return number;
};

const parseFile = async (file: File): Promise<StockingImportRow[]> => {
  const workbook = XLSX.read(await file.arrayBuffer(), {
    type: 'array',
    cellDates: true,
    ...(/\.csv$/i.test(file.name) ? { codepage: 65001, raw: true } : {}),
  });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) throw new Error('文件内没有可读取的表格');
  const cells = XLSX.utils.sheet_to_json<Array<string | number | Date | null>>(workbook.Sheets[firstSheet], {
    header: 1, defval: '', blankrows: true, raw: true,
  });
  const heading = (cells[0] ?? []).map((item) => String(item ?? '').trim());
  const missing = requiredHeaders.filter((item) => !heading.includes(item));
  if (missing.length) throw new Error(`模板缺少列：${missing.join('、')}`);
  const rawColumn = (row: Array<string | number | Date | null>, name: string) =>
    row[heading.indexOf(name)] ?? '';
  const column = (row: Array<string | number | Date | null>, name: string) =>
    String(row[heading.indexOf(name)] ?? '').trim();
  const records = cells.slice(1).map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => row.some((value) => String(value ?? '').trim()));
  if (!records.length) throw new Error('文件中没有采购明细');
  if (records.length > maxRows) throw new Error(`单次最多导入 ${maxRows} 条采购明细`);
  return records.map(({ row, rowNumber }) => {
    const required = (name: string) => {
      const value = column(row, name);
      if (!value) throw new Error(`第 ${rowNumber} 行：${name}不能为空`);
      return value;
    };
    required('采购日期');
    return {
      rowNumber,
      orderNo: required('采购单号'),
      supplierName: required('供应商'),
      warehouseName: required('仓库'),
      orderDate: parseDate(rawColumn(row, '采购日期') as string | number | Date, rowNumber, '采购日期')!,
      expectedArrival: parseDate(rawColumn(row, '预计到货日期') as string | number | Date, rowNumber, '预计到货日期'),
      orderRemark: column(row, '整单备注'),
      materialSku: required('物料编号'),
      minimumSpecificationCode: column(row, '最小规格编码'),
      color: column(row, '颜色'),
      specification: column(row, '规格'),
      width: column(row, '幅宽'),
      grammage: column(row, '克重'),
      quantity: parseNumber(required('采购数量'), rowNumber, '采购数量', true)!,
      unitPrice: parseNumber(column(row, '采购单价'), rowNumber, '采购单价', false),
      lineRemark: column(row, '明细备注'),
    };
  });
};

const StockingPurchaseImportModal = ({ open, materialType, onClose, onImported }: Props) => {
  const { message } = AntdApp.useApp();
  const [fileName, setFileName] = useState('');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [rows, setRows] = useState<StockingImportRow[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setFileName('');
      setFileList([]);
      setRows([]);
      setError('');
    }
  }, [open]);

  const downloadTemplate = () => {
    const workbook = XLSX.utils.book_new();
    const data = XLSX.utils.aoa_to_sheet([[...headers]]);
    data['!cols'] = headers.map((label) => ({ wch: Math.max(label.length * 2 + 4, 16) }));
    XLSX.utils.book_append_sheet(workbook, data, '备料采购明细');
    const guide = XLSX.utils.aoa_to_sheet([
      ['填写说明'],
      ['一行一条物料明细；同一采购单的采购单号、供应商、仓库、日期和整单备注须相同。'],
      ['采购单号须唯一；重复导入相同采购单号会被拒绝，避免重复建单。'],
      ['供应商、仓库和物料编号须已在档案中存在；系统不会自动新建档案。'],
      ['多最小规格物料请填准确的最小规格编码，或填能唯一确定规格的颜色、规格、幅宽、克重。'],
      ['日期格式 YYYY-MM-DD；采购数量大于 0、最多 4 位小数；采购单价可留空。'],
      ['导入只建立备料采购单，不计实收、不增加库存；到货后仍需执行收料。'],
    ]);
    guide['!cols'] = [{ wch: 105 }];
    XLSX.utils.book_append_sheet(workbook, guide, '填写说明');
    XLSX.writeFile(workbook, `备料采购导入模板-${materialType === 'fabric' ? '面料' : '辅料包材'}.xlsx`);
  };

  const chooseFile = async (file: File) => {
    setRows([]);
    setError('');
    setFileName(file.name);
    setFileList([{ uid: file.name, name: file.name, status: 'done' }]);
    if (!/\.(xlsx|xls|csv)$/i.test(file.name) || file.size > maxFileSize) {
      setError('请选择不超过 5MB 的 .xlsx、.xls 或 .csv 文件');
      return false;
    }
    try {
      setRows(await parseFile(file));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '文件解析失败');
    }
    return false;
  };

  const importRows = async () => {
    if (!rows.length || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await stockingPurchaseInboundService.importOrders(rows, materialType);
      message.success(`已导入 ${result.orderCount} 张采购单、${result.lineCount} 条明细`);
      setRows([]);
      setFileName('');
      setFileList([]);
      onImported();
      onClose();
    } catch (cause) {
      const response = cause as { response?: { data?: { message?: string } } };
      setError(response.response?.data?.message || '导入失败，请检查文件后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return <Modal
    title="导入备料采购单"
    open={open}
    onCancel={onClose}
    onOk={importRows}
    okText="确认导入"
    okButtonProps={{ disabled: !rows.length }}
    confirmLoading={submitting}
    width={920}
    destroyOnHidden
  >
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div>
        <Text>先下载模板，填写采购单与物料明细。</Text>
        <Button type="link" icon={<DownloadOutlined />} onClick={downloadTemplate}>下载模板</Button>
      </div>
      <Upload.Dragger
        accept=".xlsx,.xls,.csv"
        maxCount={1}
        fileList={fileList}
        beforeUpload={chooseFile}
        onRemove={() => { setRows([]); setFileName(''); setFileList([]); setError(''); }}
      >
        <p className="ant-upload-drag-icon"><InboxOutlined /></p>
        <p className="ant-upload-text">点击或拖入已填写的模板</p>
        <p className="ant-upload-hint">支持 Excel / CSV，单次最多 500 条明细，文件不超过 5MB</p>
      </Upload.Dragger>
      <Alert type="info" showIcon message="导入后生成待收料采购单；实际入库仍需在采购单上办理收料。" />
      {error && <Alert type="error" showIcon message={error} />}
      {rows.length > 0 && <>
        <Text>已解析 {fileName}：{new Set(rows.map((row) => row.orderNo)).size} 张采购单、{rows.length} 条明细</Text>
        <Table
          size="small"
          rowKey="rowNumber"
          dataSource={rows}
          pagination={{ pageSize: 5 }}
          scroll={{ x: 800 }}
          columns={[
            { title: '行号', dataIndex: 'rowNumber', width: 70 },
            { title: '采购单号', dataIndex: 'orderNo', width: 150 },
            { title: '供应商', dataIndex: 'supplierName', width: 130 },
            { title: '仓库', dataIndex: 'warehouseName', width: 130 },
            { title: '物料编号', dataIndex: 'materialSku', width: 150 },
            { title: '数量', dataIndex: 'quantity', width: 100 },
          ]}
        />
      </>}
    </Space>
  </Modal>;
};

export default StockingPurchaseImportModal;
