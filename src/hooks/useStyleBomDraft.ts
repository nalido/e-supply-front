import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  StyleBomConfiguration,
  StyleBomLineDraft,
  StyleBomValidationIssue,
} from '../types/style';

const createUid = () => `bom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeForCompare = (lines: StyleBomLineDraft[]) => lines.map(({ uid, ...line }) => {
  void uid;
  return {
    ...line,
    applicableColors: line.applyToAllColors ? [] : [...line.applicableColors].sort(),
    sizeConsumptions: line.sizeConsumptions.map((item) => ({ ...item })).sort((a, b) => a.size.localeCompare(b.size)),
    remark: line.remark?.trim() || undefined,
  };
});

const serialize = (lines: StyleBomLineDraft[]) => JSON.stringify(normalizeForCompare(lines));

const resolveSizeConsumption = (
  sizeConsumptions: StyleBomLineDraft['sizeConsumptions'],
  size: string,
) => sizeConsumptions.find((entry) => entry.size === size)?.consumption
  ?? sizeConsumptions.find((entry) => entry.size === '全部尺码')?.consumption
  ?? null;

const toDrafts = (
  configuration: StyleBomConfiguration,
  sizes: string[],
  colors: string[],
): StyleBomLineDraft[] => configuration.items.flatMap((item, index) => {
  const scopedColors = item.applyToAllColors ? colors : item.applicableColors;
  const preservedColors = scopedColors.length ? scopedColors : [''];
  return preservedColors.map((color, colorIndex) => ({
    ...item,
    id: colorIndex === 0 ? item.id : undefined,
    uid: item.id ? `bom-id-${item.id}-${colorIndex}` : `bom-${index}-${colorIndex}-${createUid()}`,
    applyToAllColors: false,
    applicableColors: color ? [color] : [],
    sizeConsumptions: sizes.map((size) => ({
      size,
      consumption: resolveSizeConsumption(item.sizeConsumptions, size),
    })),
  }));
});

export default function useStyleBomDraft(colors: string[], sizes: string[]) {
  const [lines, setLines] = useState<StyleBomLineDraft[]>([]);
  const [bomVersionId, setBomVersionId] = useState<string>();
  const [revision, setRevision] = useState(0);
  const originalSerializedRef = useRef('[]');
  const originalDimensionsRef = useRef(JSON.stringify({ colors: [], sizes: [] }));
  const tracksDimensionsRef = useRef(false);

  const reset = useCallback((
    configuration: StyleBomConfiguration,
    targetSizes: string[],
    targetColors: string[],
  ) => {
    const next = toDrafts(configuration, targetSizes, targetColors);
    setLines(next);
    setBomVersionId(configuration.bomVersionId);
    setRevision(configuration.revision);
    originalSerializedRef.current = serialize(next);
    originalDimensionsRef.current = JSON.stringify({ colors: targetColors, sizes: targetSizes });
    tracksDimensionsRef.current = next.length > 0;
  }, []);

  useEffect(() => {
    setLines((previous) => previous.map((line) => ({
      ...line,
      sizeConsumptions: sizes.map((size) => ({
        size,
        consumption: resolveSizeConsumption(line.sizeConsumptions, size),
      })),
    })));
  }, [sizes]);

  const addLine = useCallback((line: Omit<StyleBomLineDraft, 'uid' | 'id'>) => {
    const uid = createUid();
    setLines((previous) => [...previous, { ...line, uid, id: undefined }]);
    return uid;
  }, []);

  const updateLine = useCallback((uid: string, line: StyleBomLineDraft) => {
    setLines((previous) => previous.map((item) => (item.uid === uid ? { ...line, uid } : item)));
  }, []);

  const updateSizeConsumption = useCallback((uid: string, size: string, consumption: number | null) => {
    setLines((previous) => previous.map((line) => (
      line.uid === uid
        ? {
            ...line,
            sizeConsumptions: line.sizeConsumptions.map((item) => (
              item.size === size ? { ...item, consumption } : item
            )),
          }
        : line
    )));
  }, []);

  const copySizeConsumptions = useCallback((sourceSize: string, targetSize: string, color: string) => {
    if (sourceSize === targetSize) {
      return;
    }
    setLines((previous) => previous.map((line) => {
      if (!line.applicableColors.includes(color)) {
        return line;
      }
      const sourceConsumption = line.sizeConsumptions.find((item) => item.size === sourceSize)?.consumption ?? null;
      return {
        ...line,
        sizeConsumptions: line.sizeConsumptions.map((item) => (
          item.size === targetSize ? { ...item, consumption: sourceConsumption } : item
        )),
      };
    }));
  }, []);

  const removeLine = useCallback((uid: string) => {
    setLines((previous) => previous.filter((item) => item.uid !== uid));
  }, []);

  const duplicateLine = useCallback((uid: string) => {
    setLines((previous) => {
      const index = previous.findIndex((item) => item.uid === uid);
      if (index < 0) {
        return previous;
      }
      const source = previous[index];
      const copy: StyleBomLineDraft = {
        ...source,
        id: undefined,
        uid: createUid(),
        applicableColors: [...source.applicableColors],
        sizeConsumptions: source.sizeConsumptions.map((item) => ({ ...item })),
        remark: source.remark,
      };
      return [...previous.slice(0, index + 1), copy, ...previous.slice(index + 1)];
    });
  }, []);

  const validationIssues = useMemo(() => {
    const issues: StyleBomValidationIssue[] = [];
    if (tracksDimensionsRef.current && lines.length === 0) {
      issues.push({ uid: '__bom__', code: 'MATERIAL_REQUIRED', message: '已发布的款式用料不能清空，请至少保留一条用料' });
    }
    lines.forEach((line) => {
      if (!line.materialId) {
        issues.push({ uid: line.uid, code: 'MATERIAL_REQUIRED', message: '请选择物料' });
      }
      if (!line.materialMinimumSpecificationId) {
        issues.push({ uid: line.uid, code: 'SPECIFICATION_REQUIRED', message: '请选择最小规格' });
      } else if (!line.minimumSpecification.active) {
        issues.push({ uid: line.uid, code: 'SPECIFICATION_INACTIVE', message: '所选最小规格已停用' });
      }
      const lineColor = line.applicableColors[0];
      if (line.applyToAllColors || line.applicableColors.length !== 1) {
        issues.push({ uid: line.uid, code: 'COLOR_REQUIRED', message: '每条用料必须归属一个款式颜色', color: lineColor });
      }
      const invalidColors = line.applicableColors.filter((color) => !colors.includes(color));
      if (invalidColors.length) {
        issues.push({ uid: line.uid, code: 'COLOR_INVALID', message: `款式已不包含：${invalidColors.join('、')}`, color: lineColor });
      }
      sizes.forEach((size) => {
        const value = line.sizeConsumptions.find((item) => item.size === size)?.consumption;
        if (value == null || !Number.isFinite(value) || value < 0) {
          issues.push({ uid: line.uid, code: 'CONSUMPTION_REQUIRED', message: `${size} 尺码用量未填写`, color: lineColor, size });
        }
      });
    });

    lines.forEach((line, index) => {
      const lineColors = line.applicableColors;
      const duplicate = lines.slice(0, index).some((other) => {
        if (other.materialMinimumSpecificationId !== line.materialMinimumSpecificationId) {
          return false;
        }
        const otherColors = other.applicableColors;
        return lineColors.some((color) => otherColors.includes(color));
      });
      if (duplicate) {
        issues.push({ uid: line.uid, code: 'DUPLICATE_SCOPE', message: '同一颜色下不能重复绑定相同物料规格', color: line.applicableColors[0] });
      }
    });
    return issues;
  }, [colors, lines, sizes]);

  const isDirty = useMemo(() => (
    serialize(lines) !== originalSerializedRef.current
    || (
      tracksDimensionsRef.current
      && JSON.stringify({ colors, sizes }) !== originalDimensionsRef.current
    )
  ), [colors, lines, sizes]);

  return {
    lines,
    bomVersionId,
    revision,
    validationIssues,
    isDirty,
    reset,
    addLine,
    updateLine,
    updateSizeConsumption,
    copySizeConsumptions,
    removeLine,
    duplicateLine,
  };
}
