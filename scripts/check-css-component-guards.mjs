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

const failures = [];

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

if (failures.length) {
  console.error('CSS component guard failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
