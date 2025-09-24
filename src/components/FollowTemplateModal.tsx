import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Switch,
  Button,
  message,
  Select,
  InputNumber,
} from 'antd';
import {
  PlusOutlined,
} from '@ant-design/icons';
import DraggableNodeTable from './DraggableNodeTable';
import type { TemplateNode, TemplateFieldType } from '../types/sample';

export interface FollowTemplateData {
  id?: number;
  name: string;
  isDefault: boolean;
  nodes?: TemplateNode[];
}

interface FollowTemplateModalProps {
  visible: boolean;
  loading: boolean;
  editingRecord?: FollowTemplateData | null;
  onSubmit: (data: FollowTemplateData) => Promise<void>;
  onCancel: () => void;
}

const FollowTemplateModal: React.FC<FollowTemplateModalProps> = ({
  visible,
  loading,
  editingRecord,
  onSubmit,
  onCancel,
}) => {
  const [form] = Form.useForm();
  const [nodeForm] = Form.useForm();
  
  // 节点管理状态
  const [nodes, setNodes] = useState<TemplateNode[]>([]);
  const [nodeModalVisible, setNodeModalVisible] = useState(false);
  const [editingNode, setEditingNode] = useState<TemplateNode | null>(null);

  type TemplateNodeFormValues = Pick<TemplateNode, 'sortOrder' | 'nodeName' | 'fieldType' | 'duration'>;

  // 字段类型选项
  const fieldTypeOptions: { label: string; value: TemplateFieldType }[] = [
    { label: '文本', value: 'text' },
    { label: '数字', value: 'number' },
    { label: '日期', value: 'date' },
    { label: '选择', value: 'select' },
    { label: '多选', value: 'checkbox' },
    { label: '文件', value: 'file' },
  ];

  // 初始化表单数据
  useEffect(() => {
    if (visible) {
      if (editingRecord) {
        form.setFieldsValue({
          name: editingRecord.name,
          isDefault: editingRecord.isDefault,
        });
        setNodes(editingRecord.nodes || []);
      } else {
        form.resetFields();
        setNodes([]);
      }
    }
  }, [visible, editingRecord, form]);

  // 节点管理方法
  const handleAddNode = () => {
    setEditingNode(null);
    nodeForm.resetFields();
    setNodeModalVisible(true);
  };

  const handleEditNode = (node: TemplateNode) => {
    setEditingNode(node);
    nodeForm.setFieldsValue(node);
    setNodeModalVisible(true);
  };

  const handleDeleteNode = (nodeId: number) => {
    const newNodes = nodes.filter(node => node.id !== nodeId);
    // 更新序号和排序
    const updatedNodes = newNodes.map((node, index) => ({
      ...node,
      sortOrder: index + 1,
      sequenceNo: index + 1,
    }));
    setNodes(updatedNodes);
    message.success('删除节点成功');
  };

  const handleNodesChange = (newNodes: TemplateNode[]) => {
    setNodes(newNodes);
  };

  const handleNodeSubmit = async () => {
    try {
      const values = await nodeForm.validateFields<TemplateNodeFormValues>();
      
      if (editingNode) {
        // 编辑节点
        setNodes(prev => prev.map(node => 
          node.id === editingNode.id 
            ? { ...node, ...values }
            : node
        ));
      } else {
        // 新增节点
        const newNode: TemplateNode = {
          ...values,
          id: Date.now(), // 使用时间戳作为临时ID
          sortOrder: nodes.length + 1,
          sequenceNo: nodes.length + 1,
        };
        setNodes(prev => [...prev, newNode]);
      }
      
      setNodeModalVisible(false);
      message.success(editingNode ? '更新节点成功' : '添加节点成功');
    } catch {
      // 表单验证失败，不需要显示错误信息
    }
  };

  // 提交主表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const templateData: FollowTemplateData = {
        ...values,
        nodes,
      };
      
      if (editingRecord?.id) {
        templateData.id = editingRecord.id;
      }
      
      await onSubmit(templateData);
    } catch {
      // 表单验证失败，不需要显示错误信息
    }
  };


  return (
    <>
      {/* 主模态框 */}
      <Modal
        title={editingRecord ? '编辑跟进模板' : '新增跟进模板'}
        open={visible}
        onOk={handleSubmit}
        onCancel={onCancel}
        confirmLoading={loading}
        width={800}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ isDefault: false }}
        >
          <Form.Item
            name="name"
            label="名称"
            rules={[
              { required: true, message: '请输入名称' },
              { max: 50, message: '名称不能超过50个字符' },
            ]}
          >
            <Input placeholder="请输入名称" />
          </Form.Item>
          
          <Form.Item
            name="isDefault"
            label="默认"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>

        {/* 节点管理区域 */}
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 500 }}>跟进节点</span>
            <Button
              type="link"
              icon={<PlusOutlined />}
              onClick={handleAddNode}
            >
              添加节点
            </Button>
          </div>
          
          <DraggableNodeTable
            nodes={nodes}
            fieldTypeOptions={fieldTypeOptions}
            onNodesChange={handleNodesChange}
            onEditNode={handleEditNode}
            onDeleteNode={handleDeleteNode}
          />
        </div>
      </Modal>

      {/* 节点编辑模态框 */}
      <Modal
        title={editingNode ? '编辑节点' : '添加节点'}
        open={nodeModalVisible}
        onOk={handleNodeSubmit}
        onCancel={() => setNodeModalVisible(false)}
        destroyOnHidden
      >
        <Form
          form={nodeForm}
          layout="vertical"
        >
          <Form.Item
            name="sortOrder"
            label="排序"
            rules={[
              { required: true, message: '请输入排序' },
            ]}
          >
            <InputNumber min={1} placeholder="请输入排序" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="nodeName"
            label="节点名称"
            rules={[
              { required: true, message: '请输入节点名称' },
              { max: 50, message: '节点名称不能超过50个字符' },
            ]}
          >
            <Input placeholder="请输入节点名称" />
          </Form.Item>

          <Form.Item
            name="fieldType"
            label="字段类型"
            rules={[
              { required: true, message: '请选择字段类型' },
            ]}
          >
            <Select placeholder="请选择字段类型">
              {fieldTypeOptions.map(option => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="duration"
            label="时长(小时)"
            rules={[
              { required: true, message: '请输入时长' },
            ]}
          >
            <InputNumber min={0} step={0.5} placeholder="请输入时长" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default FollowTemplateModal;
