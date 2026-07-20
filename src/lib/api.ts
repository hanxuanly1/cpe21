import type {
  Account,
  AdoptStatus,
  ApiResult,
  RegisterPayload,
  RegisterStatus,
  ReplenishStatus,
  ScheduleSettings,
} from './types';

export interface ConnectionConfig {
  baseUrl: string;
  token: string;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const TIMEOUT_MS = 25000;

async function request<T extends ApiResult>(cfg: ConnectionConfig, path: string, init?: RequestInit): Promise<T> {
  const base = cfg.baseUrl.replace(/\/+$/, '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(base + path, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init && init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(cfg.token ? { 'X-Token': cfg.token } : {}),
      },
    });
  } catch {
    clearTimeout(timer);
    throw new ApiError('无法连接服务器，请检查地址与网络', 0);
  }
  clearTimeout(timer);
  if (!res.ok) {
    let snippet = '';
    try {
      snippet = (await res.text()).slice(0, 80);
    } catch {}
    const suffix = snippet ? '：' + snippet : '';
    throw new ApiError('HTTP ' + res.status + suffix, res.status);
  }
  return (await res.json()) as T;
}

function post(body?: unknown): RequestInit {
  return { method: 'POST', body: JSON.stringify(body ?? {}) };
}

export const api = {
  listAccounts: (cfg: ConnectionConfig, full = false) =>
    request<ApiResult & { accounts: Account[] }>(cfg, '/api/accounts' + (full ? '?full=1' : '')),

  check: (cfg: ConnectionConfig, email: string) =>
    request<ApiResult & { alive: boolean; balance1?: number; balance4?: number; status?: string; name?: string }>(
      cfg, '/api/check', post({ email })),

  checkAll: (cfg: ConnectionConfig) => request<ApiResult>(cfg, '/api/check_all', post()),

  checkSelected: (cfg: ConnectionConfig, emails: string[]) =>
    request<ApiResult & { total?: number }>(cfg, '/api/check_selected', post({ emails })),

  claimAll: (cfg: ConnectionConfig) =>
    request<ApiResult & { claimed?: number; total?: number }>(cfg, '/api/claim_all', post()),

  claimSelected: (cfg: ConnectionConfig, emails: string[]) =>
    request<ApiResult & { claimed?: number; total?: number }>(cfg, '/api/claim_selected', post({ emails })),

  adoptAll: (cfg: ConnectionConfig, emails: string[]) =>
    request<ApiResult>(cfg, '/api/adopt_all', post({ emails })),

  adoptStatus: (cfg: ConnectionConfig) =>
    request<ApiResult & { status: AdoptStatus }>(cfg, '/api/adopt_status'),

  deleteAccount: (cfg: ConnectionConfig, email: string) =>
    request<ApiResult>(cfg, '/api/delete', post({ email })),

  deleteBatch: (cfg: ConnectionConfig, payload: Record<string, unknown>) =>
    request<ApiResult & { deleted?: number; total?: number }>(cfg, '/api/delete_batch', post(payload)),

  uploadRelay: (cfg: ConnectionConfig, payload: Record<string, unknown>) =>
    request<ApiResult & { uploaded?: number; total?: number; results?: { ok: boolean; msg?: string }[] }>(
      cfg, '/api/upload_relay', post(payload)),

  unmarkUploaded: (cfg: ConnectionConfig, payload: Record<string, unknown>) =>
    request<ApiResult & { unmarked?: number }>(cfg, '/api/unmark_uploaded', post(payload)),

  getRelayCookie: (cfg: ConnectionConfig) =>
    request<ApiResult & { has_cookie?: boolean; cookie_masked?: string }>(cfg, '/api/relay_cookie'),

  saveRelayCookie: (cfg: ConnectionConfig, cookie: string) =>
    request<ApiResult>(cfg, '/api/relay_cookie', post({ cookie })),

  importText: (cfg: ConnectionConfig, text: string) =>
    request<ApiResult & { added?: number; updated?: number; bad?: number }>(cfg, '/api/import_text', post({ text })),

  registerStart: (cfg: ConnectionConfig, payload: RegisterPayload) =>
    request<ApiResult>(cfg, '/api/register/start', post(payload)),

  registerStop: (cfg: ConnectionConfig) => request<ApiResult>(cfg, '/api/register/stop', post()),

  registerStatus: (cfg: ConnectionConfig) =>
    request<ApiResult & { status: RegisterStatus }>(cfg, '/api/register/status'),

  listNodes: (cfg: ConnectionConfig) =>
    request<ApiResult & { nodes?: string[]; current?: string }>(cfg, '/api/nodes'),

  switchNode: (cfg: ConnectionConfig, name: string) =>
    request<ApiResult>(cfg, '/api/nodes/switch', post({ name })),

  getSchedule: (cfg: ConnectionConfig) =>
    request<ApiResult & { settings: ScheduleSettings }>(cfg, '/api/schedule'),

  saveSchedule: (cfg: ConnectionConfig, settings: ScheduleSettings) =>
    request<ApiResult>(cfg, '/api/schedule', post(settings)),

  relayPool: (cfg: ConnectionConfig) =>
    request<ApiResult & { pool?: number }>(cfg, '/api/relay_pool'),

  replenish: (cfg: ConnectionConfig) => request<ApiResult>(cfg, '/api/replenish', post()),

  replenishStatus: (cfg: ConnectionConfig) =>
    request<ApiResult & { status: ReplenishStatus }>(cfg, '/api/replenish_status'),
};

export function maskApiKey(key?: string): string {
  if (!key) return '无 API Key';
  if (key.length > 20) return key.slice(0, 12) + '···' + key.slice(-6);
  return key;
}

export function formatNumber(n: number): string {
  return n.toLocaleString('zh-CN');
}
