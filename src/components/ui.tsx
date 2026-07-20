import { SymbolView } from 'expo-symbols';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cardShadow, monoFont, radius, spacing, useTheme } from '@/lib/theme';

type SFSymbolName = React.ComponentProps<typeof SymbolView>['name'];

// ---------- 按压缩放 ----------
export function PressableScale({
  children,
  onPress,
  onLongPress,
  disabled,
  style,
  scaleTo = 0.96,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const animate = (to: number) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={320}
      onPressIn={() => animate(scaleTo)}
      onPressOut={() => animate(1)}
      style={style}
    >
      <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
    </Pressable>
  );
}

// ---------- 卡片 ----------
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={[
        { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg },
        cardShadow(isDark),
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ---------- 分组标题 ----------
export function SectionTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionRow}>
      <Text style={[styles.sectionText, { color: colors.textTertiary }]}>{title}</Text>
      {right}
    </View>
  );
}

// ---------- 徽标 ----------
export type Tone = 'green' | 'red' | 'orange' | 'gray' | 'blue';

export function toneColors(colors: ReturnType<typeof useTheme>['colors']): Record<Tone, { fg: string; bg: string }> {
  return {
    green: { fg: colors.green, bg: colors.greenSoft },
    red: { fg: colors.red, bg: colors.redSoft },
    orange: { fg: colors.orange, bg: colors.orangeSoft },
    gray: { fg: colors.gray, bg: colors.graySoft },
    blue: { fg: colors.tint, bg: colors.tintSoft },
  };
}

export function Badge({ text, tone = 'gray', dot }: { text: string; tone?: Tone; dot?: boolean }) {
  const { colors } = useTheme();
  const t = toneColors(colors)[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      {dot ? <View style={[styles.badgeDot, { backgroundColor: t.fg }]} /> : null}
      <Text style={[styles.badgeText, { color: t.fg }]}>{text}</Text>
    </View>
  );
}

// ---------- 统计卡 ----------
export function StatCard({
  icon,
  label,
  value,
  tone = 'blue',
  style,
}: {
  icon: SFSymbolName;
  label: string;
  value: string;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, isDark } = useTheme();
  const t = toneColors(colors)[tone];
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card }, cardShadow(isDark), style]}>
      <View style={[styles.statIcon, { backgroundColor: t.bg }]}>
        <SymbolView name={icon} size={17} tintColor={t.fg} weight="semibold" />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{label}</Text>
    </View>
  );
}

// ---------- 按钮 ----------
export type ButtonKind = 'primary' | 'tinted' | 'gray' | 'danger' | 'dangerSolid';

export function Button({
  title,
  onPress,
  kind = 'primary',
  icon,
  loading,
  disabled,
  compact,
  style,
}: {
  title: string;
  onPress: () => void;
  kind?: ButtonKind;
  icon?: SFSymbolName;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const scheme: Record<ButtonKind, { bg: string; fg: string }> = {
    primary: { bg: colors.tint, fg: '#FFFFFF' },
    tinted: { bg: colors.tintSoft, fg: colors.tint },
    gray: { bg: colors.graySoft, fg: colors.text },
    danger: { bg: colors.redSoft, fg: colors.red },
    dangerSolid: { bg: colors.red, fg: '#FFFFFF' },
  };
  const s = scheme[kind];
  const inactive = disabled || loading;
  return (
    <PressableScale onPress={onPress} disabled={inactive} style={style}>
      <View style={[styles.button, compact && styles.buttonCompact, { backgroundColor: s.bg, opacity: inactive ? 0.45 : 1 }]}>
        {loading ? (
          <ActivityIndicator size="small" color={s.fg} />
        ) : (
          <>
            {icon ? <SymbolView name={icon} size={compact ? 14 : 16} tintColor={s.fg} weight="semibold" /> : null}
            <Text style={[styles.buttonText, compact && styles.buttonTextCompact, { color: s.fg }]}>{title}</Text>
          </>
        )}
      </View>
    </PressableScale>
  );
}

// ---------- 圆形图标按钮 ----------
export function IconButton({
  icon,
  onPress,
  tone = 'gray',
  loading,
  disabled,
  size = 36,
}: {
  icon: SFSymbolName;
  onPress?: () => void;
  tone?: Tone;
  loading?: boolean;
  disabled?: boolean;
  size?: number;
}) {
  const { colors } = useTheme();
  const t = toneColors(colors)[tone];
  const inactive = disabled || loading;
  return (
    <PressableScale onPress={onPress} disabled={inactive} scaleTo={0.88}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: t.bg,
          opacity: inactive ? 0.5 : 1,
        }}
      >
        {loading ? (
          <ActivityIndicator size="small" color={t.fg} />
        ) : (
          <SymbolView name={icon} size={size * 0.46} tintColor={t.fg} weight="semibold" />
        )}
      </View>
    </PressableScale>
  );
}

