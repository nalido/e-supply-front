import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  message,
  Popconfirm,
  Modal,
  Form,
  Input,
} from 'antd';
import {
  PlusOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

import { sample } from '../api/mock';
import type { SampleTypeItem } from '../types/sample';

/**
 * 样板类型页面 - 复刻原网站设计
 */
const SampleType: React.FC = () => {
  // 数据状态
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<SampleTypeItem[]>([]);
  
  // 分页状态 (简化版，不显示分页器，与原网站一致)
  const [pagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0,
  });

  // 弹窗状态
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SampleTypeItem | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [form] = Form.useForm();

  // 加载数据
  const loadData = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.current,
        pageSize: pagination.pageSize,
      };
      
      const result = await sample.sampleTypes(params);
      setDataSource(result.list);
    } catch {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始化数据
  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 新建类型
  const handleCreate = () => {
    setEditingRecord(null);
    form.resetFields();
    setModalVisible(true);
  };

  // 编辑类型
  const handleEdit = (record: SampleTypeItem) => {
    setEditingRecord(record);
    form.setFieldsValue({ name: record.name });
    setModalVisible(true);
  };

  // 删除类型
  const handleDelete = async (record: SampleTypeItem) => {
    try {
      await sample.deleteSampleType(record.id);
      message.success('删除成功');
      loadData();
    } catch {
      message.error('删除失败');
    }
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setModalLoading(true);
      
      if (editingRecord) {
        await sample.updateSampleType(editingRecord.id, values);
        message.success('更新成功');
      } else {
        await sample.createSampleType(values);
        message.success('创建成功');
      }
      
      setModalVisible(false);
      loadData();
    } catch {
      message.error('操作失败');
    } finally {
      setModalLoading(false);
    }
  };

  // 表格列定义 - 严格按照原网站设计
  const columns: ColumnsType<SampleTypeItem> = [
    {
      title: '序号',
      key: 'index',
      width: 80,
      align: 'center',
      render: (_, __, index) => index + 1,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除吗？"
            onConfirm={() => handleDelete(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '0 24px 24px' }}>
      <Card>
        {/* 工具栏 - 只有新建按钮，与原网站一致 */}
        <div style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            新建
          </Button>
        </div>

        {/* 数据表格 - 简洁设计，与原网站一致 */}
        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="id"
          loading={loading}
          pagination={false} // 原网站没有分页器
          size="middle"
        />
      </Card>

      {/* 新建/编辑弹窗 */}
      <Modal
        title={editingRecord ? '编辑样板类型' : '新建样板类型'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={modalLoading}
        okText="确定"
        cancelText="取消"
        width={400}
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="name"
            label="名称"
            rules={[
              { required: true, message: '请输入名称' },
              { max: 50, message: '名称不能超过50个字符' },
            ]}
          >
            <Input placeholder="请输入样板类型名称" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SampleType;
