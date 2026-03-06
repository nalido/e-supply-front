import { Button, Space, Typography } from 'antd';
import { openSetupPage, type SelectSetupConfig } from '../../utils/select-setup-hint';

type SetupHintProps = {
  config: SelectSetupConfig;
  compact?: boolean;
  marginTop?: number;
  marginBottom?: number;
};

const { Text } = Typography;

export const SelectSetupHint = ({ config, compact = false, marginTop, marginBottom }: SetupHintProps) => (
  <div style={{ marginTop, marginBottom }}>
    <Space size={compact ? 6 : 8}>
      <Text type="secondary" style={{ fontSize: 12 }}>
        若没有合适的{config.entityLabel}，可前往{config.pageLabel}新建。
      </Text>
      <Button type="link" size="small" style={{ paddingInline: compact ? 0 : 6 }} onClick={() => openSetupPage(config.path)}>
        {config.buttonText}
      </Button>
    </Space>
  </div>
);
