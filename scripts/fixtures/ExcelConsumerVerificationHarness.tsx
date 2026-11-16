/* eslint-disable react-refresh/only-export-components */
import { useEffect, useMemo, useState } from 'react';
import { App as AntdApp, Form } from 'antd';
import { createRoot } from 'react-dom/client';
import dayjs from 'dayjs';
import StockingPurchaseBatchEditModal from '../../src/components/procurement/StockingPurchaseBatchEditModal';
import AllocationCreateModal from '../../src/views/factory-orders/AllocationCreateModal';
import type { AllocationQuantityMatrix } from '../../src/views/factory-orders/types';

type HarnessMode = 'batch-edit' | 'allocation';

const colors = ['黑色', '白色'];
const sizes = ['S', 'M', 'L'];
const capacityMatrix: AllocationQuantityMatrix = {
  黑色: { S: 12, M: 14, L: 16 },
  白色: { S: 10, M: 12, L: 14 },
};
const historyMatrix: AllocationQuantityMatrix = {
  黑色: { S: 2, M: 3, L: 4 },
  白色: { S: 1, M: 2, L: 3 },
};

function AllocationHarness() {
  const [form] = Form.useForm();
  const [matrix, setMatrix] = useState<AllocationQuantityMatrix>(() => ({
    黑色: { S: null, M: null, L: null },
    白色: { S: null, M: null, L: null },
  }));

  useEffect(() => {
    form.setFieldsValue({
      completedAt: dayjs('2026-11-16 08:30:00'),
      factoryId: 'factory-1',
      unitPrice: 3.5,
    });
  }, [form]);

  const rowTotals = useMemo(() => Object.fromEntries(colors.map((color) => [
    color,
    sizes.reduce((sum, size) => sum + Number(matrix[color]?.[size] ?? 0), 0),
  ])), [matrix]);
  const columnTotals = useMemo(() => Object.fromEntries(sizes.map((size) => [
    size,
    colors.reduce((sum, color) => sum + Number(matrix[color]?.[size] ?? 0), 0),
  ])), [matrix]);
  const grandTotal = Object.values(rowTotals).reduce((sum, value) => sum + value, 0);

  return (
    <AllocationCreateModal
      open
      isCuttingProgressStage={false}
      submitting={false}
      form={form}
      factoryOptions={[{ value: 'factory-1', label: '验收工厂' }]}
      allocationHistoryTotal={15}
      allocationCapacityTotal={78}
      orderedTotal={90}
      cuttingCompletedTotal={78}
      allocationGrandTotal={grandTotal}
      allocationColors={colors}
      allocationSizes={sizes}
      allocationCapacityMatrix={capacityMatrix}
      allocationHistoryMatrix={historyMatrix}
      allocationMatrix={matrix}
      allocationRowTotals={rowTotals}
      allocationColumnTotals={columnTotals}
      onCancel={() => undefined}
      onOk={() => undefined}
      onOpenFactoryGuide={() => undefined}
      onLoadRemainingAllocation={() => setMatrix({
        黑色: { S: 10, M: 11, L: 12 },
        白色: { S: 9, M: 10, L: 11 },
      })}
      onAllocationMatrixQtyChange={(color, size, value) => setMatrix((current) => ({
        ...current,
        [color]: { ...current[color], [size]: value },
      }))}
    />
  );
}

function BatchEditHarness() {
  return (
    <StockingPurchaseBatchEditModal
      open
      orderIds={['262']}
      lineIds={['322']}
      materialType="fabric"
      onClose={() => undefined}
      onSaved={() => undefined}
    />
  );
}

export function mountExcelConsumerVerificationHarness(container: HTMLElement, mode: HarnessMode) {
  const root = createRoot(container);
  root.render(
    <AntdApp>
      {mode === 'batch-edit' ? <BatchEditHarness /> : <AllocationHarness />}
    </AntdApp>,
  );
  return () => root.unmount();
}
