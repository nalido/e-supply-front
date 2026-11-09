import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';
import {
  App as AntdApp,
  Button,
  Popconfirm,
  Space,
  Table,
  Tabs,
  Tag,
} from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
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
  MaterialMinimumSpecification,
  MaterialSpecificationRecoveryPreview,
  MaterialUnit,
} from '../types';
import '../styles/material-archive.css';
import { useSearchParams } from 'react-router-dom';

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
  recoveryLoading?: boolean;
  recoveryPreview?: MaterialSpecificationRecoveryPreview;
};

type ImportModalState = {
  open: boolean;
  loading: boolean;
  fileList: UploadFile[];
  parsed: CreateMaterialPayload[];
  parsedRowCount: number;
  resultRows: MaterialImportRowResult[];
};

type ParsedMaterialFile = {
  items: CreateMaterialPayload[];
  sourceRowCount: number;
  errors: MaterialImportRowResult[];
};

const MATERIAL_IMPORT_HEADERS = [
  '物料编号',
  '名称',
  '用量单位',
  '参考单价',
  '最小规格编码',
  '颜色',
  '规格',
  '幅宽',
  '克重',
  '空差',
  '安全库存',
  '图片URL',
  '备注',
];

const MATERIAL_EXPORT_HEADERS = [
  ...MATERIAL_IMPORT_HEADERS,
  '档案状态',
  '创建时间',
  '更新时间',
];

const MATERIAL_SPECIFICATION_EXPORT_HEADERS = [
  '物料编号',
  '物料名称',
  '物料类型',
  '档案状态',
  '最小规格编码',
  '规格标签',
  '颜色',
  '规格',
  '幅宽',
  '克重',
  '安全库存',
  '规格状态',
  '资料类型',
];

const formatExportDateTime = (value?: string) => {
  const parsed = dayjs(value);
  return value && parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss') : '';
};

const toExportDateTime = (value?: string) => {
  const parsed = dayjs(value);
  return value && parsed.isValid() ? parsed.toDate() : '';
};

const configureExportSheet = (
  worksheet: XLSX.WorkSheet,
  headers: string[],
  rowCount: number,
  widths: number[],
) => {
  const lastColumn = XLSX.utils.encode_col(headers.length - 1);
  worksheet['!autofilter'] = { ref: `A1:${lastColumn}${Math.max(rowCount + 1, 1)}` };
  worksheet['!cols'] = widths.map((wch) => ({ wch }));
};

const formatCurrency = (value?: number) => {
  if (value === undefined || Number.isNaN(value)) {
    return '-';
  }
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(value);
};

