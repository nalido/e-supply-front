import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Button, Card, Input, Space, Table, Tabs, Tag, Typography, message } from 'antd';
import { DeleteOutlined, EditOutlined, DownloadOutlined } from '@ant-design/icons';
import { materialIssueService } from '../api/mock';
import type {
  MaterialIssueListParams,
  MaterialIssueRecord,
  MaterialIssueListResponse,
  MaterialIssueMeta,
  MaterialIssueType,
} from '../types/material-issue';

const { Text } = Typography;

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

const formatQuantity = (value: number): string => value.toLocaleString('zh-CN');
const formatCurrency = (value: number): string => value.toLocaleString('zh-CN', { minimumFractionDigits: 2 });

const MaterialIssueDetails = () => {
  const [meta, setMeta] = useState<MaterialIssueMeta | null>(null);
  const [materialType, setMaterialType] = useState<MaterialIssueType>('fabric');
  const [keyword, setKeyword] = useState('');
  const [records, setRecords] = useState<MaterialIssueRecord[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({ issueQtyTotal: 0, amountTotal: 0 });

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const response = await materialIssueService.getMeta();
        setMeta(response);
        if (response.tabs.length) {
          setMaterialType(response.tabs[0].value);
        }
      } catch (error) {
        console.error('failed to load material issue meta', error);
        message.error('加载出库配置失败');
      }
    };
    loadMeta();
  }, []);

  const loadList = useCallback(async () => {
    setTableLoading(true);
    try {
      const params: MaterialIssueListParams = {
        page,
        pageSize,
        materialType,
        keyword: keyword.trim() || undefined,
      };
      const response: MaterialIssueListResponse = await materialIssueService.getList(params);
      setRecords(response.list);
      setTotal(response.total);
      setSummary(response.summary);
    } catch (error) {
      console.error('failed to load material issue list', error);
      message.error('获取领料出库明细失败');
    } finally {
      setTableLoading(false);
    }
  }, [keyword, materialType, page, pageSize]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const handleTabChange = (value: string) => {
    setMaterialType(value as MaterialIssueType);
    setPage(1);
    setSelectedRowKeys([]);
  };

  const handleSearch = () => {
    setPage(1);
    void loadList();
  };

  const handleReset = () => {
    setKeyword('');
    setPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
  };

  const handleTableChange = (nextPage: number, nextPageSize?: number) => {
    setPage(nextPage);
    if (nextPageSize && nextPageSize !== pageSize) {
      setPageSize(nextPageSize);
    }
  };

  const handleModify = () => {
    if (selectedRowKeys.length !== 1) {
      return;
    }
    const record = records.find((item) => item.id === selectedRowKeys[0]);
    if (!record) {
      return;
    }
    message.info(`后续将支持编辑：${record.materialName}`);
  };

  const handleDelete = () => {
    if (!selectedRowKeys.length) {
      return;
    }
    message.warning('当前为演示环境，删除操作未开放');
  };

  const handleExport = () => {
    message.success('已生成导出任务，请在下载中心查看');
  };

  const columns: ColumnsType<MaterialIssueRecord> = useMemo(
    () => [
      {
        title: '序号',
        dataIndex: 'index',
        width: 80,
        align: 'center',
        render: (_value, _record, index) => (page - 1) * pageSize + index + 1,
      },
      {
        title: '图片',
        dataIndex: 'imageUrl',
        width: 96,
        render: (value: string | undefined, record) => (
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 8,
              overflow: 'hidden',
              background: '#f4f4f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {value ? (
              <img src={value} alt={record.materialName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Tag bordered={false}>无图</Tag>
            )}
          </div>
        ),
      },
      {
        title: '采购单号',
        dataIndex: 'poNumber',
        width: 160,
      },
      {
        title: '仓库',
        dataIndex: 'warehouseName',
        width: 140,
      },
      {
        title: '物料名称',
        dataIndex: 'materialName',
        width: 200,
        ellipsis: true,
      },
      {
        title: '颜色',
        dataIndex: 'color',
        width: 120,
        render: (value?: string) => value || <Text type="secondary">-</Text>,
      },
      {
        title: '幅宽',
        dataIndex: 'width',
        width: 120,
        render: (value?: string) => value || <Text type="secondary">-</Text>,
      },
      {
        title: '克重',
        dataIndex: 'weight',
        width: 120,
        render: (value?: string) => value || <Text type="secondary">-</Text>,
      },
      {
        title: '单位',
        dataIndex: 'unit',
        width: 80,
        align: 'center',
      },
      {
        title: '领料数量',
        dataIndex: 'issueQty',
        width: 140,
        align: 'right',
        render: (value: number) => formatQuantity(value),
      },
      {
        title: '包装数',
        dataIndex: 'packageInfo',
        width: 140,
        render: (value?: string) => value || <Text type="secondary">-</Text>,
      },
      {
        title: '缸号',
        dataIndex: 'dyeLotNo',
        width: 120,
        render: (value?: string) => value || <Text type="secondary">-</Text>,
      },
      {
        title: '批次',
        dataIndex: 'batchNo',
        width: 120,
        render: (value?: string) => value || <Text type="secondary">-</Text>,
      },
      {
        title: '单价',
        dataIndex: 'unitPrice',
        width: 140,
        align: 'right',
        render: (value: number) => formatCurrency(value),
      },
      {
        title: '金额',
        dataIndex: 'amount',
        width: 160,
        align: 'right',
        render: (value: number) => formatCurrency(value),
      },
      {
        title: '供应商',
        dataIndex: 'supplierName',
        width: 160,
        render: (value?: string) => value || <Text type="secondary">-</Text>,
      },
      {
        title: '供应商型号',
        dataIndex: 'supplierModel',
        width: 140,
        render: (value?: string) => value || <Text type="secondary">-</Text>,
      },
      {
        title: '供应商色号',
        dataIndex: 'supplierColorNo',
        width: 140,
        render: (value?: string) => value || <Text type="secondary">-</Text>,
      },
      {
        title: '加工厂',
        dataIndex: 'processorName',
        width: 140,
        render: (value?: string) => value || <Text type="secondary">-</Text>,
      },
      {
        title: '来源订单号',
        dataIndex: 'sourceOrderNo',
        width: 160,
        render: (value?: string) => value || <Text type="secondary">-</Text>,
      },
      {
        title: '发料订单号',
        dataIndex: 'dispatchOrderNo',
        width: 160,
        render: (value?: string) => value || <Text type="secondary">-</Text>,
      },
      {
        title: '出库类型',
        dataIndex: 'issueType',
        width: 120,
      },
      {
        title: '领料人',
        dataIndex: 'recipient',
        width: 120,
      },
      {
        title: '领料日期',
        dataIndex: 'issueDate',
        width: 180,
      },
      {
        title: '备注',
        dataIndex: 'remark',
        ellipsis: true,
        render: (value?: string) => value || <Text type="secondary">无备注</Text>,
      },
    ],
    [page, pageSize],
  );

  const tabs = useMemo(() => meta?.tabs ?? [{ value: 'fabric', label: '面料' }], [meta?.tabs]);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card bordered={false} title="领料出库明细">
        <Tabs
          items={tabs.map((tab) => ({ key: tab.value, label: tab.label }))}
          activeKey={materialType}
          onChange={handleTabChange}
        />
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Space size={12} wrap>
            <Input
              placeholder="请输入物料/来源订单号/发料订单号"
              allowClear
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              style={{ width: 340 }}
            />
          </Space>
          <Space size={12}>
            <Button type="primary" onClick={handleSearch}>
              搜索
            </Button>
            <Button onClick={handleReset}>重置</Button>
            <Button icon={<EditOutlined />} disabled={selectedRowKeys.length !== 1} onClick={handleModify}>
              修改
            </Button>
            <Button
              icon={<DeleteOutlined />}
              disabled={!selectedRowKeys.length}
              danger
              onClick={handleDelete}
            >
              删除
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出Excel
            </Button>
          </Space>
        </Space>
      </Card>

      <Card bordered={false}>
        <Table<MaterialIssueRecord>
          rowKey="id"
          loading={tableLoading}
          dataSource={records}
          columns={columns}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS.map(String),
            onChange: handleTableChange,
            showTotal: (value) => `共 ${value} 条`,
          }}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          scroll={{ x: 2000 }}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={9}>
                合计
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                {formatQuantity(summary.issueQtyTotal)}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} colSpan={3} />
              <Table.Summary.Cell index={3} align="right" />
              <Table.Summary.Cell index={4} align="right">
                {formatCurrency(summary.amountTotal)}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={5} colSpan={10} />
            </Table.Summary.Row>
          )}
        />
      </Card>
    </Space>
  );
};

export default MaterialIssueDetails;
