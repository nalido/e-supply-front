const specValueCollator = new Intl.Collator('zh-CN', {
  numeric: true,
  sensitivity: 'base',
});

const normalizeSpecValue = (value: string) => value.trim();

const SIZE_ORDER = new Map<string, number>([
  ['XS', 1],
  ['S', 2],
  ['M', 3],
  ['L', 4],
  ['XL', 5],
  ['2XL', 6],
  ['XXL', 6],
  ['3XL', 7],
  ['XXXL', 7],
  ['4XL', 8],
  ['XXXXL', 8],
  ['5XL', 9],
  ['6XL', 10],
]);

const PURE_NUMBER_PATTERN = /^\d+$/;

const collectUniqueValues = (values: Array<string | undefined | null>): string[] => {
  const uniqueValues = new Set<string>();
  values.forEach((value) => {
    if (typeof value !== 'string') {
      return;
    }
    const normalized = normalizeSpecValue(value);
    if (!normalized) {
      return;
    }
    uniqueValues.add(normalized);
  });
  return Array.from(uniqueValues);
};

const normalizeSizeKey = (value: string) => value.trim().toUpperCase().replace(/[\s-]+/g, '');

const getSizeCategory = (value: string): number => {
  if (SIZE_ORDER.has(normalizeSizeKey(value))) {
    return 0;
  }
  if (PURE_NUMBER_PATTERN.test(value.trim())) {
    return 1;
  }
  return 2;
};

const compareColors = (left: string, right: string) => specValueCollator.compare(left, right);

const compareSizes = (left: string, right: string) => {
  const leftCategory = getSizeCategory(left);
  const rightCategory = getSizeCategory(right);
  if (leftCategory !== rightCategory) {
    return leftCategory - rightCategory;
  }
  if (leftCategory === 0) {
    const leftRank = SIZE_ORDER.get(normalizeSizeKey(left)) ?? Number.MAX_SAFE_INTEGER;
    const rightRank = SIZE_ORDER.get(normalizeSizeKey(right)) ?? Number.MAX_SAFE_INTEGER;
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }
  }
  if (leftCategory === 1) {
    return Number(left.trim()) - Number(right.trim());
  }
  return specValueCollator.compare(left, right);
};

export const sortColorValues = (values: Array<string | undefined | null>): string[] =>
  collectUniqueValues(values).sort(compareColors);

export const sortSizeValues = (values: Array<string | undefined | null>): string[] =>
  collectUniqueValues(values).sort(compareSizes);

export const sortSpecRows = <T extends { color: string; size: string }>(rows: T[]): T[] =>
  [...rows].sort((left, right) => {
    const colorCompare = compareColors(left.color, right.color);
    if (colorCompare !== 0) {
      return colorCompare;
    }
    return compareSizes(left.size, right.size);
  });
