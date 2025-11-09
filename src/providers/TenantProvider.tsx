import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Button, Result, Spin } from 'antd';
import { useAuth } from '@clerk/clerk-react';
import settingsApi from '../api/settings';
import type { CompanyOverview } from '../types/settings';
import { tenantStore } from '../stores/tenant';
import { setAuthTokenResolver } from '../api/http';
import { TenantContext, type TenantContextValue } from '../contexts/tenant';
import { isAxiosError } from 'axios';

const TenantProvider = ({ children }: { children: ReactNode }) => {
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth();
  const [overview, setOverview] = useState<CompanyOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  useEffect(() => {
    const resolver = async () => {
      if (!isLoaded || !isSignedIn) {
        return null;
      }
      return getToken();
    };
    setAuthTokenResolver(resolver);
    return () => {
      setAuthTokenResolver(async () => null);
    };
  }, [getToken, isLoaded, isSignedIn]);

  const loadOverview = useCallback(async () => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      tenantStore.setTenantId(null);
      setOverview(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setIsForbidden(false);
    try {
      const data = await settingsApi.company.getOverview();
      setOverview(data);
      tenantStore.setTenantId(data.id);
    } catch (err) {
      console.error('Failed to load company overview', err);
      if (isAxiosError(err) && err.response?.status === 403) {
        setIsForbidden(true);
        setError('当前账号无权访问企业信息，请尝试重新登录');
      } else {
        setError(err instanceof Error ? err.message : '获取企业信息失败');
      }
    } finally {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const contextValue = useMemo(() => {
    if (!overview) {
      return null;
    }
    return {
      tenantId: overview.id,
      overview,
      refresh: loadOverview,
    } satisfies TenantContextValue;
  }, [loadOverview, overview]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Spin size="large" tip="正在获取企业信息..." />
      </div>
    );
  }

  if (error || !contextValue) {
    const actions = [
      <Button type="primary" onClick={() => loadOverview()} key="retry">
        重试
      </Button>,
    ];

    if (isForbidden) {
      actions.push(
        <Button
          danger
          onClick={() => {
            if (signOut) {
              void signOut();
            }
          }}
          key="signout"
        >
          退出账号
        </Button>,
      );
    }

    return (
      <Result
        status="error"
        title="加载企业信息失败"
        subTitle={error || '请稍后再试'}
        extra={actions}
      />
    );
  }

  return <TenantContext.Provider value={contextValue}>{children}</TenantContext.Provider>;
};

export default TenantProvider;
