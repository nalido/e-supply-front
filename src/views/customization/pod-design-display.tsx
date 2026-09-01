import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, EditOutlined } from '@ant-design/icons'
import { Tag } from 'antd'
import type { PodDesignStatus } from '../../types/pod-design'

const statusConfig: Record<PodDesignStatus, { label: string; color: string; icon: React.ReactNode }> = {
  DRAFT: { label: '设计中', color: 'default', icon: <EditOutlined /> },
  PENDING_REVIEW: { label: '待审核', color: 'processing', icon: <ClockCircleOutlined /> },
  APPROVED: { label: '已通过', color: 'success', icon: <CheckCircleOutlined /> },
  REJECTED: { label: '已驳回', color: 'error', icon: <CloseCircleOutlined /> },
  ARCHIVED: { label: '已归档', color: 'default', icon: <CloseCircleOutlined /> },
}

export const PodDesignStatusTag = ({ status }: { status: PodDesignStatus }) => {
  const config = statusConfig[status] ?? statusConfig.DRAFT
  return <Tag color={config.color} icon={config.icon}>{config.label}</Tag>
}
