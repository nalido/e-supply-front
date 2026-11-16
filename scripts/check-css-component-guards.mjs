import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const checks = [
  {
    file: 'src/styles/global.css',
    pattern: /^\s*\.ant-input-search\b|^\s*\.ant-input-group\b|^\s*\.ant-input-number-group\b/m,
    message:
      'global.css must not target AntD Search/InputGroup globally. Use an opt-in wrapper such as .oc-input-action-group.',
  },
  {
    file: 'src/views/sale/ozon-product-publish.css',
    pattern: /\.opp-section-title\s*>\s*div\b/,
    message:
      'Do not style .opp-section-title children with bare > div; AntD components render div wrappers internally. Use explicit classes.',
  },
  {
    file: 'src/views/sale/OzonProductPublish.tsx',
    pattern: /Input\.Search|\benterButton\b/,
    message:
      'Ozon publish search fields must use plain Input with suffix SearchOutlined. Do not use Input.Search or enterButton.',
  },
];

const excelTableConsumers = [
  { file: 'src/components/CuttingBedRecordModal.tsx', className: 'cutting-bed-material-usage-table' },
  { file: 'src/components/material/MaterialIssueModal.tsx', className: 'material-issue-entry-table' },
  { file: 'src/components/material/MaterialSpecificationEditor.tsx', className: 'material-specification-editor' },
  { file: 'src/components/procurement/StockingPurchaseBatchEditModal.tsx', className: 'stocking-purchase-batch-edit__table' },
  { file: 'src/components/procurement/StockingPurchaseCreateModal.tsx', className: 'stocking-purchase-entry-table' },
  { file: 'src/components/style-bom/StyleBomSection.tsx', className: 'style-bom-summary-table' },
  { file: 'src/components/style-bom/StyleBomSizeGrid.tsx', className: 'style-bom-size-grid' },
  { file: 'src/views/sale/OzonProductPublish.tsx', className: 'opp-item-table' },
  { file: 'src/views/sale/OzonPromotions.tsx', className: 'scw-promo-entry-table' },
];

const excelGridConsumers = [
  'src/components/CuttingBedRecordModal.tsx',
  'src/components/style/StyleCodeMatrixEditor.tsx',
  'src/views/factory-orders/AllocationCreateModal.tsx',
  'src/views/factory-orders/CreateOrderModal.tsx',
];

const failures = [];

const collectSourceFiles = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const absolutePath = path.join(directory, entry.name);
  if (entry.isDirectory()) return collectSourceFiles(absolutePath);
  return /\.(?:ts|tsx)$/.test(entry.name) ? [absolutePath] : [];
});

for (const check of checks) {
  const absolutePath = path.join(root, check.file);
  if (!fs.existsSync(absolutePath)) {
    continue;
  }
  const source = fs.readFileSync(absolutePath, 'utf8');
  if (check.pattern.test(source)) {
    failures.push(`${check.file}: ${check.message}`);
  }
}

for (const { file, className } of excelTableConsumers) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const escapedClassName = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const componentPattern = new RegExp(`<ExcelTable[\\s\\S]{0,500}className=["']${escapedClassName}["']`);
  if (!componentPattern.test(source)) {
    failures.push(`${file}: 编辑表格 ${className} 必须直接复用 ExcelTable，不能用同文件内其他表格代替通过守卫。`);
  }
}

const cuttingBedRecordSource = fs.readFileSync(
  path.join(root, 'src/components/CuttingBedRecordModal.tsx'),
  'utf8',
);
if (!/<ExcelTable[\s\S]{0,500}className="cutting-bed-material-usage-table"[\s\S]{0,500}tableLayout="fixed"[\s\S]{0,200}scroll=\{\{ x: 1150 \}\}/.test(cuttingBedRecordSource)) {
  failures.push('CuttingBedRecordModal.tsx: 裁床实际用量表必须使用 1150px 横向滚动宽度和 fixed 布局，避免长物料内容压缩列宽并撑高页面。');
}

for (const file of excelGridConsumers) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (!/<ExcelGrid\b/.test(source)) {
    failures.push(`${file}: 编辑矩阵必须复用 ExcelGrid 交互作用域。`);
  }
}

const excelComponentPath = path.join(root, 'src/components/common/ExcelTable.tsx');
const excelBaseClassPattern = /\boc-excel-(?:entry-table|cell-(?:input|text-input|select|picker|readonly|placeholder|note)|row-actions|image-cell|price-cell|table-footer)\b/;
for (const absolutePath of collectSourceFiles(path.join(root, 'src'))) {
  if (absolutePath === excelComponentPath) continue;
  const source = fs.readFileSync(absolutePath, 'utf8');
  if (excelBaseClassPattern.test(source)) {
    failures.push(`${path.relative(root, absolutePath)}: Excel 表格基础类名只能由 components/common/ExcelTable.tsx 提供，请复用通用组件。`);
  }
}

if (failures.length) {
  console.error('CSS component guard failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
