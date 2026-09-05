import type { MaterialItem, MaterialMinimumSpecification } from '../types/material';

export const getActiveMinimumSpecifications = (
  material?: MaterialItem,
): MaterialMinimumSpecification[] => (material?.minimumSpecifications ?? [])
  .filter((item) => item.active !== false && Boolean(item.id));

export const getDefaultMinimumSpecificationId = (material?: MaterialItem): string | undefined => {
  const specifications = getActiveMinimumSpecifications(material);
  return specifications.length === 1 ? specifications[0].id : undefined;
};

export const findMinimumSpecification = (
  material: MaterialItem | undefined,
  specificationId: string | undefined,
): MaterialMinimumSpecification | undefined => {
  if (!material || !specificationId) {
    return undefined;
  }
  return getActiveMinimumSpecifications(material).find((item) => item.id === specificationId);
};

export const resolveOrderLineMinimumSpecificationId = (
  material: MaterialItem,
  line: {
    materialMinimumSpecificationId?: string;
    color?: string;
    specification?: string;
  },
): string | undefined => {
  const activeSpecifications = getActiveMinimumSpecifications(material);
  const exact = activeSpecifications.find((item) => item.id === line.materialMinimumSpecificationId);
  if (exact?.id) {
    return exact.id;
  }
  const legacyMatches = activeSpecifications.filter((item) => (
    (item.color ?? '') === (line.color ?? '')
    && (item.specification ?? '') === (line.specification ?? '')
  ));
  return legacyMatches.length === 1 ? legacyMatches[0].id : undefined;
};

export const formatOrderLineSpecification = (line: {
  color?: string;
  specification?: string;
}): string => [line.color, line.specification].filter(Boolean).join(' · ') || '未关联最小规格';
