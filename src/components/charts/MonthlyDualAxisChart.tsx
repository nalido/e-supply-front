import { useEffect, useMemo, useRef } from 'react';
import { DualAxes, type DualAxesOptions } from '@antv/g2plot';

type ColumnDatum = {
  month: string;
  value: number;
};

type LineDatum = {
  month: string;
  value: number;
};

type MonthlyDualAxisChartProps = {
  columnData: ColumnDatum[];
  lineData: LineDatum[];
  columnLabel?: string;
  lineLabel?: string;
  height?: number;
  columnColor?: string;
  lineColor?: string;
  columnFormatter?: (value: number) => string;
  lineFormatter?: (value: number) => string;
  xLabelFormatter?: (value: string) => string;
};

const DEFAULT_HEIGHT = 260;
const DEFAULT_COLUMN_COLOR = '#3b82f6';
const DEFAULT_LINE_COLOR = '#22c55e';
const defaultValueFormatter = (value: number) => `${value}`;
const defaultLabelFormatter = (value: string) => {
  if (value.includes('-')) {
    const [, month] = value.split('-');
    return `${Number(month)}月`;
  }
  return value;
};

export default function MonthlyDualAxisChart({
  columnData,
  lineData,
  columnLabel = '出货金额',
  lineLabel = '利润总额',
  height = DEFAULT_HEIGHT,
  columnColor = DEFAULT_COLUMN_COLOR,
  lineColor = DEFAULT_LINE_COLOR,
  columnFormatter,
  lineFormatter,
  xLabelFormatter,
}: MonthlyDualAxisChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const plotRef = useRef<DualAxes | null>(null);

  const resolveColumnFormatter = useMemo(
    () => columnFormatter ?? defaultValueFormatter,
    [columnFormatter],
  );
  const resolveLineFormatter = useMemo(
    () => lineFormatter ?? columnFormatter ?? defaultValueFormatter,
    [columnFormatter, lineFormatter],
  );
  const resolveLabelFormatter = useMemo(
    () => xLabelFormatter ?? defaultLabelFormatter,
    [xLabelFormatter],
  );

  const config = useMemo<DualAxesOptions>(() => ({
    data: [
      columnData.map((item) => ({ month: item.month, value: item.value, type: columnLabel })),
      lineData.map((item) => ({ month: item.month, value: item.value, type: lineLabel })),
    ],
    autoFit: true,
    height,
    xField: 'month',
    yField: ['value', 'value'],
    geometryOptions: [
      {
        geometry: 'column',
        seriesField: 'type',
        columnWidthRatio: 0.45,
        color: columnColor,
        columnStyle: {
          radius: [6, 6, 0, 0],
        },
        tooltip: {
          formatter: (datum) => ({
            name: columnLabel,
            value: resolveColumnFormatter(Number(datum.value)),
          }),
        },
      },
      {
        geometry: 'line',
        seriesField: 'type',
        color: lineColor,
        smooth: true,
        lineStyle: {
          lineWidth: 2,
        },
        point: {
          size: 4,
          shape: 'circle',
          style: {
            fill: '#fff',
            lineWidth: 2,
            stroke: lineColor,
          },
        },
        tooltip: {
          formatter: (datum) => ({
            name: lineLabel,
            value: resolveLineFormatter(Number(datum.value)),
          }),
        },
      },
    ],
    meta: {
      month: {
        type: 'cat',
        formatter: (value: string) => resolveLabelFormatter(value),
      },
    },
    legend: {
      position: 'top',
    },
    yAxis: {
      value: {
        label: {
          formatter: (text: string, item) => {
            const numeric = Number(text);
            if (item?.name === lineLabel) {
              return resolveLineFormatter(Number.isFinite(numeric) ? numeric : 0);
            }
            return resolveColumnFormatter(Number.isFinite(numeric) ? numeric : 0);
          },
          style: {
            fill: '#6b7280',
            fontSize: 12,
          },
        },
        grid: {
          line: {
            style: {
              stroke: '#eef2f7',
              lineDash: [4, 4],
            },
          },
        },
      },
    },
    xAxis: {
      label: {
        style: {
          fill: '#6b7280',
          fontSize: 12,
        },
      },
      line: {
        style: {
          stroke: '#d7dce3',
        },
      },
    },
    animation: false,
    tooltip: {
      shared: true,
      showMarkers: true,
      customItems: (originalItems) =>
        originalItems.map((item) => ({
          ...item,
          name: item.name === columnLabel ? columnLabel : lineLabel,
          value:
            item.name === columnLabel
              ? resolveColumnFormatter(Number(item.value))
              : resolveLineFormatter(Number(item.value)),
        })),
    },
  }), [columnData, columnColor, columnLabel, height, lineColor, lineData, lineLabel, resolveColumnFormatter, resolveLabelFormatter, resolveLineFormatter]);

  const initialConfigRef = useRef<DualAxesOptions>(config);

  useEffect(() => {
    if (!containerRef.current) {
      return () => undefined;
    }

    const plot = new DualAxes(containerRef.current, initialConfigRef.current);
    plot.render();
    plotRef.current = plot;

    return () => {
      plot.destroy();
      plotRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!plotRef.current) {
      return;
    }
    plotRef.current.update(config);
  }, [config]);

  return <div ref={containerRef} />;
}
