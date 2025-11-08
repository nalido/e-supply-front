import { Suspense, useMemo } from 'react';
import { Card, Skeleton, Tabs } from 'antd';
import { useSearchParams } from 'react-router-dom';
import OrderProgressDetailsSection from './order-report/OrderProgressDetailsSection';
import OrderTicketDetailsSection from './order-report/OrderTicketDetailsSection';
import ProcessProductionComparisonSection from './order-report/ProcessProductionComparisonSection';

const TAB_KEYS = {
  process: 'process-comparison',
  ticket: 'ticket-details',
  progress: 'order-progress',
  sequential: 'sequential-process',
} as const;

const DEFAULT_KEY = TAB_KEYS.progress;

const PlaceholderCard = ({ title }: { title: string }) => (
  <Card bordered={false} bodyStyle={{ padding: 48, textAlign: 'center' }}>
    尚未实现的报表：{title}
  </Card>
);

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
        return <PlaceholderCard title="按序生产工序表" />;
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
      <Suspense fallback={<Card bordered={false}><Skeleton active /></Card>}>
        {content}
      </Suspense>
    </div>
  );
};

export default OrderReportAggregation;
