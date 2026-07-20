import { SymbolView } from 'expo-symbols';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Badge,
  Button,
  Card,
  IconButton,
  LogConsole,
  PressableScale,
  ProgressBar,
  ScreenHeader,
  SectionTitle,
  Skeleton,
  StatCard,
  useToast,
  toneColors,
  type Tone,
} from '@/components/ui';
import { api, formatNumber } from '@/lib/api';
import { useConnection } from '@/lib/settings';
import { cardShadow, radius, spacing, useTheme, type Palette } from '@/lib/theme';
import type { Account, RegisterStatus, ReplenishStatus } from '@/lib/types';

type SFSymbolName = React.ComponentProps<typeof SymbolView>['name'];

function QuickTile({
  icon,
  label,
  tone,
  loading,
  onPress,
  colors,
  isDark,
}: {
  icon: SFSymbolName;
  label: string;
  tone: Tone;
  loading: boolean;
  onPress: () => void;
  colors: Palette;
  isDark: boolean;
}) {
  const t = toneColors(colors)[tone];
  return (
    <PressableScale onPress={onPress} disabled={loading} style={styles.tileWrap}>
      <View style={[styles.tile, { backgroundColor: colors.card }, cardShadow(isDark)]}>
        <View style={[styles.tileIcon, { backgroundColor: t.bg }]}>
          {loading ? (
            <ActivityIndicator size="small" color={t.fg} />
          ) : (
            <SymbolView name={icon} size={20} tintColor={t.fg} weight="semibold" />
          )}
        </View>
        <Text style={[styles.tileLabel, { color: colors.text }]}>{label}</Text>
      </View>
    </PressableScale>
  );
}

