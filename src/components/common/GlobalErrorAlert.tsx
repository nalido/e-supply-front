import { Alert } from 'antd';
import { useEffect, useState } from 'react';
import type { GlobalErrorPayload } from './global-error-bus';
import { clearGlobalError, subscribeGlobalError } from './global-error-bus';
import '../../styles/global-error-alert.css';

const GlobalErrorAlert = () => {
  const [error, setError] = useState<GlobalErrorPayload | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeGlobalError(setError);
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!error) {
      return undefined;
    }
    const timeout = window.setTimeout(() => {
      clearGlobalError();
    }, 10_000);
    return () => window.clearTimeout(timeout);
  }, [error?.id]);

  if (!error) {
    return null;
  }

  return (
    <div className="global-error-alert">
      <Alert
        type={error.type ?? 'error'}
        showIcon
        message={error.title}
        description={error.description}
        closable
        onClose={() => clearGlobalError()}
      />
    </div>
  );
};

export default GlobalErrorAlert;
