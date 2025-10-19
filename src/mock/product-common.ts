import type { FinishedGoodsOtherInboundProcessor, FinishedGoodsOtherInboundStyleOption, FinishedGoodsOtherInboundTypeOption, FinishedGoodsOtherInboundWarehouse } from '../types/finished-goods-other-inbound';

export const productWarehouses: FinishedGoodsOtherInboundWarehouse[] = [
  { id: 'wh-hz', name: '杭州成品仓' },
  { id: 'wh-sz', name: '苏州中转仓' },
  { id: 'wh-cq', name: '重庆成品仓' },
];

export const productProcessors: FinishedGoodsOtherInboundProcessor[] = [
  { id: 'proc-01', name: '杭州星澜制衣厂' },
  { id: 'proc-02', name: '湖州锦程加工部' },
  { id: 'proc-03', name: '苏州冠云外发车间' },
];

export const otherInboundTypeOptions: FinishedGoodsOtherInboundTypeOption[] = [
  { value: 'customer-return', label: '客户退货' },
  { value: 'inventory-surplus', label: '盘点盘盈' },
  { value: 'initial-stock', label: '期初库存' },
  { value: 'sample-inbound', label: '样品入库' },
  { value: 'adjustment', label: '库存调整' },
];

export const productStyleOptions: FinishedGoodsOtherInboundStyleOption[] = [
  {
    id: 'ET0110',
    styleNo: 'ET0110',
    styleName: '儿童羊羔毛拉链夹克套装',
    imageUrl: '/assets/images/styles/ET0110.jpg',
    colors: ['黑色', '浅灰', '藏青'],
    sizes: ['110', '120', '130', '140', '150'],
  },
  {
    id: 'ET0168',
    styleNo: 'ET0168',
    styleName: '儿童条纹工装卫裤',
    imageUrl: '/assets/images/styles/ET0168.jpg',
    colors: ['军绿', '藏青', '浅灰'],
    sizes: ['110', '120', '130', '140'],
  },
  {
    id: 'ET0151',
    styleNo: 'ET0151',
    styleName: '儿童拉链连帽拼色套装',
    imageUrl: '/assets/images/styles/ET0151.jpg',
    colors: ['粉色', '藏青', '卡其'],
    sizes: ['110', '120', '130', '140', '150'],
  },
  {
    id: 'ET0193',
    styleNo: 'ET0193',
    styleName: '儿童书包卫衣',
    imageUrl: '/assets/images/styles/ET0193.jpg',
    colors: ['黑色', '白色', '浅灰'],
    sizes: ['120', '130', '140', '150', '160'],
  },
  {
    id: 'ET5033',
    styleNo: 'ET5033',
    styleName: '儿童撞色条纹卫衣卫裤套装',
    imageUrl: '/assets/images/styles/ET5033.jpg',
    colors: ['橘色', '湖蓝', '黑色'],
    sizes: ['110', '120', '130', '140'],
  },
  {
    id: 'ET0409',
    styleNo: 'ET0409',
    styleName: '儿童拼色连帽开衫套装',
    imageUrl: '/assets/images/styles/ET0409.jpg',
    colors: ['粉色', '藏青', '黑色'],
    sizes: ['110', '120', '130', '140', '150'],
  },
  {
    id: 'ET5031',
    styleNo: 'ET5031',
    styleName: '儿童高领开衫撞色条纹套装',
    imageUrl: '/assets/images/styles/ET5031.jpg',
    colors: ['咖色', '墨绿', '藏青'],
    sizes: ['110', '120', '130', '140'],
  },
  {
    id: 'ET0362',
    styleNo: 'ET0362',
    styleName: '儿童黑色波浪拉链速干短裤',
    imageUrl: '/assets/images/styles/ET0362.jpg',
    colors: ['黑色'],
    sizes: ['110', '120', '130', '140', '150'],
  },
];

export const styleAssetMap = productStyleOptions.reduce<Record<string, string>>((acc, style) => {
  acc[style.styleNo] = style.imageUrl;
  return acc;
}, {});

export const fallbackStyleAsset = '/assets/images/styles/ET0110.jpg';

export const getStyleOptionById = (styleId: string): FinishedGoodsOtherInboundStyleOption | undefined =>
  productStyleOptions.find((style) => style.id === styleId || style.styleNo === styleId);
