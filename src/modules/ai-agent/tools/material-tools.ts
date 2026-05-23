import { materialApi } from '../../../api/material';
import type { CreateMaterialPayload, MaterialBasicType, MaterialUnit } from '../../../types';
import type { PendingWriteAction } from '../types';

const UNIT_ALIAS: Record<string, MaterialUnit> = {
  kg: 'kg',
  千克: 'kg',
  公斤: 'kg',
  米: '米',
  m: '米',
  件: '件',
  个: '个',
  码: '码',
  张: '张',
  套: '套',
  条: '条',
};

const normalizeMaterialType = (raw: string | undefined): MaterialBasicType | undefined => {
  if (!raw) {
    return undefined;
  }
  const value = raw.trim().toLowerCase();
  if (['fabric', '布料', '面料'].includes(value)) {
    return 'fabric';
  }
  if (['accessory', '辅料', '配件'].includes(value)) {
    return 'accessory';
  }
  return undefined;
};

const parsePairs = (content: string): Record<string, string> => {
  const pairs: Record<string, string> = {};
  const segments = content.split(/\n|,|，|;|；/).map((item) => item.trim()).filter(Boolean);
  segments.forEach((segment) => {
    const splitIndex = segment.search(/[:：=]/);
    if (splitIndex <= 0) {
      return;
    }
    const key = segment.slice(0, splitIndex).trim().toLowerCase();
    const value = segment.slice(splitIndex + 1).trim();
    if (key && value) {
      pairs[key] = value;
    }
  });
  return pairs;
};

const pickFromAliases = (pairs: Record<string, string>, aliases: string[]): string | undefined =>
  aliases.map((alias) => pairs[alias.toLowerCase()]).find((item) => Boolean(item));

export const buildCreateMaterialAction = (
  userInput: string,
  actionId: string,
): { action?: PendingWriteAction; error?: string } => {
  const normalized = userInput.replace(/^新增物料|^录入物料/g, '').trim();
  const pairs = parsePairs(normalized);
  const name = pickFromAliases(pairs, ['name', '名称']);
  const typeRaw = pickFromAliases(pairs, ['type', '类型']);
  const materialType = normalizeMaterialType(typeRaw) ?? (userInput.includes('辅料') ? 'accessory' : 'fabric');
  const unitRaw = pickFromAliases(pairs, ['unit', '单位']);
  const unit = unitRaw ? UNIT_ALIAS[unitRaw] : '米';
  const sku = pickFromAliases(pairs, ['sku', '编码']);
  const remarks = pickFromAliases(pairs, ['remark', 'remarks', '备注']);
  const width = pickFromAliases(pairs, ['width', '门幅']);
  const grammage = pickFromAliases(pairs, ['grammage', '克重']);
  const tolerance = pickFromAliases(pairs, ['tolerance', '损耗']);
  const imageUrl = pickFromAliases(pairs, ['image', 'imageurl', '图片']);
  const colorsRaw = pickFromAliases(pairs, ['colors', '颜色']);
  const specificationsRaw = pickFromAliases(pairs, ['specifications', 'specification', '规格']);
  const priceRaw = pickFromAliases(pairs, ['price', '单价', '价格']);

  if (!name) {
    return { error: '缺少名称，请按 `名称: xx` 传入。' };
  }
  if (!unit) {
    return { error: '单位不支持，请使用 kg/米/件/个/码/张/套/条。' };
  }

  const referencePrice =
    typeof priceRaw === 'string' && priceRaw.trim() ? Number.parseFloat(priceRaw.trim()) : undefined;
  if (priceRaw && (referencePrice === undefined || Number.isNaN(referencePrice))) {
    return { error: '单价格式无效，请传入数字，例如 `单价: 12.5`。' };
  }

  const payload: CreateMaterialPayload = {
    name,
    materialType,
    unit,
    sku,
    remarks,
    width: materialType === 'fabric' ? width : undefined,
    grammage: materialType === 'fabric' ? grammage : undefined,
    tolerance: materialType === 'fabric' ? tolerance : undefined,
    imageUrl,
    referencePrice,
    colors: colorsRaw ? colorsRaw.split(/[、,，/]/).map((item) => item.trim()).filter(Boolean) : undefined,
    specifications: materialType === 'accessory' && specificationsRaw
      ? specificationsRaw.split(/[、,，/]/).map((item) => item.trim()).filter(Boolean)
      : undefined,
  };

  const typeText = payload.materialType === 'fabric' ? '布料' : '辅料';
  return {
    action: {
      id: actionId,
      toolName: 'material.create',
      endpoint: '/api/v1/materials',
      summary: `创建${typeText}物料：${payload.name}`,
      payload,
      riskLevel: 'MEDIUM',
      confirmKeyword: '确认执行',
    },
  };
};

const markdownForMaterials = (
  keyword: string,
  type: MaterialBasicType,
  rows: Awaited<ReturnType<typeof materialApi.list>>['list'],
) => {
  if (!rows.length) {
    return `已完成查询：关键词 **${keyword || '全部'}**，类型 **${type === 'fabric' ? '布料' : '辅料'}**。\n\n未找到匹配结果。`;
  }
  const tableHead = '| 编码 | 名称 | 类型 | 单位 | 状态 |\n| --- | --- | --- | --- | --- |';
  const tableRows = rows
    .map(
      (item) =>
        `| ${item.sku} | ${item.name} | ${item.materialType === 'fabric' ? '布料' : '辅料'} | ${item.unit} | ${
          item.status === 'inactive' ? '停用' : '启用'
        } |`,
    )
    .join('\n');
  return `查询完成，共返回 **${rows.length}** 条：\n\n${tableHead}\n${tableRows}`;
};

export const runMaterialQuery = async (userInput: string) => {
  const pairs = parsePairs(userInput);
  const keyword = pickFromAliases(pairs, ['keyword', '关键词']) ?? userInput.replace(/查询|查找|搜索|物料/g, '').trim();
  const materialType =
    normalizeMaterialType(pickFromAliases(pairs, ['type', '类型'])) ??
    (userInput.includes('辅料') ? 'accessory' : 'fabric');
  const data = await materialApi.list({
    page: 1,
    pageSize: 10,
    keyword: keyword || undefined,
    materialType,
  });
  return markdownForMaterials(keyword || '全部', materialType, data.list);
};

export const executeCreateMaterialAction = async (action: PendingWriteAction) => {
  const created = await materialApi.create(action.payload);
  return `写入成功，已通过 \`${action.endpoint}\` 创建物料。\n\n- 编码：${created.sku}\n- 名称：${created.name}\n- 类型：${
    created.materialType === 'fabric' ? '布料' : '辅料'
  }\n- 单位：${created.unit}`;
};
