import React from 'react';
import {
  Table,
  Button,
  Space,
  Popconfirm,
  Empty,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  EditOutlined,
  DeleteOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import type { DragEndEvent } from '@dnd-kit/core';
import '../styles/draggable-table.css';

export type TemplateOperationItem = {
  id: string;
  processCatalogId?: string;
  processName?: string;
  processCode?: string;
  unitPrice?: number;
  remarks?: string;
  sortOrder: number;
  sequenceNo: number;
};

interface DraggableOperationTableProps {
  operations: TemplateOperationItem[];
  onOperationsChange: (operations: TemplateOperationItem[]) => void;
  onEditOperation: (operation: TemplateOperationItem) => void;
  onDeleteOperation: (id: string) => void;
}

interface DraggableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  'data-row-key': string;
}

const DraggableRow: React.FC<DraggableRowProps> = (props) => {
  const { children, ...restProps } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props['data-row-key'] });

  const style: React.CSSProperties = {
    ...restProps.style,
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging
      ? {
          position: 'relative',
          zIndex: 9999,
          backgroundColor: '#f0f0f0',
          opacity: 0.85,
          boxShadow: '0 4px 8px rgba(0,0,0,0.08)',
        }
      : {}),
  };

  const processedChildren = React.Children.map(children, (child, index) => {
    if (index === 0 && React.isValidElement(child)) {
      const childElement = child as React.ReactElement;
      return React.cloneElement(childElement, {
        ...childElement.props,
        children: (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              className={`drag-handle ${isDragging ? 'dragging' : ''}`}
              style={{
                cursor: isDragging ? 'grabbing' : 'grab',
                color: isDragging ? '#1890ff' : '#999',
                fontSize: 14,
                padding: '2px 4px',
                borderRadius: 2,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              {...listeners}
              {...attributes}
              title="拖拽排序"
            >
              <MenuOutlined />
            </span>
            {childElement.props.children}
          </div>
        ),
      });
    }
    return child;
  });

  return (
    <tr {...restProps} ref={setNodeRef} style={style}>
      {processedChildren}
    </tr>
  );
};

const DraggableOperationTable: React.FC<DraggableOperationTableProps> = ({
  operations,
  onOperationsChange,
  onEditOperation,
  onDeleteOperation,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
        delay: 100,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!active || !over || active.id === over.id) {
      return;
    }

    const activeId = active.id?.toString();
    const overId = over.id?.toString();
    if (!activeId || !overId) {
      return;
    }

    const oldIndex = operations.findIndex((operation) => operation.id.toString() === activeId);
    const newIndex = operations.findIndex((operation) => operation.id.toString() === overId);

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
      return;
    }

    const newOperations = arrayMove(operations, oldIndex, newIndex).map((operation, index) => ({
      ...operation,
      sortOrder: index + 1,
      sequenceNo: index + 1,
    }));

    onOperationsChange(newOperations);
    message.success(`工序排序已更新：从第 ${oldIndex + 1} 位调整到第 ${newIndex + 1} 位`);
  };

  const columns: ColumnsType<TemplateOperationItem> = [
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 100,
      align: 'center',
      render: (sortOrder: number) => <span style={{ color: '#666', fontWeight: 500 }}>{sortOrder}</span>,
    },
    {
      title: '序号',
      dataIndex: 'sequenceNo',
      key: 'sequenceNo',
      width: 80,
      align: 'center',
    },
    {
      title: '工序名称',
      dataIndex: 'processName',
      key: 'processName',
      render: (_value, record) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span>{record.processName ?? '未知工序'}</span>
          {record.processCode ? (
            <span style={{ color: '#8c8c8c', fontSize: 12 }}>编号：{record.processCode}</span>
          ) : null}
        </div>
      ),
    },
    {
      title: '工价（元）',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 150,
      align: 'center',
      render: (value?: number) => (typeof value === 'number' ? `¥${value.toFixed(2)}` : '-'),
    },
    {
      title: '备注',
      dataIndex: 'remarks',
      key: 'remarks',
      render: (remarks?: string) => remarks || '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 140,
      render: (_value, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => onEditOperation(record)}>
            编辑
          </Button>
          <Popconfirm title="确定删除这个工序吗？" onConfirm={() => onDeleteOperation(record.id)} okText="确定" cancelText="取消">
            <Button type="link" size="small" icon={<DeleteOutlined />} danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (!operations.length) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="暂无工序"
        style={{ padding: '40px 0' }}
      />
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToVerticalAxis]}
    >
      <SortableContext items={operations.map((item) => item.id.toString())} strategy={verticalListSortingStrategy}>
        <div style={{ overflow: 'hidden', borderRadius: 6, border: '1px solid #f0f0f0' }}>
          <Table
            className="draggable-table"
            columns={columns}
            dataSource={operations}
            rowKey={(record) => record.id.toString()}
            size="small"
            pagination={false}
            components={{
              body: {
                row: DraggableRow,
              },
            }}
            rowClassName={(_, index) => `draggable-row draggable-row-${index}`}
            scroll={{ x: true }}
          />
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default DraggableOperationTable;
