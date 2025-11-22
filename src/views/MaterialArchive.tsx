import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';
import {
  Avatar,
  Button,
  Image,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tabs,
  Tag,
  message,
} from 'antd';
import { DeleteOutlined, EditOutlined, PictureOutlined } from '@ant-design/icons';
import MaterialActionBar from '../components/material/MaterialActionBar';
import MaterialFormModal from '../components/material/MaterialFormModal';
import MaterialImportModal from '../components/material/MaterialImportModal';
import materialApi from '../api/material';
import type {
  CreateMaterialPayload,
  MaterialBasicType,
  MaterialDataset,
  MaterialItem,
} from '../types';
import '../styles/material-archive.css';

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
  const [importModal, setImportModal] = useState<ImportModalState>({ open: false, loading: false, fileList: [] });
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
      message.error('删除失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [dataset.list.length, fetchList, keyword, page, pageSize]);

  const handleOpenImport = () => {
    setImportModal({ open: true, loading: false, fileList: [] });
  };

  const handleStartImport = async () => {
    setImportModal((prev) => ({ ...prev, loading: true }));
    try {
      const mockPayload: CreateMaterialPayload[] = [
        {
          name: `${activeTab === 'fabric' ? '导入面料' : '导入辅料'}-${Date.now().toString().slice(-4)}`,
          materialType: activeTab,
          unit: activeTab === 'fabric' ? '米' : '个',
          price: activeTab === 'fabric' ? 18.6 : 0.42,
          width: activeTab === 'fabric' ? '145cm' : undefined,
          colors: activeTab === 'fabric' ? ['默认色'] : ['黑色'],
          remarks: `来自导入文件 ${importModal.fileList[0]?.name ?? ''}`.trim(),
        },
      ];
      const count = await materialApi.import(mockPayload, activeTab);
      fetchList({ page: 1, pageSize, keyword });
      setImportModal({ open: false, loading: false, fileList: [] });
      Modal.success({
        title: '导入完成',
        content: (
          <div>
            <p>成功导入 {count} 条记录。</p>
            <p>失败 0 条。</p>
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
    const csvHeader = '名称,用量单位,单价,幅宽,克重,空差,颜色,备注\n';
    const blob = new Blob([csvHeader], { type: 'text/csv;charset=utf-8;' });
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
        render: (value, record) => {
          if (value) {
            return <Image src={value} alt={record.name} width={48} height={48} style={{ objectFit: 'cover', borderRadius: 4 }} />;
          }
          return (
            <Avatar shape="square" size={48} icon={<PictureOutlined />} style={{ backgroundColor: '#f5f5f5' }} />
          );
        },
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
      { title: '幅宽', dataIndex: 'width' },
      { title: '克重', dataIndex: 'grammage' },
      { title: '空差', dataIndex: 'tolerance' },
      {
        title: '用量单位',
        dataIndex: 'unit',
      },
      {
        title: '单价',
        dataIndex: 'price',
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
  }, [handleRemove, openEditModal, page, pageSize]);

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
        onCancel={() => setImportModal({ open: false, loading: false, fileList: [] })}
        onDownloadTemplate={handleDownloadTemplate}
        onFileChange={(fileList) => setImportModal((prev) => ({ ...prev, fileList }))}
        onStartImport={handleStartImport}
      />
    </div>
  );
};

export default MaterialArchive;