export default function DashboardScreen() {
  const { colors, isDark } = useTheme();
  const cfg = useConnection();
  const toast = useToast();
  const router = useRouter();

  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [status, setStatus] = useState<RegisterStatus | null>(null);
  const [pool, setPool] = useState<number | null>(null);
  const [replenish, setReplenish] = useState<ReplenishStatus | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [adoptText, setAdoptText] = useState('');

  const loadAccounts = useCallback(async () => {
    try {
      const res = await api.listAccounts(cfg);
      if (res.success) setAccounts(res.accounts || []);
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }, [cfg]);

  const loadStatus = useCallback(async () => {
    try {
      const res = await api.registerStatus(cfg);
      if (res.success && res.status) setStatus(res.status);
    } catch {}
  }, [cfg]);

  const loadPool = useCallback(async () => {
    try {
      const [p, r] = await Promise.all([api.relayPool(cfg), api.replenishStatus(cfg)]);
      if (p.success && typeof p.pool === 'number') setPool(p.pool);
      if (r.success && r.status) setReplenish(r.status);
    } catch {}
  }, [cfg]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadAccounts(), loadStatus(), loadPool()]);
  }, [loadAccounts, loadStatus, loadPool]);

  useFocusEffect(
    useCallback(() => {
      void refreshAll();
    }, [refreshAll]),
  );

  const running = !!status?.running;
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      void loadStatus();
      void loadAccounts();
    }, 2500);
    return () => clearInterval(timer);
  }, [running, loadStatus, loadAccounts]);

  const replenishRunning = !!replenish?.running;
  useEffect(() => {
    if (!replenishRunning) return;
    const timer = setInterval(() => void loadPool(), 2500);
    return () => clearInterval(timer);
  }, [replenishRunning, loadPool]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  }, [refreshAll]);

  // ---------- 快捷操作 ----------
  const runCheckAll = useCallback(() => {
    Alert.alert('全部检测', '确定检测所有账号的心跳与 CEP 余量？', [
      { text: '取消', style: 'cancel' },
      {
        text: '开始检测',
        onPress: async () => {
          setBusy('check');
          try {
            const res = await api.checkAll(cfg);
            if (res.success) {
              await loadAccounts();
              toast.show('全部检测完成', 'ok');
            } else {
              toast.show(res.message || '检测失败', 'err');
            }
          } catch (e) {
            toast.show(e instanceof Error ? e.message : '检测失败', 'err');
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  }, [cfg, loadAccounts, toast]);

  const runClaimAll = useCallback(() => {
    Alert.alert('领取全部', '确定领取所有账号的今日奖励？', [
      { text: '取消', style: 'cancel' },
      {
        text: '领取',
        onPress: async () => {
          setBusy('claim');
          try {
            const res = await api.claimAll(cfg);
            if (res.success) {
              toast.show(`领取完成 ${res.claimed ?? 0}/${res.total ?? 0}`, 'ok');
            } else {
              toast.show(res.message || '领取失败', 'err');
            }
          } catch (e) {
            toast.show(e instanceof Error ? e.message : '领取失败', 'err');
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  }, [cfg, toast]);

  const runAdoptAll = useCallback(() => {
    const candidates = (accounts || []).filter((a) => !a.uploaded).map((a) => a.email);
    if (candidates.length === 0) {
      toast.show('没有可领养的账号', 'info');
      return;
    }
    Alert.alert('批量领养', `将领养 ${candidates.length} 个未上传账号？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '开始领养',
        onPress: async () => {
          setBusy('adopt');
          try {
            const res = await api.adoptAll(cfg, candidates);
            if (!res.success) {
              toast.show(res.message || '领养失败', 'err');
              return;
            }
            setAdoptText('领养中…');
            const timer = setInterval(async () => {
              try {
                const s = await api.adoptStatus(cfg);
                if (s.success && s.status) {
                  setAdoptText(`领养中 ${s.status.done}/${s.status.total} · 成功 ${s.status.ok}`);
                  if (!s.status.running) {
                    clearInterval(timer);
                    setAdoptText('');
                    toast.show(`领养完成，成功 ${s.status.ok} 个`, 'ok');
                    void loadAccounts();
                    setBusy(null);
                  }
                }
              } catch {
                clearInterval(timer);
                setAdoptText('');
                setBusy(null);
              }
            }, 2000);
          } catch (e) {
            toast.show(e instanceof Error ? e.message : '领养失败', 'err');
            setBusy(null);
          }
        },
      },
    ]);
  }, [accounts, cfg, loadAccounts, toast]);

  const runReplenish = useCallback(async () => {
    setBusy('replenish');
    try {
      const res = await api.replenish(cfg);
      if (res.success) {
        toast.show('已开始补号', 'ok');
        void loadPool();
      } else {
        toast.show(res.message || '补号失败', 'err');
      }
    } catch (e) {
      toast.show(e instanceof Error ? e.message : '补号失败', 'err');
    } finally {
      setBusy(null);
    }
  }, [cfg, loadPool, toast]);

  // ---------- 统计 ----------
  const list = accounts || [];
  const total = list.length;
  const alive = list.filter((a) => a.alive === true).length;
  const dead = list.filter((a) => a.alive === false).length;
  const uploaded = list.filter((a) => a.uploaded === true).length;
  const cep = list.reduce((s, a) => s + (Number(a.balance4) || 0), 0);
  const loading = accounts === null;

  const hasTask = !!status && (status.running || status.target > 0);
  const connTone: Tone = online === null ? 'gray' : online ? 'green' : 'red';
  const connText = online === null ? '连接中' : online ? '已连接' : '离线';

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScreenHeader
        title="总览"
        right={
          <PressableScale onPress={() => router.push('/settings' as never)} scaleTo={0.94}>
            <View style={[styles.pill, { backgroundColor: toneColors(colors)[connTone].bg }]}>
              <View style={[styles.pillDot, { backgroundColor: toneColors(colors)[connTone].fg }]} />
              <Text style={[styles.pillText, { color: toneColors(colors)[connTone].fg }]}>{connText}</Text>
            </View>
          </PressableScale>
        }
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
      >
        {loading ? (
          <View style={styles.gridRow}>
            <Card style={styles.gridItem}>
              <Skeleton width={32} height={32} round={10} />
              <Skeleton width="60%" height={24} style={{ marginTop: 10 }} />
              <Skeleton width="40%" height={12} style={{ marginTop: 6 }} />
            </Card>
            <Card style={styles.gridItem}>
              <Skeleton width={32} height={32} round={10} />
              <Skeleton width="60%" height={24} style={{ marginTop: 10 }} />
              <Skeleton width="40%" height={12} style={{ marginTop: 6 }} />
            </Card>
          </View>
        ) : (
          <View style={styles.gridRow}>
            <StatCard icon="person.2.fill" label="账号总数" value={formatNumber(total)} tone="blue" style={styles.gridItem} />
            <StatCard icon="checkmark.circle.fill" label="在线" value={formatNumber(alive)} tone="green" style={styles.gridItem} />
          </View>
        )}
        {!loading ? (
          <View style={styles.gridRow}>
            <StatCard icon="xmark.circle.fill" label="失效" value={formatNumber(dead)} tone="red" style={styles.gridItem} />
            <StatCard icon="tray.and.arrow.up.fill" label="已上传" value={formatNumber(uploaded)} tone="orange" style={styles.gridItem} />
          </View>
        ) : null}
        <Card style={styles.cepCard}>
          <View style={[styles.cepIcon, { backgroundColor: colors.greenSoft }]}>
            <SymbolView name="bolt.fill" size={18} tintColor={colors.green} weight="semibold" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cepValue, { color: colors.text }]}>{formatNumber(cep)}</Text>
            <Text style={[styles.cepLabel, { color: colors.textTertiary }]}>CEP 总量</Text>
          </View>
          <Badge text={dead > 0 ? dead + ' 个待处理' : '状态良好'} tone={dead > 0 ? 'red' : 'green'} />
        </Card>

        <SectionTitle title="注册任务" />
        <Card>
          {hasTask && status ? (
            <View style={{ gap: spacing.md }}>
              <View style={styles.rowBetween}>
                <Badge text={status.running ? '运行中' : '已结束'} tone={status.running ? 'blue' : 'gray'} dot />
                <Text style={[styles.taskStat, { color: colors.textSecondary }]}>
                  成功 {status.success}/{status.target}
                </Text>
              </View>
              <ProgressBar value={status.success} max={status.target} tone={status.running ? 'blue' : 'green'} />
              <Text style={[styles.taskFail, { color: colors.textTertiary }]}>失败重试 {status.fail} 次</Text>
              {status.logs && status.logs.length > 0 ? <LogConsole lines={status.logs.slice(-10)} height={120} /> : null}
              <Button title="查看注册页" kind="tinted" icon="arrow.right.circle.fill" onPress={() => router.push('/register' as never)} />
            </View>
          ) : (
            <View style={{ gap: spacing.md }}>
              <Text style={[styles.noTask, { color: colors.textTertiary }]}>暂无注册任务，启动后可在此实时查看进度</Text>
              <Button title="去注册" icon="plus.circle.fill" onPress={() => router.push('/register' as never)} />
            </View>
          )}
        </Card>

        <SectionTitle title="中转站号池" />
        <Card>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.poolValue, { color: colors.text }]}>{pool === null ? '—' : formatNumber(pool)}</Text>
              <Text style={[styles.poolLabel, { color: colors.textTertiary }]}>
                号池余量{replenish && replenish.target > 0 ? ` · 目标 ${replenish.target}` : ''}
              </Text>
            </View>
            <IconButton icon="arrow.clockwise" tone="blue" onPress={() => void loadPool()} />
          </View>
          {replenishRunning && replenish ? (
            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              <ProgressBar value={replenish.done} max={Math.max(1, replenish.need)} tone="orange" />
              <Text style={[styles.taskFail, { color: colors.textTertiary }]}>补号中 {replenish.done}/{replenish.need}</Text>
            </View>
          ) : null}
          <Button
            title={replenishRunning ? '补号中…' : '立即补号'}
            kind="tinted"
            icon="plus.square.on.square"
            loading={busy === 'replenish'}
            disabled={replenishRunning}
            onPress={() => void runReplenish()}
            style={{ marginTop: spacing.md }}
          />
        </Card>

        <SectionTitle
          title="快捷操作"
          right={adoptText ? <Text style={{ color: colors.tint, fontSize: 12 }}>{adoptText}</Text> : undefined}
        />
        <View style={styles.gridRow}>
          <QuickTile icon="waveform.path.ecg" label="全部检测" tone="blue" loading={busy === 'check'} onPress={runCheckAll} colors={colors} isDark={isDark} />
          <QuickTile icon="gift.fill" label="领取全部" tone="green" loading={busy === 'claim'} onPress={runClaimAll} colors={colors} isDark={isDark} />
        </View>
        <View style={styles.gridRow}>
          <QuickTile icon="pawprint.fill" label="批量领养" tone="orange" loading={busy === 'adopt'} onPress={runAdoptAll} colors={colors} isDark={isDark} />
          <QuickTile icon="doc.text.magnifyingglass" label="刷新数据" tone="gray" loading={refreshing} onPress={() => void onRefresh()} colors={colors} isDark={isDark} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.lg, paddingTop: 0, paddingBottom: 120 },
  gridRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  gridItem: { flex: 1 },
  cepCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xs },
  cepIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cepValue: { fontSize: 24, fontWeight: '700', fontVariant: ['tabular-nums'] },
  cepLabel: { fontSize: 12, marginTop: 1 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  taskStat: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  taskFail: { fontSize: 12 },
  noTask: { fontSize: 14, textAlign: 'center', paddingVertical: spacing.sm },
  poolValue: { fontSize: 28, fontWeight: '700', fontVariant: ['tabular-nums'] },
  poolLabel: { fontSize: 12, marginTop: 2 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  pillDot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontSize: 12, fontWeight: '600' },
  tileWrap: { flex: 1 },
  tile: { borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', gap: spacing.sm },
  tileIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { fontSize: 14, fontWeight: '600' },
});