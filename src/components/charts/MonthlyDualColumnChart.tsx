import { useEffect, useMemo, useRef } from 'react';
import { Column, type ColumnOptions } from '@antv/g2plot';

type MonthlyFlowDatum = {
  month: string;
  inbound: number;
  outbound: number;
};

type MonthlyDualColumnChartProps = {
  data: MonthlyFlowDatum[];
  height?: number;
  inboundLabel?: string;
  outboundLabel?: string;
  colorMap?: { inbound: string; outbound: string };
  valueFormatter?: (value: number) => string;
  tooltipValueFormatter?: (value: number) => string;
  seriesLabelFormatter?: (seriesType: string) => string;
  xLabelFormatter?: (label: string) => string;
};

const DEFAULT_HEIGHT = 260;
const DEFAULT_INBOUND_LABEL = '入库数';
const DEFAULT_OUTBOUND_LABEL = '出库数';
const DEFAULT_COLORS: { inbound: string; outbound: string } = {
  inbound: '#3b82f6',
  outbound: '#fb923c',
};

const defaultNumberFormatter = (value: number): string => `${value}`;
const defaultSeriesFormatter = (seriesType: string): string => seriesType;
const defaultXAxisFormatter = (label: string): string => {
  if (!label.includes('-')) {
    return label;
  }
  const [, monthPart] = label.split('-');
  return `${Number(monthPart)}月`;
};

export default function MonthlyDualColumnChart({
  data,
  height = DEFAULT_HEIGHT,
  inboundLabel = DEFAULT_INBOUND_LABEL,
  outboundLabel = DEFAULT_OUTBOUND_LABEL,
  colorMap = DEFAULT_COLORS,
  valueFormatter,
  tooltipValueFormatter,
  seriesLabelFormatter,
  xLabelFormatter,
}: MonthlyDualColumnChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const plotRef = useRef<Column | null>(null);

  const resolveValue = useMemo(() => valueFormatter ?? defaultNumberFormatter, [valueFormatter]);
  const resolveTooltipValue = useMemo(
    () => tooltipValueFormatter ?? valueFormatter ?? defaultNumberFormatter,
    [tooltipValueFormatter, valueFormatter],
  );
  const resolveSeriesLabel = useMemo(
    () => seriesLabelFormatter ?? defaultSeriesFormatter,
    [seriesLabelFormatter],
  );
  const resolveXAxisLabel = useMemo(
    () => xLabelFormatter ?? defaultXAxisFormatter,
    [xLabelFormatter],
  );

  const dataset = useMemo(() =>
    data.flatMap((item) => [
      {
        month: item.month,
        category: inboundLabel,
        value: item.inbound,
      },
      {
        month: item.month,
        category: outboundLabel,
        value: item.outbound,
      },
    ]),
  [data, inboundLabel, outboundLabel]);

  const config = useMemo<ColumnOptions>(() => ({
    data: dataset,
    autoFit: true,
    height,
    xField: 'month',
    yField: 'value',
    seriesField: 'category',
    isGroup: true,
    marginRatio: 0.2,
    columnStyle: {
      radius: [6, 6, 0, 0],
    },
    color: (datum) =>
      datum.category === inboundLabel ? colorMap.inbound : colorMap.outbound,
    tooltip: {
      shared: true,
      showMarkers: false,
      formatter: (datum) => ({
        name: resolveSeriesLabel(String(datum.category)),
        value: resolveTooltipValue(Number(datum.value)),
      }),
    },
    legend: {
      position: 'top',
      itemName: {
        formatter: (value: string) => resolveSeriesLabel(value),
      },
    },
    xAxis: {
      label: {
        formatter: (value: string) => resolveXAxisLabel(value),
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
      grid: null,
    },
    yAxis: {
      tickCount: 6,
      label: {
        formatter: (value: string) => {
          const numeric = Number(value);
          return resolveValue(Number.isFinite(numeric) ? numeric : 0);
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
    animation: false,
  }), [colorMap, dataset, height, inboundLabel, resolveSeriesLabel, resolveTooltipValue, resolveValue, resolveXAxisLabel]);

  const initialConfigRef = useRef<ColumnOptions>(config);

  useEffect(() => {
    if (!containerRef.current) {
      return () => undefined;
    }

    const plot = new Column(containerRef.current, initialConfigRef.current);
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
