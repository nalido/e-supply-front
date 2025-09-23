import React from 'react';
import {
  Table,
  Button,
  Space,
  Popconfirm,
  Empty,
  message,
} from 'antd';
import '../styles/draggable-table.css';
import {
  MenuOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface TemplateNode {
  id: number;
  sortOrder: number;
  sequenceNo: number;
  nodeName: string;
  fieldType: string;
  duration: number; // 时长(小时)
}

interface DraggableNodeTableProps {
  nodes: TemplateNode[];
  fieldTypeOptions: { label: string; value: string }[];
  onNodesChange: (nodes: TemplateNode[]) => void;
  onEditNode: (node: TemplateNode) => void;
  onDeleteNode: (nodeId: number) => void;
}

// 可拖拽的表格行组件
interface DraggableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  'data-row-key': string;
}

const DraggableRow: React.FC<DraggableRowProps> = (props) => {
  const { children, ...restProps } = props;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props['data-row-key'],
  });

  const style: React.CSSProperties = {
    ...restProps.style,
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging ? {
      position: 'relative',
      zIndex: 9999,
      backgroundColor: '#f0f0f0',
      opacity: 0.8,
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
    } : {}),
  };

  // 修复 React 19 兼容性问题：正确处理 children 和 ref
  const processedChildren = React.Children.map(children, (child, index) => {
    if (index === 0 && React.isValidElement(child)) {
      // 在第一列添加拖拽手柄
      const childElement = child as React.ReactElement<any>;
      return React.cloneElement(childElement, {
        ...childElement.props,
        children: (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              className={`drag-handle ${isDragging ? 'dragging' : ''}`}
              style={{ 
                cursor: isDragging ? 'grabbing' : 'grab', 
                color: isDragging ? '#1890ff' : '#999',
                fontSize: '14px',
                padding: '2px 4px',
                borderRadius: '2px',
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
        )
      });
    }
    return child;
  });

  return (
    <tr
      {...restProps}
      ref={setNodeRef}
      style={style}
    >
      {processedChildren}
    </tr>
  );
};

const DraggableNodeTable: React.FC<DraggableNodeTableProps> = ({
  nodes,
  fieldTypeOptions,
  onNodesChange,
  onEditNode,
  onDeleteNode,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 减少激活距离
        delay: 100, // 减少延迟以提升响应性
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    // 早期退出，避免不必要的处理
    if (!active || !over || active.id === over.id) {
      return;
    }

    try {
      const activeId = active.id?.toString();
      const overId = over.id?.toString();
      
      if (!activeId || !overId) {
        console.warn('无效的拖拽 ID');
        return;
      }

      const oldIndex = nodes.findIndex((item) => item.id.toString() === activeId);
      const newIndex = nodes.findIndex((item) => item.id.toString() === overId);
      
      if (oldIndex === -1 || newIndex === -1) {
        console.warn('找不到对应的节点索引');
        return;
      }

      if (oldIndex === newIndex) {
        return; // 同一位置，无需更新
      }

      const newNodes = arrayMove(nodes, oldIndex, newIndex);
      // 更新排序字段
      const updatedNodes = newNodes.map((node, index) => ({
        ...node,
        sortOrder: index + 1,
        sequenceNo: index + 1,
      }));
      
      onNodesChange(updatedNodes);
      
      // 提供拖拽成功的反馈
      message.success(`节点排序已更新：从第 ${oldIndex + 1} 位移动到第 ${newIndex + 1} 位`);
    } catch (error) {
      console.error('拖拽排序失败:', error);
      message.error('拖拽排序失败，请重试');
    }
  };

  // 表格列定义
  const columns: ColumnsType<TemplateNode> = [
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 100,
      align: 'center',
      render: (sortOrder: number) => (
        <span style={{ color: '#666', fontWeight: 500 }}>{sortOrder}</span>
      ),
    },
    {
      title: '序号',
      dataIndex: 'sequenceNo',
      key: 'sequenceNo',
      width: 80,
      align: 'center',
    },
    {
      title: '节点名称',
      dataIndex: 'nodeName',
      key: 'nodeName',
      width: 150,
    },
    {
      title: '字段类型',
      dataIndex: 'fieldType',
      key: 'fieldType',
      width: 120,
      render: (fieldType: string) => {
        const option = fieldTypeOptions.find(opt => opt.value === fieldType);
        return option?.label || fieldType;
      },
    },
    {
      title: '时长(小时)',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      align: 'center',
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEditNode(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个节点吗？"
            onConfirm={() => onDeleteNode(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              icon={<DeleteOutlined />}
              danger
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (nodes.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="暂无内容"
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
      <SortableContext 
        items={nodes.map(item => item.id.toString())} 
        strategy={verticalListSortingStrategy}
      >
        <div style={{ overflow: 'hidden', borderRadius: '6px', border: '1px solid #f0f0f0' }}>
          <Table
            className="draggable-table"
            columns={columns}
            dataSource={nodes}
            rowKey={(record) => record.id.toString()}
            size="small"
            pagination={false}
            components={{
              body: {
                row: DraggableRow,
              },
            }}
            rowClassName={(_, index) => {
              return `draggable-row draggable-row-${index}`;
            }}
            scroll={{ x: true }}
          />
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default DraggableNodeTable;