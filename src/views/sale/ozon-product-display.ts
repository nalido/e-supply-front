type JsonRecord = Record<string, unknown>;

export type OzonProductDisplaySource = {
  id?: string | null;
  platformSpuId?: string | null;
  platformSkcId?: string | null;
  platformSkuId?: string | null;
  platformSkuCode?: string | null;
  platformProductName?: string | null;
  platformMainImageUrl?: string | null;
  platformCategoryPath?: string | null;
  platformStatus?: string | null;
  normalizedColor?: string | null;
  normalizedSize?: string | null;
  normalizedAttributesJson?: string | null;
  platformSnapshotJson?: string | null;
};

export type OzonProductDisplayInfo = {
  platformSpuId?: string;
  platformSkcId?: string;
  platformSkuId?: string;
  productId?: number;
  offerId?: string;
  name?: string;
  imageUrl?: string;
  color?: string;
  colorName?: string;
  size?: string;
  makerSize?: string;
  categoryName?: string;
  platformStatus?: string;
  price?: string;
  currencyCode?: string;
  stockPresent?: number | null;
  stockReserved?: number | null;
  factoryStyleNo?: string;
  spuKey?: string;
  skcKey?: string;
  spuLabel?: string;
  skcLabel?: string;
};

const parseJson = (value?: string | null): JsonRecord => {
  if (!value) return {};
  try {
    return JSON.parse(value) as JsonRecord;
  } catch {
    return {};
  }
};

const textFrom = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return undefined;
};

const numberFrom = (value: unknown): number | undefined => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const arrayFrom = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const valueFromAttribute = (attribute: JsonRecord) => {
  const direct = textFrom(attribute.value);
  if (direct && !direct.startsWith('[')) return direct;
  const values = arrayFrom(attribute.values);
  for (const item of values) {
    if (isRecord(item)) {
      const value = textFrom(item.value, item.name);
      if (value) return value;
    }
    const value = textFrom(item);
    if (value) return value;
  }
  return undefined;
};

const collectAttributeMap = (...sources: JsonRecord[]) => {
  const result = new Map<string, string>();
  sources.forEach((source) => {
    Object.entries(source).forEach(([key, value]) => {
      if (key === 'raw' || key === 'attributes' || key === 'price_info' || key === 'stock_info') return;
      const text = textFrom(value);
      if (text) result.set(key.trim(), text);
    });
    arrayFrom(source.attributes).forEach((item) => {
      if (!isRecord(item)) return;
      const name = textFrom(item.attribute_name_zh, item.attribute_name, item.name);
      const value = valueFromAttribute(item);
      if (name && value) result.set(name.trim(), value.trim());
    });
  });
  return result;
};

const attributeText = (attributes: Map<string, string>, exactNames: string[], fuzzyNames: string[] = []) => {
  for (const name of exactNames) {
    const value = attributes.get(name);
    if (value) return value;
  }
  for (const [key, value] of attributes.entries()) {
    const normalizedKey = key.toLowerCase();
    if (fuzzyNames.some((name) => normalizedKey.includes(name.toLowerCase()))) {
      return value;
    }
  }
  return undefined;
};

const firstImageFromSnapshot = (snapshot: JsonRecord) => {
  const direct = textFrom(snapshot.primary_image, snapshot.primaryImage, snapshot.image, snapshot.image_url, snapshot.imageUrl);
  if (direct) return direct;
  for (const image of arrayFrom(snapshot.images)) {
    if (isRecord(image)) {
      const value = textFrom(image.url, image.file_name, image.image, image.image_url);
      if (value) return value;
    }
    const value = textFrom(image);
    if (value) return value;
  }
  return undefined;
};

const firstStockNumber = (snapshot: JsonRecord, keys: string[]) => {
  const stockInfo = isRecord(snapshot.stock_info) ? snapshot.stock_info : {};
  const stocks = arrayFrom(stockInfo.stocks);
  for (const stock of stocks) {
    if (!isRecord(stock)) continue;
    for (const key of keys) {
      const value = numberFrom(stock[key]);
      if (value !== undefined) return value;
    }
  }
  for (const key of keys) {
    const value = numberFrom(stockInfo[key]);
    if (value !== undefined) return value;
  }
  return undefined;
};

const normalizeGroupText = (value?: string | null) => value?.trim().toLowerCase() || '';

const sanitizeIdentity = (value: unknown, invalidCandidates: Array<string | undefined>) => {
  const text = textFrom(value);
  if (!text) return undefined;
  return invalidCandidates.some((candidate) => candidate && candidate === text) ? undefined : text;
};

export const isSuspiciousHistoryRow = (row: OzonProductDisplaySource) => {
  const snapshot = parseJson(row.platformSnapshotJson);
  const snapshotProductId = textFrom(
    snapshot.product_id,
    snapshot.productId,
    isRecord(snapshot.raw) && isRecord(snapshot.raw.list) ? snapshot.raw.list.product_id : undefined,
  );
  const offerId = textFrom(row.platformSkuCode, snapshot.offer_id, snapshot.offerId);
  return Boolean(
    row.platformSkuId &&
      snapshotProductId &&
      row.platformSkuId === snapshotProductId &&
      !textFrom(row.platformProductName) &&
      offerId,
  );
};