// ---------- 筛选胶囊 ----------
export function FilterChip({
  label,
  active,
  onPress,
  count,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  count?: number;
}) {
  const { colors } = useTheme();
  return (
    <PressableScale onPress={onPress} scaleTo={0.94}>
      <View
        style={[
          styles.chip,
          { backgroundColor: active ? colors.tint : colors.fill },
        ]}
      >
        <Text style={[styles.chipText, { color: active ? '#FFFFFF' : colors.textSecondary }]}>
          {label}
          {count !== undefined ? ' ' + count : ''}
        </Text>
      </View>
    </PressableScale>
  );
}

// ---------- 输入框 ----------
export function Field({
  label,
  style,
  inputStyle,
  ...props
}: {
  label?: string;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
} & TextInputProps) {
  const { colors } = useTheme();
  return (
    <View style={style}>
      {label ? <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textTertiary}
        style={[styles.fieldInput, { backgroundColor: colors.fill, color: colors.text, borderRadius: radius.md }, inputStyle]}
        {...props}
      />
    </View>
  );
}

// ---------- 信息行（标签 + 值，可复制） ----------
export function InfoRow({
  label,
  value,
  mono,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  mono?: boolean;
  onCopy?: () => void;
  copied?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>{label}</Text>
      <Text
        selectable
        numberOfLines={2}
        style={[styles.infoValue, { color: colors.text }, mono && { fontFamily: monoFont, fontSize: 12.5 }]}
      >
        {value || '—'}
      </Text>
      {onCopy ? (
        <Pressable onPress={onCopy} hitSlop={8}>
          <SymbolView
            name={copied ? 'checkmark' : 'doc.on.doc'}
            size={14}
            tintColor={copied ? colors.green : colors.gray}
            weight="semibold"
          />
        </Pressable>
      ) : null}
    </View>
  );
}

// ---------- 分隔线 ----------
export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator }, style]} />;
}

// ---------- 骨架屏 ----------
export function Skeleton({ width, height = 14, round = 8, style }: { width: number | string; height?: number; round?: number; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={[{ width: width as number, height, borderRadius: round, backgroundColor: colors.graySoft, opacity }, style]}
    />
  );
}

// ---------- 开关行 ----------
export function SwitchRow({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.switchRow}>
      <View style={{ flex: 1, paddingRight: spacing.md }}>
        <Text style={[styles.switchLabel, { color: colors.text }]}>{label}</Text>
        {description ? <Text style={[styles.switchDesc, { color: colors.textTertiary }]}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.graySoft, true: colors.green }}
        ios_backgroundColor={colors.graySoft}
      />
    </View>
  );
}

// ---------- 分段选择器 ----------
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, isDark } = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.key === value));
  const anim = useRef(new Animated.Value(index)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: index, useNativeDriver: true, speed: 28, bounciness: 6 }).start();
  }, [anim, index]);
  const last = Math.max(1, options.length - 1);
  const segW = width > 0 ? (width - 4) / options.length : 0;
  return (
    <View
      style={[styles.segmented, { backgroundColor: colors.fill }, style]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {segW > 0 ? (
        <Animated.View
          style={[
            styles.segmentedThumb,
            {
              width: segW,
              backgroundColor: colors.card,
              transform: [{ translateX: anim.interpolate({ inputRange: [0, last], outputRange: [0, segW * last] }) }],
            },
            cardShadow(isDark),
          ]}
        />
      ) : null}
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable key={o.key} style={styles.segmentedItem} onPress={() => onChange(o.key)}>
            <Text style={[styles.segmentedText, { color: active ? colors.text : colors.textTertiary }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------- 底部弹层 ----------
export function Sheet({
  visible,
  onClose,
  title,
  children,
  scroll,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  scroll?: boolean;
}) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(56)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slide, { toValue: 0, useNativeDriver: true, speed: 24, bounciness: 3 }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slide, { toValue: 56, duration: 180, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible, mounted, fade, slide]);

  if (!mounted) return null;
  return (
    <Modal transparent visible statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={[styles.sheetBackdrop, { backgroundColor: colors.backdrop, opacity: fade }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheetBody,
            cardShadow(isDark),
            { backgroundColor: colors.card, paddingBottom: insets.bottom + spacing.lg, transform: [{ translateY: slide }] },
          ]}
        >
          <View style={[styles.sheetGrabber, { backgroundColor: colors.separator }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>{title}</Text>
          {scroll ? (
            <ScrollView style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          ) : (
            children
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------- 轻提示 ----------
type ToastKind = 'ok' | 'err' | 'info';
interface ToastState { text: string; kind: ToastKind; id: number }
const ToastContext = createContext<{ show: (text: string, kind?: ToastKind) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (text: string, kind: ToastKind = 'info') => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ text, kind, id: Date.now() });
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();
      timer.current = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setToast(null));
      }, 2400);
    },
    [anim],
  );

  const value = useMemo(() => ({ show }), [show]);
  const iconMap: Record<ToastKind, { name: SFSymbolName; color: string }> = {
    ok: { name: 'checkmark.circle.fill', color: '#34C759' },
    err: { name: 'xmark.octagon.fill', color: '#FF3B30' },
    info: { name: 'info.circle.fill', color: '#8E8E93' },
  };
  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            {
              top: insets.top + 8,
              backgroundColor: isDark ? colors.cardAlt : '#1C1C1E',
              opacity: anim,
              transform: [
                { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) },
                { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
              ],
            },
          ]}
        >
          <SymbolView name={iconMap[toast.kind].name} size={16} tintColor={iconMap[toast.kind].color} />
          <Text style={styles.toastText} numberOfLines={2}>
            {toast.text}
          </Text>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast 必须在 ToastProvider 内使用');
  return ctx;
}

