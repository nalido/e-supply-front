import { Button, Modal, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';

const { Paragraph, Text } = Typography;
const VERSION_CHECK_INTERVAL_MS = 60_000;

type VersionManifest = {
  buildId?: string;
};

const AppVersionGuard = () => {
  const [outdated, setOutdated] = useState(false);

  const checkVersion = useCallback(async () => {
    try {
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!response.ok) {
        return;
      }
      const manifest = await response.json() as VersionManifest;
      if (manifest.buildId && manifest.buildId !== __APP_BUILD_ID__) {
        setOutdated(true);
      }
    } catch {
      // 版本探测失败不影响当前业务；恢复网络或窗口重新聚焦时会再次检查。
    }
  }, []);

  useEffect(() => {
    void checkVersion();
    const timer = window.setInterval(() => void checkVersion(), VERSION_CHECK_INTERVAL_MS);
    const handleFocus = () => void checkVersion();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void checkVersion();
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkVersion]);

  return (
    <Modal
      open={outdated}
      title="系统已更新"
      closable={false}
      keyboard={false}
      maskClosable={false}
      footer={(
        <Button type="primary" onClick={() => window.location.reload()}>
          刷新页面
        </Button>
      )}
    >
      <Paragraph>当前页面版本已过期。为避免提交不完整的数据，请刷新后继续操作。</Paragraph>
      <Text type="secondary">已填写但尚未保存的内容，请在刷新前自行确认。</Text>
    </Modal>
  );
};

export default AppVersionGuard;
