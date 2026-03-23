import { Button, Dropdown, Space, Tag, Typography } from 'antd';
import type { MenuProps } from 'antd';
import {
  CalendarOutlined,
  CheckCircleTwoTone,
  ExclamationCircleOutlined,
  MoreOutlined,
  PictureOutlined,
  ScissorOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { CuttingTask } from '../types';
import ListImage from './common/ListImage';

const { Text } = Typography;

type Props = {
  task: CuttingTask;
  onViewDetail: (task: CuttingTask) => void;
  onPreview: (task: CuttingTask) => void;
  onNavigateToFactoryOrder: (orderCode?: string) => void;
  onRecordBed?: (task: CuttingTask) => void;
  onComplete?: (task: CuttingTask) => void;
  menuItems?: MenuProps['items'];
  onMenuClick?: MenuProps['onClick'];
  detailButtonType?: 'default' | 'link' | 'primary' | 'text';
  colorButtonType?: 'default' | 'link' | 'primary' | 'text';
  showMoreButton?: boolean;
  completedLabel?: string;
  pendingLabel?: string;
  testIdPrefix?: string;
};

const getStatusTag = (task: CuttingTask) => {
  const workOrderStatus = (task.workOrderStatus ?? 'NOT_STARTED').toUpperCase();
  if (workOrderStatus === 'COMPLETED') {
    return <Tag color="success" bordered={false}>已裁</Tag>;
  }
  if (workOrderStatus === 'IN_PROGRESS') {
    return <Tag color="processing" bordered={false}>裁剪中</Tag>;
  }
  if (workOrderStatus === 'NOT_STARTED') {
    return <Tag bordered={false}>未开裁</Tag>;
  }
  return null;
};

export default function CuttingTaskCard({
  task,
  onViewDetail,
  onPreview,
  onNavigateToFactoryOrder,
  onRecordBed,
  onComplete,
  menuItems,
  onMenuClick,
  detailButtonType = 'default',
  colorButtonType = 'default',
  showMoreButton = false,
  completedLabel = '已裁数量',
  pendingLabel = '待裁数量',
  testIdPrefix,
}: Props) {
  const workOrderStatus = (task.workOrderStatus ?? 'NOT_STARTED').toUpperCase();
  const pendingTone = task.pendingQuantity > 0 ? 'cutting-qty-highlight' : '';

  return (
    <article className="cutting-task-card" key={task.workOrderId ?? task.id} data-testid={testIdPrefix ? `${testIdPrefix}-card-${task.orderCode}` : undefined}>
      <div className="cutting-task-header">
        <div className="cutting-task-main">
          <ListImage
            src={task.thumbnail}
            alt={task.styleName}
            wrapperClassName="cutting-task-thumbnail"
            width={null}
            height={null}
            background="#fff"
          />
          <div className="cutting-task-info">
            <div className="cutting-task-title">
              <Text strong>{task.styleName}</Text>
              <Tag bordered={false} color="geekblue">{task.styleCode}</Tag>
              {getStatusTag(task)}
              {task.priorityTag ? (
                <Tag color="volcano" bordered={false}>
                  <ExclamationCircleOutlined style={{ marginRight: 4 }} />
                  {task.priorityTag}
                </Tag>
              ) : null}
            </div>
            <div className="cutting-task-meta">
              <Space size={12} wrap>
                <span>
                  订单号：
                  <Button
                    type="link"
                    size="small"
                    style={{ paddingInline: 4 }}
                    onClick={() => onNavigateToFactoryOrder(task.orderCode)}
                  >
                    {task.orderCode}
                  </Button>
                </span>
                <span>床次：{task.bedNumber || '-'}</span>
                <span>
                  <CalendarOutlined style={{ marginRight: 4 }} />
                  下单：{task.orderDate}
                </span>
                {task.scheduleDate ? (
                  <span>
                    <CheckCircleTwoTone twoToneColor="#52c41a" />
                    <Text type="secondary" style={{ marginLeft: 4 }}>
                      计划排床：{task.scheduleDate}
                    </Text>
                  </span>
                ) : null}
                {task.customer ? (
                  <span>
                    <UserOutlined style={{ marginRight: 4 }} />
                    客户：{task.customer}
                  </span>
                ) : null}
              </Space>
            </div>
          </div>
        </div>
        <div className="cutting-task-actions">
          <Button
            size="small"
            type={detailButtonType}
            onClick={() => onViewDetail(task)}
            data-testid={testIdPrefix ? `${testIdPrefix}-detail-${task.orderCode}` : undefined}
          >
            查看详情
          </Button>
          {onRecordBed && workOrderStatus !== 'COMPLETED' ? (
            <Button
              size="small"
              type="primary"
              onClick={() => onRecordBed(task)}
              disabled={!task.workOrderId}
              icon={<ScissorOutlined />}
              data-testid={testIdPrefix ? `${testIdPrefix}-record-bed-${task.orderCode}` : undefined}
            >
              录入床次
            </Button>
          ) : null}
          {onComplete && workOrderStatus === 'IN_PROGRESS' ? (
            <Button
              size="small"
              onClick={() => onComplete(task)}
              disabled={!task.workOrderId}
              icon={<CheckCircleTwoTone twoToneColor="#52c41a" />}
              data-testid={testIdPrefix ? `${testIdPrefix}-complete-${task.orderCode}` : undefined}
            >
              完成
            </Button>
          ) : null}
          <Button
            size="small"
            type={colorButtonType}
            icon={<PictureOutlined />}
            onClick={() => onPreview(task)}
          >
            颜色图
          </Button>
          {showMoreButton && menuItems && onMenuClick ? (
            <Dropdown trigger={['click']} menu={{ items: menuItems, onClick: onMenuClick }}>
              <Button size="small" icon={<MoreOutlined />}>更多</Button>
            </Dropdown>
          ) : null}
        </div>
      </div>
      <div className="cutting-task-quantities">
        <div>
          <div className="label">下单数量</div>
          <div className="value">{task.orderedQuantity.toLocaleString()} {task.unit}</div>
        </div>
        <div>
          <div className="label">{completedLabel}</div>
          <div className="value">{task.cutQuantity.toLocaleString()} {task.unit}</div>
        </div>
        <div className={pendingTone}>
          <div className="label">{pendingLabel}</div>
          <div className="value">{task.pendingQuantity.toLocaleString()} {task.unit}</div>
        </div>
      </div>
    </article>
  );
}
