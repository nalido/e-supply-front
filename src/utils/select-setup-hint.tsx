import type { ReactNode } from 'react';
import { Button, Typography } from 'antd';

const { Text } = Typography;

export type SelectSetupConfig = {
  entityLabel: string;
  pageLabel: string;
  buttonText: string;
  path: string;
};

export const openSetupPage = (path: string) => {
  window.open(path, '_blank', 'noopener,noreferrer');
};

export const renderSelectDropdownWithSetup = (menu: ReactNode, config: SelectSetupConfig) => (
  <>
    {menu}
    <div style={{ borderTop: '1px solid #f0f0f0', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <Text type="secondary" style={{ fontSize: 12 }}>
        若没有合适的{config.entityLabel}，可前往{config.pageLabel}新建。
      </Text>
      <Button type="link" size="small" onMouseDown={(event) => event.preventDefault()} onClick={() => openSetupPage(config.path)}>
        {config.buttonText}
      </Button>
    </div>
  </>
);

