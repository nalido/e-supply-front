import type {
  MaterialStockListItem,
  MaterialStockListParams,
  MaterialStockListResponse,
  MaterialStockMeta,
  MaterialStockType,
} from '../types/material-stock';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const warehouses: MaterialStockMeta['warehouses'] = [
  { id: 'wh-hz', name: '杭州总仓' },
  { id: 'wh-sz', name: '苏州面料仓' },
  { id: 'wh-gd', name: '广东辅料仓' },
];

const tabs: MaterialStockMeta['materialTabs'] = [
  { value: 'fabric', label: '面料' },
  { value: 'accessory', label: '辅料/包材' },
];

const materialImages: Record<string, string | undefined> = {
  'FAB-001': '/assets/images/materials/fabric-cotton.jpg',
  'FAB-002': '/assets/images/materials/fabric-nylon.jpg',
  'FAB-003': '/assets/images/materials/fabric-denim.jpg',
  'FAB-004': '/assets/images/materials/fabric-flannel.jpg',
  'ACC-001': '/assets/images/materials/zipper.jpg',
  'ACC-002': '/assets/images/materials/button.jpg',
  'ACC-003': '/assets/images/materials/elastics.jpg',
  'ACC-004': '/assets/images/materials/packaging-box.jpg',
};

const fabricDataset: MaterialStockListItem[] = [
  {
    id: 'fabric-001',
    materialCode: 'FAB-001',
    materialName: '32S全棉罗纹',
    color: '本白',
    specification: '180cm · 180g/m²',
    unit: '米',
    warehouseId: 'wh-hz',
    warehouseName: '杭州总仓',
    stockQty: 12540,
    availableQty: 11200,
    inTransitQty: 1200,
    remark: '常规款童装领口用料',
    imageUrl: materialImages['FAB-001'],
  },
  {
    id: 'fabric-002',
    materialCode: 'FAB-002',
    materialName: '40D锦纶高弹胆布',
    color: '香槟',
    specification: '152cm · 96g/m²',
    unit: '米',
    warehouseId: 'wh-sz',
    warehouseName: '苏州面料仓',
    stockQty: 8640,
    availableQty: 8430,
    inTransitQty: 600,
    remark: '羽绒内胆常备色号',
    imageUrl: materialImages['FAB-002'],
  },
  {
    id: 'fabric-003',
    materialCode: 'FAB-003',
    materialName: '磨毛弹力牛仔',
    color: '烟灰',
    specification: '150cm · 320g/m²',
    unit: '米',
    warehouseId: 'wh-hz',
    warehouseName: '杭州总仓',
    stockQty: 4320,
    availableQty: 3980,
    inTransitQty: 1600,
    remark: '秋冬裤装重点排产',
    imageUrl: materialImages['FAB-003'],
  },
  {
    id: 'fabric-004',
    materialCode: 'FAB-004',
    materialName: '水洗磨毛法兰绒',
    color: '咖啡格',
    specification: '145cm · 220g/m²',
    unit: '米',
    warehouseId: 'wh-sz',
    warehouseName: '苏州面料仓',
    stockQty: 0,
    availableQty: 0,
    inTransitQty: 2600,
    remark: '大货在途，将于3月18日到仓',
    imageUrl: materialImages['FAB-004'],
  },
];

const accessoryDataset: MaterialStockListItem[] = [
  {
    id: 'accessory-001',
    materialCode: 'ACC-001',
    materialName: 'YKK树脂拉链5#',
    color: '黑色',
    specification: '60cm',
    unit: '条',
    warehouseId: 'wh-gd',
    warehouseName: '广东辅料仓',
    stockQty: 18450,
    availableQty: 17200,
    inTransitQty: 2000,
    remark: '春夏外套通用',
    imageUrl: materialImages['ACC-001'],
  },
  {
    id: 'accessory-002',
    materialCode: 'ACC-002',
    materialName: '合金四合扣17mm',
    color: '青古铜',
    specification: '17mm',
    unit: '粒',
    warehouseId: 'wh-gd',
    warehouseName: '广东辅料仓',
    stockQty: 30200,
    availableQty: 29500,
    inTransitQty: 0,
    remark: '童装牛仔系列专用',
    imageUrl: materialImages['ACC-002'],
  },
  {
    id: 'accessory-003',
    materialCode: 'ACC-003',
    materialName: '5cm棉包PU腰里',
    color: '黑色',
    specification: '5cm × 100m/卷',
    unit: '卷',
    warehouseId: 'wh-hz',
    warehouseName: '杭州总仓',
    stockQty: 520,
    availableQty: 480,
    inTransitQty: 80,
    remark: '裤装生产线常用',
    imageUrl: materialImages['ACC-003'],
  },
  {
    id: 'accessory-004',
    materialCode: 'ACC-004',
    materialName: '120gsm珠光吊牌卡纸',
    specification: '7cm × 12cm',
    unit: '张',
    warehouseId: 'wh-gd',
    warehouseName: '广东辅料仓',
    stockQty: 0,
    availableQty: 0,
    inTransitQty: 35000,
    remark: '包装物料待补货',
    imageUrl: materialImages['ACC-004'],
  },
];

const datasetByType: Record<MaterialStockType, MaterialStockListItem[]> = {
  fabric: fabricDataset,
  accessory: accessoryDataset,
};

const summarize = (records: MaterialStockListItem[]) =>
  records.reduce(
    (acc, item) => {
      acc.stockQtyTotal += item.stockQty;
      acc.availableQtyTotal += item.availableQty;
      acc.inTransitQtyTotal += item.inTransitQty;
      return acc;
    },
    { stockQtyTotal: 0, availableQtyTotal: 0, inTransitQtyTotal: 0 },
  );

export const fetchMaterialStockMeta = async (): Promise<MaterialStockMeta> => {
  await delay(180);
  return {
    materialTabs: tabs,
    warehouses,
  };
};

export const fetchMaterialStockList = async (
  params: MaterialStockListParams,
): Promise<MaterialStockListResponse> => {
  await delay(220);
  const source = datasetByType[params.materialType] ?? [];
  const filtered = source.filter((item) => {
    if (params.onlyInStock && item.stockQty <= 0) {
      return false;
    }
    if (params.keywordRemark) {
      const keyword = params.keywordRemark.trim().toLowerCase();
      if (keyword && !(item.remark ?? '').toLowerCase().includes(keyword)) {
        return false;
      }
    }
    if (params.keywordOrderStyle) {
      const keyword = params.keywordOrderStyle.trim().toLowerCase();
      if (keyword) {
        const haystack = `${item.materialName} ${item.materialCode}`.toLowerCase();
        if (!haystack.includes(keyword)) {
          return false;
        }
      }
    }
    return true;
  });

  const safePage = Math.max(1, params.page);
  const safeSize = Math.max(1, params.pageSize);
  const start = (safePage - 1) * safeSize;
  const list = filtered.slice(start, start + safeSize);
  return {
    list,
    total: filtered.length,
    summary: summarize(filtered),
  };
};
