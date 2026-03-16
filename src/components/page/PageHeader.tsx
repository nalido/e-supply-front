import { Breadcrumb, Space, Typography } from 'antd'
import type { ReactNode } from 'react'

const { Title, Text } = Typography

type BreadcrumbItem = {
  title: ReactNode
}

type PageHeaderProps = {
  title: ReactNode
  subtitle?: ReactNode
  extra?: ReactNode
  breadcrumb?: BreadcrumbItem[]
  stats?: ReactNode
  className?: string
}

const PageHeader = ({ title, subtitle, extra, breadcrumb, stats, className }: PageHeaderProps) => {
  return (
    <div className={["oc-page-header", className].filter(Boolean).join(' ')}>
      {breadcrumb?.length ? <Breadcrumb items={breadcrumb} className="oc-page-header__breadcrumb" /> : null}
      <div className="oc-page-header__main">
        <div className="oc-page-header__content">
          <Space direction="vertical" size={4}>
            <Title level={2} className="oc-page-header__title">
              {title}
            </Title>
            {subtitle ? <Text className="oc-page-header__subtitle">{subtitle}</Text> : null}
          </Space>
          {stats ? <div className="oc-page-header__stats">{stats}</div> : null}
        </div>
        {extra ? <div className="oc-page-header__extra">{extra}</div> : null}
      </div>
    </div>
  )
}

export default PageHeader
