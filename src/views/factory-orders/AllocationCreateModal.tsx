import { Alert, Button, Form, Input, InputNumber, Modal, Select, Typography } from 'antd';
import type { FormInstance } from 'antd/es/form';
import type { AllocationQuantityMatrix, SelectOption } from './types';
import { normalizeQtyValue } from './utils';

const { Text } = Typography;

type Props = {
  open: boolean;
  isCuttingProgressStage: boolean;
  submitting: boolean;
  form: FormInstance;
  factoryOptions: SelectOption[];
  allocationHistoryTotal: number;
  allocationCapacityTotal: number;
  orderedTotal: number;
  cuttingCompletedTotal: number;
  allocationGrandTotal: number;
  allocationColors: string[];
  allocationSizes: string[];
  allocationCapacityMatrix: AllocationQuantityMatrix;
  allocationHistoryMatrix: AllocationQuantityMatrix;
  allocationMatrix: AllocationQuantityMatrix;
  allocationRowTotals: Record<string, number>;
  allocationColumnTotals: Record<string, number>;
  onCancel: () => void;
  onOk: () => void;
  onOpenFactoryGuide: () => void;
  onLoadRemainingAllocation: () => void;
  onAllocationMatrixQtyChange: (color: string, size: string, value: number | null) => void;
};

export default function AllocationCreateModal({
  open,
  isCuttingProgressStage,
  submitting,
  form,
  factoryOptions,
  allocationHistoryTotal,
  allocationCapacityTotal,
  orderedTotal,
  cuttingCompletedTotal,
  allocationGrandTotal,
  allocationColors,
  allocationSizes,
  allocationCapacityMatrix,
  allocationHistoryMatrix,
  allocationMatrix,
  allocationRowTotals,
  allocationColumnTotals,
  onCancel,
  onOk,
  onOpenFactoryGuide,
  onLoadRemainingAllocation,
  onAllocationMatrixQtyChange,
}: Props) {
  return (
    <Modal
      open={open}
      title={isCuttingProgressStage ? '新增裁床记录' : '新建车缝领取'}
      onCancel={onCancel}
      onOk={onOk}
      confirmLoading={submitting}
      width={1360}
      styles={{ body: { maxHeight: '72vh', overflow: 'auto' } }}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        {isCuttingProgressStage ? (
          <Form.Item label="床次编号" name="bedNumber" rules={[{ required: true, message: '请输入床次编号' }]}>
            <Input maxLength={32} placeholder="请输入床次编号" />
          </Form.Item>
        ) : null}
        <Form.Item
          label="工厂"
          name="factoryId"
          rules={isCuttingProgressStage ? [] : [{ required: true, message: '请选择工厂' }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            options={factoryOptions}
            placeholder="请选择工厂"
            notFoundContent="暂无工厂，请先新增合作方工厂"
          />
        </Form.Item>
        {!isCuttingProgressStage ? (
          <div style={{ marginTop: -8, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary">没有可选工厂？请先到合作方页面新增工厂。</Text>
            <Button type="link" size="small" onClick={onOpenFactoryGuide}>
              去新建工厂
            </Button>
          </div>
        ) : null}
        <Form.Item label="工价（元/件）" name="unitPrice" rules={[{ required: true, message: '请输入工价' }]}>
          <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="请输入工价" />
        </Form.Item>
        <div className="factory-allocation-toolbar">
          <Text strong>{isCuttingProgressStage ? '颜色/尺码裁剪矩阵' : '颜色/尺码领取矩阵'}</Text>
          <Button type="link" size="small" onClick={onLoadRemainingAllocation}>
            {isCuttingProgressStage ? '加载剩余待裁' : '加载当前可领'}
          </Button>
        </div>
        {allocationColors.length === 0 || allocationSizes.length === 0 ? (
          <Text type="secondary">{isCuttingProgressStage ? '暂无可录入的颜色/尺码裁剪数据' : '暂无可领取的颜色/尺码数据'}</Text>
        ) : (
          <>
            <Alert
              type={allocationHistoryTotal + allocationGrandTotal > allocationCapacityTotal ? 'warning' : 'info'}
              showIcon
              style={{ marginBottom: 8 }}
              message={
                isCuttingProgressStage
                  ? `下单总量：${orderedTotal}，已裁：${allocationHistoryTotal}，本次录入：${allocationGrandTotal}，录入后：${allocationHistoryTotal + allocationGrandTotal}`
                  : `裁床累计已完成：${cuttingCompletedTotal}，车缝累计已领取：${allocationHistoryTotal}，本次领取：${allocationGrandTotal}，领取后累计已领：${allocationHistoryTotal + allocationGrandTotal}，剩余可领：${Math.max(allocationCapacityTotal - allocationHistoryTotal - allocationGrandTotal, 0)}`
              }
            />
            {!isCuttingProgressStage ? (
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                领取口径按“裁床累计已完成 - 车缝累计已领取”控制；进度百分比仍按下单总量计算。
              </Text>
            ) : null}
            <div className="factory-create-matrix-wrap">
              <table className="factory-create-matrix-table">
                <thead>
                  <tr>
                    <th>颜色 \ 尺码</th>
                    {allocationSizes.map((size) => (
                      <th key={`alloc-create-head-${size}`}>{size}</th>
                    ))}
                    <th>小计</th>
                  </tr>
                </thead>
                <tbody>
                  {allocationColors.map((color) => (
                    <tr key={`alloc-create-row-${color}`}>
                      <td>{color}</td>
                      {allocationSizes.map((size) => {
                        const capacityQty = allocationCapacityMatrix[color]?.[size] ?? 0;
                        const historyAllocatedQty = allocationHistoryMatrix[color]?.[size] ?? 0;
                        const allocatedQty = normalizeQtyValue(allocationMatrix[color]?.[size]);
                        const remainingQty = Math.max(capacityQty - historyAllocatedQty - allocatedQty, 0);
                        const availableQty = Math.max(capacityQty - historyAllocatedQty, 0);
                        const exceededQty = Math.max(historyAllocatedQty + allocatedQty - capacityQty, 0);
                        return (
                          <td key={`alloc-create-${color}-${size}`}>
                            <div style={{ display: 'grid', gap: 4 }}>
                              <InputNumber
                                min={0}
                                precision={0}
                                max={isCuttingProgressStage ? undefined : availableQty}
                                value={allocatedQty}
                                onChange={(value) => onAllocationMatrixQtyChange(color, size, value)}
                                controls={false}
                                style={{ width: '100%' }}
                                placeholder={!isCuttingProgressStage ? `最多可领 ${availableQty}` : '填写裁剪数量'}
                              />
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                {isCuttingProgressStage
                                  ? `${historyAllocatedQty + allocatedQty}/${capacityQty}${exceededQty > 0 ? `（超裁 ${exceededQty}）` : ''}`
                                  : `已领后 ${historyAllocatedQty + allocatedQty}/${capacityQty}，剩余可领 ${remainingQty}`}
                              </Text>
                            </div>
                          </td>
                        );
                      })}
                      <td>{allocationRowTotals[color] ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>合计</td>
                    {allocationSizes.map((size) => (
                      <td key={`alloc-create-sum-${size}`}>{allocationColumnTotals[size] ?? 0}</td>
                    ))}
                    <td>{allocationGrandTotal}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </Form>
    </Modal>
  );
}
