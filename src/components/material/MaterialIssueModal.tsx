import { useEffect, useMemo, useRef, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Alert, Button, Input, Modal, Select, Space, Table, Typography, InputNumber, message } from 'antd';
import type { MaterialStockListItem, MaterialStockType } from '../../types/material-stock';
import { materialIssueService } from '../../api/material-inventory';
import { pieceworkService } from '../../api/piecework';
import type { MaterialIssueCreatePayload } from '../../types/material-issue';
import '../../styles/matrix-table.css';

const { Text } = Typography;

export type MaterialIssueModalProps = {
  open: boolean;
  materials: MaterialStockListItem[];
  materialType: MaterialStockType;
  onClose: () => void;
  onIssued: () => void;
};

const MaterialIssueModal = ({ open, materials, materialType, onClose, onIssued }: MaterialIssueModalProps) => {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [bulkQuantity, setBulkQuantity] = useState<number | null>(null);
  const [remark, setRemark] = useState('');
  const [workOrderId, setWorkOrderId] = useState<string>();
  const [cuttingBedId, setCuttingBedId] = useState<string>();
  const [cuttingKeyword, setCuttingKeyword] = useState('');
  const [cuttingOptions, setCuttingOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [cuttingLoading, setCuttingLoading] = useState(false);
  const [bedOptions, setBedOptions] = useState<Array<{ label: string; value: string; bedNumber: string }>>([]);
  const [bedLoading, setBedLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const cuttingRequestRef = useRef(0);
  const bedRequestRef = useRef(0);

  useEffect(() => {
    if (!open) {
      setQuantities({});
      setBulkQuantity(null);
      setRemark('');
      setWorkOrderId(undefined);
      setCuttingBedId(undefined);
      setCuttingKeyword('');
      setCuttingOptions([]);
      setBedOptions([]);
    }
  }, [open, materials]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const requestId = cuttingRequestRef.current + 1;
    cuttingRequestRef.current = requestId;
    const timer = window.setTimeout(() => {
      setCuttingLoading(true);
      void pieceworkService.getCuttingPending({
        page: 1,
        pageSize: 20,
        keyword: cuttingKeyword.trim() || undefined,
        includeCompleted: true,
        includeSummary: false,
      }).then((result) => {
        if (cuttingRequestRef.current !== requestId) return;
        setCuttingOptions(result.list
          .filter((task) => task.workOrderId)
          .map((task) => ({
            value: String(task.workOrderId),
            label: [task.orderCode, task.styleCode, task.styleName].filter(Boolean).join(' · '),
          })));
      }).catch((error) => {
        if (cuttingRequestRef.current !== requestId) return;
        console.error('failed to search cutting sheets', error);
        setCuttingOptions([]);
      }).finally(() => {
        if (cuttingRequestRef.current === requestId) {
          setCuttingLoading(false);
        }
      });
    }, cuttingKeyword ? 300 : 0);
    return () => {
      window.clearTimeout(timer);
      if (cuttingRequestRef.current === requestId) {
        cuttingRequestRef.current += 1;
      }
    };
  }, [cuttingKeyword, open]);

  useEffect(() => {
    if (!open || !workOrderId) {
      setBedLoading(false);
      setBedOptions([]);
      return undefined;
    }
    const requestId = bedRequestRef.current + 1;
    bedRequestRef.current = requestId;
    setBedLoading(true);
    void pieceworkService.getCuttingSheetDetail(Number(workOrderId)).then((detail) => {
      if (bedRequestRef.current !== requestId) return;
      setBedOptions((detail.bedRecords ?? [])
        .filter((record) => Boolean(record.bedId))
        .map((record) => ({
          value: record.bedId!,
          bedNumber: record.bedNumber,
          label: `${record.bedNumber} · ${record.totalQty.toLocaleString('zh-CN')} 件`,
        })));
    }).catch((error) => {
      if (bedRequestRef.current !== requestId) return;
      console.error('failed to load cutting beds', error);
      setBedOptions([]);
      message.error('加载床次失败，请重新选择裁床单');
    }).finally(() => {
      if (bedRequestRef.current === requestId) {
        setBedLoading(false);
      }
    });
    return () => {
      if (bedRequestRef.current === requestId) {
        bedRequestRef.current += 1;
      }
    };
  }, [open, workOrderId]);

  const handleQuantityChange = (materialId: string, value: number | null) => {
    setQuantities((prev) => ({
      ...prev,
      [materialId]: value ?? 0,
    }));
  };

  const tableData = useMemo(() => materials, [materials]);

  const handleApplyBulkQuantity = () => {
    if (!tableData.length) {
      message.warning('请先选择需要出库的物料');
      return;
    }
    if (!bulkQuantity || bulkQuantity <= 0) {
      message.warning('请填写大于 0 的批量出库数量');
      return;
    }
    const exceeded = tableData.find((item) => bulkQuantity > item.availableQty);
    if (exceeded) {
      message.error(`${exceeded.materialName}${exceeded.color ? `（${exceeded.color}）` : ''} 可用库存不足`);
      return;
    }
    setQuantities((prev) => {
      const next = { ...prev };
      tableData.forEach((item) => {
        next[item.id] = bulkQuantity;
      });
      return next;
    });
    message.success(`已批量填写 ${tableData.length} 条出库数量`);
  };

  const handleClearBulkQuantity = () => {
    setBulkQuantity(null);
    setQuantities({});
  };

  const rowsWithQuantity = useMemo(() => {
    return tableData.filter((item) => {
      const qty = quantities[item.id];
      return qty !== undefined && qty > 0;
    });
  }, [quantities, tableData]);

  const disabled = !rowsWithQuantity.length || submitting;
  const warehouseName = materials[0]?.warehouseName;

  const columns: ColumnsType<MaterialStockListItem> = useMemo(
    () => [
      {
        title: '物料名称',
        dataIndex: 'materialName',
        key: 'materialName',
        width: 240,
        render: (value: string, record) => (
          <Space className="oc-excel-cell-readonly" direction="vertical" size={2}>
            <Text strong ellipsis={{ tooltip: value }}>
              {value}
            </Text>
            <Text type="secondary">{record.materialCode}</Text>
          </Space>
        ),
      },
      {
        title: '颜色',
        dataIndex: 'color',
        key: 'color',
        width: 100,
        render: (value?: string) => <span className="oc-excel-cell-readonly">{value || '-'}</span>,
      },
      {
        title: '规格',
        dataIndex: 'specification',
        key: 'specification',
        width: 130,
        render: (value?: string) => <span className="oc-excel-cell-readonly">{value || '-'}</span>,
      },
      {
        title: '可用库存',
        dataIndex: 'availableQty',
        key: 'availableQty',
        width: 120,
        render: (value: number, record) => (
          <span className="oc-excel-cell-readonly">{value.toLocaleString('zh-CN')} {record.unit}</span>
        ),
      },
      {
        title: '出库数量',
        dataIndex: 'issueQty',
        key: 'issueQty',
        width: 170,
        render: (_value, record) => (
          <InputNumber
            className="oc-excel-cell-input"
            min={0}
            max={record.availableQty}
            precision={0}
            controls={false}
            value={quantities[record.id] ?? 0}
            onChange={(val) => handleQuantityChange(record.id, val)}
            addonAfter={record.unit}
          />
        ),
      },
    ],
    [quantities],
  );

  const handleSubmit = async () => {
    if (!rowsWithQuantity.length) {
      message.warning('请先填写出库数量');
      return;
    }
    const invalid = rowsWithQuantity.find((item) => {
      const qty = quantities[item.id];
      return !qty || qty <= 0 || qty > item.availableQty;
    });
    if (invalid) {
      message.error('出库数量需大于0且不得超过可用库存');
      return;
    }
    const warehouseId = materials[0]?.warehouseId;
    if (!warehouseId) {
      message.error('无法识别仓库信息，请刷新后重试');
      return;
    }
    const payload: MaterialIssueCreatePayload = {
      warehouseId,
      materialType,
      workOrderId,
      cuttingBedId,
      cuttingBedNumber: bedOptions.find((option) => option.value === cuttingBedId)?.bedNumber,
      remark: remark.trim() || undefined,
      lines: rowsWithQuantity.map((item) => ({
        materialId: item.materialId,
        materialMinimumSpecificationId: item.materialMinimumSpecificationId,
        quantity: quantities[item.id],
        unit: item.unit,
        color: item.color,
        specification: item.specification,
      })),
    };
    setSubmitting(true);
    try {
      const response = await materialIssueService.createIssue(payload);
      message.success(`出库成功，单号 ${response.issueNo}`);
      onIssued();
    } catch (error) {
      console.error('failed to create material issue', error);
      message.error('出库失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      width={860}
      title="领料出库"
      open={open}
      onCancel={onClose}
      confirmLoading={submitting}
      okButtonProps={{ disabled }}
      cancelText="取消"
      okText="出库"
      onOk={handleSubmit}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Alert
          type="info"
          message={
            <Space direction="vertical" size={4}>
              <Text>请填写各物料的出库数量，出库后库存将实时扣减。</Text>
              {warehouseName ? (
                <Text type="secondary">出库仓库：{warehouseName}</Text>
              ) : null}
            </Space>
          }
        />
        <Space size={8} wrap>
          <Text type="secondary">批量出库数量</Text>
          <InputNumber
            min={0}
            precision={0}
            value={bulkQuantity}
            onChange={setBulkQuantity}
            placeholder="填写后应用到全部明细"
            style={{ width: 200 }}
          />
          <Button onClick={handleApplyBulkQuantity}>批量应用</Button>
          <Button onClick={handleClearBulkQuantity}>清空数量</Button>
        </Space>
        <Table<MaterialStockListItem>
          className="oc-excel-entry-table material-issue-entry-table"
          rowKey="id"
          dataSource={tableData}
          columns={columns}
          pagination={false}
          size="small"
          scroll={{ y: 360 }}
        />
        <Text type="secondary">
          已填写数量的物料：<Text strong>{rowsWithQuantity.length}</Text> 项
        </Text>
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Text type="secondary">关联裁床单（可选）</Text>
          <Select
            allowClear
            showSearch
            filterOption={false}
            value={workOrderId}
            options={cuttingOptions}
            loading={cuttingLoading}
            onSearch={setCuttingKeyword}
            onChange={(value) => {
              setWorkOrderId(value);
              setCuttingBedId(undefined);
              setBedOptions([]);
            }}
            placeholder="输入订单号、款号或款名搜索"
            notFoundContent={cuttingLoading ? '正在搜索…' : '未找到可关联的裁床单'}
            style={{ width: '100%' }}
          />
          <Text type="secondary">不选择也可直接出库；选择裁床单后可继续关联具体床次。</Text>
        </Space>
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Text type="secondary">关联床次（可选）</Text>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            value={cuttingBedId}
            options={bedOptions}
            loading={bedLoading}
            disabled={!workOrderId}
            onChange={setCuttingBedId}
            placeholder={workOrderId ? '选择该裁床单下的床次' : '请先选择裁床单'}
            notFoundContent={bedLoading ? '正在加载…' : '该裁床单暂无可关联床次'}
            style={{ width: '100%' }}
          />
          <Text type="secondary">床次不是必填项；关联后可在出库明细中核对具体床次。</Text>
        </Space>
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Text type="secondary">备注</Text>
          <Input.TextArea
            rows={3}
            maxLength={200}
            showCount
            value={remark}
            onChange={(event) => setRemark(event.target.value)}
            placeholder="可填写本次领料出库备注"
          />
        </Space>
      </Space>
    </Modal>
  );
};

export default MaterialIssueModal;
