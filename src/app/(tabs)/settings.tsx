import { SymbolView } from 'expo-symbols';
import Constants from 'expo-constants';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Badge,
  Button,
  Card,
  Divider,
  Field,
  IconButton,
  InfoRow,
  PressableScale,
  ScreenHeader,
  SectionTitle,
  Segmented,
  Skeleton,
  SwitchRow,
  useToast,
} from '@/components/ui';
import { api } from '@/lib/api';
import { useSettings } from '@/lib/settings';
import { cardShadow, monoFont, radius, spacing, useTheme } from '@/lib/theme';
import { DEFAULT_SCHEDULE, type ScheduleSettings } from '@/lib/types';

interface SchForm {
  check_enabled: boolean;
  check_interval_hours: string;
  autoreg_enabled: boolean;
  autoreg_interval_hours: string;
  autoreg_count: string;
  autoreg_threads: string;
  autoreg_proxy: string;
  autoreg_invite: string;
  dailyclaim_enabled: boolean;
  dailyclaim_hour: string;
  require_proxy: boolean;
  replenish_enabled: boolean;
  replenish_interval_minutes: string;
  replenish_target: string;
  reg_mode: 'phone' | 'email';
  reg_email_provider: 'temporam' | 'moemail';
  reg_temporam_cookie: string;
  reg_moemail_base: string;
  reg_moemail_key: string;
}

function toForm(s: ScheduleSettings): SchForm {
  return {
    check_enabled: s.check_enabled,
    check_interval_hours: String(s.check_interval_hours),
    autoreg_enabled: s.autoreg_enabled,
    autoreg_interval_hours: String(s.autoreg_interval_hours),
    autoreg_count: String(s.autoreg_count),
    autoreg_threads: String(s.autoreg_threads),
    autoreg_proxy: s.autoreg_proxy,
    autoreg_invite: s.autoreg_invite,
    dailyclaim_enabled: s.dailyclaim_enabled,
    dailyclaim_hour: String(s.dailyclaim_hour),
    require_proxy: s.require_proxy,
    replenish_enabled: s.replenish_enabled,
    replenish_interval_minutes: String(s.replenish_interval_minutes),
    replenish_target: String(s.replenish_target),
    reg_mode: s.reg_mode === 'email' ? 'email' : 'phone',
    reg_email_provider: s.reg_email_provider === 'moemail' ? 'moemail' : 'temporam',
    reg_temporam_cookie: s.reg_temporam_cookie,
    reg_moemail_base: s.reg_moemail_base,
    reg_moemail_key: s.reg_moemail_key,
  };
}

function toPayload(f: SchForm): ScheduleSettings {
  const num = (v: string, d: number) => {
    const n = parseInt(v, 10);
    return isNaN(n) ? d : n;
  };
  return {
    check_enabled: f.check_enabled,
    check_interval_hours: num(f.check_interval_hours, 6),
    autoreg_enabled: f.autoreg_enabled,
    autoreg_interval_hours: num(f.autoreg_interval_hours, 12),
    autoreg_count: num(f.autoreg_count, 5),
    autoreg_threads: num(f.autoreg_threads, 3),
    autoreg_proxy: f.autoreg_proxy.trim(),
    autoreg_invite: f.autoreg_invite.trim(),
    dailyclaim_enabled: f.dailyclaim_enabled,
    dailyclaim_hour: Math.min(23, Math.max(0, num(f.dailyclaim_hour, 0))),
    require_proxy: f.require_proxy,
    replenish_enabled: f.replenish_enabled,
    replenish_interval_minutes: num(f.replenish_interval_minutes, 30),
    replenish_target: num(f.replenish_target, 5),
    reg_mode: f.reg_mode,
    reg_email_provider: f.reg_email_provider,
    reg_temporam_cookie: f.reg_temporam_cookie.trim(),
    reg_moemail_base: f.reg_moemail_base.trim(),
    reg_moemail_key: f.reg_moemail_key.trim(),
  };
}

