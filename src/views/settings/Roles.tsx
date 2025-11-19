import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { TreeProps } from 'antd/es/tree';
import {
  Button,
  Card,
  Drawer,
  Form,
  Input,
  Modal,
  Space,
  Table,
  Tree,
  message,
  Spin,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, SafetyCertificateOutlined, SearchOutlined } from '@ant-design/icons';
import type { PermissionTreeNode, RoleItem } from '../../types/settings';
import settingsApi from '../../api/settings';

const RolesSettings = () => {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [permissionDrawerOpen, setPermissionDrawerOpen] = useState(false);
  const [permissionRole, setPermissionRole] = useState<RoleItem | null>(null);
  const [permissionTree, setPermissionTree] = useState<PermissionTreeNode[]>([]);
  const [selectedPermissionKeys, setSelectedPermissionKeys] = useState<string[]>([]); // Selected permission leaf nodes
  const [permissionTreeLoading, setPermissionTreeLoading] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const permissionsLoadedRef = useRef(false);
  const permissionLeafKeysRef = useRef<Set<string>>(new Set());
  const [form] = Form.useForm<{ name: string; description?: string }>();

  const fetchRoles = useCallback(() => {
    setLoading(true);
    settingsApi.roles
      .list()
      .then(data => {
        setRoles(data);
      })
      .finally(() => setLoading(false));
  }, []);

  const pickLeafKeys = useCallback((keys: string[] = []) => {
    if (!permissionLeafKeysRef.current.size) {
      return keys;
    }
    return keys.filter((key) => permissionLeafKeysRef.current.has(key));
  }, []);

  const collectLeafKeys = useCallback((nodes: PermissionTreeNode[]): string[] => {
    const result: string[] = [];
    const traverse = (items: PermissionTreeNode[]) => {
      items.forEach((node) => {
        if (node.children && node.children.length > 0) {
          traverse(node.children);
        } else {
          result.push(node.key);
        }
      });
    };
    traverse(nodes);
    return result;
  }, []);

  const loadPermissions = useCallback(() => {
    if (permissionsLoadedRef.current) {
      return;
    }
    permissionsLoadedRef.current = true;
    setPermissionTreeLoading(true);
    settingsApi.roles
      .permissions()
      .then((tree) => {
        setPermissionTree(tree);
        permissionLeafKeysRef.current = new Set(collectLeafKeys(tree));
        setSelectedPermissionKeys((prev) => pickLeafKeys(prev));
      })
      .catch((error) => {
        console.error('Failed to load permissions', error);
        permissionsLoadedRef.current = false;
        message.error('权限列表拉取失败，请稍后重试');
      })
      .finally(() => setPermissionTreeLoading(false));
  }, [collectLeafKeys, pickLeafKeys]);

  useEffect(() => {
    fetchRoles();
    loadPermissions();
  }, [fetchRoles, loadPermissions]);

  const filteredRoles = useMemo(() => {
    if (!keyword) {
      return roles;
    }
    const lower = keyword.toLowerCase();
    return roles.filter((role) => role.name.toLowerCase().includes(lower));
  }, [keyword, roles]);

  const openCreateModal = () => {
    setEditingRole(null);
    form.resetFields();
    setSelectedPermissionKeys([]); // Clear selected permissions for new role
    setModalOpen(true);
  };

  const openEditModal = (role: RoleItem) => {
    setEditingRole(role);
    form.setFieldsValue({ name: role.name, description: role.description });
    setSelectedPermissionKeys(pickLeafKeys(role.permissionIds || []));
    setModalOpen(true);
  };

  const openPermissionDrawer = (role: RoleItem) => {
    setPermissionRole(role);
    setSelectedPermissionKeys(pickLeafKeys(role.permissionIds || []));
    setPermissionDrawerOpen(true);
    loadPermissions();
  };

  const closePermissionDrawer = () => {
    setPermissionDrawerOpen(false);
    setPermissionRole(null);
    setSelectedPermissionKeys([]);
  };

  const submit = async () => {
    try {
      const values = await form.validateFields();
      const permissionIds = pickLeafKeys(selectedPermissionKeys);
      const rolePayload = {
        ...values,
        permissionIds,
      };
      if (editingRole) {
        await settingsApi.roles.update(editingRole.id, rolePayload);
        message.success('岗位已更新');
      } else {
        await settingsApi.roles.create(rolePayload);
        message.success('岗位已创建');
      }
      setModalOpen(false);
      fetchRoles();
    } catch (error) {
      if (error) {
        console.error(error);
      }
    }
  };

  const handlePermissionCheck: TreeProps['onCheck'] = (checkedKeysValue) => {
    const keys = Array.isArray(checkedKeysValue)
      ? (checkedKeysValue as string[])
      : ((checkedKeysValue.checked ?? []) as string[]);
    setSelectedPermissionKeys(pickLeafKeys(keys));
  };

  const handleSavePermissions = async () => {
    if (!permissionRole) {
      return;
    }
    const leafKeys = pickLeafKeys(selectedPermissionKeys);
    setSavingPermissions(true);
    try {
      const updatedRole = await settingsApi.roles.update(permissionRole.id, {
        name: permissionRole.name,
        description: permissionRole.description,
        permissionIds: leafKeys,
      });
      const nextRoles = roles.map((role) =>
        role.id === permissionRole.id
          ? {
              ...role,
              permissionIds: updatedRole?.permissionIds ?? leafKeys,
            }
          : role,
      );
      setRoles(nextRoles);
      message.success('权限设置已保存');
      closePermissionDrawer();
    } catch (error) {
      console.error('Failed to save permissions', error);
      message.error('保存权限失败，请稍后重试');
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleRemove = (role: RoleItem) => {
    Modal.confirm({
      title: '删除岗位',
      content: `确定要删除岗位「${role.name}」吗？`,
      okText: '删除',
      okButtonProps: { danger: true },
      onOk: async () => {
        const success = await settingsApi.roles.remove(role.id);
        if (success) {
          message.success('岗位已删除');
          fetchRoles();
        } else {
          message.error('删除失败');
        }
      },
    });
  };

  const columns: ColumnsType<RoleItem> = [
    { title: '名称', dataIndex: 'name' },

    { title: '更新时间', dataIndex: 'updatedAt' },
    {
      title: '描述',
      dataIndex: 'description',
      width: '30%',
      render: (value?: string) => value ?? '—',
    },
    {
      title: '操作',
      key: 'action',
      align: 'right',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
            编辑
          </Button>
          <Button
            type="link"
            icon={<SafetyCertificateOutlined />}
            onClick={() => openPermissionDrawer(record)}
          >
            权限
          </Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleRemove(record)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card title="岗位管理">
      <Space direction="vertical" style={{ width: '100%' }} size={16}>
        <Space wrap>
          <Input
            placeholder="搜索岗位"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            allowClear
            style={{ width: 240 }}
            prefix={<SearchOutlined />}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            新建
          </Button>
        </Space>
        <Table<RoleItem>
          rowKey={(record) => record.id}
          loading={loading}
          dataSource={filteredRoles}
          columns={columns}
          pagination={{ pageSize: 8 }}
        />
      </Space>

      <Modal
        title={editingRole ? '编辑岗位' : '新建岗位'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={submit}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="岗位名称"
            name="name"
            rules={[{ required: true, message: '请输入岗位名称' }]}
          >
            <Input placeholder="请输入岗位名称" />
          </Form.Item>
          <Form.Item label="岗位描述" name="description">
            <Input.TextArea placeholder="简要说明岗位职责" rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={permissionRole ? `${permissionRole.name} 的权限` : '岗位权限'}
        placement="right"
        width={360}
        onClose={closePermissionDrawer}
        open={permissionDrawerOpen}
        footer={
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={closePermissionDrawer}>取消</Button>
            <Button type="primary" loading={savingPermissions} disabled={!permissionRole} onClick={handleSavePermissions}>
              保存
            </Button>
          </Space>
        }
      >
        <Spin spinning={permissionTreeLoading}>
          <Tree
            treeData={permissionTree}
            checkable
            defaultExpandAll
            checkedKeys={selectedPermissionKeys}
            onCheck={handlePermissionCheck}
            disabled={!permissionTree.length}
          />
        </Spin>
      </Drawer>
    </Card>
  );
};

export default RolesSettings;
