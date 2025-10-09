import type {
  CreateMaterialPayload,
  MaterialDataset,
  MaterialItem,
  MaterialListParams,
  UpdateMaterialPayload,
} from '../types';
import {
  createMaterial,
  exportMaterials,
  importMaterials,
  listMaterials,
  removeMaterial,
  updateMaterial,
} from '../mock/material';

export const materialApi = {
  list: (params: MaterialListParams): Promise<MaterialDataset> => listMaterials(params),
  create: (payload: CreateMaterialPayload): Promise<MaterialItem> => createMaterial(payload),
  update: (id: string, payload: UpdateMaterialPayload) => updateMaterial(id, payload),
  remove: (id: string) => removeMaterial(id),
  import: (payload: CreateMaterialPayload[], category: MaterialListParams['category']) =>
    importMaterials(payload, category),
  export: (params: { category: MaterialListParams['category']; keyword?: string }) => exportMaterials(params),
};

export default materialApi;
