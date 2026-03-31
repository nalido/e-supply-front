import { Col, DatePicker, Form, Input, InputNumber, Modal, Row, Select, Space, Typography } from 'antd';
import type { FormInstance } from 'antd/es/form';
import ListImage from '../../components/common/ListImage';
import { materialStatusOptions, normalizeQtyValue, overallStatusOptions } from './utils';
import type { CreateQuantityMatrix, CreateStyleMaterial, SelectOption } from './types';

const { Text } = Typography;

type Props = {
  open: boolean;
  title: string;
  okText: string;
  isEditing: boolean;
  confirmLoading: boolean;
  onCancel: () => void;
  onOk: () => void;
  form: FormInstance;
  createOptionsLoading: boolean;
  styleOptions: SelectOption[];
  factoryOptions: SelectOption[];
  merchandiserOptions: SelectOption[];
  selectedStyleOption?: SelectOption;
  createStyleMaterials: CreateStyleMaterial[];
  createColors: string[];
  createSizes: string[];
  createColorOptions: Array<{ label: string; value: string }>;
  createSizeOptions: Array<{ label: string; value: string }>;
  createMatrix: CreateQuantityMatrix;
  createRowTotals: Record<string, number>;
  createColumnTotals: Record<string, number>;
  createGrandTotal: number;
  onCreateColorsChange: (values: string[]) => void;
  onCreateSizesChange: (values: string[]) => void;
  onCreateMatrixQtyChange: (color: string, size: string, value?: number | null) => void;
};

