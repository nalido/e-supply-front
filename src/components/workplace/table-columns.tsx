import { Avatar } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { DeliveryItem } from '../../types/workplace';

const statusLabelMap: Record<string, string> = {
  DRAFT: '待生产',
  RELEASED: '已下达',
  IN_PROGRESS: '生产中',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

const formatMoney = (value?: number) => {
  if (value === null || value === undefined) {
    return '-';
  }
  return `¥${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
};

/**
 * 创建表格列配置
 * @param withType 是否包含加工类型列（用于区分客户表格和工厂表格）
 */
export const createColumns = (withType: boolean): ColumnsType<DeliveryItem> => {
  const columns: ColumnsType<DeliveryItem> = [
    {
      title: '图片',
      dataIndex: 'image',
      width: 80,
      fixed: 'left',
      render: (image) => (
        <Avatar src={image} size={40} shape="square" />
      ),
    },
    { 
      title: '工厂订单', 
      dataIndex: 'orderNo', 
      width: 120, 
      fixed: 'left',
      ellipsis: true 
    },
    { 
      title: '款式资料', 
      dataIndex: 'styleName', 
      width: 150, 
      ellipsis: true 
    },
    { 
      title: withType ? '加工厂' : '客户', 
      dataIndex: 'org', 
      width: 120,
      ellipsis: true 
    },
    { 
      title: '交货日期', 
      dataIndex: 'date', 
      width: 100 
    },
    { 
      title: '数量', 
      dataIndex: 'qty', 
      width: 80,
      render: (value) => (
        <span>{value?.toLocaleString()}</span>
      )
    },
    {
      title: '单价',
      dataIndex: 'price',
      width: 100,
      render: (_value, record) => {
        if (record.price !== undefined) {
          return <span>{formatMoney(record.price)}</span>;
        }
        if (record.amount !== undefined && record.qty) {
          const computed = record.amount / record.qty;
          return <span>{formatMoney(computed)}</span>;
        }
        return <span>-</span>;
      }
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 120,
      render: (_value, record) => {
        const amount =
          record.amount ?? (record.price !== undefined ? record.price * record.qty : undefined);
        return (
          <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
            {formatMoney(amount)}
          </span>
        );
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value) => {
        const label = statusLabelMap[String(value ?? '')] ?? String(value ?? '-');
        return <span>{label}</span>;
      }
    },
    {
      title: '备注',
      dataIndex: 'remark',
      width: 200,
      ellipsis: true,
      render: (value) => value || '-'
    },
  ];
  
  if (withType) {
    columns.push({ 
      title: '加工类型', 
      dataIndex: 'type', 
      width: 100, 
      ellipsis: true 
    });
  }
  
  return columns;
};
