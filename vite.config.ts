import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const localApiTarget = env.VITE_DEV_PROXY_TARGET || 'http://localhost:8080'
  const useE2eAuthBypass = mode === 'development' && env.VITE_E2E_AUTH_BYPASS === '1'
  const e2eAuthBypassPlugin = useE2eAuthBypass ? {
    name: 'e2e-auth-bypass',
    enforce: 'pre' as const,
    resolveId(source: string) {
      return source === '@clerk/clerk-react' ? '\0e2e-clerk-react' : null
    },
    load(id: string) {
      if (id !== '\0e2e-clerk-react') return null
      return `
        import React from 'react';
        export const ClerkProvider = ({ children }) => children;
        export const SignedIn = ({ children }) => children;
        export const SignedOut = () => null;
        export const SignIn = () => React.createElement('div', { 'data-testid': 'e2e-sign-in-placeholder' });
        export const SignInButton = ({ children }) => children;
        export const UserButton = () => React.createElement('span', { 'data-testid': 'e2e-user-button' });
        export const useAuth = () => ({
          isLoaded: true,
          isSignedIn: true,
          getToken: async () => 'e2e-local-token',
          signOut: async () => undefined,
        });
        export const useUser = () => ({
          isLoaded: true,
          isSignedIn: true,
          user: {
            id: 'e2e-local-user',
            username: 'coverage-admin',
            firstName: 'Coverage',
            lastName: 'Admin',
            fullName: 'Coverage Admin',
            imageUrl: '',
            primaryEmailAddress: { emailAddress: 'coverage-admin@example.test' },
            unsafeMetadata: { localUserId: '20' },
            publicMetadata: {},
          },
        });
      `
    },
  } : null
  return {
    plugins: [...(e2eAuthBypassPlugin ? [e2eAuthBypassPlugin] : []), react()],
    server: {
      proxy: {
        '/api/actuator': {
          target: localApiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/actuator/, '/actuator'),
        },
        '/api': {
          target: localApiTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      proxy: {
        '/api/actuator': {
          target: localApiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/actuator/, '/actuator'),
        },
        '/api': {
          target: localApiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
