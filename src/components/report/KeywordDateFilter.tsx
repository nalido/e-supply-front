import type { ReactNode } from 'react';
import type { RangeValue } from 'rc-picker/lib/interface';
import type { Dayjs } from 'dayjs';
import { Button, Card, DatePicker, Input, Space } from 'antd';
import type { CardProps } from 'antd/es/card';
import type { InputProps } from 'antd/es/input';
import type { RangePickerProps } from 'antd/es/date-picker';
import { DownloadOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';

const { RangePicker } = DatePicker;

export type KeywordDateFilterProps = {
  keyword: string;
  dateRange: RangeValue<Dayjs>;
  onKeywordChange: (value: string) => void;
  onDateRangeChange: (value: RangeValue<Dayjs>) => void;
  onSearch: () => void;
  onReset: () => void;
  onExport?: () => void;
  keywordPlaceholder?: string;
  rangePlaceholder?: [string, string];
  exportLabel?: string;
  extraActions?: ReactNode;
  keywordInputProps?: Partial<InputProps>;
  rangePickerProps?: Partial<RangePickerProps<Dayjs>>;
  cardProps?: CardProps;
};

const defaultRangePlaceholder: [string, string] = ['开始日期', '结束日期'];

const KeywordDateFilter = ({
  keyword,
  dateRange,
  onKeywordChange,
  onDateRangeChange,
  onSearch,
  onReset,
  onExport,
  keywordPlaceholder = '请输入关键字',
  rangePlaceholder = defaultRangePlaceholder,
  exportLabel = '导出Excel',
  extraActions,
  keywordInputProps,
  rangePickerProps,
  cardProps,
}: KeywordDateFilterProps) => {
  const { style: keywordStyle, ...restKeywordInputProps } = keywordInputProps ?? {};
  const { style: pickerStyleProp, allowEmpty, ...restRangePickerProps } = rangePickerProps ?? {};
  const inputStyle = {
    width: 240,
    ...(keywordStyle ?? {}),
  };
  const pickerStyle = {
    width: 260,
    ...(pickerStyleProp ?? {}),
  };

  return (
    <Card {...cardProps}>
      <Space wrap size={16}>
        <Input
          value={keyword}
          allowClear
          placeholder={keywordPlaceholder}
          onChange={(event) => onKeywordChange(event.target.value)}
          {...restKeywordInputProps}
          style={inputStyle}
        />
        <RangePicker
          value={dateRange}
          onChange={onDateRangeChange}
          placeholder={rangePlaceholder}
          allowEmpty={allowEmpty ?? [true, true]}
          {...restRangePickerProps}
          style={pickerStyle}
        />
        <Space>
          <Button type="primary" icon={<SearchOutlined />} onClick={onSearch}>
            查询
          </Button>
          <Button icon={<ReloadOutlined />} onClick={onReset}>
            重置
          </Button>
          {onExport && (
            <Button icon={<DownloadOutlined />} onClick={onExport}>
              {exportLabel}
            </Button>
          )}
          {extraActions}
        </Space>
      </Space>
    </Card>
  );
};

export default KeywordDateFilter;
