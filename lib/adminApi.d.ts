// Ambient type declarations for the JavaScript adminApi module.
// Kept lightweight — richer types can be added incrementally if needed.
export interface AdminLoginResponse {
  token: string;
  expiresAt: number;
}

export interface SessionCallbacks {
  onWarning?: (minutesLeft: number) => void;
  onExpired?: () => void;
}

export function setSessionCallbacks(callbacks: SessionCallbacks): void;
export function adminLogin(accessToken: string): Promise<AdminLoginResponse>;
export function adminLogout(): Promise<void>;
export function refreshAdminToken(): Promise<AdminLoginResponse | null>;
export function getSessionInfo(): Promise<{ authenticated: boolean; [key: string]: unknown }>;
export function isAuthenticated(): boolean;
export function getJwtToken(): string | null;
export function restoreSession(): boolean;

export function fetchAdminProducts(token: string | null): Promise<unknown>;
export function createAdminProduct(token: string | null, payload: Record<string, unknown>): Promise<unknown>;
export function updateAdminProduct(token: string | null, sku: string, payload: Record<string, unknown>): Promise<unknown>;
export function deleteAdminProduct(token: string | null, sku: string): Promise<unknown>;

export function fetchAdminPromos(token: string | null): Promise<unknown>;
export function createAdminPromo(token: string | null, payload: Record<string, unknown>): Promise<unknown>;
export function updateAdminPromo(token: string | null, code: string, payload: Record<string, unknown>): Promise<unknown>;
export function deleteAdminPromo(token: string | null, code: string): Promise<unknown>;

export function fetchAdminOrders(token: string | null): Promise<unknown>;
export function fetchAdminOrdersList(
  token: string | null,
  params?: { status?: string | string[]; limit?: number; skip?: number },
): Promise<unknown>;
export function fetchAdminOrderCounts(token: string | null): Promise<unknown>;
export function fetchAdminOrderSummary(token: string | null, range?: string): Promise<unknown>;
export function fetchAdminOrder(token: string | null, orderNumber: string): Promise<unknown>;
export function deleteAdminOrder(token: string | null, orderNumber: string): Promise<unknown>;
export function updateAdminOrderStatus(token: string | null, orderNumber: string, status: string): Promise<unknown>;

export function fetchAdminAnalytics(token: string | null, range?: string): Promise<unknown>;
export function fetchAdminDashboardSummary(
  token: string | null,
  params?: { range?: string; lowStockThreshold?: number; pendingLimit?: number },
): Promise<unknown>;
