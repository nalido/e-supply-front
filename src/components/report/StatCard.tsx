import type { ReactNode } from 'react';
import { Statistic } from 'antd';

const numberFormatter = (value: number): string => value.toLocaleString('zh-CN');

export type StatCardProps = {
  title: ReactNode;
  value: number;
  unit?: string;
  valueFormatter?: (value: number) => string;
};

const StatCard = ({ title, value, unit, valueFormatter = numberFormatter }: StatCardProps) => (
  <Statistic
    title={title}
    value={value}
    formatter={(rawValue) => {
      const numericValue = Number(rawValue);
      const formatted = valueFormatter(Number.isFinite(numericValue) ? numericValue : 0);
      return unit ? `${formatted} ${unit}` : formatted;
    }}
  />
);

export default StatCard;
