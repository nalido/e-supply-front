import type {
  CreateMaterialPayload,
  MaterialDataset,
  MaterialItem,
  MaterialListParams,
  UpdateMaterialPayload,
} from '../types';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const initialStore: MaterialItem[] = [
  {
    id: 'mat-001',
    name: '32S全棉罗纹',
    category: 'fabric',
    categoryPath: ['面料', '针织面料', '罗纹'],
    imageUrl: '/assets/images/materials/fabric-cotton.jpg',
    width: '180cm',
    grammage: '180g/m²',
    tolerance: '±2cm',
    unit: '米',
    price: 32,
    colors: ['本白', '藏青', '黑灰'],
    remarks: '常用罗纹领口面料，弹性佳。',
    createdAt: '2025-01-04 09:12',
    updatedAt: '2025-03-02 14:48',
  },
  {
    id: 'mat-002',
    name: '40D锦纶高弹胆布',
    category: 'fabric',
    categoryPath: ['面料', '功能面料', '胆布'],
    imageUrl: '/assets/images/materials/fabric-nylon.jpg',
    width: '152cm',
    grammage: '96g/m²',
    tolerance: '±1.5cm',
    unit: '米',
    price: 28.5,
    colors: ['白色', '香槟', '藏青'],
    remarks: '羽绒内胆常用布料，轻薄透气。',
    createdAt: '2024-12-16 16:05',
    updatedAt: '2025-02-22 10:10',
  },
  {
    id: 'mat-003',
    name: '磨毛弹力牛仔',
    category: 'fabric',
    categoryPath: ['面料', '梭织面料', '牛仔'],
    width: '150cm',
    grammage: '320g/m²',
    tolerance: '±2.5cm',
    unit: '米',
    price: 45.8,
    colors: ['深蓝', '烟灰'],
    remarks: '秋冬裤装面料，水洗后有微弹。',
    createdAt: '2025-01-26 11:20',
    updatedAt: '2025-02-28 08:45',
  },
  {
    id: 'mat-004',
    name: '380T涤塔夫',
    category: 'fabric',
    categoryPath: ['面料', '功能面料', '防绒面料'],
    width: '148cm',
    grammage: '68g/m²',
    tolerance: '±1.5cm',
    unit: '米',
    price: 16.2,
    colors: ['黑色', '军绿', '孔雀蓝'],
    remarks: '羽绒外壳用料，具有防绒效果。',
    createdAt: '2024-11-08 09:50',
    updatedAt: '2025-02-18 15:32',
  },
  {
    id: 'mat-005',
    name: 'YKK树脂拉链5#',
    category: 'accessory',
    categoryPath: ['辅料/包材', '拉链'],
    imageUrl: '/assets/images/materials/zipper.jpg',
    unit: '个',
    price: 2.2,
    colors: ['黑色', '军绿', '本白'],
    tolerance: '±0.3cm',
    remarks: '成衣前后门襟通用树脂拉链。',
    createdAt: '2025-02-03 17:05',
    updatedAt: '2025-03-01 09:40',
  },
  {
    id: 'mat-006',
    name: '合金四合扣17mm',
    category: 'accessory',
    categoryPath: ['辅料/包材', '扣子'],
    unit: '个',
    price: 0.36,
    colors: ['枪黑', '青古铜'],
    remarks: '牛仔外套与童装常用扣具。',
    tolerance: '±0.1mm',
    createdAt: '2024-12-28 13:16',
    updatedAt: '2025-02-25 18:12',
  },
  {
    id: 'mat-007',
    name: '5cm棉包PU腰里',
    category: 'accessory',
    categoryPath: ['辅料/包材', '里料'],
    width: '5cm',
    unit: '米',
    price: 3.2,
    colors: ['黑色', '灰色'],
    remarks: '裤腰用料，手感柔软耐磨。',
    createdAt: '2024-10-14 08:25',
    updatedAt: '2025-02-12 10:22',
  },
  {
    id: 'mat-008',
    name: '120gsm珠光吊牌卡纸',
    category: 'accessory',
    categoryPath: ['辅料/包材', '包材'],
    unit: '张',
    price: 0.58,
    colors: ['珠光白'],
    remarks: '童装系列通用包装吊牌。',
    createdAt: '2025-01-09 09:10',
    updatedAt: '2025-02-17 12:08',
  },
];

const store: MaterialItem[] = clone(initialStore);

const nowString = () => new Date().toISOString().replace('T', ' ').slice(0, 16);

