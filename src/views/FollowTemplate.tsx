import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  message,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

import { sample } from '../api/mock';
import FollowTemplateModal, { type FollowTemplateData } from '../components/FollowTemplateModal';

interface FollowTemplate {
  id: number;
  sequenceNo: number;
  name: string;
  isDefault: boolean;
  nodes?: any[];
}

/**
 * 跟进模板页面
 */
const FollowTemplate: React.FC = () => {
  // 数据状态
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<FollowTemplate[]>([]);
  
  // 分页状态
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total: number, range: [number, number]) =>
      `共 ${total} 条`,
  });

  // 弹窗状态
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FollowTemplate | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // 加载数据
  const loadData = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.current,
        pageSize: pagination.pageSize,
      };
      
      const result = await sample.followTemplates(params);
      setDataSource(result.list);
      setPagination(prev => ({
        ...prev,
        total: result.total,
      }));
    } catch (error) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始化数据
  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 分页变化
  const handleTableChange = (newPagination: any) => {
    setPagination(prev => ({
      ...prev,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    }));
  };

  // 监听分页变化重新加载数据
  useEffect(() => {
    if (pagination.current > 1) {
      loadData();
    }
  }, [pagination.current, pagination.pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  // 新建模板
  const handleCreate = () => {
    setEditingRecord(null);
    setModalVisible(true);
  };

  // 编辑模板
  const handleEdit = (record: FollowTemplate) => {
    setEditingRecord(record);
    setModalVisible(true);
  };

  // 删除模板
  const handleDelete = async (record: FollowTemplate) => {
    try {
      await sample.deleteFollowTemplate(record.id);
      message.success('删除成功');
      loadData();
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 提交模板数据
  const handleTemplateSubmit = async (data: FollowTemplateData) => {
    try {
      setModalLoading(true);
      
      if (editingRecord) {
        await sample.updateFollowTemplate(editingRecord.id, data);
        message.success('更新成功');
      } else {
        await sample.createFollowTemplate(data);
        message.success('创建成功');
      }
      
      setModalVisible(false);
      loadData();
    } catch (error) {
      message.error('操作失败');
    } finally {
      setModalLoading(false);
    }
  };


  // 模板表格列定义
  const columns: ColumnsType<FollowTemplate> = [
    {
      title: '序号',
      dataIndex: 'sequenceNo',
      key: 'sequenceNo',
      width: 80,
      align: 'center',
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '默认模板',
      dataIndex: 'isDefault',
      key: 'isDefault',
      width: 120,
      align: 'center',
      render: (isDefault: boolean) => (
        <span>{isDefault ? '是' : ''}</span>
      ),
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
            title="确定要删除这个模板吗？"
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
        {/* 工具栏 */}
        <div style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            新建
          </Button>
        </div>

        {/* 数据表格 */}
        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          size="small"
        />
      </Card>

      {/* 新建/编辑弹窗 */}
      <FollowTemplateModal
        visible={modalVisible}
        loading={modalLoading}
        editingRecord={editingRecord}
        onSubmit={handleTemplateSubmit}
        onCancel={() => setModalVisible(false)}
      />
    </div>
  );
};

export default FollowTemplate;