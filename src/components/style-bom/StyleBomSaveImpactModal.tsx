import { Alert, Button, DatePicker, Modal, Radio, Segmented, Space, Statistic, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useEffect, useState } from 'react';
import type { StyleBomHandlingMode, StyleBomHistoryRangePreset, StyleBomImpactPreview } from '../../types/style';

const { Text } = Typography;

export type StyleBomImpactDecision = {
  handlingMode: StyleBomHandlingMode;
  historyStart?: string;
  historyEnd?: string;
};

type Props = {
  open: boolean;
  loading: boolean;
  saving: boolean;
  preview?: StyleBomImpactPreview;
  onCancel: () => void;
  onRangePreview: (historyStart?: string, historyEnd?: string) => void;
  onConfirm: (decision: StyleBomImpactDecision) => void;
};

const resolvePreset = (preset: StyleBomHistoryRangePreset): [string | undefined, string | undefined] => {
  const end = dayjs().endOf('day').format('YYYY-MM-DDTHH:mm:ss');
  if (preset === 'LAST_7_DAYS') return [dayjs().subtract(6, 'day').startOf('day').format('YYYY-MM-DDTHH:mm:ss'), end];
  if (preset === 'LAST_30_DAYS') return [dayjs().subtract(29, 'day').startOf('day').format('YYYY-MM-DDTHH:mm:ss'), end];
  if (preset === 'LAST_90_DAYS') return [dayjs().subtract(89, 'day').startOf('day').format('YYYY-MM-DDTHH:mm:ss'), end];
  return [undefined, undefined];
};

export default function StyleBomSaveImpactModal({ open, loading, saving, preview, onCancel, onRangePreview, onConfirm }: Props) {
  const [handlingMode, setHandlingMode] = useState<StyleBomHandlingMode>('FUTURE_ONLY');
  const [preset, setPreset] = useState<StyleBomHistoryRangePreset>('LAST_30_DAYS');
  const [customRange, setCustomRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [historyRange, setHistoryRange] = useState<[string | undefined, string | undefined]>(() => resolvePreset('LAST_30_DAYS'));

  useEffect(() => {
    if (open) {
      setHandlingMode('FUTURE_ONLY');
      setPreset('LAST_30_DAYS');
      setCustomRange(null);
      setHistoryRange(resolvePreset('LAST_30_DAYS'));
    }
  }, [open]);

  const changePreset = (next: StyleBomHistoryRangePreset) => {
    setPreset(next);
    if (next === 'CUSTOM') {
      setCustomRange(null);
      setHistoryRange([undefined, undefined]);
      return;
    }
    const range = resolvePreset(next);
    setHistoryRange(range);
    onRangePreview(...range);
  };

  const confirmLabel = handlingMode === 'FUTURE_ONLY'
    ? '保存并用于之后订单'
    : handlingMode === 'SYNC_UNISSUED'
      ? `保存并同步 ${preview?.unissuedOrderCount ?? 0} 个订单`
      : `保存并创建 ${preview?.adjustableHistoryCount ?? 0} 条差异处理`;
  const customRangeIncomplete = handlingMode === 'CREATE_CORRECTION_TASK'
    && preset === 'CUSTOM'
    && (!customRange?.[0] || !customRange[1]);

  return (
    <Modal
      className="style-bom-impact-modal"
      title="检查并处理受影响用料"
      open={open}
      width={760}
      destroyOnHidden
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>继续检查</Button>,
        <Button key="confirm" type="primary" loading={saving} disabled={loading || !preview || customRangeIncomplete} onClick={() => onConfirm({ handlingMode, historyStart: handlingMode === 'CREATE_CORRECTION_TASK' ? historyRange[0] : undefined, historyEnd: handlingMode === 'CREATE_CORRECTION_TASK' ? historyRange[1] : undefined })}>{confirmLabel}</Button>,
      ]}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div className="style-bom-impact-stats">
          <Statistic title="尚未领料订单" value={preview?.unissuedOrderCount ?? 0} loading={loading} />
          <Statistic title="已有领料记录" value={preview?.issuedOrderCount ?? 0} loading={loading} />
          <Statistic title="需人工核对" value={preview?.manualReviewCount ?? 0} loading={loading} />
          <Statistic title="已锁定" value={preview?.lockedCount ?? 0} loading={loading} />
        </div>

        <Radio.Group className="style-bom-impact-options" value={handlingMode} onChange={(event) => {
          const next = event.target.value as StyleBomHandlingMode;
          setHandlingMode(next);
          if (next === 'CREATE_CORRECTION_TASK') {
            onRangePreview(...historyRange);
          } else {
            onRangePreview(undefined, undefined);
          }
        }}>
          <Radio value="FUTURE_ONLY"><Text strong>仅用于之后的新订单</Text><Text type="secondary">已有订单和历史出库保持不变。</Text></Radio>
          <Radio value="SYNC_UNISSUED"><Text strong>同步尚未领料的订单</Text><Text type="secondary">仅更新还没有发生领料的进行中订单。</Text></Radio>
          <Radio value="CREATE_CORRECTION_TASK"><Text strong>创建历史用料差异处理</Text><Text type="secondary">生成补领、退料或人工核对任务，不覆盖原有出库记录。</Text></Radio>
        </Radio.Group>

        {handlingMode === 'CREATE_CORRECTION_TASK' ? (
          <div className="style-bom-history-range">
            <Text strong>核对历史范围</Text>
            <Segmented
              block
              value={preset}
              options={[
                { label: '近7天', value: 'LAST_7_DAYS' },
                { label: '近30天', value: 'LAST_30_DAYS' },
                { label: '近90天', value: 'LAST_90_DAYS' },
                { label: '自定义', value: 'CUSTOM' },
                { label: '全部', value: 'ALL' },
              ]}
              onChange={(value) => changePreset(value as StyleBomHistoryRangePreset)}
            />
            {preset === 'CUSTOM' ? (
              <DatePicker.RangePicker
                value={customRange}
                onChange={(dates) => {
                  const normalized = dates as [Dayjs | null, Dayjs | null] | null;
                  setCustomRange(normalized);
                  if (normalized?.[0] && normalized[1]) {
                    const range: [string, string] = [normalized[0].startOf('day').format('YYYY-MM-DDTHH:mm:ss'), normalized[1].endOf('day').format('YYYY-MM-DDTHH:mm:ss')];
                    setHistoryRange(range);
                    onRangePreview(...range);
                  }
                }}
              />
            ) : null}
            <Alert type="info" showIcon message={`当前范围可生成 ${preview?.adjustableHistoryCount ?? 0} 条差异处理，另有 ${preview?.manualReviewCount ?? 0} 条需要人工核对。`} />
          </div>
        ) : null}
      </Space>
    </Modal>
  );
}
