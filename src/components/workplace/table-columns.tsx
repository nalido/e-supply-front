import { Avatar } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { DeliveryItem } from '../../types/workplace';

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
      render: () => (
        <span>¥{(Math.random() * 50 + 10).toFixed(2)}</span>
      )
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 120,
      render: (_, record) => (
        <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
          ¥{(record.qty * (Math.random() * 50 + 10)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: () => {
        const statuses = ['待生产', '生产中', '待交货', '已完成'];
        const colors = ['orange', 'blue', 'gold', 'green'];
        const randomIndex = Math.floor(Math.random() * statuses.length);
        return (
          <span style={{ color: colors[randomIndex] }}>
            {statuses[randomIndex]}
          </span>
        );
      }
    },
    {
      title: '备注',
      dataIndex: 'remark',
      width: 200,
      ellipsis: true,
      render: () => {
        const remarks = ['紧急订单', '优质客户', '特殊工艺', '无特殊要求', '需要加急'];
        return remarks[Math.floor(Math.random() * remarks.length)];
      }
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