const MaterialArchive = () => {
  const [searchParams] = useSearchParams();
  const initialKeyword = searchParams.get('keyword')?.trim() ?? '';
  const { message, modal } = AntdApp.useApp();
  const [activeTab, setActiveTab] = useState<MaterialBasicType>('fabric');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [dataset, setDataset] = useState<MaterialDataset>({ list: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [formModal, setFormModal] = useState<FormModalState>({ open: false, submitting: false });
  const [importModal, setImportModal] = useState<ImportModalState>({
    open: false,
    loading: false,
    fileList: [],
    parsed: [],
    parsedRowCount: 0,
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
  }, [activeTab, message]);

  useEffect(() => {
    fetchList({ page: 1, pageSize: pageSizeRef.current, keyword: initialKeyword });
  }, [activeTab, fetchList, initialKeyword]);

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

  const openEditModal = useCallback(async (record: MaterialItem) => {
    setFormModal({
      open: true,
      submitting: false,
      record,
      recoveryLoading: record.legacyUnmappedDimensions === true,
    });
    if (!record.legacyUnmappedDimensions) {
      return;
    }
    try {
      const recoveryPreview = await materialApi.specificationRecoveryPreview(record.id);
      setFormModal((current) => current.record?.id === record.id
        ? { ...current, recoveryLoading: false, recoveryPreview }
        : current);
    } catch (error) {
      console.error('Failed to load material recovery suggestions', error);
      setFormModal((current) => current.record?.id === record.id
        ? { ...current, recoveryLoading: false }
        : current);
      message.warning('原有资料已保留，但组合建议暂时加载失败，请稍后再试');
    }
  }, [message]);

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
  }, [dataset.list.length, fetchList, keyword, message, page, pageSize]);

  const handleOpenImport = () => {
    setImportModal({
      open: true,
      loading: false,
      fileList: [],
      parsed: [],
      parsedRowCount: 0,
      resultRows: [],
    });
  };

  const parseMaterialFile = async (
    file: File,
    materialType: MaterialBasicType,
  ): Promise<ParsedMaterialFile> => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', raw: false });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { items: [], sourceRowCount: 0, errors: [] };
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
  ): ParsedMaterialFile => {
    if (rows.length <= 1) {
      return { items: [], sourceRowCount: 0, errors: [] };
    }
    const header = rows[0].map((value) => String(value ?? '').trim());
    const headerMap = new Map<string, number>();
    header.forEach((label, index) => headerMap.set(label, index));
    const getValue = (row: Array<string | number | null>, label: string) => {
      const idx = headerMap.get(label);
      return idx !== undefined ? String(row[idx] ?? '').trim() : '';
    };
    const splitValues = (value: string) => value
      .split(/[,/，、]/)
      .map((item) => item.trim())
      .filter(Boolean);
    const errors: MaterialImportRowResult[] = [];
    const grouped = new Map<string, {
      payload: CreateMaterialPayload;
      specificationKeys: Set<string>;
    }>();
    let sourceRowCount = 0;

    rows.slice(1).forEach((row, index) => {
      const rowNumber = index + 2;
      if (!row.some((value) => String(value ?? '').trim())) {
        return;
      }
      sourceRowCount += 1;
      const sku = getValue(row, '物料编号') || getValue(row, 'SKU') || getValue(row, '编号');
      const name = getValue(row, '名称');
      const unit = getValue(row, '用量单位') || getValue(row, '单位');
      if (!sku) {
        errors.push({ rowNumber, name, action: 'VALIDATE', success: false, message: '物料编号不能为空' });
        return;
      }

      const priceText = getValue(row, '参考单价') || getValue(row, '单价');
      const priceValue = priceText ? Number(priceText) : undefined;
      if (priceText && (!Number.isFinite(priceValue) || Number(priceValue) < 0)) {
        errors.push({
          rowNumber,
          sku,
          name,
          action: 'VALIDATE',
          success: false,
          message: '参考单价必须是大于等于 0 的数字',
        });
      }
      const safetyStockText = getValue(row, '安全库存');
      const safetyStockQty = safetyStockText ? Number(safetyStockText) : undefined;
      if (safetyStockText && (!Number.isFinite(safetyStockQty) || Number(safetyStockQty) < 0)) {
        errors.push({
          rowNumber,
          sku,
          name,
          action: 'VALIDATE',
          success: false,
          message: '安全库存必须是大于等于 0 的数字',
        });
      }

      const width = getValue(row, '幅宽') || undefined;
      const grammage = getValue(row, '克重') || undefined;
      const tolerance = getValue(row, '空差') || undefined;
      const imageUrl = getValue(row, '图片URL') || undefined;
      const remarks = getValue(row, '备注') || undefined;
      const colors = splitValues(getValue(row, '颜色'));
      const specifications = splitValues(getValue(row, '规格'));
      const specificationCode = getValue(row, '最小规格编码') || undefined;
      if (materialType === 'accessory' && colors.length > 1 && specifications.length > 1) {
        errors.push({
          rowNumber,
          sku,
          name,
          action: 'VALIDATE',
          success: false,
          message: '同一行包含多个颜色和多个规格，无法判断实际组合；请拆成一行一个组合',
        });
        return;
      }

      const colorOptions = colors.length > 0 ? colors : [undefined];
      const specificationOptions = specifications.length > 0 ? specifications : [undefined];
      const combinations = materialType === 'fabric'
        ? colorOptions.map((color) => ({ color, specification: undefined }))
        : colorOptions.flatMap((color) => specificationOptions.map((specification) => ({ color, specification })));
      if (specificationCode && combinations.length > 1) {
        errors.push({
          rowNumber,
          sku,
          name,
          action: 'VALIDATE',
          success: false,
          message: '一个最小规格编码只能对应一个颜色规格组合，请拆分为多行',
        });
        return;
      }

      let group = grouped.get(sku);
      if (!group) {
        group = {
          payload: {
            rowNumber,
            sku,
            name,
            materialType,
            unit: unit as MaterialUnit,
            referencePrice: Number.isFinite(priceValue) ? priceValue : undefined,
            tolerance: materialType === 'fabric' ? tolerance : undefined,
            imageUrl,
            remarks,
            minimumSpecifications: [],
          },
          specificationKeys: new Set<string>(),
        };
        grouped.set(sku, group);
      }

      const mergeField = (key: keyof CreateMaterialPayload, value: unknown, label: string) => {
        if (value === undefined || value === null || value === '') {
          return;
        }
        const target = group?.payload as unknown as Record<string, unknown>;
        const current = target[key];
        if (current !== undefined && current !== null && current !== '' && String(current) !== String(value)) {
          errors.push({
            rowNumber,
            sku,
            name,
            action: 'VALIDATE',
            success: false,
            message: `同一物料编号的${label}不一致`,
          });
          return;
        }
        target[key] = value;
      };
      mergeField('name', name, '名称');
      mergeField('unit', unit as MaterialUnit, '单位');
      mergeField('referencePrice', Number.isFinite(priceValue) ? priceValue : undefined, '参考单价');
      mergeField('tolerance', materialType === 'fabric' ? tolerance : undefined, '空差');
      mergeField('imageUrl', imageUrl, '图片URL');
      mergeField('remarks', remarks, '备注');

      const hasSpecificationData = Boolean(
        specificationCode || colors.length || specifications.length || width || grammage || safetyStockText,
      );
      if (!hasSpecificationData) {
        return;
      }
      combinations.forEach(({ color, specification }) => {
        const dimensionsKey = [
          color?.toLowerCase() ?? '',
          specification?.toLowerCase() ?? '',
          materialType === 'fabric' ? width?.toLowerCase() ?? '' : '',
          materialType === 'fabric' ? grammage?.toLowerCase() ?? '' : '',
        ].join('|');
        const specificationKey = specificationCode
          ? `CODE:${specificationCode.toUpperCase()}`
          : `DIM:${dimensionsKey}`;
        if (group?.specificationKeys.has(specificationKey)) {
          errors.push({
            rowNumber,
            sku,
            name,
            action: 'VALIDATE',
            success: false,
            message: '同一物料存在重复的最小规格组合',
          });
          return;
        }
        group?.specificationKeys.add(specificationKey);
        const label = [color, specification, width, grammage].filter(Boolean).join(' · ') || '通用规格';
        group?.payload.minimumSpecifications?.push({
          code: specificationCode,
          label,
          color,
          specification,
          width: materialType === 'fabric' ? width : undefined,
          grammage: materialType === 'fabric' ? grammage : undefined,
          safetyStockQty: Number.isFinite(safetyStockQty) ? safetyStockQty : undefined,
          active: true,
        });
      });
    });

    const items = Array.from(grouped.values()).map(({ payload }) => {
      const minimumSpecifications = payload.minimumSpecifications ?? [];
      return {
        ...payload,
        colors: Array.from(new Set(
          minimumSpecifications.map((item) => item.color).filter((item): item is string => Boolean(item)),
        )),
        specifications: Array.from(new Set(
          minimumSpecifications
            .map((item) => item.specification)
            .filter((item): item is string => Boolean(item)),
        )),
      };
    });
    return { items, sourceRowCount, errors };
  };

  const validateImportRows = (rows: CreateMaterialPayload[]) => {
    const errors: MaterialImportRowResult[] = [];
    rows.forEach((row) => {
      const rowNumber = row.rowNumber ?? 0;
      const sku = row.sku?.trim();
      if (!sku) {
        errors.push({ rowNumber, sku: row.sku, name: row.name, action: 'VALIDATE', success: false, message: '物料编号不能为空' });
        return;
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
      const parsedFile = importModal.parsed.length > 0
        ? {
            items: importModal.parsed,
            sourceRowCount: importModal.parsedRowCount,
            errors: importModal.resultRows.filter((item) => !item.success),
          }
        : await parseMaterialFile(file, activeTab);
      const payloads = parsedFile.items;
      if (parsedFile.errors.length > 0) {
        setImportModal((prev) => ({ ...prev, resultRows: parsedFile.errors }));
        message.error('导入数据存在错误，请先修正模板');
        return;
      }
      if (payloads.length === 0) {
        message.error('未解析到有效的导入数据');
        return;
      }
      if (parsedFile.sourceRowCount > MATERIAL_IMPORT_MAX_ROWS) {
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
      const validationErrors = [...parsedFile.errors, ...validateImportRows(payloads)];
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
      setImportModal({
        open: false,
        loading: false,
        fileList: [],
        parsed: [],
        parsedRowCount: 0,
        resultRows: [],
      });
      modal.success({
        title: '导入完成',
        content: (
          <div>
            <p>成功处理 {result.imported} 个物料。</p>
            <p>新增 {result.created} 个，更新 {result.updated} 个，失败 {result.failed} 个。</p>
          </div>
        ),
      });
    } catch (error) {
      console.error('Failed to import materials', error);
      message.error('导入失败，请稍后重试');
    } finally {
      setImportModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleExport = async () => {
    if (exportLoading) {
      return;
    }
    setExportLoading(true);
    try {
      const exported = await materialApi.export({ materialType: activeTab, keyword: keyword.trim() });
      if (exported.total === 0) {
        message.warning(keyword.trim() ? '未找到符合当前搜索条件的物料' : '暂无可导出的物料');
        return;
      }
      const rows = exported.list.flatMap((material) => {
        const activeSpecifications = material.minimumSpecifications.filter(
          (item) => item.active && !item.legacyDefault,
        );
        const specifications = activeSpecifications.length > 0 ? activeSpecifications : [undefined];
        return specifications.map((specification) => [
          material.sku,
          material.name,
          material.unit,
          material.referencePrice ?? '',
          specification?.code ?? '',
          specification?.color ?? '',
          specification?.specification ?? '',
          specification?.width ?? material.width ?? '',
          specification?.grammage ?? material.grammage ?? '',
          material.tolerance ?? '',
          specification?.safetyStockQty ?? '',
          material.imageUrl ?? '',
          material.remarks ?? '',
          material.status === 'inactive' ? '停用' : '启用',
          toExportDateTime(material.createdAt),
          toExportDateTime(material.updatedAt),
        ]);
      });
      const specificationRows = exported.list.flatMap((material) => {
        const specifications = material.minimumSpecifications.length > 0
          ? material.minimumSpecifications
          : [undefined];
        return specifications.map((specification) => [
          material.sku,
          material.name,
          material.materialType === 'fabric' ? '面料' : '辅料/包材',
          material.status === 'inactive' ? '停用' : '启用',
          specification?.code ?? '',
          specification?.label ?? '通用规格',
          specification?.color ?? '',
          specification?.specification ?? '',
          specification?.width ?? material.width ?? '',
          specification?.grammage ?? material.grammage ?? '',
          specification?.safetyStockQty ?? '',
          specification?.active === false ? '停用' : '启用',
          specification?.legacyDefault
            ? '历史占位'
            : specification?.id
              ? '正式规格'
              : '原资料推导',
        ]);
      });
      const workbook = XLSX.utils.book_new();
      const materialWorksheet = XLSX.utils.aoa_to_sheet(
        [MATERIAL_EXPORT_HEADERS, ...rows],
        { cellDates: true, dateNF: 'yyyy-mm-dd hh:mm:ss' },
      );
      configureExportSheet(
        materialWorksheet,
        MATERIAL_EXPORT_HEADERS,
        rows.length,
        [22, 24, 12, 12, 18, 14, 16, 12, 12, 10, 12, 36, 28, 12, 20, 20],
      );
      XLSX.utils.book_append_sheet(workbook, materialWorksheet, '物料档案');
      const specificationWorksheet = XLSX.utils.aoa_to_sheet([
        MATERIAL_SPECIFICATION_EXPORT_HEADERS,
        ...specificationRows,
      ]);
      configureExportSheet(
        specificationWorksheet,
        MATERIAL_SPECIFICATION_EXPORT_HEADERS,
        specificationRows.length,
        [22, 24, 12, 12, 18, 28, 14, 16, 12, 12, 12, 12, 14],
      );
      XLSX.utils.book_append_sheet(workbook, specificationWorksheet, '规格明细');
      const summaryWorksheet = XLSX.utils.aoa_to_sheet([
        ['导出项目', '内容'],
        ['导出时间', formatExportDateTime(exported.exportedAt)],
        ['物料类型', activeTab === 'fabric' ? '面料' : '辅料/包材'],
        ['搜索条件', keyword.trim() || '全部'],
        ['物料数量', exported.total],
        ['可回导数据行', rows.length],
        ['规格明细行', specificationRows.length],
        ['回导说明', '仅“物料档案”工作表用于回导；“规格明细”用于核对，不参与导入。'],
      ]);
      summaryWorksheet['!cols'] = [{ wch: 20 }, { wch: 80 }];
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, '导出说明');
      XLSX.utils.book_append_sheet(workbook, buildImportGuideSheet(), '填写说明');
      const timestamp = dayjs().format('YYYYMMDD-HHmmss');
      XLSX.writeFile(
        workbook,
        `物料档案-${activeTab === 'fabric' ? '面料' : '辅料'}-${timestamp}.xlsx`,
      );
      message.success(`已完整导出 ${exported.total} 个物料、${specificationRows.length} 条规格明细`);
    } catch (error) {
      console.error('Failed to export materials', error);
      message.error('导出失败，请稍后重试');
    } finally {
      setExportLoading(false);
    }
  };

  const buildImportGuideSheet = () => {
    const guideRows = [
      ['填写规则', '说明'],
      ['物料编号', '必填。同一编号可填写多行，每行表示一个颜色/规格组合。'],
      ['名称、用量单位', '每个物料必填；同一编号多行必须保持一致。'],
      ['参考单价、图片URL、备注', '新增时可留空；更新已有物料时留空会保留原值，不会清空。'],
      ['最小规格编码', '可选；填写后一个编码只能对应一个颜色/规格组合。'],
      ['颜色与规格', '辅料多颜色多规格请拆成一行一个真实组合，系统不会猜测笛卡尔积。'],
      ['更新规则', '同编号、同类型时安全合并；未出现在文件中的原有规格继续保留。'],
      ['类型保护', '面料编号不能在辅料页导入，辅料编号也不能在面料页导入。'],
      ['导出工作表', '“物料档案”可直接回导；“规格明细”和“导出说明”仅用于核对。'],
      ['档案状态与时间', '导出文件中的状态、创建时间、更新时间为核对信息，回导时不会修改。'],
      ['文件限制', '支持 .xlsx / .xls / .csv，单次最多 500 行、5MB。'],
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(guideRows);
    worksheet['!cols'] = [{ wch: 20 }, { wch: 80 }];
    return worksheet;
  };

  const handleDownloadTemplate = () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([MATERIAL_IMPORT_HEADERS]);
    worksheet['!autofilter'] = { ref: 'A1:M1' };
    worksheet['!cols'] = [
      { wch: 22 }, { wch: 24 }, { wch: 12 }, { wch: 12 }, { wch: 18 },
      { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
      { wch: 12 }, { wch: 36 }, { wch: 28 },
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet, '物料导入');
    XLSX.utils.book_append_sheet(workbook, buildImportGuideSheet(), '填写说明');
    XLSX.writeFile(workbook, `物料导入模板-${activeTab === 'fabric' ? '面料' : '辅料'}.xlsx`);
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
        title: '最小规格',
        dataIndex: 'minimumSpecifications',
        width: 300,
        render: (specifications: MaterialMinimumSpecification[], record: MaterialItem) => {
          const activeSpecifications = (specifications ?? []).filter(
            (specification) => specification.active && !specification.legacyDefault,
          );
          return (
            <Space size={[4, 4]} wrap>
              <Tag color="blue">{activeSpecifications.length} 种</Tag>
              {activeSpecifications.slice(0, 2).map((specification) => (
                <Tag key={specification.id ?? specification.label}>{specification.label}</Tag>
              ))}
              {activeSpecifications.length > 2 ? <span>等 {activeSpecifications.length} 种</span> : null}
              {record.legacyUnmappedDimensions ? <Tag color="gold">原资料待确认</Tag> : null}
            </Space>
          );
        },
      },
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
        exportLoading={exportLoading}
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
        recoveryLoading={formModal.recoveryLoading}
        recoveryPreview={formModal.recoveryPreview}
        onCancel={closeFormModal}
        onSubmit={handleSubmitForm}
      />
      <MaterialImportModal
        open={importModal.open}
        loading={importModal.loading}
        fileList={importModal.fileList}
        previewRows={importModal.parsed}
        sourceRowCount={importModal.parsedRowCount}
        resultRows={importModal.resultRows}
        onCancel={() => setImportModal({
          open: false,
          loading: false,
          fileList: [],
          parsed: [],
          parsedRowCount: 0,
          resultRows: [],
        })}
        onDownloadTemplate={handleDownloadTemplate}
        onFileChange={(fileList) => {
          setImportModal((prev) => ({
            ...prev,
            fileList,
            parsed: [],
            parsedRowCount: 0,
            resultRows: [],
          }));
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
                if (parsed.sourceRowCount > MATERIAL_IMPORT_MAX_ROWS) {
                  setImportModal((prev) => ({
                    ...prev,
                    parsed: parsed.items,
                    parsedRowCount: parsed.sourceRowCount,
                    resultRows: [
                      { rowNumber: 0, action: 'VALIDATE', success: false, message: `单次最多导入 ${MATERIAL_IMPORT_MAX_ROWS} 行` },
                    ],
                  }));
                  message.error(`单次最多导入 ${MATERIAL_IMPORT_MAX_ROWS} 行`);
                  return;
                }
                setImportModal((prev) => ({
                  ...prev,
                  parsed: parsed.items,
                  parsedRowCount: parsed.sourceRowCount,
                  resultRows: [...parsed.errors, ...validateImportRows(parsed.items)],
                }));
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
