import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';
import {
  Button,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tabs,
  Tag,
  message,
} from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import MaterialActionBar from '../components/material/MaterialActionBar';
import ListImage from '../components/common/ListImage';
import MaterialFormModal from '../components/material/MaterialFormModal';
import MaterialImportModal from '../components/material/MaterialImportModal';
import materialApi from '../api/material';
import type { MaterialImportRowResult } from '../api/material';
import type {
  CreateMaterialPayload,
  MaterialBasicType,
  MaterialDataset,
  MaterialItem,
  MaterialUnit,
} from '../types';
import '../styles/material-archive.css';

const MATERIAL_IMPORT_MAX_ROWS = 500;
const MATERIAL_IMPORT_MAX_FILE_SIZE = 5 * 1024 * 1024;

const tabItems = [
  { key: 'fabric', label: '面料' },
  { key: 'accessory', label: '辅料/包材' },
];

type FormModalState = {
  open: boolean;
  submitting: boolean;
  record?: MaterialItem;
};

type ImportModalState = {
  open: boolean;
  loading: boolean;
  fileList: UploadFile[];
  parsed: CreateMaterialPayload[];
  resultRows: MaterialImportRowResult[];
};

const formatCurrency = (value?: number) => {
  if (value === undefined || Number.isNaN(value)) {
    return '-';
  }
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(value);
};

