import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  StyleBomConfiguration,
  StyleBomLineDraft,
  StyleBomSizeConsumption,
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

const resolveAverageConsumption = (line: {
  averageConsumption: number | null;
  sizeConsumptions: StyleBomSizeConsumption[];
}): number | null => {
  if (line.averageConsumption != null) {
    return line.averageConsumption;
  }
  const values = line.sizeConsumptions
    .map((item) => item.consumption)
    .filter((value): value is number => value != null);
  if (!values.length || values.some((value) => value !== values[0])) {
    return null;
  }
  return values[0];
};

const expandAverageConsumption = (
  sizes: string[],
  averageConsumption: number | null,
): StyleBomSizeConsumption[] => sizes.map((size) => ({ size, consumption: averageConsumption }));

const toDrafts = (
  configuration: StyleBomConfiguration,
  sizes: string[],
): StyleBomLineDraft[] => configuration.items.map((item, index) => {
  const averageConsumption = resolveAverageConsumption(item);
  return {
    ...item,
    uid: item.id ? `bom-id-${item.id}` : `bom-${index}-${createUid()}`,
    applicableColors: item.applyToAllColors ? [] : [...item.applicableColors],
    averageConsumption,
    sizeConsumptions: averageConsumption == null
      ? item.sizeConsumptions.map((entry) => ({ ...entry }))
      : expandAverageConsumption(sizes, averageConsumption),
  };
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
    const next = toDrafts(configuration, targetSizes);
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
      sizeConsumptions: expandAverageConsumption(sizes, line.averageConsumption),
    })));
  }, [sizes]);

  const addLine = useCallback((line: Omit<StyleBomLineDraft, 'uid' | 'id'>) => {
    const uid = createUid();
    setLines((previous) => [...previous, { ...line, uid, id: undefined }]);
    return uid;
  }, []);

  const updateLine = useCallback((uid: string, line: StyleBomLineDraft) => {
    setLines((previous) => previous.map((item) => (
      item.uid === uid
        ? {
            ...line,
            uid,
            applicableColors: line.applyToAllColors ? [] : line.applicableColors,
            sizeConsumptions: expandAverageConsumption(sizes, line.averageConsumption),
          }
        : item
    )));
  }, [sizes]);

  const updateAverageConsumption = useCallback((uid: string, averageConsumption: number | null) => {
    setLines((previous) => previous.map((line) => (
      line.uid === uid
        ? {
            ...line,
            averageConsumption,
            sizeConsumptions: expandAverageConsumption(sizes, averageConsumption),
          }
        : line
    )));
  }, [sizes]);

  const removeLine = useCallback((uid: string) => {
    setLines((previous) => previous.filter((item) => item.uid !== uid));
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
      if (!line.applyToAllColors && line.applicableColors.length === 0) {
        issues.push({ uid: line.uid, code: 'COLOR_REQUIRED', message: '请选择适用的款式颜色' });
      }
      const invalidColors = line.applicableColors.filter((color) => !colors.includes(color));
      if (invalidColors.length) {
        issues.push({ uid: line.uid, code: 'COLOR_INVALID', message: `款式已不包含：${invalidColors.join('、')}` });
      }
      if (
        line.averageConsumption == null
        || !Number.isFinite(line.averageConsumption)
        || line.averageConsumption < 0
      ) {
        issues.push({ uid: line.uid, code: 'AVERAGE_CONSUMPTION_REQUIRED', message: '请填写平均单件用量' });
      }
    });

    lines.forEach((line, index) => {
      const lineColors = line.applyToAllColors ? colors : line.applicableColors;
      const duplicate = lines.slice(0, index).some((other) => {
        if (other.materialMinimumSpecificationId !== line.materialMinimumSpecificationId) {
          return false;
        }
        const otherColors = other.applyToAllColors ? colors : other.applicableColors;
        return lineColors.some((color) => otherColors.includes(color));
      });
      if (duplicate) {
        issues.push({ uid: line.uid, code: 'DUPLICATE_SCOPE', message: '同一物料规格的适用颜色不能重复' });
      }
    });
    return issues;
  }, [colors, lines]);

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
    updateAverageConsumption,
    removeLine,
  };
}
