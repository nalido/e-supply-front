import { Tag } from 'antd'
import type { PodProductTemplate } from '../../types/pod-design'

type ProductTemplateStatusTagProps = Pick<PodProductTemplate, 'status' | 'readinessBlockers'>

const ProductTemplateStatusTag = ({ status, readinessBlockers }: ProductTemplateStatusTagProps) => {
  if (status === 'ACTIVE') return <Tag color="green">已启用</Tag>
  if (status === 'INACTIVE') return <Tag>已停用</Tag>
  if (readinessBlockers.length === 0) return <Tag color="blue">待启用</Tag>
  return <Tag color="orange">待完善</Tag>
}

export default ProductTemplateStatusTag