export default function CreateOrderModal({
  open,
  title,
  okText,
  isEditing,
  confirmLoading,
  onCancel,
  onOk,
  form,
  createOptionsLoading,
  styleOptions,
  factoryOptions,
  merchandiserOptions,
  selectedStyleOption,
  createStyleMaterials,
  createColors,
  createSizes,
  createColorOptions,
  createSizeOptions,
  createMatrix,
  createRowTotals,
  createColumnTotals,
  createGrandTotal,
  onCreateColorsChange,
  onCreateSizesChange,
  onCreateMatrixQtyChange,
}: Props) {
  return (
    <Modal
      open={open}
      title={title}
      data-testid="factory-order-create-modal"
      onCancel={onCancel}
      onOk={onOk}
      confirmLoading={confirmLoading}
      okText={okText}
      width={1120}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="订单号" name="orderNo">
              <Input
                placeholder={isEditing ? '订单号编辑时不可修改' : '留空自动生成（可手动覆盖）'}
                disabled={isEditing}
                data-testid="factory-order-create-order-no"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="款式" name="styleId" rules={[{ required: true, message: '请选择款式' }]}>
              <Select
                showSearch
                optionFilterProp="label"
                disabled={isEditing}
                loading={createOptionsLoading}
                options={styleOptions}
                placeholder={isEditing ? '款式编辑时不可修改' : '请选择款式'}
                notFoundContent={createOptionsLoading ? '加载中...' : '暂无款式数据'}
                data-testid="factory-order-create-style-select"
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="单价（元/件）" name="unitPrice">
              <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="可选，不填按 0 处理" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="预计交货日期" name="expectedDelivery">
              <div data-testid="factory-order-create-delivery-date-wrapper">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" placeholder="请选择预计交货日期" inputReadOnly={false} data-testid="factory-order-create-delivery-date" />
              </div>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="工厂" name="factoryId">
              <Select
                showSearch
                allowClear
                optionFilterProp="label"
                loading={createOptionsLoading}
                options={factoryOptions}
                placeholder="可选"
                notFoundContent={createOptionsLoading ? '加载中...' : '暂无工厂数据'}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="跟单员" name="merchandiserId">
              <Select
                showSearch
                allowClear
                optionFilterProp="label"
                loading={createOptionsLoading}
                options={merchandiserOptions}
                placeholder="可选"
                notFoundContent={createOptionsLoading ? '加载中...' : '暂无跟单员数据'}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="整体状态" name="overallStatus">
              <Select options={overallStatusOptions} placeholder="请选择整体状态" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="物料状态" name="materialStatus">
              <Select allowClear options={materialStatusOptions} placeholder="可选" />
            </Form.Item>
          </Col>
          {selectedStyleOption ? (
            <Col span={24}>
              <div className="factory-create-style-preview">
                <ListImage src={selectedStyleOption.image} alt={selectedStyleOption.label} width={88} height={88} borderRadius={6} />
                <Space direction="vertical" size={2}>
                  <Text type="secondary">款式图片</Text>
                  <Text>{selectedStyleOption.label}</Text>
                </Space>
              </div>
            </Col>
          ) : null}
          {selectedStyleOption ? (
            <Col span={24}>
              <Form.Item label="关联面辅料">
                {createStyleMaterials.length === 0 ? (
                  <Text type="secondary">当前款式未配置 BOM，暂无可同步的面辅料。</Text>
                ) : (
                  <div className="factory-create-material-preview">
                    {createStyleMaterials.map((item) => (
                      <div key={`${item.materialId}-${item.materialType}`} className="factory-create-material-card">
                        <div className="factory-create-material-top">
                          <span className={`factory-create-material-type ${item.materialType.toLowerCase()}`}>
                            {item.materialType === 'FABRIC' ? '面料' : item.materialType === 'ACCESSORY' ? '辅料' : '包装'}
                          </span>
                          <span className="factory-create-material-sku">{item.materialSku || '未配置编码'}</span>
                        </div>
                        <div className="factory-create-material-name">{item.materialName}</div>
                        <div className="factory-create-material-meta">
                          单耗 {item.consumption || 0}{item.unit || '件'}
                          {item.lossRate ? ` · 损耗 ${(item.lossRate * 100).toFixed(1)}%` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Form.Item>
            </Col>
          ) : null}
          <Col span={12}>
            <Form.Item label="颜色" required>
              <Select
                mode="tags"
                value={createColors}
                onChange={onCreateColorsChange}
                options={createColorOptions}
                tokenSeparators={[',', '，', '、', ' ']}
                placeholder={selectedStyleOption ? '回车添加或选择颜色' : '请先选择款式'}
                disabled={!selectedStyleOption}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="尺码" required>
              <Select
                mode="tags"
                value={createSizes}
                onChange={onCreateSizesChange}
                options={createSizeOptions}
                tokenSeparators={[',', '，', '、', ' ']}
                placeholder={selectedStyleOption ? '回车添加或选择尺码' : '请先选择款式'}
                disabled={!selectedStyleOption}
              />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item label="下单数量（颜色 × 尺码）" required>
              {!selectedStyleOption ? (
                <Text type="secondary">请先选择款式，系统将自动带出该款颜色和尺码。</Text>
              ) : createColors.length === 0 || createSizes.length === 0 ? (
                <Text type="secondary">请先补全颜色和尺码，再录入数量。</Text>
              ) : (
                <div className="factory-create-matrix-wrap">
                  <table className="factory-create-matrix-table">
                    <thead>
                      <tr>
                        <th>颜色 \\ 尺码</th>
                        {createSizes.map((size) => (
                          <th key={`head-${size}`}>{size}</th>
                        ))}
                        <th>小计</th>
                      </tr>
                    </thead>
                    <tbody data-testid="factory-order-create-quantity-matrix">
                      {createColors.map((color) => (
                        <tr key={`row-${color}`}>
                          <td>{color}</td>
                          {createSizes.map((size) => (
                            <td key={`${color}-${size}`}>
                              <InputNumber
                                min={0}
                                precision={0}
                                value={normalizeQtyValue(createMatrix[color]?.[size])}
                                onChange={(value) => onCreateMatrixQtyChange(color, size, value)}
                                controls={false}
                                style={{ width: '100%' }}
                                placeholder="0"
                              />
                            </td>
                          ))}
                          <td>{createRowTotals[color] ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td>合计</td>
                        {createSizes.map((size) => (
                          <td key={`sum-${size}`}>{createColumnTotals[size] ?? 0}</td>
                        ))}
                        <td>{createGrandTotal}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item label="备注" name="remarks">
              <Input.TextArea rows={2} placeholder="可选" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
