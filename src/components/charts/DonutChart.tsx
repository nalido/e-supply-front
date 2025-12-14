import { useMemo } from 'react';

interface DonutSlice {
  name: string;
  value: number;
  colorStops: [string, string];
}

interface DonutChartProps {
  data: DonutSlice[];
  total: number;
  width?: number;
  height?: number;
  innerRadiusRatio?: number;
  connectorLength?: number;
  showLabels?: boolean;
  centerTitle?: string;
  totalFormatter?: (value: number) => string;
  valueFormatter?: (slice: DonutSlice) => string;
  labelDistance?: number;
}

interface ChartPoint {
  x: number;
  y: number;
}

interface DonutSliceGeometry {
  slice: DonutSlice;
  gradientId: string;
  path: string;
  connector: {
    start: ChartPoint;
    radial: ChartPoint;
    end: ChartPoint;
    isRightSide: boolean;
  };
  label: {
    x: number;
    y: number;
    anchor: 'start' | 'end';
    lines: string[];
  };
  horizontalLength: number;
  labelWidth: number;
  midAngle: number;
  baseRadialLength: number;
}

const DEFAULT_WIDTH = 260;
const DEFAULT_HEIGHT = 220;
const DEFAULT_INNER_RATIO = 0.58;
const DEFAULT_CONNECTOR = 22;
const LABEL_LINE_HEIGHT = 16;
const LABEL_TEXT_PADDING = 4;
const LABEL_BASELINE_OFFSET = 12;
const LABEL_MIN_GAP = 8;
const LABEL_HORIZONTAL_PADDING = 12;
const LABEL_CHAR_ESTIMATE = 7.2;
const LABEL_MIN_HORIZONTAL = 16;

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angle: number,
): { x: number; y: number } {
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

export default function DonutChart({
  data,
  total,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  innerRadiusRatio = DEFAULT_INNER_RATIO,
  connectorLength = DEFAULT_CONNECTOR,
  showLabels = true,
  centerTitle = '合计数量',
  totalFormatter,
  valueFormatter,
  labelDistance,
}: DonutChartProps) {
  const sanitizedTotal = total > 0 ? total : 1;
  const centerX = width / 2;
  const centerY = height / 2;
  const padding = 24;
  const outerRadius = Math.min(width, height) / 2 - padding;
  const innerRadius = outerRadius * innerRadiusRatio;

  const renderTotalValue = totalFormatter ?? ((value: number) => `${value}`);
  const resolveValueLine = useMemo(
    () => valueFormatter ?? ((slice: DonutSlice) => `${slice.value} 款`),
    [valueFormatter],
  );

  const horizontalDistance = labelDistance ?? (connectorLength + 8);

  const slices = useMemo((): DonutSliceGeometry[] => {
    let startAngle = 0;

    const estimateHorizontalLength = (isRightSide: boolean, radialX: number, labelWidth: number): number => {
      const baseSpacing = horizontalDistance + Math.max(0, (labelWidth - 64) * 0.25);
      const availableSpace = isRightSide
        ? width - padding - labelWidth - LABEL_HORIZONTAL_PADDING - radialX
        : radialX - padding - labelWidth - LABEL_HORIZONTAL_PADDING;

      if (availableSpace <= 0) {
        return LABEL_MIN_HORIZONTAL;
      }

      const minFeasible = Math.min(availableSpace, LABEL_MIN_HORIZONTAL);
      const candidate = Math.min(baseSpacing, availableSpace);
      return candidate < minFeasible ? minFeasible : candidate;
    };

    const baseSlices: DonutSliceGeometry[] = data
      .filter((slice) => slice.value >= 0)
      .map((slice, index) => {
        const fraction = slice.value / sanitizedTotal;
        const angle = fraction * Math.PI * 2;
        const adjustedAngle = angle >= Math.PI * 2 ? Math.PI * 2 - 1e-6 : angle;
        const endAngle = startAngle + adjustedAngle;
        const midAngle = startAngle + angle / 2;
        const largeArc = angle > Math.PI ? 1 : 0;
        const startOuter = polarToCartesian(centerX, centerY, outerRadius, startAngle);
        const endOuter = polarToCartesian(centerX, centerY, outerRadius, endAngle);
        const startInner = polarToCartesian(centerX, centerY, innerRadius, endAngle);
        const endInner = polarToCartesian(centerX, centerY, innerRadius, startAngle);
        const sweepFlag = 1;
        const connectorStart = polarToCartesian(centerX, centerY, outerRadius, midAngle);
        const baseRadialLength = outerRadius + connectorLength;
        const connectorRadial = polarToCartesian(centerX, centerY, baseRadialLength, midAngle);
        const isRightSide = connectorRadial.x >= centerX;
        const percent = sanitizedTotal ? ((fraction * 100) || 0) : 0;
        const labelLines = [
          `${slice.name} ${percent.toFixed(0)}%`,
          resolveValueLine(slice),
        ];
        const longestLine = labelLines.reduce((max, line) => Math.max(max, line.length), 0);
        const estimatedLabelWidth = longestLine * LABEL_CHAR_ESTIMATE;
        const horizontalLength = estimateHorizontalLength(isRightSide, connectorRadial.x, estimatedLabelWidth);
        const connectorEnd = {
          x: connectorRadial.x + (isRightSide ? horizontalLength : -horizontalLength),
          y: connectorRadial.y,
        };
        const labelAnchor: 'start' | 'end' = isRightSide ? 'start' : 'end';
        const gradientId = `donut-gradient-${index}`;

        startAngle = endAngle;

        return {
          slice,
          gradientId,
          path: [
            `M ${startOuter.x} ${startOuter.y}`,
            `A ${outerRadius} ${outerRadius} 0 ${largeArc} ${sweepFlag} ${endOuter.x} ${endOuter.y}`,
            `L ${startInner.x} ${startInner.y}`,
            `A ${innerRadius} ${innerRadius} 0 ${largeArc} ${1 - sweepFlag} ${endInner.x} ${endInner.y}`,
            'Z',
          ].join(' '),
          connector: {
            start: connectorStart,
            radial: connectorRadial,
            end: connectorEnd,
            isRightSide,
          },
          label: {
            x: connectorEnd.x + (isRightSide ? LABEL_HORIZONTAL_PADDING : -LABEL_HORIZONTAL_PADDING),
            y: connectorEnd.y - LABEL_TEXT_PADDING,
            anchor: labelAnchor,
            lines: labelLines,
          },
          horizontalLength,
          labelWidth: estimatedLabelWidth,
          midAngle,
          baseRadialLength,
        };
      });

    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
    const topBoundary = padding;
    const bottomBoundary = height - padding;

    const layoutSide = (items: DonutSliceGeometry[], isRightSide: boolean) => {
      if (!items.length) return;

      const boxes = items
        .map((item) => {
          const linesCount = item.label.lines.length;
          const contentHeight = Math.max(linesCount, 1) * LABEL_LINE_HEIGHT;
          const halfHeight = contentHeight / 2 + LABEL_TEXT_PADDING;
          const minCenter = topBoundary + halfHeight;
          const maxCenter = bottomBoundary - halfHeight;
          const target = clamp(item.connector.radial.y, minCenter, maxCenter);

          return {
            item,
            halfHeight,
            minCenter,
            maxCenter,
            target,
            center: target,
          };
        })
        .sort((a, b) => a.target - b.target);

      let currentTop = topBoundary;
      boxes.forEach((box) => {
        const minCenter = box.minCenter;
        const desired = Math.max(box.target, minCenter, currentTop + box.halfHeight + LABEL_MIN_GAP);
        box.center = desired;
        currentTop = box.center + box.halfHeight;
      });

      let currentBottom = bottomBoundary;
      for (let index = boxes.length - 1; index >= 0; index -= 1) {
        const box = boxes[index];
        const maxCenter = box.maxCenter;
        const desired = Math.min(box.center, maxCenter, currentBottom - box.halfHeight - LABEL_MIN_GAP);
        box.center = desired;
        currentBottom = box.center - box.halfHeight;
      }

      boxes.forEach((box) => {
        const desiredCenter = clamp(box.center, box.minCenter, box.maxCenter);
        const sinValue = Math.sin(box.item.midAngle);
        const cosValue = Math.cos(box.item.midAngle);
        let radialLength = box.item.baseRadialLength;

        if (Math.abs(sinValue) > 1e-3) {
          const projectedLength = (desiredCenter - centerY) / sinValue;
          if (projectedLength > 0) {
            radialLength = Math.max(box.item.baseRadialLength, Math.abs(projectedLength));
          }
        }

        const radialPoint = {
          x: centerX + radialLength * cosValue,
          y: centerY + radialLength * sinValue,
        };

        const horizontalLength = estimateHorizontalLength(isRightSide, radialPoint.x, box.item.labelWidth);
        const endPoint = {
          x: radialPoint.x + (isRightSide ? horizontalLength : -horizontalLength),
          y: radialPoint.y,
        };

        box.item.connector = {
          ...box.item.connector,
          radial: radialPoint,
          end: endPoint,
        };
        box.item.horizontalLength = horizontalLength;

        const labelHeight = (box.item.label.lines.length || 1) * LABEL_LINE_HEIGHT;
        const labelTop = endPoint.y - labelHeight / 2;
        const labelXOffset = isRightSide ? LABEL_HORIZONTAL_PADDING : -LABEL_HORIZONTAL_PADDING;
        box.item.label = {
          ...box.item.label,
          x: endPoint.x + labelXOffset,
          y: labelTop + LABEL_BASELINE_OFFSET,
        };
      });
    };

    layoutSide(baseSlices.filter((item) => item.connector.isRightSide), true);
    layoutSide(baseSlices.filter((item) => !item.connector.isRightSide), false);

    return baseSlices;
  }, [centerX, centerY, connectorLength, data, height, horizontalDistance, innerRadius, outerRadius, resolveValueLine, sanitizedTotal, padding, width]);

  if (data.length === 0) {
    return (
      <div style={{ width: '100%', textAlign: 'center', color: '#999' }}>
        暂无数据
      </div>
    );
  }

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
    >
      <defs>
        {slices.map(({ gradientId, slice }) => (
          <linearGradient
            key={gradientId}
            id={gradientId}
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <stop offset="0%" stopColor={slice.colorStops[0]} />
            <stop offset="100%" stopColor={slice.colorStops[1]} />
          </linearGradient>
        ))}
        <filter id="donut-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="rgba(79, 134, 255, 0.2)" />
        </filter>
      </defs>

      <g filter="url(#donut-shadow)">
        {slices.map(({ path, gradientId }, index) => (
          <path key={gradientId} d={path} fill={`url(#${gradientId})`} stroke="none">
            <title>{`${data[index].name}: ${data[index].value}`}</title>
          </path>
        ))}
      </g>

      {showLabels && slices.map(({ connector, label }, index) => (
        <g key={`label-${index}`}>
          <path
            d={`M ${connector.start.x} ${connector.start.y} L ${connector.radial.x} ${connector.radial.y} L ${connector.end.x} ${connector.end.y}`}
            stroke="#ccd5e0"
            strokeWidth={1}
            fill="none"
          />
          <text
            x={label.x}
            y={label.y}
            textAnchor={label.anchor}
            fontSize={12}
            fill="#4a5564"
          >
            <tspan x={label.x} dy="0">{label.lines[0]}</tspan>
            <tspan x={label.x} dy="16">{label.lines[1]}</tspan>
          </text>
        </g>
      ))}

      <circle cx={centerX} cy={centerY} r={innerRadius - 1} fill="#fff" />

      <text
        x={centerX}
        y={centerY - 4}
        textAnchor="middle"
        fontSize={14}
        fill="#9ca3af"
      >
        {centerTitle}
      </text>
      <text
        x={centerX}
        y={centerY + 24}
        textAnchor="middle"
        fontSize={28}
        fontWeight={600}
        fill="#1f2933"
      >
        {renderTotalValue(total)}
      </text>
    </svg>
  );
}
