import { EditOutlined } from '@ant-design/icons';
import { Input, Typography } from 'antd';
import { useMemo, type MouseEvent } from 'react';
import type { StyleCodeVariantDraft } from '../../types/style';
import '../../styles/matrix-table.css';

const { Text } = Typography;

type Props = {
  colors: string[];
  sizes: string[];
  variantDrafts: Record<string, StyleCodeVariantDraft>;
  onSkcChange: (color: string, value: string) => void;
  onSkuChange: (color: string, size: string, value: string) => void;
};

const buildVariantKey = (color: string, size: string) => `${color}|${size}`;
const getDisplayCodeValue = (customValue?: string, systemValue?: string) => customValue ?? systemValue ?? '';
const preventSuffixMouseDown = (event: MouseEvent<HTMLElement>) => {
  event.preventDefault();
};
const resolveWidthCh = (lengths: number[]) => {
  const longest = Math.max(...lengths.map((len) => len + 4));
  return Math.min(56, Math.max(18, longest));
};

export default function StyleCodeMatrixEditor({
  colors,
  sizes,
  variantDrafts,
  onSkcChange,
  onSkuChange,
}: Props) {
  const columnSkcMap = useMemo(
    () =>
      colors.reduce<Record<string, StyleCodeVariantDraft | undefined>>((acc, color) => {
        acc[color] = sizes.map((size) => variantDrafts[buildVariantKey(color, size)]).find(Boolean);
        return acc;
      }, {}),
    [colors, sizes, variantDrafts],
  );

  const columnWidthMap = useMemo(
    () =>
      colors.reduce<Record<string, number>>((acc, color) => {
        const columnDraft = columnSkcMap[color];
        const lengths = [
          color.length,
          getDisplayCodeValue(columnDraft?.skcNo, columnDraft?.systemSkcNo).length,
          ...sizes.map((size) =>
            getDisplayCodeValue(
              variantDrafts[buildVariantKey(color, size)]?.skuNo,
              variantDrafts[buildVariantKey(color, size)]?.systemSkuNo,
            ).length,
          ),
        ];
        acc[color] = resolveWidthCh(lengths);
        return acc;
      }, {}),
    [colors, columnSkcMap, sizes, variantDrafts],
  );

  const rowHeaderWidthCh = useMemo(
    () => resolveWidthCh(['尺码 / 颜色'.length, ...sizes.map((size) => size.length)]),
    [sizes],
  );

  return (
    <div className="style-code-matrix">
      <table className="style-code-matrix__table">
        <colgroup>
          <col style={{ width: `${rowHeaderWidthCh}ch` }} />
          {colors.map((color) => (
            <col key={color} style={{ width: `${columnWidthMap[color]}ch` }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className="style-code-matrix__corner-head">
              <div className="style-code-matrix__corner-head-content">尺码 / 颜色</div>
            </th>
            {colors.map((color) => {
              const columnDraft = columnSkcMap[color];
              return (
                <th key={color} className="style-code-matrix__column-head">
                  <div className="style-code-matrix__column-head-content">
                    <div className="style-code-matrix__column-color">
                      <Text strong>{color}</Text>
                    </div>
                    <Input
                      className="style-code-matrix__code-input oc-excel-cell-text-input"
                      spellCheck={false}
                      value={getDisplayCodeValue(columnDraft?.skcNo, columnDraft?.systemSkcNo)}
                      onChange={(event) => onSkcChange(color, event.target.value)}
                      suffix={
                        <EditOutlined
                          className="style-code-matrix__edit-icon"
                          onMouseDown={preventSuffixMouseDown}
                        />
                      }
                    />
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sizes.map((size) => (
            <tr key={size}>
              <th className="style-code-matrix__size-head">
                <div className="style-code-matrix__size-head-content">
                  <Text strong>{size}</Text>
                </div>
              </th>
              {colors.map((color) => {
                const key = buildVariantKey(color, size);
                const draft = variantDrafts[key];
                return (
                  <td key={key} className="style-code-matrix__cell">
                    <div className="style-code-matrix__cell-content">
                      <Input
                        className="style-code-matrix__code-input oc-excel-cell-text-input"
                        spellCheck={false}
                        value={getDisplayCodeValue(draft?.skuNo, draft?.systemSkuNo)}
                        onChange={(event) => onSkuChange(color, size, event.target.value)}
                        suffix={
                          <EditOutlined
                            className="style-code-matrix__edit-icon"
                            onMouseDown={preventSuffixMouseDown}
                          />
                        }
                      />
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
