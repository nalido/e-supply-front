import type { SampleMaterialItem, SampleOrderDetail, SampleProcessItem } from '../types/sample-detail';
import type { StyleDetailData, StyleMaterialData } from '../types/style';

export type SamplePrintContext = {
  detail: SampleOrderDetail;
  styleDetail?: StyleDetailData;
  styleBom?: StyleMaterialData[];
};

type PrintImageItem = {
  title: string;
  url: string;
};

type PrintMaterialItem = {
  imageUrl?: string;
  name: string;
  code: string;
  unit: string;
  consumption: number;
  lossRate?: number;
  remark?: string;
};

const escapeHtml = (value: string): string => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const formatNumber = (value: number, digits = 2) => Number(value ?? 0).toFixed(digits);

const formatLossRate = (value?: number) => {
  if (value == null) {
    return '-';
  }
  return `${formatNumber(value * 100)}%`;
};

const uniqueImages = (items: PrintImageItem[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.url || seen.has(item.url)) {
      return false;
    }
    seen.add(item.url);
    return true;
  });
};

const collectGalleryImages = (detail: SampleOrderDetail, styleDetail?: StyleDetailData) => uniqueImages([
  ...Object.entries(styleDetail?.colorImages ?? {}).flatMap(([color, url]) =>
    url ? [{ title: `颜色图：${color}`, url }] : []),
  ...(styleDetail?.detailImageUrls ?? []).map((url, index) => ({
    title: `细节图 ${index + 1}`,
    url,
  })),
  ...detail.attachments
    .filter((attachment) => attachment.type?.toLowerCase().startsWith('image'))
    .map((attachment) => ({ title: attachment.name || '附件图片', url: attachment.url })),
]);

const mapStyleBomMaterial = (item: StyleMaterialData): PrintMaterialItem => ({
  imageUrl: item.imageUrl,
  name: item.materialName,
  code: item.materialSku,
  unit: item.unit,
  consumption: Number(item.consumption ?? 0),
  lossRate: item.lossRate,
  remark: item.remark,
});

const mapSampleMaterial = (item: SampleMaterialItem): PrintMaterialItem => ({
  imageUrl: item.image,
  name: item.name,
  code: item.code,
  unit: item.unit,
  consumption: Number(item.consumption ?? 0),
  lossRate: item.lossRate,
  remark: item.remark,
});

const hasMaterialData = (items: SampleMaterialItem[]) => items.length > 0;

const resolveMaterials = (
  detailItems: SampleMaterialItem[],
  styleItems: StyleMaterialData[] | undefined,
  category: 'fabric' | 'trim',
): PrintMaterialItem[] => {
  if (hasMaterialData(detailItems)) {
    return detailItems.map(mapSampleMaterial);
  }
  const filtered = (styleItems ?? []).filter((item) =>
    category === 'fabric' ? item.materialType === 'FABRIC' : item.materialType !== 'FABRIC');
  return filtered.map(mapStyleBomMaterial);
};