// ---------- 空状态 ----------
export function EmptyState({
  icon,
  title,
  message,
}: {
  icon: SFSymbolName;
  title: string;
  message?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <SymbolView name={icon} size={44} tintColor={colors.gray} weight="light" />
      <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>{title}</Text>
      {message ? <Text style={[styles.emptyMsg, { color: colors.textTertiary }]}>{message}</Text> : null}
    </View>
  );
}

// ---------- 进度条 ----------
export function ProgressBar({
  value,
  max,
  tone = 'blue',
  style,
}: {
  value: number;
  max: number;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const ratio = max > 0 ? Math.min(1, value / max) : 0;
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: ratio, duration: 320, useNativeDriver: false }).start();
  }, [anim, ratio]);
  const fg = tone === 'green' ? colors.green : tone === 'red' ? colors.red : tone === 'orange' ? colors.orange : colors.tint;
  return (
    <View style={[styles.progressTrack, { backgroundColor: colors.graySoft }, style]}>
      <Animated.View
        style={[styles.progressFill, { backgroundColor: fg, width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
      />
    </View>
  );
}

// ---------- 日志控制台 ----------
export function LogConsole({ lines, height = 200 }: { lines: string[]; height?: number }) {
  const { colors } = useTheme();
  const ref = useRef<ScrollView>(null);
  return (
    <View style={[{ backgroundColor: colors.consoleBg, borderRadius: radius.lg, height }, styles.consoleWrap]}>
      <ScrollView
        ref={ref}
        onContentSizeChange={() => ref.current?.scrollToEnd({ animated: false })}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.md }}
      >
        {lines.length === 0 ? (
          <Text style={[styles.consoleText, { color: colors.gray }]}>暂无日志</Text>
        ) : (
          lines.map((line, i) => (
            <Text key={i} style={[styles.consoleText, { color: colors.consoleText }]}>
              {line}
            </Text>
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ---------- 状态点 ----------
export function StatusDot({ ok, size = 8 }: { ok: boolean | null; size?: number }) {
  const { colors } = useTheme();
  const color = ok === null ? colors.gray : ok ? colors.green : colors.red;
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
}

// ---------- 页面大标题 ----------
export function ScreenHeader({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.headerRow}>
      <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
      <View style={styles.headerRight}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xs,
  },
  sectionText: { fontSize: 13, fontWeight: '600', letterSpacing: 0.4 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    height: 22,
    borderRadius: radius.pill,
  },
  badgeDot: { width: 5, height: 5, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  statCard: { padding: spacing.lg, flexGrow: 1, borderRadius: radius.lg },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: { fontSize: 26, fontWeight: '700', letterSpacing: 0.2, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 12, marginTop: 2 },
  button: {
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.lg,
  },
  buttonCompact: { height: 34, paddingHorizontal: spacing.md, borderRadius: radius.sm },
  buttonText: { fontSize: 16, fontWeight: '600' },
  buttonTextCompact: { fontSize: 13 },
  chip: {
    paddingHorizontal: 14,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  fieldLabel: { fontSize: 13, marginBottom: 6, marginLeft: 2 },
  fieldInput: { height: 42, paddingHorizontal: spacing.md, fontSize: 15 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 7 },
  infoLabel: { width: 64, fontSize: 13 },
  infoValue: { flex: 1, fontSize: 13.5, textAlign: 'right' },
  switchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  switchLabel: { fontSize: 15, fontWeight: '500' },
  switchDesc: { fontSize: 12, marginTop: 2 },
  segmented: { flexDirection: 'row', borderRadius: 10, padding: 2, position: 'relative' },
  segmentedThumb: { position: 'absolute', top: 2, left: 2, bottom: 2, borderRadius: 8 },
  segmentedItem: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 32 },
  segmentedText: { fontSize: 13, fontWeight: '600' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject },
  sheetBody: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '88%',
  },
  sheetGrabber: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    marginBottom: spacing.md,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.md, textAlign: 'center' },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: radius.pill,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    maxWidth: '86%',
  },
  toastText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  emptyMsg: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  consoleWrap: { overflow: 'hidden' },
  consoleText: { fontFamily: monoFont, fontSize: 11, lineHeight: 17 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerTitle: { fontSize: 32, fontWeight: '800', letterSpacing: 0.2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});