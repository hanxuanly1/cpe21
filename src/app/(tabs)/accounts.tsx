import { SymbolView } from 'expo-symbols';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Clipboard,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  Field,
  FilterChip,
  IconButton,
  InfoRow,
  PressableScale,
  ScreenHeader,
  Sheet,
  Skeleton,
  useToast,
} from '@/components/ui';
import { api, formatNumber } from '@/lib/api';
import { useConnection } from '@/lib/settings';
import { cardShadow, monoFont, radius, spacing, useTheme } from '@/lib/theme';
import type { Account } from '@/lib/types';

type Row = Account & { username?: string };
type FilterKey = 'all' | 'alive' | 'dead' | 'unknown' | 'uploaded' | 'not_uploaded' | 'banned' | 'cep_negative';
type SortKey = 'default' | 'cep_desc' | 'cep_asc' | 'recent';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'alive', label: '在线' },
  { key: 'dead', label: '失效' },
  { key: 'unknown', label: '未检测' },
  { key: 'uploaded', label: '已上传' },
  { key: 'not_uploaded', label: '未上传' },
  { key: 'banned', label: '封禁' },
  { key: 'cep_negative', label: 'CEP 负数' },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'default', label: '默认排序' },
  { key: 'cep_desc', label: 'CEP 从高到低' },
  { key: 'cep_asc', label: 'CEP 从低到高' },
  { key: 'recent', label: '最近检测优先' },
];

function shortTime(t?: string): string {
  if (!t) return '';
  return t.length >= 16 ? t.slice(5, 16) : t;
}

function nowString(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function matchFilter(a: Row, f: FilterKey): boolean {
  switch (f) {
    case 'all': return true;
    case 'alive': return a.alive === true;
    case 'dead': return a.alive === false;
    case 'unknown': return a.alive !== true && a.alive !== false;
    case 'uploaded': return a.uploaded === true;
    case 'not_uploaded': return a.uploaded !== true;
    case 'banned': return String(a.status || '').includes('封禁');
    case 'cep_negative': return (Number(a.balance4) || 0) < 0;
  }
}

function FadeIn({ index, children }: { index: number; children: React.ReactNode }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 260,
      delay: Math.min(index, 8) * 35,
      useNativeDriver: true,
    }).start();
  }, [anim, index]);
  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