const listToDataset = (list: MaterialItem[], total: number): MaterialDataset => ({
  list: clone(list),
  total,
});

export const listMaterials = async (
  params: MaterialListParams,
  delay = 180,
): Promise<MaterialDataset> =>
  new Promise((resolve) => {
    setTimeout(() => {
      const { page, pageSize, keyword, category } = params;
      const safePage = Math.max(1, page);
      const safeSize = Math.max(1, pageSize);
      const lower = keyword?.trim().toLowerCase();

      const filtered = store.filter((item) => {
        if (item.category !== category) {
          return false;
        }
        if (!lower) {
          return true;
        }
        if (item.name.toLowerCase().includes(lower)) {
          return true;
        }
        if (item.remarks) {
          return item.remarks.toLowerCase().includes(lower);
        }
        return false;
      });

      const start = (safePage - 1) * safeSize;
      const list = filtered.slice(start, start + safeSize);
      resolve(listToDataset(list, filtered.length));
    }, delay);
  });

export const createMaterial = async (
  payload: CreateMaterialPayload,
  delay = 220,
): Promise<MaterialItem> =>
  new Promise((resolve) => {
    setTimeout(() => {
      const next: MaterialItem = {
        id: `mat-${Date.now()}`,
        name: payload.name,
        category: payload.category,
        categoryPath: payload.categoryPath ?? [],
        unit: payload.unit,
        colors: payload.colors ?? [],
        imageUrl: payload.imageUrl,
        width: payload.width,
        grammage: payload.grammage,
        tolerance: payload.tolerance,
        price: payload.price,
        remarks: payload.remarks,
        createdAt: nowString(),
        updatedAt: nowString(),
      };
      store.unshift(next);
      resolve(clone(next));
    }, delay);
  });

export const updateMaterial = async (
  id: string,
  payload: UpdateMaterialPayload,
  delay = 200,
): Promise<MaterialItem | undefined> =>
  new Promise((resolve) => {
    setTimeout(() => {
      const index = store.findIndex((item) => item.id === id);
      if (index === -1) {
        resolve(undefined);
        return;
      }
      const updated: MaterialItem = {
        ...store[index],
        ...payload,
        colors: payload.colors ?? store[index].colors,
        categoryPath: payload.categoryPath ?? store[index].categoryPath,
        updatedAt: nowString(),
      };
      store[index] = updated;
      resolve(clone(updated));
    }, delay);
  });

export const removeMaterial = async (id: string, delay = 160): Promise<boolean> =>
  new Promise((resolve) => {
    setTimeout(() => {
      const index = store.findIndex((item) => item.id === id);
      if (index === -1) {
        resolve(false);
        return;
      }
      store.splice(index, 1);
      resolve(true);
    }, delay);
  });

export const importMaterials = async (
  payload: CreateMaterialPayload[],
  category: MaterialListParams['category'],
  delay = 260,
): Promise<number> =>
  new Promise((resolve) => {
    setTimeout(() => {
      const count = payload.length;
      payload.forEach((item) => {
        store.unshift({
          id: `mat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: item.name,
          category: item.category ?? category,
          categoryPath: item.categoryPath ?? [category === 'fabric' ? '面料' : '辅料/包材'],
          unit: item.unit,
          colors: item.colors ?? [],
          imageUrl: item.imageUrl,
          width: item.width,
          grammage: item.grammage,
          tolerance: item.tolerance,
          price: item.price,
          remarks: item.remarks,
          createdAt: nowString(),
          updatedAt: nowString(),
        });
      });
      resolve(count);
    }, delay);
  });

export const exportMaterials = async (
  params: { category: MaterialListParams['category']; keyword?: string },
  delay = 200,
): Promise<Blob> =>
  new Promise((resolve) => {
    setTimeout(() => {
      const keyword = params.keyword?.trim().toLowerCase();
      const dataset = store.filter((item) => {
        if (item.category !== params.category) {
          return false;
        }
        if (!keyword) {
          return true;
        }
        if (item.name.toLowerCase().includes(keyword)) {
          return true;
        }
        if (item.remarks) {
          return item.remarks.toLowerCase().includes(keyword);
        }
        return false;
      });
      const blob = new Blob([JSON.stringify({ exportedAt: nowString(), list: dataset }, null, 2)], {
        type: 'application/json',
      });
      resolve(blob);
    }, delay);
  });

export const resetMaterialStore = (): void => {
  store.splice(0, store.length, ...clone(initialStore));
};
