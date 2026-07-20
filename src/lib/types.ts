export interface Account {
  email: string;
  name?: string;
  password?: string;
  api?: string;
  token?: string;
  alive?: boolean | null;
  status?: string;
  balance1?: number;
  balance4?: number;
  uploaded?: boolean;
  checked_at?: string;
}

export interface ApiResult {
  success: boolean;
  message?: string;
}

export interface RegisterStatus {
  running: boolean;
  target: number;
  success: number;
  fail: number;
  logs: string[];
}

export interface RegisterPayload {
  count: number;
  threads: number;
  mail_interval: number;
  invite_code: string;
  proxy: string;
  mode: string;
  moemail_base: string;
  moemail_key: string;
  email_provider: string;
  temporam_cookie: string;
}

export interface AdoptStatus {
  running: boolean;
  done: number;
  total: number;
  ok: number;
}

export interface ReplenishStatus {
  running: boolean;
  pool: number;
  target: number;
  need: number;
  done: number;
  finished_at?: string;
}

export interface ScheduleSettings {
  check_enabled: boolean;
  check_interval_hours: number;
  autoreg_enabled: boolean;
  autoreg_interval_hours: number;
  autoreg_count: number;
  autoreg_threads: number;
  autoreg_proxy: string;
  autoreg_invite: string;
  dailyclaim_enabled: boolean;
  dailyclaim_hour: number;
  require_proxy: boolean;
  replenish_enabled: boolean;
  replenish_interval_minutes: number;
  replenish_target: number;
  reg_mode: string;
  reg_email_provider: string;
  reg_temporam_cookie: string;
  reg_moemail_base: string;
  reg_moemail_key: string;
}

export const DEFAULT_SCHEDULE: ScheduleSettings = {
  check_enabled: false,
  check_interval_hours: 6,
  autoreg_enabled: false,
  autoreg_interval_hours: 12,
  autoreg_count: 5,
  autoreg_threads: 3,
  autoreg_proxy: '',
  autoreg_invite: 'BfXSPi',
  dailyclaim_enabled: false,
  dailyclaim_hour: 0,
  require_proxy: true,
  replenish_enabled: false,
  replenish_interval_minutes: 30,
  replenish_target: 5,
  reg_mode: 'phone',
  reg_email_provider: 'temporam',
  reg_temporam_cookie: '',
  reg_moemail_base: '',
  reg_moemail_key: '',
};