export default function SettingsScreen() {
  const { colors, isDark } = useTheme();
  const { config, save } = useSettings();
  const toast = useToast();

  const [baseUrl, setBaseUrl] = useState(config.baseUrl);
  const [token, setToken] = useState(config.token);
  const [showToken, setShowToken] = useState(false);
  const [testing, setTesting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [cookieMasked, setCookieMasked] = useState('');
  const [cookieInput, setCookieInput] = useState('');
  const [cookieBusy, setCookieBusy] = useState(false);

  const [nodes, setNodes] = useState<string[] | null>(null);
  const [currentNode, setCurrentNode] = useState('');
  const [nodeBusy, setNodeBusy] = useState('');

  const [sch, setSch] = useState<SchForm | null>(null);
  const [schBusy, setSchBusy] = useState(false);

  const setS = useCallback(<K extends keyof SchForm>(key: K, value: SchForm[K]) => {
    setSch((prev) => (prev ? { ...prev, [key]: value } : prev));
  }, []);

  const loadAux = useCallback(async () => {
    try {
      const res = await api.getRelayCookie(config);
      if (res.success) setCookieMasked(res.has_cookie ? res.cookie_masked || '已设置' : '未设置');
    } catch {}
    try {
      const res = await api.listNodes(config);
      if (res.success) {
        setNodes(res.nodes || []);
        setCurrentNode(res.current || '');
      }
    } catch {
      setNodes(null);
    }
    try {
      const res = await api.getSchedule(config);
      if (res.success && res.settings) setSch(toForm({ ...DEFAULT_SCHEDULE, ...res.settings }));
    } catch {}
  }, [config]);

  useFocusEffect(
    useCallback(() => {
      setBaseUrl(config.baseUrl);
      setToken(config.token);
      void loadAux();
    }, [config, loadAux]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAux();
    setRefreshing(false);
  }, [loadAux]);

  const persistConnection = useCallback(async () => {
    await save({ baseUrl: baseUrl.trim(), token: token.trim() });
  }, [baseUrl, save, token]);

  const testAndSave = useCallback(async () => {
    const url = baseUrl.trim();
    if (!url) {
      toast.show('请填写服务器地址', 'err');
      return;
    }
    setTesting(true);
    try {
      const res = await api.listAccounts({ baseUrl: url, token: token.trim() });
      if (res.success) {
        await persistConnection();
        toast.show(`连接成功 · ${res.accounts?.length ?? 0} 个账号`, 'ok');
      } else {
        toast.show(res.message || '连接失败', 'err');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '连接失败';
      Alert.alert('连接失败', msg + '。是否仍然保存该配置？', [
        { text: '取消', style: 'cancel' },
        {
          text: '仍然保存',
          onPress: () => {
            void persistConnection().then(() => toast.show('已保存', 'ok'));
          },
        },
      ]);
    } finally {
      setTesting(false);
    }
  }, [baseUrl, persistConnection, toast, token]);

  const saveCookie = useCallback(async () => {
    const c = cookieInput.trim();
    if (!c) {
      toast.show('请粘贴 Cookie', 'info');
      return;
    }
    setCookieBusy(true);
    try {
      const res = await api.saveRelayCookie(config, c);
      if (res.success) {
        toast.show('Cookie 已保存', 'ok');
        setCookieInput('');
        void loadAux();
      } else {
        toast.show(res.message || '保存失败', 'err');
      }
    } catch (e) {
      toast.show(e instanceof Error ? e.message : '保存失败', 'err');
    } finally {
      setCookieBusy(false);
    }
  }, [config, cookieInput, loadAux, toast]);

  const switchTo = useCallback(
    async (name: string) => {
      if (name === currentNode) return;
      setNodeBusy(name);
      try {
        const res = await api.switchNode(config, name);
        if (res.success) {
          setCurrentNode(name);
          toast.show(`已切换到 ${name}`, 'ok');
        } else {
          toast.show(res.message || '切换失败', 'err');
        }
      } catch (e) {
        toast.show(e instanceof Error ? e.message : '切换失败', 'err');
      } finally {
        setNodeBusy('');
      }
    },
    [config, currentNode, toast],
  );

  const saveSchedule = useCallback(async () => {
    if (!sch) return;
    setSchBusy(true);
    try {
      const res = await api.saveSchedule(config, toPayload(sch));
      toast.show(res.success ? '定时任务已保存' : res.message || '保存失败', res.success ? 'ok' : 'err');
    } catch (e) {
      toast.show(e instanceof Error ? e.message : '保存失败', 'err');
    } finally {
      setSchBusy(false);
    }
  }, [config, sch, toast]);

  const appVersion = Constants.expoConfig?.version || '1.0.0';

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScreenHeader title="设置" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
      >
        <SectionTitle title="服务器连接" />
        <Card style={{ gap: spacing.md }}>
          <Field
            label="服务器地址"
            value={baseUrl}
            onChangeText={setBaseUrl}
            placeholder="https://api.example.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <View>
            <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>访问令牌（Token）</Text>
            <View style={[styles.tokenRow, { backgroundColor: colors.fill }]}>
              <Field
                value={token}
                onChangeText={setToken}
                placeholder="留空则不携带令牌"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={!showToken}
                style={{ flex: 1 }}
                inputStyle={{ backgroundColor: 'transparent' }}
              />
              <Pressable onPress={() => setShowToken((v) => !v)} hitSlop={10} style={{ paddingHorizontal: spacing.md }}>
                <SymbolView name={showToken ? 'eye.slash' : 'eye'} size={17} tintColor={colors.gray} />
              </Pressable>
            </View>
          </View>
          <Button title="测试并保存" icon="checkmark.circle.fill" loading={testing} onPress={() => void testAndSave()} />
        </Card>

        <SectionTitle title="中转站 Cookie" />
        <Card style={{ gap: spacing.md }}>
          <InfoRow label="当前状态" value={cookieMasked || '读取中…'} mono />
          <Field
            label="新的 Cookie"
            value={cookieInput}
            onChangeText={setCookieInput}
            placeholder="粘贴中转站 Cookie…"
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            inputStyle={[styles.textArea, { fontFamily: monoFont }]}
          />
          <Button title="保存 Cookie" kind="tinted" icon="key.fill" loading={cookieBusy} onPress={() => void saveCookie()} />
        </Card>

        <SectionTitle title="Clash 节点" right={currentNode ? <Badge text={currentNode} tone="blue" /> : undefined} />
        <Card style={{ paddingVertical: spacing.sm }}>
          {nodes === null ? (
            <View style={{ gap: spacing.sm, paddingVertical: spacing.sm }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} width="100%" height={34} round={10} />
              ))}
            </View>
          ) : nodes.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>未获取到节点，请确认服务器已配置 Clash</Text>
          ) : (
            nodes.map((n, i) => (
              <View key={n}>
                {i > 0 ? <Divider /> : null}
                <PressableScale onPress={() => void switchTo(n)} scaleTo={0.98}>
                  <View style={styles.nodeRow}>
                    <SymbolView
                      name={n === currentNode ? 'checkmark.circle.fill' : 'circle'}
                      size={18}
                      tintColor={n === currentNode ? colors.tint : colors.gray}
                      weight="semibold"
                    />
                    <Text style={[styles.nodeName, { color: colors.text }]} numberOfLines={1}>
                      {n}
                    </Text>
                    {nodeBusy === n ? <IconButton icon="arrow.triangle.2.circlepath" size={28} loading onPress={() => {}} /> : null}
                  </View>
                </PressableScale>
              </View>
            ))
          )}
        </Card>

        <SectionTitle title="定时任务" />
        <Card style={{ gap: spacing.xs }}>
          {sch === null ? (
            <View style={{ gap: spacing.sm, paddingVertical: spacing.sm }}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} width="100%" height={40} round={10} />
              ))}
            </View>
          ) : (
            <>
              <SwitchRow label="定时检测心跳" description="按间隔自动检测所有账号" value={sch.check_enabled} onValueChange={(v) => setS('check_enabled', v)} />
              {sch.check_enabled ? (
                <Field label="检测间隔（小时）" value={sch.check_interval_hours} onChangeText={(t) => setS('check_interval_hours', t)} keyboardType="number-pad" />
              ) : null}
              <Divider style={{ marginVertical: spacing.sm }} />
              <SwitchRow label="自动注册" description="按间隔自动注册新账号" value={sch.autoreg_enabled} onValueChange={(v) => setS('autoreg_enabled', v)} />
              {sch.autoreg_enabled ? (
                <View style={{ gap: spacing.md }}>
                  <View style={styles.twoCol}>
                    <Field label="间隔（小时）" value={sch.autoreg_interval_hours} onChangeText={(t) => setS('autoreg_interval_hours', t)} keyboardType="number-pad" style={{ flex: 1 }} />
                    <Field label="每次数量" value={sch.autoreg_count} onChangeText={(t) => setS('autoreg_count', t)} keyboardType="number-pad" style={{ flex: 1 }} />
                  </View>
                  <View style={styles.twoCol}>
                    <Field label="线程数" value={sch.autoreg_threads} onChangeText={(t) => setS('autoreg_threads', t)} keyboardType="number-pad" style={{ flex: 1 }} />
                    <Field label="邀请码" value={sch.autoreg_invite} onChangeText={(t) => setS('autoreg_invite', t)} autoCapitalize="none" autoCorrect={false} style={{ flex: 1 }} />
                  </View>
                  <Field label="代理（可选）" value={sch.autoreg_proxy} onChangeText={(t) => setS('autoreg_proxy', t)} placeholder="http://user:pass@host:port" autoCapitalize="none" autoCorrect={false} />
                  <Segmented
                    options={[
                      { key: 'phone', label: '手机号' },
                      { key: 'email', label: '邮箱' },
                    ]}
                    value={sch.reg_mode}
                    onChange={(v) => setS('reg_mode', v)}
                  />
                  {sch.reg_mode === 'email' ? (
                    <>
                      <Segmented
                        options={[
                          { key: 'temporam', label: 'Temporam' },
                          { key: 'moemail', label: 'MoeMail' },
                        ]}
                        value={sch.reg_email_provider}
                        onChange={(v) => setS('reg_email_provider', v)}
                      />
                      {sch.reg_email_provider === 'temporam' ? (
                        <Field label="Temporam Cookie" value={sch.reg_temporam_cookie} onChangeText={(t) => setS('reg_temporam_cookie', t)} autoCapitalize="none" autoCorrect={false} />
                      ) : (
                        <View style={styles.twoCol}>
                          <Field label="邮箱平台" value={sch.reg_moemail_base} onChangeText={(t) => setS('reg_moemail_base', t)} autoCapitalize="none" autoCorrect={false} style={{ flex: 1 }} />
                          <Field label="API Key" value={sch.reg_moemail_key} onChangeText={(t) => setS('reg_moemail_key', t)} autoCapitalize="none" autoCorrect={false} style={{ flex: 1 }} />
                        </View>
                      )}
                    </>
                  ) : null}
                </View>
              ) : null}
              <Divider style={{ marginVertical: spacing.sm }} />
              <SwitchRow label="每日自动领取" description="每天在指定小时领取奖励" value={sch.dailyclaim_enabled} onValueChange={(v) => setS('dailyclaim_enabled', v)} />
              {sch.dailyclaim_enabled ? (
                <Field label="领取时间（0-23 点）" value={sch.dailyclaim_hour} onChangeText={(t) => setS('dailyclaim_hour', t)} keyboardType="number-pad" />
              ) : null}
              <Divider style={{ marginVertical: spacing.sm }} />
              <SwitchRow label="自动补号" description="号池不足时自动补充" value={sch.replenish_enabled} onValueChange={(v) => setS('replenish_enabled', v)} />
              {sch.replenish_enabled ? (
                <View style={styles.twoCol}>
                  <Field label="检测间隔（分钟）" value={sch.replenish_interval_minutes} onChangeText={(t) => setS('replenish_interval_minutes', t)} keyboardType="number-pad" style={{ flex: 1 }} />
                  <Field label="目标余量" value={sch.replenish_target} onChangeText={(t) => setS('replenish_target', t)} keyboardType="number-pad" style={{ flex: 1 }} />
                </View>
              ) : null}
              <Divider style={{ marginVertical: spacing.sm }} />
              <SwitchRow label="注册强制使用代理" value={sch.require_proxy} onValueChange={(v) => setS('require_proxy', v)} />
              <Button title="保存定时任务" icon="checkmark" loading={schBusy} onPress={() => void saveSchedule()} style={{ marginTop: spacing.md }} />
            </>
          )}
        </Card>

        <SectionTitle title="关于" />
        <Card>
          <InfoRow label="应用" value="账号 API 管理" />
          <InfoRow label="版本" value={appVersion} />
          <InfoRow label="服务器" value={config.baseUrl} mono />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.lg, paddingTop: 0, paddingBottom: 120 },
  fieldLabel: { fontSize: 13, marginBottom: 6, marginLeft: 2 },
  tokenRow: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md },
  textArea: { height: 84, textAlignVertical: 'top', paddingTop: spacing.md, fontSize: 12.5 },
  nodeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.xs },
  nodeName: { flex: 1, fontSize: 15 },
  emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: spacing.md },
  twoCol: { flexDirection: 'row', gap: spacing.md },
});