const renderInfoRows = (rows: Array<[string, string]>) => rows
  .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value || '-')}</td></tr>`)
  .join('');

const renderImageGrid = (title: string, images: PrintImageItem[]) => {
  if (!images.length) {
    return '';
  }
  return `
    <section class="print-section avoid-break">
      <h2>${escapeHtml(title)}</h2>
      <div class="image-grid">
        ${images.map((image) => `
          <figure class="image-card">
            <img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.title)}" />
            <figcaption>${escapeHtml(image.title)}</figcaption>
          </figure>
        `).join('')}
      </div>
    </section>
  `;
};

const renderSizeChart = (sizeChartImage?: string) => {
  if (!sizeChartImage) {
    return '';
  }
  return `
    <section class="print-section avoid-break">
      <h2>尺寸表</h2>
      <div class="size-chart-wrap">
        <img class="size-chart" src="${escapeHtml(sizeChartImage)}" alt="尺寸表" />
      </div>
    </section>
  `;
};

const renderQuantityMatrix = (detail: SampleOrderDetail) => {
  if (!detail.colors.length || !detail.sizes.length) {
    return '';
  }
  const header = detail.sizes.map((size) => `<th>${escapeHtml(size)}</th>`).join('');
  const rows = detail.colors.map((color) => {
    const sizeMap = detail.quantityMatrix[color] ?? {};
    const subtotal = detail.sizes.reduce((sum, size) => sum + Number(sizeMap[size] ?? 0), 0);
    return `
      <tr>
        <th>${escapeHtml(color)}</th>
        ${detail.sizes.map((size) => `<td>${Number(sizeMap[size] ?? 0) || '-'}</td>`).join('')}
        <td>${subtotal || '-'}</td>
      </tr>
    `;
  }).join('');
  const totalCells = detail.sizes.map((size) => {
    const total = detail.colors.reduce((sum, color) => sum + Number(detail.quantityMatrix[color]?.[size] ?? 0), 0);
    return `<td>${total || '-'}</td>`;
  }).join('');
  const grandTotal = detail.colors.reduce((sum, color) =>
    sum + detail.sizes.reduce((rowTotal, size) => rowTotal + Number(detail.quantityMatrix[color]?.[size] ?? 0), 0), 0);
  return `
    <section class="print-section avoid-break">
      <h2>颜色尺码数量表</h2>
      <table class="matrix-table">
        <thead>
          <tr>
            <th>颜色</th>
            ${header}
            <th>小计</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr>
            <th>合计</th>
            ${totalCells}
            <td>${grandTotal || '-'}</td>
          </tr>
        </tbody>
      </table>
    </section>
  `;
};

const renderMaterialsTable = (title: string, items: PrintMaterialItem[]) => {
  if (!items.length) {
    return '';
  }
  return `
    <section class="print-section avoid-break">
      <h2>${escapeHtml(title)}</h2>
      <table class="material-table">
        <thead>
          <tr>
            <th class="image-col">图片</th>
            <th>名称</th>
            <th>编号</th>
            <th>单耗</th>
            <th>损耗</th>
            <th>单位</th>
            <th>备注</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item) => `
            <tr>
              <td class="image-col">${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" class="material-image" />` : '<span class="muted">-</span>'}</td>
              <td>${escapeHtml(item.name)}</td>
              <td>${escapeHtml(item.code || '-')}</td>
              <td>${formatNumber(item.consumption)}</td>
              <td>${escapeHtml(formatLossRate(item.lossRate))}</td>
              <td>${escapeHtml(item.unit || '-')}</td>
              <td>${escapeHtml(item.remark || '-')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>
  `;
};

const renderProcesses = (processes: SampleProcessItem[]) => {
  if (!processes.length) {
    return '';
  }
  return `
    <section class="print-section avoid-break">
      <h2>工序参考</h2>
      <ol class="process-list">
        ${processes
          .sort((left, right) => left.sequence - right.sequence)
          .map((process) => `<li>${escapeHtml(process.name)}${process.standardTime ? `（${process.standardTime} 分钟）` : ''}</li>`)
          .join('')}
      </ol>
    </section>
  `;
};

export const buildSamplePrintHtml = ({ detail, styleDetail, styleBom }: SamplePrintContext) => {
  const mainImage = detail.lineArtImage || styleDetail?.coverImageUrl;
  const galleryImages = collectGalleryImages(detail, styleDetail);
  const sizeChartImage = detail.sizeChartImage || styleDetail?.sizeChartImageUrl;
  const fabricMaterials = resolveMaterials(detail.bom.fabrics, styleBom, 'fabric');
  const trimMaterials = resolveMaterials(detail.bom.trims, styleBom, 'trim');
  const infoRows: Array<[string, string]> = [
    ['样板单号', detail.sampleNo],
    ['款号', detail.styleNo],
    ['款名', detail.styleName],
    ['板类', detail.patternType ?? '-'],
    ['下板日期', detail.patternDate || '-'],
    ['预计交板', detail.estimatedDeliveryDate ?? '-'],
    ['纸样号', detail.paperPatternNo ?? '-'],
    ['纸样师', detail.patternMaker ?? '-'],
    ['跟单员', detail.merchandiser ?? '-'],
    ['车板师', detail.sampleSewer ?? '-'],
    ['颜色数', String(detail.colors.length || 0)],
    ['尺码数', String(detail.sizes.length || 0)],
    ['备注', detail.remarks ?? '-'],
  ];

  return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>样板单打印 - ${escapeHtml(detail.sampleNo)}</title>
    <style>
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 18mm 12mm;
        color: #111827;
        font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "Source Han Sans SC", "Heiti SC", sans-serif;
        font-size: 12px;
        line-height: 1.5;
        background: #fff;
      }
      h1, h2, h3, p { margin: 0; }
      h1 { font-size: 24px; font-weight: 700; }
      h2 { font-size: 16px; font-weight: 700; margin-bottom: 10px; }
      .muted { color: #6b7280; }
      .page-header {
        display: grid;
        grid-template-columns: 1.1fr 0.9fr;
        gap: 16px;
        align-items: start;
        margin-bottom: 18px;
      }
      .header-text { display: flex; flex-direction: column; gap: 12px; }
      .meta-table, .matrix-table, .material-table {
        width: 100%;
        border-collapse: collapse;
      }
      .meta-table th, .meta-table td, .matrix-table th, .matrix-table td, .material-table th, .material-table td {
        border: 1px solid #d1d5db;
        padding: 8px 10px;
        vertical-align: top;
      }
      .meta-table th, .matrix-table th, .material-table th {
        background: #f9fafb;
        font-weight: 600;
      }
      .meta-table th { width: 88px; }
      .header-image {
        width: 100%;
        max-height: 320px;
        object-fit: contain;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        background: #fff;
        padding: 8px;
      }
      .print-section { margin-top: 18px; }
      .image-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .image-card {
        margin: 0;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        overflow: hidden;
        background: #fff;
      }
      .image-card img {
        display: block;
        width: 100%;
        height: 220px;
        object-fit: contain;
        background: #f9fafb;
      }
      .image-card figcaption {
        padding: 8px 10px;
        font-size: 11px;
        color: #374151;
        border-top: 1px solid #e5e7eb;
      }
      .size-chart-wrap {
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 12px;
      }
      .size-chart {
        width: 100%;
        max-height: 420px;
        object-fit: contain;
      }
      .image-col { width: 74px; min-width: 74px; text-align: center; }
      .material-image {
        width: 54px;
        height: 54px;
        object-fit: cover;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
      }
      .process-list {
        margin: 0;
        padding-left: 20px;
      }
      .process-list li + li { margin-top: 4px; }
      .avoid-break { page-break-inside: avoid; break-inside: avoid; }
      @page { size: A4 portrait; margin: 10mm; }
      @media print {
        body { padding: 0; }
      }
    </style>
  </head>
  <body>
    <section class="page-header avoid-break">
      <div class="header-text">
        <div>
          <h1>样板单打印</h1>
          <p class="muted">版师用打印版：聚焦款式识别、图片、尺寸与关键材料信息</p>
        </div>
        <table class="meta-table">
          <tbody>
            ${renderInfoRows(infoRows)}
          </tbody>
        </table>
      </div>
      <div>
        ${mainImage ? `<img class="header-image" src="${escapeHtml(mainImage)}" alt="${escapeHtml(detail.styleName)}" />` : '<div class="header-image muted" style="display:flex;align-items:center;justify-content:center;">暂无主图</div>'}
      </div>
    </section>
    ${renderImageGrid('颜色图 / 细节图', galleryImages)}
    ${renderSizeChart(sizeChartImage)}
    ${renderQuantityMatrix(detail)}
    ${renderMaterialsTable('面料清单', fabricMaterials)}
    ${renderMaterialsTable('辅料 / 包材清单', trimMaterials)}
    ${renderProcesses(detail.processes)}
  </body>
</html>`;
};
