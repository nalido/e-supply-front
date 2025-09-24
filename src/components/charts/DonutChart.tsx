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
    mid: ChartPoint;
    end: ChartPoint;
    isRightSide: boolean;
  };
  label: {
    x: number;
    y: number;
    anchor: 'start' | 'end';
    lines: string[];
  };
  midAngle: number;
}

const DEFAULT_WIDTH = 260;
const DEFAULT_HEIGHT = 220;
const DEFAULT_INNER_RATIO = 0.58;
const DEFAULT_CONNECTOR = 22;

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
}: DonutChartProps) {
  const sanitizedTotal = total > 0 ? total : 1;
  const centerX = width / 2;
  const centerY = height / 2;
  const padding = 24;
  const outerRadius = Math.min(width, height) / 2 - padding;
  const innerRadius = outerRadius * innerRadiusRatio;

  const slices = useMemo((): DonutSliceGeometry[] => {
    let startAngle = 0;

    const baseSlices: DonutSliceGeometry[] = data
      .filter((slice) => slice.value >= 0)
      .map((slice, index) => {
        const fraction = slice.value / sanitizedTotal;
        const angle = fraction * Math.PI * 2;
        const endAngle = startAngle + angle;
        const midAngle = startAngle + angle / 2;
        const largeArc = angle > Math.PI ? 1 : 0;
        const startOuter = polarToCartesian(centerX, centerY, outerRadius, startAngle);
        const endOuter = polarToCartesian(centerX, centerY, outerRadius, endAngle);
        const startInner = polarToCartesian(centerX, centerY, innerRadius, endAngle);
        const endInner = polarToCartesian(centerX, centerY, innerRadius, startAngle);
        const sweepFlag = 1;
        const connectorStart = polarToCartesian(centerX, centerY, outerRadius, midAngle);
        const connectorMidBase = polarToCartesian(centerX, centerY, outerRadius + connectorLength, midAngle);
        const isRightSide = connectorMidBase.x >= centerX;
        const horizontalOffset = isRightSide ? 16 : -16;
        const connectorMid = { ...connectorMidBase };
        const connectorEnd = {
          x: connectorMidBase.x + horizontalOffset,
          y: connectorMidBase.y,
        };
        const labelAnchor: 'start' | 'end' = isRightSide ? 'start' : 'end';
        const textPadding = 4;
        const labelX = connectorEnd.x + (isRightSide ? 4 : -4);
        const labelY = connectorEnd.y - textPadding;
        const percent = sanitizedTotal ? ((fraction * 100) || 0) : 0;
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
            mid: connectorMid,
            end: connectorEnd,
            isRightSide,
          },
          label: {
            x: labelX,
            y: labelY,
            anchor: labelAnchor,
            lines: [
              `${slice.name} ${(percent).toFixed(0)}%`,
              `${slice.value} 款`,
            ],
          },
          midAngle,
        };
      });

    const topBoundary = padding;
    const bottomBoundary = height - padding;
    const textPadding = 4;
    const labelLineHeight = 16;
    const minLabelY = topBoundary + textPadding;

    const adjustLabels = (items: DonutSliceGeometry[]) => {
      if (items.length === 0) return;

      const sorted = [...items].sort((a, b) => a.midAngle - b.midAngle);
      const availableHeight = bottomBoundary - topBoundary;
      const step = items.length > 1 ? availableHeight / (items.length + 1) : 0;

      sorted.forEach((item, index) => {
        const linesCount = item.label.lines.length;
        const maxLabelY = bottomBoundary - (linesCount - 1) * labelLineHeight - textPadding;
        const targetY = items.length > 1
          ? topBoundary + step * (index + 1)
          : topBoundary + availableHeight / 2;
        const labelY = Math.max(minLabelY, Math.min(targetY, maxLabelY));
        const connectorY = labelY + textPadding;
        const offsetX = item.label.anchor === 'start' ? 4 : -4;

        item.connector = {
          ...item.connector,
          mid: { ...item.connector.mid, y: connectorY },
          end: { ...item.connector.end, y: connectorY },
        };

        item.label = {
          ...item.label,
          x: item.connector.end.x + offsetX,
          y: labelY,
        };
      });
    };

    adjustLabels(baseSlices.filter((item) => item.connector.isRightSide));
    adjustLabels(baseSlices.filter((item) => !item.connector.isRightSide));

    return baseSlices;
  }, [centerX, centerY, connectorLength, data, height, innerRadius, outerRadius, sanitizedTotal, padding]);

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
            d={`M ${connector.start.x} ${connector.start.y} L ${connector.mid.x} ${connector.mid.y} L ${connector.end.x} ${connector.end.y}`}
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
        合计数量
      </text>
      <text
        x={centerX}
        y={centerY + 24}
        textAnchor="middle"
        fontSize={28}
        fontWeight={600}
        fill="#1f2933"
      >
        {total}
      </text>
    </svg>
  );
}
