import { useEffect, useMemo, useRef } from 'react';
import { Area, type AreaOptions } from '@antv/g2plot';

type MonthlyAreaDatum = {
  month: string;
  count: number;
  type: string;
};

type MonthlyAreaChartProps = {
  data: MonthlyAreaDatum[];
  height?: number;
  getColor: (seriesType: string) => string;
  getGradient: (seriesType: string) => string;
  valueFormatter?: (value: number) => string;
  tooltipValueFormatter?: (value: number) => string;
  seriesLabelFormatter?: (seriesType: string) => string;
  xLabelFormatter?: (label: string) => string;
};

const DEFAULT_HEIGHT = 200;
const defaultValueFormatter = (value: number): string => `${value}`;
const defaultSeriesLabelFormatter = (seriesType: string): string => seriesType;
const defaultXAxisFormatter = (label: string): string => label;

export default function MonthlyAreaChart({
  data,
  height = DEFAULT_HEIGHT,
  getColor,
  getGradient,
  valueFormatter,
  tooltipValueFormatter,
  seriesLabelFormatter,
  xLabelFormatter,
}: MonthlyAreaChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const plotRef = useRef<Area | null>(null);
  const resolveAxisValue = useMemo(
    () => valueFormatter ?? defaultValueFormatter,
    [valueFormatter],
  );
  const resolveTooltipValue = useMemo(
    () => tooltipValueFormatter ?? valueFormatter ?? defaultValueFormatter,
    [tooltipValueFormatter, valueFormatter],
  );
  const resolveSeriesLabel = useMemo(
    () => seriesLabelFormatter ?? defaultSeriesLabelFormatter,
    [seriesLabelFormatter],
  );
  const resolveXAxisLabel = useMemo(
    () => xLabelFormatter ?? defaultXAxisFormatter,
    [xLabelFormatter],
  );

  const config = useMemo<AreaOptions>(() => ({
    data,
    height,
    autoFit: true,
    xField: 'month',
    yField: 'count',
    seriesField: 'type',
    isStack: false,
    smooth: true,
    areaStyle: (datum) => ({
      fill: getGradient(String(datum.type)),
    }),
    line: {
      style: (datum) => ({
        lineWidth: 1,
        stroke: getColor(String(datum.type)),
        // shadowColor: datum.type === '打板数量' ? 'rgba(80, 135, 246, 0.25)' : 'rgba(62, 195, 160, 0.25)',
        // shadowBlur: 10,
      }),
    },
    // color: (datum) => getColor(String(datum.type)),
    // point: {
    //   size: 0,
    //   shape: 'circle',
    //   style: (datum) => ({
    //     fill: getColor(String(datum.type)),
    //     stroke: '#fff',
    //     strokeWidth: 2,
    //     shadowBlur: 8,
    //     shadowColor: 'rgba(15, 23, 42, 0.18)',
    //   }),
    //   state: {
    //     active: {
    //       style: {
    //         size: 6,
    //         fillOpacity: 1,
    //         strokeOpacity: 1,
    //       },
    //     },
    //     inactive: {
    //       style: {
    //         size: 0,
    //         fillOpacity: 0,
    //         strokeOpacity: 0,
    //       },
    //     },
    //   },
    // },
    tooltip: {
      shared: true,
      showMarkers: true,
      formatter: (datum) => ({
        name: resolveSeriesLabel(String(datum.type)),
        value: resolveTooltipValue(Number(datum.count)),
      }),
      domStyles: {
        'g2-tooltip': {
          borderRadius: '8px',
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.12)',
          border: '1px solid #e2e8f0',
          padding: '12px 16px',
        },
        'g2-tooltip-title': {
          fontWeight: 600,
          marginBottom: 8,
        },
      },
    },
    xAxis: {
      type: 'cat',
      range: [0.05, 0.95],
      label: {
        offset: 12,
        autoHide: false,
        autoRotate: false,
        rotate: 0,
        formatter: (value: string) => resolveXAxisLabel(value),
        style: {
          fill: '#6b7280',
          fontSize: 12,
          textAlign: 'center',
        },
      },
      line: {
        style: {
          stroke: '#d7dce3',
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
      tickCount: Math.min(data.length, 6),
    },
    yAxis: {
      tickCount: 6,
      label: {
        style: {
          fill: '#6b7280',
          fontSize: 12,
        },
        formatter: (value: string) => {
          const numeric = Number(value);
          return resolveAxisValue(Number.isFinite(numeric) ? numeric : 0);
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
    state: {
      active: {
        style: {
          lineWidth: 4,
        },
      },
    },
    interactions: [
      { type: 'marker-active' },
      { type: 'element-active' },
    ],
    animation: false,
  }), [data, getColor, getGradient, height, resolveAxisValue, resolveTooltipValue, resolveSeriesLabel, resolveXAxisLabel]);

  const initialConfigRef = useRef<AreaOptions>(config);

  useEffect(() => {
    if (!containerRef.current) {
      return () => undefined;
    }

    const plot = new Area(containerRef.current, initialConfigRef.current);
    plot.render();
    plotRef.current = plot;

    return () => {
      plot.destroy();
      plotRef.current = null;
    };
  }, []);

  useEffect(() => {
    plotRef.current?.update(config);
  }, [config]);

  return <div ref={containerRef} />;
}