const MaterialArchive = () => {
  const [activeTab, setActiveTab] = useState<MaterialBasicType>('fabric');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [dataset, setDataset] = useState<MaterialDataset>({ list: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [formModal, setFormModal] = useState<FormModalState>({ open: false, submitting: false });
  const [importModal, setImportModal] = useState<ImportModalState>({
    open: false,
    loading: false,
    fileList: [],
    parsed: [],
    resultRows: [],
  });
  const pageSizeRef = useRef(pageSize);

  useEffect(() => {
    pageSizeRef.current = pageSize;
  }, [pageSize]);

  const fetchList = useCallback(async (
    params: { page?: number; pageSize?: number; keyword?: string } = {},
  ) => {
    const nextPage = params.page ?? 1;
    const nextSize = params.pageSize ?? 10;
    const search = params.keyword ?? '';
    setLoading(true);
    try {
      const response = await materialApi.list({
        page: nextPage,
        pageSize: nextSize,
        keyword: search?.trim() ? search.trim() : undefined,
        materialType: activeTab,
      });
      setDataset(response);
      setPage(nextPage);
      setPageSize(nextSize);
    } catch (error) {
      console.error('Failed to load materials', error);
      message.error('加载物料数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchList({ page: 1, pageSize: pageSizeRef.current, keyword: '' });
  }, [activeTab, fetchList]);

  const handleTabChange = (key: string) => {
    setActiveTab(key === 'accessory' ? 'accessory' : 'fabric');
    setKeyword('');
  };

  const handleKeywordChange = (value: string) => {
    setKeyword(value);
  };

  const handleSearch = () => {
    fetchList({ page: 1, pageSize, keyword });
  };

  const handlePageChange = (nextPage: number, nextSize?: number) => {
    fetchList({ page: nextPage, pageSize: nextSize ?? pageSize, keyword });
  };

  const openCreateModal = () => {
    setFormModal({ open: true, submitting: false });
  };

  const openEditModal = useCallback((record: MaterialItem) => {
    setFormModal({ open: true, submitting: false, record });
  }, []);

  const closeFormModal = () => {
    setFormModal({ open: false, submitting: false, record: undefined });
  };

  const handleSubmitForm = async (payload: CreateMaterialPayload) => {
    setFormModal((prev) => ({ ...prev, submitting: true }));
    try {
      if (formModal.record) {
        await materialApi.update(formModal.record.id, payload);
        message.success(`已更新「${payload.name}」`);
      } else {
        await materialApi.create(payload);
        message.success(`已新建「${payload.name}」`);
      }
      closeFormModal();
      fetchList({ page: 1, pageSize, keyword });
    } catch (error) {
      console.error('Failed to submit material form', error);
      message.error('保存物料信息失败，请稍后重试');
    } finally {
      setFormModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const handleRemove = useCallback(async (record: MaterialItem) => {
    setLoading(true);
    try {
      const removed = await materialApi.remove(record.id);
      if (removed) {
        message.success(`已删除「${record.name}」`);
        const currentPage = dataset.list.length === 1 && page > 1 ? page - 1 : page;
        fetchList({ page: currentPage, pageSize, keyword });
      }
    } catch (error) {
      console.error('Failed to remove material', error);
    } finally {
      setLoading(false);
    }
  }, [dataset.list.length, fetchList, keyword, page, pageSize]);

  const handleOpenImport = () => {
    setImportModal({ open: true, loading: false, fileList: [], parsed: [], resultRows: [] });
  };

  const parseMaterialFile = async (file: File, materialType: MaterialBasicType): Promise<CreateMaterialPayload[]> => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', raw: false });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return [];
    }
    const rows = XLSX.utils.sheet_to_json<Array<string | number | null>>(workbook.Sheets[sheetName], {
      header: 1,
      blankrows: false,
      defval: '',
    });
    return parseMaterialRows(rows, materialType);
  };

  const parseMaterialRows = (
    rows: Array<Array<string | number | null>>,
    materialType: MaterialBasicType,
  ): CreateMaterialPayload[] => {
    if (rows.length <= 1) {
      return [];
    }
    const header = rows[0].map((value) => String(value ?? '').trim());
    const headerMap = new Map<string, number>();
    header.forEach((label, index) => headerMap.set(label, index));
    const getValue = (row: Array<string | number | null>, label: string) => {
      const idx = headerMap.get(label);
      return idx !== undefined ? String(row[idx] ?? '').trim() : '';
    };
    return rows
      .slice(1)
      .map((row, index) => {
        const rowNumber = index + 2;
        const sku = getValue(row, '物料编号') || getValue(row, 'SKU') || getValue(row, '编号');
        const name = getValue(row, '名称');
        const unit = getValue(row, '用量单位') || getValue(row, '单位');
        if (!sku && !name && !unit) {
          return null;
        }
        const priceValue = Number(getValue(row, '参考单价') || getValue(row, '单价'));
        const colorsValue = getValue(row, '颜色');
        const colors = colorsValue
          ? colorsValue.split(/[,/，、]/).map((item) => item.trim()).filter(Boolean)
          : undefined;
        const specificationsValue = getValue(row, '规格');
        const specifications = specificationsValue
          ? specificationsValue.split(/[,/，、]/).map((item) => item.trim()).filter(Boolean)
          : undefined;
        return {
          rowNumber,
          sku,
          name,
          materialType,
          unit: unit as MaterialUnit,
          referencePrice: Number.isFinite(priceValue) ? priceValue : undefined,
          width: materialType === 'fabric' ? getValue(row, '幅宽') || undefined : undefined,
          grammage: materialType === 'fabric' ? getValue(row, '克重') || undefined : undefined,
          tolerance: materialType === 'fabric' ? getValue(row, '空差') || undefined : undefined,
          colors,
          specifications: materialType === 'accessory' ? specifications : undefined,
          imageUrl: getValue(row, '图片URL') || undefined,
          remarks: getValue(row, '备注') || undefined,
        } as CreateMaterialPayload;
      })
      .filter((item): item is CreateMaterialPayload => item !== null);
  };

  const validateImportRows = (rows: CreateMaterialPayload[]) => {
    const errors: MaterialImportRowResult[] = [];
    const seenSku = new Map<string, number>();
    rows.forEach((row) => {
      const rowNumber = row.rowNumber ?? 0;
      const sku = row.sku?.trim();
      if (!sku) {
        errors.push({ rowNumber, sku: row.sku, name: row.name, action: 'VALIDATE', success: false, message: '物料编号不能为空' });
        return;
      }
      const firstRow = seenSku.get(sku);
      if (firstRow) {
        errors.push({ rowNumber, sku, name: row.name, action: 'VALIDATE', success: false, message: `物料编号与第 ${firstRow} 行重复` });
      } else {
        seenSku.set(sku, rowNumber);
      }
      if (!row.name?.trim()) {
        errors.push({ rowNumber, sku, name: row.name, action: 'VALIDATE', success: false, message: '名称不能为空' });
      }
      if (!row.unit?.trim()) {
        errors.push({ rowNumber, sku, name: row.name, action: 'VALIDATE', success: false, message: '单位不能为空' });
      }
    });
    return errors;
  };

  const handleStartImport = async () => {
    setImportModal((prev) => ({ ...prev, loading: true }));
    try {
      const file = importModal.fileList[0]?.originFileObj as File | undefined;
      if (!file) {
        message.warning('请先选择导入文件');
        return;
      }
      if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
        message.error('仅支持 .xlsx / .xls / .csv 文件');
        return;
      }
      if (file.size > MATERIAL_IMPORT_MAX_FILE_SIZE) {
        message.error('导入文件不能超过 5MB');
        return;
      }
      const payloads = importModal.parsed.length > 0 ? importModal.parsed : await parseMaterialFile(file, activeTab);
      if (payloads.length === 0) {
        message.error('未解析到有效的导入数据');
        return;
      }
      if (payloads.length > MATERIAL_IMPORT_MAX_ROWS) {
        setImportModal((prev) => ({
          ...prev,
          loading: false,
          resultRows: [
            { rowNumber: 0, action: 'VALIDATE', success: false, message: `单次最多导入 ${MATERIAL_IMPORT_MAX_ROWS} 行` },
          ],
        }));
        message.error(`单次最多导入 ${MATERIAL_IMPORT_MAX_ROWS} 行`);
        return;
      }
      const validationErrors = validateImportRows(payloads);
      if (validationErrors.length > 0) {
        setImportModal((prev) => ({ ...prev, loading: false, resultRows: validationErrors }));
        message.error('导入数据存在错误，请先修正模板');
        return;
      }
      const result = await materialApi.import(payloads, activeTab, 'UPSERT');
      if (!result.success) {
        setImportModal((prev) => ({ ...prev, loading: false, resultRows: result.rows }));
        message.error('导入数据存在错误，请根据明细修正后重试');
        return;
      }
      fetchList({ page: 1, pageSize, keyword });
      setImportModal({ open: false, loading: false, fileList: [], parsed: [], resultRows: [] });
      Modal.success({
        title: '导入完成',
        content: (
          <div>
            <p>成功导入 {result.imported} 条记录。</p>
            <p>新增 {result.created} 条，更新 {result.updated} 条，失败 {result.failed} 条。</p>
          </div>
        ),
      });
    } catch (error) {
      console.error('Failed to import materials', error);
      message.error('导入失败，请稍后重试');
      setImportModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleExport = async () => {
    try {
      const blob = await materialApi.export({ materialType: activeTab, keyword: keyword.trim() });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `物料档案-${activeTab === 'fabric' ? '面料' : '辅料'}.json`;
      link.click();
      window.URL.revokeObjectURL(url);
      message.success('导出任务已开始');
    } catch (error) {
      console.error('Failed to export materials', error);
      message.error('导出失败，请稍后重试');
    }
  };

  const handleDownloadTemplate = () => {
    const csvHeader = activeTab === 'fabric'
      ? '物料编号,名称,用量单位,参考单价,幅宽,克重,空差,颜色,图片URL,备注\n'
      : '物料编号,名称,用量单位,参考单价,颜色,规格,图片URL,备注\n';
    const blob = new Blob([`\ufeff${csvHeader}`], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `物料导入模板-${activeTab === 'fabric' ? '面料' : '辅料'}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const columns = useMemo<ColumnsType<MaterialItem>>(() => {
    return [
      {
        title: '序号',
        dataIndex: 'index',
        width: 60,
        align: 'center',
        render: (_value, _record, index) => (page - 1) * pageSize + index + 1,
      },
      {
        title: '图片',
        dataIndex: 'imageUrl',
        width: 80,
        align: 'center',
        render: (value, record) => <ListImage src={value} alt={record.name} width={48} height={48} borderRadius={4} />,
      },
      {
        title: '物料名称',
        dataIndex: 'name',
        render: (value, record) => (
          <div className="material-name-cell">
            <div className="material-name">{value}</div>
            {record.sku && <div className="material-category-path">编号：{record.sku}</div>}
          </div>
        ),
      },
      ...(activeTab === 'fabric'
        ? [
            { title: '幅宽', dataIndex: 'width' },
            { title: '克重', dataIndex: 'grammage' },
            { title: '空差', dataIndex: 'tolerance' },
          ]
        : []),
      {
        title: '用量单位',
        dataIndex: 'unit',
      },
      {
        title: '参考单价',
        dataIndex: 'referencePrice',
        align: 'right',
        render: (value) => formatCurrency(value),
      },
      {
        title: '颜色',
        dataIndex: 'colors',
        render: (colors: string[]) => (
          <Space size={[4, 4]} wrap>
            {colors && colors.length > 0 ? colors.map((color) => <Tag key={color}>{color}</Tag>) : <span>-</span>}
          </Space>
        ),
      },
      ...(activeTab === 'accessory'
        ? [
            {
              title: '规格',
              dataIndex: 'specifications',
              render: (specifications: string[]) => (
                <Space size={[4, 4]} wrap>
                  {specifications && specifications.length > 0 ? specifications.map((spec) => <Tag key={spec}>{spec}</Tag>) : <span>-</span>}
                </Space>
              ),
            },
          ]
        : []),
      {
        title: '操作',
        dataIndex: 'actions',
        width: 120,
        align: 'center',
        render: (_value, record) => (
          <Space size={8}>
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
              编辑
            </Button>
            <Popconfirm
              title="删除物料"
              description={`确定要删除「${record.name}」吗？`}
              onConfirm={() => handleRemove(record)}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ];
  }, [activeTab, handleRemove, openEditModal, page, pageSize]);

  return (
    <div className="material-archive-page">
      <Tabs
        className="material-tabs"
        items={tabItems}
        activeKey={activeTab}
        onChange={handleTabChange}
      />
      <MaterialActionBar
        keyword={keyword}
        loading={loading}
        onKeywordChange={handleKeywordChange}
        onSearch={handleSearch}
        onCreate={openCreateModal}
        onImport={handleOpenImport}
        onExport={handleExport}
      />
      <Table<MaterialItem>
        rowKey="id"
        columns={columns}
        dataSource={dataset.list}
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total: dataset.total,
          showQuickJumper: true,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '30', '50'],
          showTotal: (total) => `共 ${total} 条`,
          onChange: handlePageChange,
        }}
        bordered
        className="material-table"
      />
      <MaterialFormModal
        open={formModal.open}
        loading={formModal.submitting}
        title={formModal.record ? '编辑物料' : '新建物料'}
        materialType={formModal.record?.materialType ?? activeTab}
        initialValues={formModal.record}
        onCancel={closeFormModal}
        onSubmit={handleSubmitForm}
      />
      <MaterialImportModal
        open={importModal.open}
        loading={importModal.loading}
        fileList={importModal.fileList}
        previewRows={importModal.parsed}
        resultRows={importModal.resultRows}
        onCancel={() => setImportModal({ open: false, loading: false, fileList: [], parsed: [], resultRows: [] })}
        onDownloadTemplate={handleDownloadTemplate}
        onFileChange={(fileList) => {
          setImportModal((prev) => ({ ...prev, fileList, parsed: [], resultRows: [] }));
          const file = fileList[0]?.originFileObj as File | undefined;
          if (file) {
            if (file.size > MATERIAL_IMPORT_MAX_FILE_SIZE) {
              setImportModal((prev) => ({
                ...prev,
                fileList: [],
                resultRows: [{ rowNumber: 0, action: 'VALIDATE', success: false, message: '导入文件不能超过 5MB' }],
              }));
              message.error('导入文件不能超过 5MB');
              return;
            }
            parseMaterialFile(file, activeTab)
              .then((parsed) => {
                if (parsed.length > MATERIAL_IMPORT_MAX_ROWS) {
                  setImportModal((prev) => ({
                    ...prev,
                    parsed,
                    resultRows: [
                      { rowNumber: 0, action: 'VALIDATE', success: false, message: `单次最多导入 ${MATERIAL_IMPORT_MAX_ROWS} 行` },
                    ],
                  }));
                  message.error(`单次最多导入 ${MATERIAL_IMPORT_MAX_ROWS} 行`);
                  return;
                }
                setImportModal((prev) => ({ ...prev, parsed, resultRows: validateImportRows(parsed) }));
              })
              .catch((error) => {
                console.error('Failed to parse material import file', error);
                setImportModal((prev) => ({
                  ...prev,
                  resultRows: [{ rowNumber: 0, action: 'PARSE', success: false, message: '文件解析失败，请检查模板格式' }],
                }));
              });
          }
        }}
        onStartImport={handleStartImport}
      />
    </div>
  );
};

export default MaterialArchive;
