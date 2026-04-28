import type { ReactNode } from 'react';
import { Button, Card, Space, Tag, Typography } from 'antd';
import {
  AlertOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import ListImage from '../common/ListImage';
import './sale-center.css';

const { Text, Title } = Typography;

type SaleHeroProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  extra?: ReactNode;
  className?: string;
};

type SaleMetricCardProps = {
  title: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'default' | 'danger' | 'warning' | 'success';
  className?: string;
};

type SaleSectionProps = {
  title: ReactNode;
  description?: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
};

type SaleActionButtonProps = {
  label: ReactNode;
  onClick?: () => void;
  danger?: boolean;
};

export const formatSaleDateTime = (value?: string | null) => {
  if (!value) {
    return '--';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('zh-CN', { hour12: false });
};

export const formatSaleMoney = (value?: string | null, currency = '¥') => {
  if (!value) {
    return '--';
  }
  const amount = Number(value);
  if (Number.isNaN(amount)) {
    return value;
  }
  return `${currency}${amount.toFixed(2)}`;
};

export const toDisplayText = (value?: string | number | null) => {
  if (value === null || value === undefined || value === '') {
    return '--';
  }
  return String(value);
};

const resolveTagColor = (value?: string | null) => {
  const text = (value || '').toUpperCase();
  if (text.includes('SUCCESS') || text.includes('ACTIVE') || text.includes('CONFIRMED') || text.includes('RESOLVED')) {
    return 'success';
  }
  if (text.includes('FAILED') || text.includes('OVERDUE') || text.includes('ESCALATED') || text.includes('CONFLICT')) {
    return 'error';
  }
  if (text.includes('PENDING') || text.includes('BLOCK') || text.includes('RISK') || text.includes('DEGRADED')) {
    return 'warning';
  }
  return 'default';
};

export const SaleStatusTag = ({ value, label }: { value?: string | null; label?: ReactNode }) => (
  <Tag color={resolveTagColor(value)} className="sale-center-tag">
    {label ?? toDisplayText(value)}
  </Tag>
);

export const SaleToneTag = ({ label, tone = 'default' }: { label: ReactNode; tone?: 'default' | 'danger' | 'warning' | 'success' }) => {
  const color = tone === 'danger' ? 'error' : tone === 'warning' ? 'warning' : tone === 'success' ? 'success' : 'default';
  return (
    <Tag color={color} className="sale-center-tag">
      {label}
    </Tag>
  );
};

export const ProductThumb = ({ src, alt }: { src?: string | null; alt?: string }) => (
  <ListImage src={src} alt={alt} width={72} height={72} borderRadius={16} wrapperStyle={{ flexShrink: 0 }} />
);

export const SaleHero = ({ eyebrow, title, subtitle, extra, className }: SaleHeroProps) => (
  <Card className={className ? `sale-center-hero ${className}` : 'sale-center-hero'}>
    <div className="sale-center-hero__body">
      <div>
        {eyebrow ? <Text className="sale-center-hero__eyebrow">{eyebrow}</Text> : null}
        <Title level={3} className="sale-center-hero__title">
          {title}
        </Title>
        {subtitle ? <Text className="sale-center-hero__subtitle">{subtitle}</Text> : null}
      </div>
      {extra ? <div className="sale-center-hero__extra">{extra}</div> : null}
    </div>
  </Card>
);

export const SaleMetricCard = ({ title, value, hint, tone = 'default', className }: SaleMetricCardProps) => (
  <Card className={`sale-center-metric sale-center-metric--${tone}${className ? ` ${className}` : ''}`}>
    <Text className="sale-center-metric__title">{title}</Text>
    <div className="sale-center-metric__value">{value}</div>
    {hint ? <Text className="sale-center-metric__hint">{hint}</Text> : null}
  </Card>
);

export const SaleSection = ({ title, description, extra, children, className }: SaleSectionProps) => (
  <Card className={className ? `sale-center-section ${className}` : 'sale-center-section'}>
    <div className="sale-center-section__header">
      <div>
        <Title level={4} className="sale-center-section__title">
          {title}
        </Title>
        {description ? <Text className="sale-center-section__description">{description}</Text> : null}
      </div>
      {extra ? <div className="sale-center-section__extra">{extra}</div> : null}
    </div>
    {children}
  </Card>
);

export const SaleActionButton = ({ label, onClick, danger }: SaleActionButtonProps) => (
  <Button
    type={danger ? 'default' : 'primary'}
    danger={danger}
    icon={<ArrowRightOutlined />}
    className="sale-center-action-button"
    onClick={onClick}
  >
    {label}
  </Button>
);

export const SaleSignalIcon = ({ tone }: { tone: 'danger' | 'warning' | 'success' | 'default' }) => {
  if (tone === 'danger') {
    return <AlertOutlined />;
  }
  if (tone === 'warning') {
    return <WarningOutlined />;
  }
  if (tone === 'success') {
    return <CheckCircleOutlined />;
  }
  return <ClockCircleOutlined />;
};

export const SaleMiniStat = ({
  label,
  value,
  tone = 'default',
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: 'danger' | 'warning' | 'success' | 'default';
}) => (
  <div className={`sale-center-mini-stat sale-center-mini-stat--${tone}`}>
    <Space size={8}>
      <SaleSignalIcon tone={tone} />
      <div>
        <div className="sale-center-mini-stat__label">{label}</div>
        <div className="sale-center-mini-stat__value">{value}</div>
      </div>
    </Space>
  </div>
);
