import { useEffect, useState } from 'react';
import { Alert, Card, Col, Row, Select, Space, Switch, Typography, message } from 'antd';
import type { PreferenceGroup, PreferenceItem } from '../../types/settings';
import settingsApi from '../../api/settings';

const { Text, Paragraph } = Typography;

const PreferencesPage = () => {
  const [groups, setGroups] = useState<PreferenceGroup[]>([]);
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    settingsApi.preferences.list().then(setGroups);
  }, []);

  const setPreferenceValue = (key: string, value: boolean | string) => {
    setGroups((prev) =>
      prev.map((group) => ({
        ...group,
        items: group.items.map((item) => (item.key === key ? { ...item, value } : item)),
      })),
    );
  };

  const toggleLoadingKey = (key: string, next: boolean) => {
    setLoadingKeys((prev) => {
      const copy = new Set(prev);
      if (next) {
        copy.add(key);
      } else {
        copy.delete(key);
      }
      return copy;
    });
  };

  const handleChange = async (item: PreferenceItem, value: boolean | string) => {
    toggleLoadingKey(item.key, true);
    try {
      await settingsApi.preferences.update({ key: item.key, value });
      setPreferenceValue(item.key, value);
      message.success('设置已更新');
    } catch (error) {
      console.error(error);
      message.error('更新失败，请稍后重试');
    } finally {
      toggleLoadingKey(item.key, false);
    }
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={16}>
      <Alert
        type="info"
        message="偏好设置在更改后自动保存，应用范围覆盖当前企业全部用户。"
        showIcon
      />
      <Row gutter={[16, 16]}>
        {groups.map((group) => (
          <Col key={group.key} xs={24} md={12}>
            <Card title={group.title} bordered>
              <Space direction="vertical" style={{ width: '100%' }} size={16}>
                {group.items.map((item) => (
                  <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 24 }}>
                    <div>
                      <Text strong>{item.label}</Text>
                      {item.description && (
                        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                          {item.description}
                        </Paragraph>
                      )}
                    </div>
                    {item.type === 'switch' ? (
                      <Switch
                        checked={Boolean(item.value)}
                        loading={loadingKeys.has(item.key)}
                        onChange={(checked) => handleChange(item, checked)}
                      />
                    ) : (
                      <Select
                        value={item.value as string}
                        options={item.options}
                        style={{ minWidth: 200 }}
                        loading={loadingKeys.has(item.key)}
                        onChange={(next) => handleChange(item, next)}
                      />
                    )}
                  </div>
                ))}
              </Space>
            </Card>
          </Col>
        ))}
      </Row>
    </Space>
  );
};

export default PreferencesPage;
