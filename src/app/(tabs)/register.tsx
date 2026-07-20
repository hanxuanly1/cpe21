import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Badge,
  Button,
  Card,
  Field,
  LogConsole,
  ProgressBar,
  ScreenHeader,
  SectionTitle,
  Segmented,
  useToast,
} from '@/components/ui';
import { api } from '@/lib/api';
import { useConnection } from '@/lib/settings';
import { monoFont, spacing, useTheme } from '@/lib/theme';
import type { RegisterPayload, RegisterStatus } from '@/lib/types';

const FORM_KEY = 'register_form_v1';

interface FormState {
  count: string;
  threads: string;
  mailInterval: string;
  inviteCode: string;
  proxy: string;
  mode: 'phone' | 'email';
  provider: 'temporam' | 'moemail';
  temporamCookie: string;
  moemailBase: string;
  moemailKey: string;
}

const DEFAULT_FORM: FormState = {
  count: '5',
  threads: '3',
  mailInterval: '1.8',
  inviteCode: '',
  proxy: 'http://127.0.0.1:7890',
  mode: 'phone',
  provider: 'temporam',
  temporamCookie: '',
  moemailBase: '',
  moemailKey: '',
};

export default function RegisterScreen() {
  const { colors } = useTheme();
  const cfg = useConnection();
  const toast = useToast();

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [status, setStatus] = useState<RegisterStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      void AsyncStorage.setItem(FORM_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(FORM_KEY);
        if (raw) setForm({ ...DEFAULT_FORM, ...(JSON.parse(raw) as Partial<FormState>) });
      } catch {}
    })();
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      const res = await api.registerStatus(cfg);
      if (res.success && res.status) setStatus(res.status);
    } catch {}
  }, [cfg]);

  useFocusEffect(
    useCallback(() => {
      void loadStatus();
    }, [loadStatus]),
  );

  const running = !!status?.running;
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => void loadStatus(), 2000);
    return () => clearInterval(timer);
  }, [running, loadStatus]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStatus();
    setRefreshing(false);
  }, [loadStatus]);

  const start = useCallback(async () => {
    const count = parseInt(form.count, 10);
    const threads = parseInt(form.threads, 10);
    const mailInterval = parseFloat(form.mailInterval);
    if (!count || count < 1) {
      toast.show('注册数量至少为 1', 'err');
      return;
    }
    if (!threads || threads < 1 || threads > 10) {
      toast.show('线程数需在 1-10 之间', 'err');
      return;
    }
    if (form.mode === 'email' && form.provider === 'temporam' && !form.temporamCookie.trim()) {
      toast.show('Temporam 需填写 Cookie（含 cf_clearance）', 'err');
      return;
    }
    if (form.mode === 'email' && form.provider === 'moemail' && (!form.moemailBase.trim() || !form.moemailKey.trim())) {
      toast.show('MoeMail 需填写邮箱平台与 API Key', 'err');
      return;
    }
    const payload: RegisterPayload = {
      count,
      threads,
      mail_interval: isNaN(mailInterval) ? 1.8 : mailInterval,
      invite_code: form.inviteCode.trim(),
      proxy: form.proxy.trim(),
      mode: form.mode,
      moemail_base: form.moemailBase.trim(),
      moemail_key: form.moemailKey.trim(),
      email_provider: form.provider,
      temporam_cookie: form.temporamCookie.trim(),
    };
    setBusy(true);
    try {
      const res = await api.registerStart(cfg, payload);
      if (res.success) {
        toast.show(`注册任务已启动 · 目标 ${count} 个`, 'ok');
        await loadStatus();
      } else {
        toast.show(res.message || '启动失败', 'err');
      }
    } catch (e) {
      toast.show(e instanceof Error ? e.message : '启动失败', 'err');
    } finally {
      setBusy(false);
    }
  }, [cfg, form, loadStatus, toast]);

  const stop = useCallback(async () => {
    setBusy(true);
    try {
      const res = await api.registerStop(cfg);
      toast.show(res.success ? '已发送停止指令' : res.message || '停止失败', res.success ? 'ok' : 'err');
      await loadStatus();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : '停止失败', 'err');
    } finally {
      setBusy(false);
    }
  }, [cfg, loadStatus, toast]);

  const hasTask = !!status && (status.running || status.target > 0);
  const percent = status && status.target > 0 ? Math.round((status.success / status.target) * 100) : 0;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScreenHeader title="注册" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
      >
        {hasTask && status ? (
          <Card style={{ marginBottom: spacing.xs }}>
            <View style={styles.rowBetween}>
              <Badge text={status.running ? '运行中' : '已结束'} tone={status.running ? 'blue' : 'gray'} dot />
              <Text style={[styles.percent, { color: colors.tint }]}>{percent}%</Text>
            </View>
            <View style={styles.statRow}>
              <View style={styles.statBox}>
                <Text style={[styles.statNum, { color: colors.green }]}>{status.success}</Text>
                <Text style={[styles.statKey, { color: colors.textTertiary }]}>成功</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNum, { color: colors.text }]}>{status.target}</Text>
                <Text style={[styles.statKey, { color: colors.textTertiary }]}>目标</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNum, { color: colors.orange }]}>{status.fail}</Text>
                <Text style={[styles.statKey, { color: colors.textTertiary }]}>失败重试</Text>
              </View>
            </View>
            <ProgressBar value={status.success} max={status.target} tone={status.running ? 'blue' : 'green'} />
            <LogConsole lines={status.logs ? status.logs.slice(-30) : []} height={200} />
          </Card>
        ) : null}

        <SectionTitle title="注册配置" />
        <Card style={{ gap: spacing.md }}>
          <Segmented
            options={[
              { key: 'phone', label: '手机号注册' },
              { key: 'email', label: '邮箱注册' },
            ]}
            value={form.mode}
            onChange={(v) => set('mode', v)}
          />
          <View style={styles.twoCol}>
            <Field label="注册数量" value={form.count} onChangeText={(t) => set('count', t)} keyboardType="number-pad" style={{ flex: 1 }} />
            <Field label="线程数 (1-10)" value={form.threads} onChangeText={(t) => set('threads', t)} keyboardType="number-pad" style={{ flex: 1 }} />
          </View>
          <View style={styles.twoCol}>
            <Field label="邮箱间隔（秒）" value={form.mailInterval} onChangeText={(t) => set('mailInterval', t)} keyboardType="decimal-pad" style={{ flex: 1 }} />
            <Field label="邀请码" value={form.inviteCode} onChangeText={(t) => set('inviteCode', t)} autoCapitalize="none" autoCorrect={false} style={{ flex: 1 }} />
          </View>
          <Field
            label="代理（可选）"
            value={form.proxy}
            onChangeText={(t) => set('proxy', t)}
            placeholder="http://user:pass@host:port"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {form.mode === 'email' ? (
            <View style={{ gap: spacing.md }}>
              <Segmented
                options={[
                  { key: 'temporam', label: 'Temporam' },
                  { key: 'moemail', label: 'MoeMail' },
                ]}
                value={form.provider}
                onChange={(v) => set('provider', v)}
              />
              {form.provider === 'temporam' ? (
                <Field
                  label="Temporam Cookie（含 cf_clearance）"
                  value={form.temporamCookie}
                  onChangeText={(t) => set('temporamCookie', t)}
                  placeholder="粘贴 Cookie…"
                  multiline
                  autoCapitalize="none"
                  autoCorrect={false}
                  inputStyle={[styles.textArea, { fontFamily: monoFont }]}
                />
              ) : (
                <View style={styles.twoCol}>
                  <Field label="邮箱平台地址" value={form.moemailBase} onChangeText={(t) => set('moemailBase', t)} placeholder="https://…" autoCapitalize="none" autoCorrect={false} style={{ flex: 1 }} />
                  <Field label="API Key" value={form.moemailKey} onChangeText={(t) => set('moemailKey', t)} autoCapitalize="none" autoCorrect={false} style={{ flex: 1 }} />
                </View>
              )}
            </View>
          ) : null}
          {running ? (
            <Button title="停止注册" kind="dangerSolid" icon="stop.fill" loading={busy} onPress={() => void stop()} />
          ) : (
            <Button title="开始注册" icon="play.fill" loading={busy} onPress={() => void start()} />
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.lg, paddingTop: 0, paddingBottom: 120 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  percent: { fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statRow: { flexDirection: 'row', marginBottom: spacing.md },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statKey: { fontSize: 12, marginTop: 2 },
  twoCol: { flexDirection: 'row', gap: spacing.md },
  textArea: { height: 90, textAlignVertical: 'top', paddingTop: spacing.md, fontSize: 12.5 },
});