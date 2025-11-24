import type { StyleDetailData, StyleDetailSavePayload, StyleFormMeta } from '../types/style';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const styleUnits = ['件', '套', '双', '组'];

export const designerDirectory = [
  { id: 'dsg-1001', name: '林清' },
  { id: 'dsg-1002', name: '周童' },
  { id: 'dsg-1003', name: '苏以' },
  { id: 'dsg-1004', name: '麦宁' },
  { id: 'dsg-1005', name: '黄婧' },
];

const defaultDetail: StyleDetailData = {
  id: 'STY-2024-001',
  styleNo: 'STY-2024-001',
  styleName: '示例款式',
  status: 'active',
  defaultUnit: styleUnits[0],
  designerId: designerDirectory[0]?.id,
  remarks: '示例款式，仅用于本地 mock',
  coverImageUrl: '/assets/images/styles/ET0110.jpg',
  colors: ['黑色', '灰色'],
  sizes: ['120', '130', '140'],
  colorImages: {
    黑色: '/assets/images/styles/ET0110.jpg',
  },
  processes: [],
};

let draftCache: StyleDetailData | undefined;

export const getStyleFormMeta = async (): Promise<StyleFormMeta> => {
  await delay(200);
  return {
    units: styleUnits,
    designers: designerDirectory,
  };
};

export const getStyleDetail = async (styleId?: string): Promise<StyleDetailData> => {
  await delay(280);
  if (draftCache && (!styleId || draftCache.id === styleId)) {
    return draftCache;
  }
  return { ...defaultDetail, id: styleId ?? defaultDetail.id, styleNo: styleId ?? defaultDetail.styleNo };
};

export const saveStyleDetail = async (payload: StyleDetailSavePayload): Promise<StyleDetailData> => {
  await delay(300);
  const saved: StyleDetailData = {
    id: payload.styleNo || draftCache?.id || `STY-${Date.now()}`,
    styleNo: payload.styleNo,
    styleName: payload.styleName,
    status: payload.status,
    defaultUnit: payload.defaultUnit,
    designerId: payload.designerId,
    remarks: payload.remarks,
    coverImageUrl: payload.coverImageUrl,
    colors: payload.colors,
    sizes: payload.sizes,
    colorImages: { ...payload.colorImages },
    processes: payload.processes ?? [],
  };
  draftCache = saved;
  return saved;
};
