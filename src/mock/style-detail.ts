import type {
  StyleColorImageMap,
  StyleDraft,
  StyleFormMeta,
  StyleOperation,
  StyleOperationTemplate,
} from '../types/style';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const styleUnits = ['件', '套', '双', '组'];

export const designerDirectory = [
  { id: 'dsg-1001', name: '林清' },
  { id: 'dsg-1002', name: '周童' },
  { id: 'dsg-1003', name: '苏以' },
  { id: 'dsg-1004', name: '麦宁' },
  { id: 'dsg-1005', name: '黄婧' },
];

export const styleOperationStages = ['研发', '裁剪', '车缝', '整烫', '包装'];

export const styleProcessDepartments = ['研发中心', '裁床', '车缝组', '后整线', '质检部'];

export const stylePartOptions = ['领口', '袖子', '前片', '后片', '裤腰', '裤脚'];

export const styleSpecificationOptions = ['100', '110', '120', '130', '140', '150'];

const createEmptyDraft = (): StyleDraft => ({
  form: {
    styleNumber: '',
    styleName: '',
    unit: styleUnits[0],
    designer: undefined,
    designNumber: '',
    remarks: '',
    colors: [],
    sizes: [],
    colorImagesEnabled: false,
  },
  operations: [],
  coverImage: undefined,
  colorImages: {},
});

const wrapOperations = (items: Array<Omit<StyleOperation, 'id'>>): StyleOperation[] =>
  items.map((item, index) => ({ ...item, id: `op-${index + 1}`, sequence: index + 1 }));

const operationTemplates: StyleOperationTemplate[] = [
  {
    id: 'tpl-knit-basic',
    name: '针织卫衣标准工序',
    operations: wrapOperations([
      {
        sequence: 1,
        operationName: '设计打版',
        stage: '研发',
        processDepartment: '研发中心',
        parts: ['前片', '后片'],
        specificationUnitPrice: 28,
        specificationEnabled: true,
        specificationNotes: '款式基础开发',
        isKeyProcess: true,
        processUnitPrice: 25,
      },
      {
        sequence: 2,
        operationName: '主线车缝',
        stage: '车缝',
        processDepartment: '车缝组',
        parts: ['前片', '后片', '袖子'],
        specificationUnitPrice: 12,
        specificationEnabled: true,
        specificationNotes: '重点控制针距',
        isKeyProcess: true,
        processUnitPrice: 11,
      },
    ]),
  },
  {
    id: 'tpl-pants-basic',
    name: '运动裤标准工序',
    operations: wrapOperations([
      {
        sequence: 1,
        operationName: '裁片检验',
        stage: '裁剪',
        processDepartment: '裁床',
        parts: ['前片', '后片'],
        specificationUnitPrice: 4.5,
        specificationEnabled: false,
        isKeyProcess: false,
        processUnitPrice: 4,
      },
      {
        sequence: 2,
        operationName: '整烫修线',
        stage: '整烫',
        processDepartment: '后整线',
        parts: ['裤腿'],
        specificationUnitPrice: 3,
        specificationEnabled: false,
        isKeyProcess: false,
        processUnitPrice: 2.8,
      },
    ]),
  },
];

const mapColorImages = (colors: string[]): StyleColorImageMap =>
  colors.reduce<StyleColorImageMap>((acc, color, index) => {
    acc[color] = {
      id: `color-img-${index + 1}`,
      filename: `${color}.jpg`,
      url: `/assets/images/color/${color}.jpg`,
      associatedColor: color,
    };
    return acc;
  }, {});

export const getStyleFormMeta = async (): Promise<StyleFormMeta> => {
  await delay(240);
  return {
    units: styleUnits,
    designers: designerDirectory,
    operationStages: styleOperationStages,
    processDepartments: styleProcessDepartments,
    partOptions: stylePartOptions,
    specificationOptions: styleSpecificationOptions,
  };
};

export const getStyleDraft = async (styleId?: string): Promise<StyleDraft> => {
  await delay(320);
  if (styleId) {
    return {
      ...createEmptyDraft(),
      form: {
        styleNumber: styleId,
        styleName: '示例款式',
        unit: styleUnits[0],
        designer: designerDirectory[0]?.id,
        designNumber: 'DES-2024',
        remarks: '从模板加载的示例数据',
        colors: ['黑色', '灰色'],
        sizes: ['120', '130', '140'],
        colorImagesEnabled: true,
      },
      coverImage: {
        id: 'cover-1',
        filename: 'cover.jpg',
        url: '/assets/images/styles/ET0110.jpg',
      },
      colorImages: mapColorImages(['黑色', '灰色']),
    };
  }
  return createEmptyDraft();
};

export const getOperationTemplates = async (): Promise<StyleOperationTemplate[]> => {
  await delay(200);
  return operationTemplates;
};

export const saveStyleDraft = async (payload: StyleDraft): Promise<{ id: string; savedAt: string }> => {
  await delay(360);
  const id = payload.form.styleNumber || `STY-${Date.now()}`;
  return { id, savedAt: new Date().toISOString() };
};
