import type { PreferenceGroup } from '../types/settings';

export const preferenceGroupTemplates: PreferenceGroup[] = [
  {
    key: 'production',
    title: '生产流程',
    items: [
      { key: 'ordered-production', label: '按顺序生产', type: 'switch', value: true },
      { key: 'scan-by-section', label: '按部位扫菲', type: 'switch', value: false },
      {
        key: 'hide-completed-steps',
        label: '扫菲时自动隐藏已完成工序',
        type: 'switch',
        value: true,
      },
      { key: 'auto-bed-generate', label: '自动生成床次', type: 'switch', value: true },
      {
        key: 'bulk-material-cost-source',
        label: '大货物料成本来源',
        type: 'select',
        value: 'plan',
        options: [
          { label: '按用量计划', value: 'plan' },
          { label: '按实耗记录', value: 'actual' },
        ],
      },
      {
        key: 'bulk-cost-quantity-source',
        label: '大货成本核算数量来源',
        type: 'select',
        value: 'cutting',
        options: [
          { label: '按剪裁数量', value: 'cutting' },
          { label: '按完工数量', value: 'finished' },
        ],
      },
      {
        key: 'bom-auto-purchase-qty',
        label: '物料清单自动设置采购数',
        type: 'switch',
        value: true,
      },
    ],
  },
  {
    key: 'mobile',
    title: '移动端与可见性',
    items: [
      { key: 'hide-app-stat', label: '隐藏APP个人统计模块', type: 'switch', value: false },
      {
        key: 'hide-app-salary-complete',
        label: 'APP薪资明细不显示已结算薪资的单价和金额',
        type: 'switch',
        value: true,
      },
      {
        key: 'notify-quantity-change',
        label: '发送登记数量更改通知',
        type: 'switch',
        value: true,
      },
    ],
  },
  {
    key: 'material',
    title: '物料设置',
    items: [
      { key: 'only-reference-material', label: '仅引用物料档案', type: 'switch', value: false },
      {
        key: 'default-process-type',
        label: '物料自动出仓默认加工类型',
        type: 'select',
        value: '外发加工',
        options: [
          { label: '内加工', value: '内加工' },
          { label: '外发加工', value: '外发加工' },
        ],
      },
      {
        key: 'factory-progress-ref',
        label: '工厂订单百分比进度参照裁剪数量',
        type: 'switch',
        value: true,
      },
      {
        key: 'factory-material-follow',
        label: '工厂订单显示物料跟进节点',
        type: 'switch',
        value: true,
      },
      {
        key: 'material-follow-precut',
        label: '物料跟进节点预裁数取值方式',
        type: 'select',
        value: 'cutting-plan',
        options: [
          { label: '裁剪计划数', value: 'cutting-plan' },
          { label: '仓库发料数', value: 'warehouse-issued' },
        ],
      },
      { key: 'workflow-ordering', label: '按流程下板下订单', type: 'switch', value: false },
    ],
  },
  {
    key: 'workshop',
    title: '车间计件',
    items: [
      {
        key: 'piecework-progress-sync',
        label: '车间扫码完成后同步进度',
        type: 'switch',
        value: true,
      },
      {
        key: 'piecework-auto-close',
        label: '达到计件阈值自动完结',
        type: 'switch',
        value: false,
      },
      {
        key: 'piecework-hide-finished',
        label: '车间端隐藏已完成工序',
        type: 'switch',
        value: true,
      },
    ],
  },
];
