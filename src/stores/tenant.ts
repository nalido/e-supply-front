export type TenantListener = (tenantId: string | null) => void;

class TenantStore {
  private tenantId: string | null = null;

  private listeners = new Set<TenantListener>();

  getTenantId() {
    return this.tenantId;
  }

  setTenantId(nextId: string | null) {
    if (this.tenantId === nextId) {
      return;
    }
    this.tenantId = nextId;
    this.listeners.forEach((listener) => listener(this.tenantId));
  }

  subscribe(listener: TenantListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const tenantStore = new TenantStore();
