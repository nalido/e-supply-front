import { useEffect, useState } from 'react';
import type { UploadProps } from 'antd';
import {
  Avatar,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  Modal,
  Skeleton,
  Space,
  Typography,
  Upload,
  message,
} from 'antd';
import { PhoneOutlined, ReloadOutlined, UploadOutlined, UserOutlined } from '@ant-design/icons';
import settingsApi from '../../api/settings';
import type { PhoneUpdatePayload, UserProfile } from '../../types/settings';

const { Text } = Typography;

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });

const ProfileSettings = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [phoneSubmitting, setPhoneSubmitting] = useState(false);
  const [phoneForm] = Form.useForm<PhoneUpdatePayload>();

  useEffect(() => {
    settingsApi.profile
      .get()
      .then((data) => setProfile(data))
      .finally(() => setLoading(false));
  }, []);

  const handleAvatarUpload: UploadProps['beforeUpload'] = async (file) => {
    try {
      setAvatarLoading(true);
      const dataUrl = await toBase64(file);
      const updated = await settingsApi.profile.updateAvatar({
        dataUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      });
      setProfile(updated);
      message.success('头像已更新');
    } catch (error) {
      console.error(error);
      message.error('更新头像失败');
    } finally {
      setAvatarLoading(false);
    }
    return false;
  };

  const openPhoneModal = () => {
    phoneForm.setFieldsValue({ phone: profile?.phone ?? '', captcha: '' });
    setPhoneModalOpen(true);
  };

  const submitPhoneChange = async () => {
    try {
      const values = await phoneForm.validateFields();
      setPhoneSubmitting(true);
      const updated = await settingsApi.profile.updatePhone(values);
      setProfile(updated);
      setPhoneModalOpen(false);
      message.success('手机号修改成功');
    } catch (error) {
      if (error) {
        console.error(error);
      }
    } finally {
      setPhoneSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      await settingsApi.profile.resetPassword();
      message.success('已发送密码重置指引');
    } catch (error) {
      console.error(error);
      message.error('重置密码失败');
    }
  };

  if (loading) {
    return <Skeleton active paragraph={{ rows: 6 }} />;
  }

  if (!profile) {
    return (
      <Card>
        <Text type="secondary">暂未获取到个人信息</Text>
      </Card>
    );
  }

  return (
    <Card title="个人资料" bordered={false} style={{ maxWidth: 720 }}>
      <Space align="start" size={32} wrap>
        <div style={{ textAlign: 'center' }}>
          <Avatar size={96} src={profile.avatar} icon={<UserOutlined />} />
          <Upload showUploadList={false} beforeUpload={handleAvatarUpload} accept="image/*">
            <Button type="link" icon={<UploadOutlined />} loading={avatarLoading} style={{ padding: 0 }}>
              修改头像
            </Button>
          </Upload>
        </div>
        <Descriptions column={1} colon>
          <Descriptions.Item label="姓名">
            <Text>{profile.name}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="手机号">
            <Space>
              <Text>{profile.phone}</Text>
              <Button type="link" onClick={openPhoneModal} icon={<PhoneOutlined />}>修改</Button>
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="邮箱">
            <Text>{profile.email}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="岗位">
            <Text>{profile.position ?? '—'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="密码">
            <Space>
              <Text>{profile.maskedPassword}</Text>
              <Button type="link" onClick={handleResetPassword} icon={<ReloadOutlined />}>重置</Button>
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="最近更新">
            <Text type="secondary">{profile.lastUpdatedAt ?? '—'}</Text>
          </Descriptions.Item>
        </Descriptions>
      </Space>

      <Modal
        title="修改手机号"
        open={phoneModalOpen}
        onCancel={() => setPhoneModalOpen(false)}
        onOk={submitPhoneChange}
        confirmLoading={phoneSubmitting}
        destroyOnClose
      >
        <Form form={phoneForm} layout="vertical" preserve={false}>
          <Form.Item
            label="手机号"
            name="phone"
            rules={[
              { required: true, message: '请输入新的手机号' },
              { pattern: /^1\d{10}$/, message: '请输入有效的11位手机号' },
            ]}
          >
            <Input maxLength={11} placeholder="请输入新的手机号" />
          </Form.Item>
          <Form.Item
            label="验证码"
            name="captcha"
            rules={[
              { required: true, message: '请输入验证码' },
              { len: 6, message: '验证码为6位数字' },
            ]}
          >
            <Input placeholder="请输入短信验证码" maxLength={6} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default ProfileSettings;
