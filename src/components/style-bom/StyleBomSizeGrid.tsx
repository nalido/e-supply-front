import { Button, InputNumber, Space, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useState } from 'react';
import type { StyleBomSizeConsumption } from '../../types/style';
import '../../styles/matrix-table.css';

const { Text } = Typography;

type Props = {
  values: StyleBomSizeConsumption[];
  unit: string;
  onChange: (values: StyleBomSizeConsumption[]) => void;
};

export default function StyleBomSizeGrid({ values, unit, onChange }: Props) {
  const [bulkValue, setBulkValue] = useState<number | null>(null);

  const applyBulk = (onlyEmpty: boolean) => {
    if (bulkValue == null) {
      return;
    }
    onChange(values.map((item) => (
      !onlyEmpty || item.consumption == null ? { ...item, consumption: bulkValue } : item
    )));
  };

  const columns: ColumnsType<StyleBomSizeConsumption> = [
    {
      title: '尺码', dataIndex: 'size', width: 140,
      render: (size) => <span className="oc-excel-cell-readonly"><Text strong>{size}</Text></span>,
    },
    {
      title: '单件用量', dataIndex: 'consumption',
      render: (consumption, row) => (
        <InputNumber
          className="oc-excel-cell-input style-bom-size-input"
          min={0}
          precision={4}
          controls={false}
          suffix={unit || undefined}
          value={consumption}
          placeholder="必填"
          status={consumption == null ? 'error' : undefined}
          onChange={(next) => onChange(values.map((item) => (
            item.size === row.size ? { ...item, consumption: next == null ? null : Number(next) } : item
          )))}
        />
      ),
    },
  ];

  return (
    <Space direction="vertical" size={8} style={{ width: '100%' }}>
      <div className="style-bom-size-bulk">
        <InputNumber
          min={0}
          precision={4}
          controls={false}
          suffix={unit || undefined}
          value={bulkValue}
          placeholder="输入统一用量"
          onChange={(value) => setBulkValue(value == null ? null : Number(value))}
        />
        <Space size={4} wrap>
          <Button disabled={bulkValue == null} onClick={() => applyBulk(false)}>填入全部尺码</Button>
          <Button disabled={bulkValue == null} onClick={() => applyBulk(true)}>仅填空白尺码</Button>
        </Space>
      </div>
      <Table<StyleBomSizeConsumption>
        className="oc-excel-entry-table style-bom-size-grid"
        rowKey="size"
        columns={columns}
        dataSource={values}
        pagination={false}
        size="small"
        scroll={{ y: 320 }}
      />
    </Space>
  );
}
