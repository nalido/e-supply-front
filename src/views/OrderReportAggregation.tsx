import { Suspense, useMemo } from 'react';
import { Card, Skeleton, Tabs } from 'antd';
import { useSearchParams } from 'react-router-dom';
import OrderProgressDetailsSection from './order-report/OrderProgressDetailsSection';
import OrderTicketDetailsSection from './order-report/OrderTicketDetailsSection';
import ProcessProductionComparisonSection from './order-report/ProcessProductionComparisonSection';
import SequentialProcessSection from './order-report/SequentialProcessSection';
import DownloadRecordsSection from './order-report/DownloadRecordsSection';

const TAB_KEYS = {
  process: 'process-comparison',
  ticket: 'ticket-details',
  progress: 'order-progress',
  sequential: 'sequential-process',
  downloads: 'download-records',
} as const;

const DEFAULT_KEY = TAB_KEYS.progress;

const OrderReportAggregation = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeKey = searchParams.get('view') ?? DEFAULT_KEY;

  const handleTabChange = (nextKey: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextKey === DEFAULT_KEY) {
      nextParams.delete('view');
    } else {
      nextParams.set('view', nextKey);
    }
    setSearchParams(nextParams);
  };

  const resolvedKey = useMemo(() => {
    const keys = new Set(Object.values(TAB_KEYS));
    return keys.has(activeKey) ? activeKey : DEFAULT_KEY;
  }, [activeKey]);

  const content = useMemo(() => {
    switch (resolvedKey) {
      case TAB_KEYS.progress:
        return <OrderProgressDetailsSection />;
      case TAB_KEYS.ticket:
        return <OrderTicketDetailsSection />;
      case TAB_KEYS.process:
        return <ProcessProductionComparisonSection />;
      case TAB_KEYS.sequential:
        return <SequentialProcessSection />;
      case TAB_KEYS.downloads:
        return <DownloadRecordsSection />;
      default:
        return <OrderProgressDetailsSection />;
    }
  }, [resolvedKey]);

  const items = useMemo(
    () => [
      { key: TAB_KEYS.process, label: '工序生产对照表' },
      { key: TAB_KEYS.ticket, label: '订单计菲明细表' },
      { key: TAB_KEYS.progress, label: '订单进度明细表' },
      { key: TAB_KEYS.sequential, label: '按序生产工序表' },
      { key: TAB_KEYS.downloads, label: '下载记录' },
    ],
    [],
  );

  return (
    <div>
      <Tabs
        items={items}
        activeKey={resolvedKey}
        onChange={handleTabChange}
        style={{ marginBottom: 16 }}
      />
      <Suspense fallback={<Card variant="borderless"><Skeleton active /></Card>}>
        {content}
      </Suspense>
    </div>
  );
};

export default OrderReportAggregation;
