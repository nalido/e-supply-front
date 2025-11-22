import { useCallback, useEffect, useState } from 'react';
import type { UploadProps } from 'antd';
import { Avatar, Button, Card, Descriptions, Skeleton, Space, Typography, Upload, message } from 'antd';
import { UploadOutlined, UserOutlined } from '@ant-design/icons';
import { useUser } from '@clerk/clerk-react';
import { isAxiosError } from 'axios';
import settingsApi from '../../api/settings';
import type { UserProfile } from '../../types/settings';

const { Text } = Typography;

const MAX_AVATAR_DIMENSION = 800;

const readImageDimensions = (file: File): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('无法读取头像图片'));
    };
    img.src = url;
  });

const validateAvatarFile = async (file: File) => {
  const { width, height } = await readImageDimensions(file);
  if (width !== height) {
    throw new Error('头像必须为正方形');
  }
  if (width > MAX_AVATAR_DIMENSION || height > MAX_AVATAR_DIMENSION) {
    throw new Error('头像尺寸不能超过800x800像素');
  }
};

type ProfileIdentity = {
  userId?: string;
  username?: string;
  email?: string;
};

const extractMetadataValue = (metadata: unknown, key: string): string | undefined => {
  if (!metadata || typeof metadata !== 'object') {
    return undefined;
  }
  const value = (metadata as Record<string, unknown>)[key];
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  return undefined;
};

const resolveLocalUserId = (clerkUser: ReturnType<typeof useUser>['user']): string | undefined => {
  return (
    extractMetadataValue(clerkUser?.unsafeMetadata, 'localUserId') ??
    extractMetadataValue(clerkUser?.unsafeMetadata, 'userId') ??
    extractMetadataValue(clerkUser?.privateMetadata as unknown, 'localUserId') ??
    extractMetadataValue(clerkUser?.publicMetadata as unknown, 'localUserId')
  );
};

const ProfileSettings = () => {
  const { user, isLoaded: isUserLoaded } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarLoading, setAvatarLoading] = useState(false);

  const loadProfile = useCallback(
    async (identity?: ProfileIdentity) => {
      try {
        setLoading(true);
        const data = await settingsApi.profile.get(identity);
        let enrichedProfile = data;
        if (data.roleIds?.length) {
          try {
            const roleList = await settingsApi.roles.list();
            const roleMap: Record<string, string> = {};
            roleList.forEach((role) => {
              roleMap[role.id] = role.name;
            });
            const names = data.roleIds
              .map((roleId) => roleMap[roleId] ?? '')
              .filter((value): value is string => Boolean(value));
            if (names.length) {
              enrichedProfile = { ...data, roleNames: names };
            }
          } catch (roleError) {
            console.error('加载岗位信息失败', roleError);
          }
        }
        setProfile(enrichedProfile);
      } catch (error) {
        console.error(error);
        const msg = error instanceof Error ? error.message : '获取个人资料失败';
        message.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!isUserLoaded) {
      return;
    }
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const localUserId = resolveLocalUserId(user);
    const username = user.username ?? undefined;
    const email = user.primaryEmailAddress?.emailAddress ?? undefined;
    const identity: ProfileIdentity | undefined = localUserId
      ? { userId: localUserId }
      : username || email
      ? { username, email }
      : undefined;
    void loadProfile(identity);
  }, [isUserLoaded, loadProfile, user]);

  const handleAvatarUpload: UploadProps['beforeUpload'] = async (file) => {
    if (!profile) {
      message.error('尚未加载个人资料，无法上传头像');
      return Upload.LIST_IGNORE;
    }
    try {
      await validateAvatarFile(file as File);
      setAvatarLoading(true);
      const updated = await settingsApi.profile.updateAvatar({ userId: profile.id, file: file as File });
      setProfile(updated);
      message.success('头像已更新');
    } catch (error) {
      console.error(error);
      if (error instanceof Error && (error.message.includes('正方形') || error.message.includes('800'))) {
        message.error(error.message);
      } else if (isAxiosError(error) && error.response?.status === 503) {
        message.error('OSS 文件存储尚未配置，请联系管理员启用文件存储');
      } else if (!isAxiosError(error)) {
        message.error('更新头像失败');
      }
    } finally {
      setAvatarLoading(false);
    }
    return Upload.LIST_IGNORE;
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
            <Text>{profile.phone}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="邮箱">
            <Text>{profile.email}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="岗位">
            <Text>{profile.roleNames?.length ? profile.roleNames.join('、') : profile.position ?? '—'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="密码">
            <Text>
              {profile.maskedPassword}
              <span style={{ marginLeft: 8, color: '#999' }}>如需修改请点击右上角头像进行密码重置</span>
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="最近更新">
            <Text type="secondary">{profile.lastUpdatedAt ?? '—'}</Text>
          </Descriptions.Item>
        </Descriptions>
      </Space>

    </Card>
  );
};

export default ProfileSettings;
