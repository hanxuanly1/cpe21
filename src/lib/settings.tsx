import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import type { ConnectionConfig } from './api';

const STORAGE_KEY = 'connection_settings_v1';

export const DEFAULT_BASE_URL = 'https://api.ddddai.xyz';
export const DEFAULT_TOKEN = 'Jiufang10086';

interface SettingsContextValue {
  config: ConnectionConfig;
  ready: boolean;
  save: (next: ConnectionConfig) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ConnectionConfig>({ baseUrl: DEFAULT_BASE_URL, token: DEFAULT_TOKEN });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw && mounted) {
          const parsed = JSON.parse(raw) as Partial<ConnectionConfig>;
          setConfig({
            baseUrl: parsed.baseUrl && parsed.baseUrl.trim() ? parsed.baseUrl : DEFAULT_BASE_URL,
            token: typeof parsed.token === 'string' ? parsed.token : DEFAULT_TOKEN,
          });
        }
      } catch {}
      if (mounted) setReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      config,
      ready,
      save: async (next: ConnectionConfig) => {
        setConfig(next);
        try {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {}
      },
    }),
    [config, ready],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings 必须在 SettingsProvider 内使用');
  return ctx;
}

export function useConnection(): ConnectionConfig {
  return useSettings().config;
}
