import { Card, Typography } from 'antd'
import type { ReactNode } from 'react'

const { Text, Title } = Typography

type PageSectionProps = {
  title?: ReactNode
  description?: ReactNode
  extra?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
}

const PageSection = ({ title, description, extra, children, className, contentClassName }: PageSectionProps) => {
  return (
    <Card className={["oc-page-section", className].filter(Boolean).join(' ')}>
      {(title || description || extra) && (
        <div className="oc-page-section__header">
          <div>
            {title ? (
              <Title level={4} className="oc-page-section__title">
                {title}
              </Title>
            ) : null}
            {description ? <Text className="oc-page-section__description">{description}</Text> : null}
          </div>
          {extra ? <div className="oc-page-section__extra">{extra}</div> : null}
        </div>
      )}
      <div className={["oc-page-section__content", contentClassName].filter(Boolean).join(' ')}>{children}</div>
    </Card>
  )
}

export default PageSection
