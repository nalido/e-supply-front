import { Button, Input, Typography } from 'antd';
import { useMemo, useState } from 'react';
import type { StyleCodeVariantDraft } from '../../types/style';
import '../../styles/matrix-table.css';

const { Text } = Typography;

type Props = {
  colors: string[];
  sizes: string[];
  variantDrafts: Record<string, StyleCodeVariantDraft>;
  onSkcChange: (color: string, value: string) => void;
  onSkuChange: (color: string, size: string, value: string) => void;
  onBarcodeChange: (color: string, size: string, value: string) => void;
};

const buildVariantKey = (color: string, size: string) => `${color}|${size}`;

export default function StyleCodeMatrixEditor({
  colors,
  sizes,
  variantDrafts,
  onSkcChange,
  onSkuChange,
  onBarcodeChange,
}: Props) {
  const [expandedCells, setExpandedCells] = useState<Record<string, boolean>>({});

  const rowSkcMap = useMemo(
    () =>
      colors.reduce<Record<string, StyleCodeVariantDraft | undefined>>((acc, color) => {
        acc[color] = sizes.map((size) => variantDrafts[buildVariantKey(color, size)]).find(Boolean);
        return acc;
      }, {}),
    [colors, sizes, variantDrafts],
  );

  return (
    <div className="factory-create-matrix-wrap style-code-matrix">
      <table className="factory-create-matrix-table style-code-matrix__table">
        <thead>
          <tr>
            <th>颜色 / SKC</th>
            {sizes.map((size) => (
              <th key={size}>{size}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {colors.map((color) => {
            const rowDraft = rowSkcMap[color];
            return (
              <tr key={color}>
                <th className="style-code-matrix__row-head">
                  <div className="style-code-matrix__row-color">
                    <Text strong>{color}</Text>
                  </div>
                  <Input
                    value={rowDraft?.skcNo ?? ''}
                    placeholder={rowDraft?.systemSkcNo ? `留空使用 ${rowDraft.systemSkcNo}` : '留空按系统生成'}
                    onChange={(event) => onSkcChange(color, event.target.value)}
                  />
                  <Text type="secondary" className="style-code-matrix__hint">
                    行头维护该颜色的 SKC，留空按系统默认生成
                  </Text>
                </th>
                {sizes.map((size) => {
                  const key = buildVariantKey(color, size);
                  const draft = variantDrafts[key];
                  const expanded = Boolean(expandedCells[key]);
                  return (
                    <td key={key} className="style-code-matrix__cell">
                      <div className="style-code-matrix__cell-main">
                        <Input
                          value={draft?.skuNo ?? ''}
                          placeholder={draft?.systemSkuNo ? `留空使用 ${draft.systemSkuNo}` : '留空按系统生成'}
                          onChange={(event) => onSkuChange(color, size, event.target.value)}
                        />
                      </div>
                      <div className="style-code-matrix__cell-meta">
                        <Button
                          type="link"
                          size="small"
                          onClick={() =>
                            setExpandedCells((prev) => ({
                              ...prev,
                              [key]: !prev[key],
                            }))
                          }
                        >
                          {expanded ? '收起条码' : '编辑条码'}
                        </Button>
                        <Text type="secondary" className="style-code-matrix__hint">
                          默认 {draft?.systemSkuNo ?? '-'}
                        </Text>
                      </div>
                      {expanded && (
                        <Input
                          value={draft?.barcode ?? ''}
                          placeholder="可选条码"
                          onChange={(event) => onBarcodeChange(color, size, event.target.value)}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
