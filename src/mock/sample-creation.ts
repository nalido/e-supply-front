import type { SampleCreationMeta } from '../types/sample-create';
import type { SampleProcessOption, SampleProcessStep } from '../types/sample';
import { sampleOptions } from './sample';

const units = ['件', '套', '色', '双', '组'];

const sampleTypes = ['初版', '复版', '产前版', '复尺版', '封样'];

const merchandisers = [
  { id: 'mer-001', name: '陈丽丽', title: '高级跟单', department: '样板部' },
  { id: 'mer-002', name: '王强', title: '资深跟单', department: '样板部' },
  { id: 'mer-003', name: '赵小燕', title: '跟单专员', department: '样板部' },
];

const patternMakers = [
  { id: 'pat-001', name: '刘静', title: '纸样师', department: '纸样室' },
  { id: 'pat-002', name: '姚哲', title: '高级纸样师', department: '纸样室' },
  { id: 'pat-003', name: '何敏', title: '纸样主管', department: '纸样室' },
];

const sampleSewers = [
  { id: 'sew-001', name: '张华', title: '车板师', department: '打板车间' },
  { id: 'sew-002', name: '李娜', title: '资深车板师', department: '打板车间' },
  { id: 'sew-003', name: '郭颖', title: '样衣师', department: '打板车间' },
];

const processLibrary: SampleProcessOption[] = [
  {
    id: 'proc-cutting',
    name: '裁剪',
    defaultDuration: 1,
    department: '裁床组',
    description: '根据纸样排料，完成面辅料裁剪',
    tags: ['标准工序'],
  },
  {
    id: 'proc-marking',
    name: '唛架排料',
    defaultDuration: 1,
    department: '纸样室',
    description: '制作唛架并优化排料效率',
    tags: ['准备'],
  },
  {
    id: 'proc-sewing',
    name: '车缝',
    defaultDuration: 2,
    department: '打板车间',
    description: '按工艺单进行样衣车缝制作',
    tags: ['关键工序'],
  },
  {
    id: 'proc-ironing',
    name: '整烫',
    defaultDuration: 1,
    department: '后整理',
    description: '对成衣进行整烫和外观修整',
  },
  {
    id: 'proc-quality',
    name: '质检',
    defaultDuration: 1,
    department: '质检组',
    description: '检查样衣尺寸、工艺和外观',
    tags: ['质控'],
  },
  {
    id: 'proc-packaging',
    name: '包装',
    defaultDuration: 1,
    department: '后整理',
    description: '根据客户要求整理附件并完成包装',
  },
];

const defaultProcesses: SampleProcessStep[] = processLibrary.slice(0, 4).map((item, index) => ({
  ...item,
  order: index + 1,
}));

const customers = sampleOptions.customers.map((name, index) => ({
  id: `cust-${(index + 1).toString().padStart(3, '0')}`,
  name,
  level: index < 3 ? 'A' : index < 6 ? 'B' : 'C',
}));

const designers = sampleOptions.designers.map((name, index) => ({
  id: `des-${(index + 1).toString().padStart(3, '0')}`,
  name,
}));

const colorPresets = sampleOptions.colors;
const sizePresets = sampleOptions.sizes;

export const sampleCreationMeta: SampleCreationMeta = {
  units,
  sampleTypes,
  customers,
  merchandisers,
  patternMakers,
  sampleSewers,
  designers,
  processLibrary,
  defaultProcesses,
  colorPresets,
  sizePresets,
};

export const getSampleCreationMeta = (): SampleCreationMeta => ({
  ...sampleCreationMeta,
  customers: [...sampleCreationMeta.customers],
  merchandisers: [...sampleCreationMeta.merchandisers],
  patternMakers: [...sampleCreationMeta.patternMakers],
  sampleSewers: [...sampleCreationMeta.sampleSewers],
  designers: [...sampleCreationMeta.designers],
  processLibrary: sampleCreationMeta.processLibrary.map((item) => ({ ...item })),
  defaultProcesses: sampleCreationMeta.defaultProcesses.map((item) => ({ ...item })),
  colorPresets: [...sampleCreationMeta.colorPresets],
  sizePresets: [...sampleCreationMeta.sizePresets],
  units: [...sampleCreationMeta.units],
  sampleTypes: [...sampleCreationMeta.sampleTypes],
});