export default function AccountsScreen() {
  const { colors, isDark } = useTheme();
  const cfg = useConnection();
  const toast = useToast();

  const [accounts, setAccounts] = useState<Row[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sort, setSort] = useState<SortKey>('default');
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<Row | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.listAccounts(cfg, true);
      if (res.success) setAccounts((res.accounts || []) as Row[]);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : '加载失败', 'err');
      setAccounts((prev) => prev ?? []);
    }
  }, [cfg, toast]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const list = accounts || [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = list.filter((a) => matchFilter(a, filter));
    if (q) out = out.filter((a) => a.email.toLowerCase().includes(q) || String(a.name || a.username || '').toLowerCase().includes(q));
    if (sort === 'cep_desc') out = [...out].sort((x, y) => (Number(y.balance4) || 0) - (Number(x.balance4) || 0));
    if (sort === 'cep_asc') out = [...out].sort((x, y) => (Number(x.balance4) || 0) - (Number(y.balance4) || 0));
    if (sort === 'recent') out = [...out].sort((x, y) => String(y.checked_at || '').localeCompare(String(x.checked_at || '')));
    return out;
  }, [list, query, filter, sort]);

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { all: list.length, alive: 0, dead: 0, unknown: 0, uploaded: 0, not_uploaded: 0, banned: 0, cep_negative: 0 };
    for (const a of list) {
      if (a.alive === true) c.alive++;
      else if (a.alive === false) c.dead++;
      else c.unknown++;
      if (a.uploaded === true) c.uploaded++; else c.not_uploaded++;
      if (String(a.status || '').includes('封禁')) c.banned++;
      if ((Number(a.balance4) || 0) < 0) c.cep_negative++;
    }
    return c;
  }, [list]);

  const cycleSort = useCallback(() => {
    const idx = SORTS.findIndex((s) => s.key === sort);
    const next = SORTS[(idx + 1) % SORTS.length];
    setSort(next.key);
    toast.show(next.label, 'info');
  }, [sort, toast]);

  const copy = useCallback(
    (label: string, value?: string) => {
      if (!value) return;
      Clipboard.setString(value);
      setCopied(label);
      toast.show(`已复制${label}`, 'ok');
      setTimeout(() => setCopied(''), 1500);
    },
    [toast],
  );

  const patchAccount = useCallback((email: string, patch: Partial<Row>) => {
    setAccounts((prev) => (prev ? prev.map((a) => (a.email === email ? { ...a, ...patch } : a)) : prev));
    setDetail((prev) => (prev && prev.email === email ? { ...prev, ...patch } : prev));
  }, []);

  // ---------- 单个操作 ----------
  const checkOne = useCallback(
    async (email: string) => {
      setBusy('check1');
      try {
        const res = await api.check(cfg, email);
        if (res.success) {
          patchAccount(email, {
            alive: res.alive,
            balance1: res.balance1,
            balance4: res.balance4,
            status: res.status,
            name: res.name,
            checked_at: nowString(),
          });
          toast.show(res.alive ? '心跳正常' : '账号已失效', res.alive ? 'ok' : 'err');
        } else {
          toast.show(res.message || '检测失败', 'err');
        }
      } catch (e) {
        toast.show(e instanceof Error ? e.message : '检测失败', 'err');
      } finally {
        setBusy(null);
      }
    },
    [cfg, patchAccount, toast],
  );

  const claimOne = useCallback(
    async (email: string) => {
      setBusy('claim1');
      try {
        const res = await api.claimSelected(cfg, [email]);
        toast.show(res.success ? `领取完成 ${res.claimed ?? 0}/${res.total ?? 1}` : res.message || '领取失败', res.success ? 'ok' : 'err');
      } catch (e) {
        toast.show(e instanceof Error ? e.message : '领取失败', 'err');
      } finally {
        setBusy(null);
      }
    },
    [cfg, toast],
  );

  const uploadOne = useCallback(
    async (email: string) => {
      setBusy('upload1');
      try {
        const res = await api.uploadRelay(cfg, { emails: [email], only_alive: false });
        if (res.success) {
          patchAccount(email, { uploaded: true });
          toast.show('已上传到中转站', 'ok');
        } else {
          toast.show(res.message || '上传失败', 'err');
        }
      } catch (e) {
        toast.show(e instanceof Error ? e.message : '上传失败', 'err');
      } finally {
        setBusy(null);
      }
    },
    [cfg, patchAccount, toast],
  );

  const unmarkOne = useCallback(
    async (email: string) => {
      setBusy('unmark1');
      try {
        const res = await api.unmarkUploaded(cfg, { emails: [email] });
        if (res.success) {
          patchAccount(email, { uploaded: false });
          toast.show('已取消上传标记', 'ok');
        } else {
          toast.show(res.message || '操作失败', 'err');
        }
      } catch (e) {
        toast.show(e instanceof Error ? e.message : '操作失败', 'err');
      } finally {
        setBusy(null);
      }
    },
    [cfg, patchAccount, toast],
  );

  const deleteOne = useCallback(
    (email: string) => {
      Alert.alert('删除账号', `确定删除 ${email}？此操作不可恢复。`, [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            setBusy('delete1');
            try {
              const res = await api.deleteAccount(cfg, email);
              if (res.success) {
                setAccounts((prev) => (prev ? prev.filter((a) => a.email !== email) : prev));
                setDetail(null);
                toast.show('已删除', 'ok');
              } else {
                toast.show(res.message || '删除失败', 'err');
              }
            } catch (e) {
              toast.show(e instanceof Error ? e.message : '删除失败', 'err');
            } finally {
              setBusy(null);
            }
          },
        },
      ]);
    },
    [cfg, toast],
  );

  // ---------- 批量操作 ----------
  const toggleSelect = useCallback((email: string) => {
    setSelected((prev) => (prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]));
  }, []);

  const exitSelection = useCallback(() => {
    setSelecting(false);
    setSelected([]);
  }, []);

  const batchAction = useCallback(
    (kind: 'check' | 'claim' | 'upload' | 'delete') => {
      const emails = selected;
      if (emails.length === 0) {
        toast.show('请先选择账号', 'info');
        return;
      }
      const labels = { check: '检测', claim: '领取', upload: '上传', delete: '删除' };
      const run = async () => {
        setBusy('batch');
        try {
          if (kind === 'check') {
            const res = await api.checkSelected(cfg, emails);
            toast.show(res.success ? '已提交检测' : res.message || '检测失败', res.success ? 'ok' : 'err');
          } else if (kind === 'claim') {
            const res = await api.claimSelected(cfg, emails);
            toast.show(res.success ? `领取完成 ${res.claimed ?? 0}/${res.total ?? emails.length}` : res.message || '领取失败', res.success ? 'ok' : 'err');
          } else if (kind === 'upload') {
            const res = await api.uploadRelay(cfg, { emails, only_alive: false });
            toast.show(res.success ? `上传完成 ${res.uploaded ?? 0}/${res.total ?? emails.length}` : res.message || '上传失败', res.success ? 'ok' : 'err');
          } else {
            const res = await api.deleteBatch(cfg, { mode: 'emails', emails });
            toast.show(res.success ? `已删除 ${res.deleted ?? emails.length} 个` : res.message || '删除失败', res.success ? 'ok' : 'err');
          }
          exitSelection();
          await load();
        } catch (e) {
          toast.show(e instanceof Error ? e.message : '操作失败', 'err');
        } finally {
          setBusy(null);
        }
      };
      if (kind === 'delete') {
        Alert.alert('批量删除', `确定删除选中的 ${emails.length} 个账号？不可恢复。`, [
          { text: '取消', style: 'cancel' },
          { text: labels[kind], style: 'destructive', onPress: () => void run() },
        ]);
      } else {
        void run();
      }
    },
    [cfg, exitSelection, load, selected, toast],
  );

  // ---------- 更多批量清理 ----------
  const moreAction = useCallback(
    (title: string, fn: () => Promise<string>) => {
      Alert.alert(title, '确定执行该操作？', [
        { text: '取消', style: 'cancel' },
        {
          text: '执行',
          style: 'destructive',
          onPress: async () => {
            setMoreOpen(false);
            setBusy('more');
            try {
              const msg = await fn();
              toast.show(msg, 'ok');
              await load();
            } catch (e) {
              toast.show(e instanceof Error ? e.message : '操作失败', 'err');
            } finally {
              setBusy(null);
            }
          },
        },
      ]);
    },
    [load, toast],
  );

  const doImport = useCallback(async () => {
    const text = importText.trim();
    if (!text) {
      toast.show('请先粘贴内容', 'info');
      return;
    }
    setBusy('import');
    try {
      const res = await api.importText(cfg, text);
      if (res.success) {
        toast.show(`新增 ${res.added ?? 0} · 更新 ${res.updated ?? 0} · 无效 ${res.bad ?? 0}`, 'ok');
        setImportText('');
        setImportOpen(false);
        await load();
      } else {
        toast.show(res.message || '导入失败', 'err');
      }
    } catch (e) {
      toast.show(e instanceof Error ? e.message : '导入失败', 'err');
    } finally {
      setBusy(null);
    }
  }, [cfg, importText, load, toast]);

  // ---------- 渲染 ----------
  const renderRow = ({ item, index }: { item: Row; index: number }) => {
    const aliveTone = item.alive === true ? colors.green : item.alive === false ? colors.red : colors.gray;
    const aliveBg = item.alive === true ? colors.greenSoft : item.alive === false ? colors.redSoft : colors.graySoft;
    const aliveText = item.alive === true ? '在线' : item.alive === false ? '失效' : '未检测';
    const isSelected = selected.includes(item.email);
    return (
      <FadeIn index={index}>
        <PressableScale
          onPress={() => (selecting ? toggleSelect(item.email) : setDetail(item))}
          onLongPress={() => {
            if (!selecting) {
              setSelecting(true);
              setSelected([item.email]);
            }
          }}
          scaleTo={0.98}
          style={styles.rowWrap}
        >
          <View style={[styles.row, { backgroundColor: colors.card }, cardShadow(isDark)]}>
            {selecting ? (
              <View
                style={[
                  styles.checkCircle,
                  { borderColor: isSelected ? colors.tint : colors.separator },
                  isSelected && { backgroundColor: colors.tint },
                ]}
              >
                {isSelected ? <SymbolView name="checkmark" size={12} tintColor="#FFFFFF" weight="bold" /> : null}
              </View>
            ) : null}
            <View style={[styles.avatar, { backgroundColor: aliveBg }]}>
              <SymbolView name="person.fill" size={17} tintColor={aliveTone} weight="semibold" />
            </View>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={[styles.rowTitle, { color: colors.text }]}>
                {item.email}
              </Text>
              <View style={styles.rowMeta}>
                <View style={[styles.miniDot, { backgroundColor: aliveTone }]} />
                <Text style={[styles.rowMetaText, { color: colors.textTertiary }]}>
                  {aliveText} · CEP {formatNumber(Number(item.balance4) || 0)}
                  {item.checked_at ? ` · ${shortTime(item.checked_at)}` : ''}
                </Text>
              </View>
            </View>
            {item.uploaded ? <Badge text="已上传" tone="orange" /> : null}
            {!selecting ? <SymbolView name="chevron.right" size={12} tintColor={colors.gray} weight="semibold" /> : null}
          </View>
        </PressableScale>
      </FadeIn>
    );
  };

  const header = (
    <View>
      <View style={[styles.searchBox, { backgroundColor: colors.fill }]}>
        <SymbolView name="magnifyingglass" size={15} tintColor={colors.gray} weight="semibold" />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="搜索邮箱或用户名"
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <SymbolView name="xmark.circle.fill" size={15} tintColor={colors.gray} />
          </Pressable>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {FILTERS.map((f) => (
          <FilterChip key={f.key} label={f.label} count={counts[f.key]} active={filter === f.key} onPress={() => setFilter(f.key)} />
        ))}
      </ScrollView>
      <View style={styles.resultRow}>
        <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
          {filtered.length} 个账号 · {SORTS.find((s) => s.key === sort)?.label}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScreenHeader
        title="账号"
        right={
          <>
            <IconButton icon={selecting ? 'checkmark.circle.fill' : 'checkmark.circle'} tone={selecting ? 'blue' : 'gray'} onPress={() => (selecting ? exitSelection() : setSelecting(true))} />
            <IconButton icon="arrow.up.arrow.down" tone="gray" onPress={cycleSort} />
            <IconButton icon="square.and.arrow.down" tone="gray" onPress={() => setImportOpen(true)} />
            <IconButton icon="ellipsis" tone="gray" onPress={() => setMoreOpen(true)} />
          </>
        }
      />
      {accounts === null ? (
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Card key={i} style={styles.skeletonRow}>
              <Skeleton width={36} height={36} round={18} />
              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton width="55%" height={14} />
                <Skeleton width="80%" height={11} />
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.email}
          renderItem={renderRow}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <EmptyState icon="tray" title="没有匹配的账号" message={query || filter !== 'all' ? '尝试更换筛选条件或搜索关键词' : '点击右上角导入按钮添加账号'} />
          }
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: selecting ? 170 : 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
          initialNumToRender={12}
          windowSize={7}
          removeClippedSubviews
        />
      )}

      {selecting ? (
        <View style={[styles.batchBar, { backgroundColor: colors.card }, cardShadow(isDark)]}>
          <Text style={[styles.batchCount, { color: colors.textSecondary }]}>已选 {selected.length}</Text>
          <View style={styles.batchBtns}>
            <Button compact kind="tinted" title="检测" loading={busy === 'batch'} onPress={() => batchAction('check')} />
            <Button compact kind="tinted" title="领取" loading={busy === 'batch'} onPress={() => batchAction('claim')} />
            <Button compact kind="tinted" title="上传" loading={busy === 'batch'} onPress={() => batchAction('upload')} />
            <Button compact kind="danger" title="删除" loading={busy === 'batch'} onPress={() => batchAction('delete')} />
          </View>
        </View>
      ) : null}

      {/* 账号详情 */}
      <Sheet visible={!!detail} onClose={() => setDetail(null)} title={detail?.email || '账号详情'} scroll>
        {detail ? (
          <View>
            <View style={styles.detailBadges}>
              <Badge
                text={detail.alive === true ? '在线' : detail.alive === false ? '失效' : '未检测'}
                tone={detail.alive === true ? 'green' : detail.alive === false ? 'red' : 'gray'}
                dot
              />
              {detail.uploaded ? <Badge text="已上传中转站" tone="orange" /> : <Badge text="未上传" tone="gray" />}
              {String(detail.status || '').includes('封禁') ? <Badge text={String(detail.status)} tone="red" /> : null}
            </View>
            <Divider style={{ marginVertical: spacing.sm }} />
            <InfoRow label="邮箱" value={detail.email} mono onCopy={() => copy('邮箱', detail.email)} copied={copied === '邮箱'} />
            <InfoRow label="用户名" value={String(detail.name || detail.username || '')} onCopy={() => copy('用户名', String(detail.name || detail.username || ''))} copied={copied === '用户名'} />
            <InfoRow label="密码" value={detail.password || ''} mono onCopy={() => copy('密码', detail.password)} copied={copied === '密码'} />
            <InfoRow label="Token" value={detail.token || ''} mono onCopy={() => copy('Token', detail.token)} copied={copied === 'Token'} />
            <InfoRow label="API Key" value={detail.api || ''} mono onCopy={() => copy('API Key', detail.api)} copied={copied === 'API Key'} />
            <Divider style={{ marginVertical: spacing.sm }} />
            <InfoRow label="CEP 余量" value={formatNumber(Number(detail.balance4) || 0)} />
            <InfoRow label="检测时间" value={detail.checked_at || ''} />
            <View style={styles.detailActions}>
              <Button compact kind="tinted" icon="waveform.path.ecg" title="检测" loading={busy === 'check1'} onPress={() => void checkOne(detail.email)} style={{ flex: 1 }} />
              <Button compact kind="tinted" icon="gift.fill" title="领取" loading={busy === 'claim1'} onPress={() => void claimOne(detail.email)} style={{ flex: 1 }} />
            </View>
            <View style={styles.detailActions}>
              {detail.uploaded ? (
                <Button compact kind="gray" icon="arrow.uturn.backward" title="取消标记" loading={busy === 'unmark1'} onPress={() => void unmarkOne(detail.email)} style={{ flex: 1 }} />
              ) : (
                <Button compact kind="tinted" icon="tray.and.arrow.up.fill" title="上传中转站" loading={busy === 'upload1'} onPress={() => void uploadOne(detail.email)} style={{ flex: 1 }} />
              )}
              <Button compact kind="danger" icon="trash" title="删除" loading={busy === 'delete1'} onPress={() => deleteOne(detail.email)} style={{ flex: 1 }} />
            </View>
          </View>
        ) : null}
      </Sheet>

      {/* 导入 */}
      <Sheet visible={importOpen} onClose={() => setImportOpen(false)} title="导入账号" scroll>
        <Text style={[styles.importHint, { color: colors.textTertiary }]}>
          支持每行一个账号，格式：邮箱----密码----Token----API Key
        </Text>
        <Field
          value={importText}
          onChangeText={setImportText}
          placeholder="粘贴账号文本…"
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          inputStyle={[styles.importArea, { fontFamily: monoFont }]}
        />
        <Button title="开始导入" icon="square.and.arrow.down.fill" loading={busy === 'import'} onPress={() => void doImport()} style={{ marginTop: spacing.md }} />
      </Sheet>

      {/* 更多操作 */}
      <Sheet visible={moreOpen} onClose={() => setMoreOpen(false)} title="批量清理">
        <View style={{ gap: spacing.sm }}>
          <Button kind="gray" icon="xmark.circle" title="删除所有失效账号" loading={busy === 'more'} onPress={() => moreAction('删除失效账号', async () => { const r = await api.deleteBatch(cfg, { mode: 'dead' }); return r.success ? `已删除 ${r.deleted ?? 0} 个` : r.message || '删除失败'; })} />
          <Button kind="gray" icon="tray.full" title="删除所有已上传账号" loading={busy === 'more'} onPress={() => moreAction('删除已上传账号', async () => { const r = await api.deleteBatch(cfg, { mode: 'uploaded' }); return r.success ? `已删除 ${r.deleted ?? 0} 个` : r.message || '删除失败'; })} />
          <Button kind="gray" icon="bolt.slash" title="删除 CEP 为 0 的账号" loading={busy === 'more'} onPress={() => moreAction('删除 CEP 为 0 的账号', async () => { const r = await api.deleteBatch(cfg, { mode: 'cep_zero' }); return r.success ? `已删除 ${r.deleted ?? 0} 个` : r.message || '删除失败'; })} />
          <Button kind="gray" icon="arrow.uturn.backward" title="取消全部上传标记" loading={busy === 'more'} onPress={() => moreAction('取消全部上传标记', async () => { const r = await api.unmarkUploaded(cfg, { all: true }); return r.success ? '已取消全部标记' : r.message || '操作失败'; })} />
        </View>
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 40,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  chipsRow: { gap: 8, paddingBottom: spacing.sm },
  resultRow: { paddingHorizontal: spacing.xs, paddingBottom: spacing.sm },
  rowWrap: { marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  miniDot: { width: 5, height: 5, borderRadius: 3 },
  rowMetaText: { fontSize: 12, fontVariant: ['tabular-nums'] },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  batchBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 96,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  batchCount: { fontSize: 13, fontWeight: '600' },
  batchBtns: { flex: 1, flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  detailBadges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: spacing.xs },
  detailActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  importHint: { fontSize: 12, lineHeight: 17, marginBottom: spacing.md },
  importArea: { height: 160, textAlignVertical: 'top', paddingTop: spacing.md, fontSize: 12.5 },
});