export const resolveOzonProductDisplayInfo = (row: OzonProductDisplaySource): OzonProductDisplayInfo => {
  const snapshot = parseJson(row.platformSnapshotJson);
  const normalizedAttributes = parseJson(row.normalizedAttributesJson);
  const attributes = collectAttributeMap(normalizedAttributes, snapshot);
  const rawSnapshot = isRecord(snapshot.raw) ? snapshot.raw : {};
  const rawList = isRecord(rawSnapshot.list) ? rawSnapshot.list : {};
  const rawDetail = isRecord(rawSnapshot.detail) ? rawSnapshot.detail : {};
  const rawAttributes = isRecord(rawSnapshot.attributes) ? rawSnapshot.attributes : {};
  const productIdText = textFrom(
    snapshot.product_id,
    snapshot.productId,
    normalizedAttributes.product_id,
    normalizedAttributes.productId,
    rawList.product_id,
    rawList.productId,
    rawList.id,
    rawDetail.product_id,
    rawDetail.productId,
    rawDetail.id,
    rawAttributes.product_id,
    rawAttributes.productId,
    rawAttributes.id,
  );
  const productId = numberFrom(productIdText);
  const offerId = textFrom(snapshot.offer_id, snapshot.offerId, row.platformSkuCode);
  const platformSkuId = textFrom(row.platformSkuId, snapshot.sku, snapshot.fbo_sku, snapshot.fbs_sku);
  const invalidIdentityCandidates = [productIdText, platformSkuId, offerId];
  const color = textFrom(
    row.normalizedColor,
    attributeText(attributes, ['商品颜色', 'Цвет товара'], ['颜色', 'цвет']),
    snapshot.color,
    snapshot.colour,
    snapshot.normalized_color,
    snapshot.normalizedColor,
  );
  const colorName = textFrom(attributeText(attributes, ['颜色名称', 'Название цвета']));
  const size = textFrom(
    row.normalizedSize,
    attributeText(attributes, ['俄罗斯尺码', 'Российский размер'], ['尺码', 'размер']),
    snapshot.size,
    snapshot.normalized_size,
    snapshot.normalizedSize,
  );
  const platformSpuId =
    sanitizeIdentity(row.platformSpuId, invalidIdentityCandidates) ??
    sanitizeIdentity(normalizedAttributes.ozon_spu_key, invalidIdentityCandidates) ??
    sanitizeIdentity(normalizedAttributes.model_id, invalidIdentityCandidates) ??
    sanitizeIdentity(isRecord(snapshot.model_info) ? snapshot.model_info.model_id : undefined, invalidIdentityCandidates);
  const platformSkcId =
    sanitizeIdentity(row.platformSkcId, invalidIdentityCandidates) ??
    sanitizeIdentity(normalizedAttributes.ozon_skc_key, invalidIdentityCandidates);
  const cardKey = attributeText(attributes, ['合并至一张卡片', 'Объединить на одной карточке'], ['合并', 'карточ']);
  const factoryStyleNo = textFrom(normalizedAttributes.factory_style_no, normalizedAttributes.factoryStyleNo, cardKey);
  const spuKey = textFrom(platformSpuId, row.platformProductName, snapshot.name, snapshot.title);
  const skcKey = textFrom(platformSkcId, color, colorName, offerId);
  return {
    platformSpuId,
    platformSkcId,
    platformSkuId,
    productId,
    offerId,
    name: textFrom(row.platformProductName, snapshot.name, snapshot.title),
    imageUrl: textFrom(row.platformMainImageUrl, firstImageFromSnapshot(snapshot)),
    color,
    colorName,
    size,
    makerSize: textFrom(attributeText(attributes, ['由制造商规定尺码', 'Размер производителя'])),
    categoryName: textFrom(row.platformCategoryPath, snapshot.description_category_name, snapshot.category_name, snapshot.type_name),
    platformStatus: textFrom(row.platformStatus, snapshot.visibility, snapshot.status, snapshot.state),
    price: textFrom(isRecord(snapshot.price_info) && isRecord(snapshot.price_info.price) ? snapshot.price_info.price.price : undefined, snapshot.price),
    currencyCode: textFrom(isRecord(snapshot.price_info) && isRecord(snapshot.price_info.price) ? snapshot.price_info.price.currency_code : undefined, snapshot.currency_code),
    stockPresent: firstStockNumber(snapshot, ['present', 'valid_stock_count', 'stock', 'available_stock_count']),
    stockReserved: firstStockNumber(snapshot, ['reserved', 'reserved_stock_count']),
    factoryStyleNo,
    spuKey,
    skcKey,
    spuLabel: platformSpuId || cardKey || spuKey,
    skcLabel: textFrom(colorName && color && colorName !== color ? `${color} / ${colorName}` : undefined, color, colorName),
  };
};

export const getOzonGroupKey = (item: Pick<OzonProductDisplayInfo, 'spuKey' | 'skcKey' | 'name'>, fallbackKey: string) => {
  if (item.spuKey?.trim() && item.skcKey?.trim()) return `spu:${item.spuKey.trim()}::skc:${item.skcKey.trim()}`;
  if (item.spuKey?.trim()) return `spu:${item.spuKey.trim()}::sku:${fallbackKey}`;
  if (item.name?.trim()) return `name:${normalizeGroupText(item.name)}`;
  return `sku:${fallbackKey}`;
};
