import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Dino, type DinoMood } from "./Dino";
import { C } from "@/lib/theme";

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const insets = useSafeAreaInsets();
  if (!scroll) return <View style={[s.screen, { paddingTop: 8 }]}>{children}</View>;
  return (
    <ScrollView style={s.screenBg} contentContainerStyle={[s.screen, { paddingBottom: 24 + insets.bottom }]} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function Header({ title, subtitle, mood = "happy" }: { title: string; subtitle?: string; mood?: DinoMood }) {
  return (
    <View style={s.header}>
      <Dino mood={mood} size={64} />
      <View style={{ flex: 1 }}>
        <Text style={s.h1} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={s.muted}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

const BADGES = {
  demo: { label: "Démo", fg: C.orange600, bg: "#fdf0e6", border: C.orange400 },
  test: { label: "Bac à sable", fg: C.orange600, bg: "#fdf0e6", border: C.orange400 },
  live: { label: "En direct", fg: C.deep800, bg: C.sage100, border: C.sage500 },
  cached: { label: "Prix en cache", fg: C.deep700, bg: C.sage50, border: C.sage400 },
  estimation: { label: "Estimation", fg: "#92400e", bg: "#fffbeb", border: "#fbbf24" },
} as const;
export type BadgeKind = keyof typeof BADGES;

export function Badge({ kind, label }: { kind: BadgeKind; label?: string }) {
  const b = BADGES[kind];
  return (
    <View style={[s.badge, { backgroundColor: b.bg, borderColor: b.border }]}>
      <Text style={[s.badgeText, { color: b.fg }]}>{label ?? b.label}</Text>
    </View>
  );
}

export function sourceBadge(source: { id: string; isDemo: boolean; freshness: string }): BadgeKind {
  if (source.isDemo) return source.id.startsWith("demo") ? "demo" : "test";
  return source.freshness === "live" ? "live" : "cached";
}

export function Button({ label, onPress, variant = "primary", disabled, loading }: { label: string; onPress: () => void; variant?: "primary" | "accent" | "ghost"; disabled?: boolean; loading?: boolean }) {
  const bg = variant === "primary" ? C.deep800 : variant === "accent" ? C.orange500 : C.white;
  const fg = variant === "ghost" ? C.deep800 : C.white;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled || !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [s.button, { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 }, variant === "ghost" && { borderWidth: 1, borderColor: C.sage200 }]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[s.buttonText, { color: fg }]}>{label}</Text>}
    </Pressable>
  );
}

export function Field({ label, ...props }: { label: string } & TextInputProps) {
  return (
    <View style={{ gap: 4, flex: 1 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput placeholderTextColor="#94a39a" style={s.input} accessibilityLabel={label} {...props} />
    </View>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <View style={s.error} accessibilityRole="alert">
      <Text style={{ color: C.danger }}>{message}</Text>
    </View>
  );
}

export function Notice({ children, tone = "demo" }: { children: ReactNode; tone?: "demo" | "info" }) {
  return (
    <View style={[s.notice, tone === "info" && { backgroundColor: C.sage50, borderColor: C.sage200 }]}>
      <Text style={{ color: tone === "demo" ? C.orange600 : C.deep800, fontSize: 13 }}>{children}</Text>
    </View>
  );
}

export function Loading({ label = "DINO cherche…" }: { label?: string }) {
  return (
    <View style={{ alignItems: "center", padding: 24, gap: 8 }}>
      <Dino mood="thinking" size={72} />
      <ActivityIndicator color={C.deep800} />
      <Text style={s.muted}>{label}</Text>
    </View>
  );
}

export function Empty({ title, children, mood = "sleeping" }: { title: string; children?: ReactNode; mood?: DinoMood }) {
  return (
    <Card style={{ alignItems: "center", gap: 8 }}>
      <Dino mood={mood} size={72} />
      <Text style={s.h2}>{title}</Text>
      {children ? <Text style={[s.muted, { textAlign: "center" }]}>{children}</Text> : null}
    </Card>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!active }} onPress={onPress} style={[s.chip, active && { backgroundColor: C.deep800, borderColor: C.deep800 }]}>
      <Text style={{ color: active ? C.white : C.deep800, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

export const s = StyleSheet.create({
  screenBg: { backgroundColor: C.cream50 },
  screen: { padding: 16, gap: 14, backgroundColor: C.cream50, flexGrow: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  h1: { fontSize: 26, fontWeight: "900", color: C.deep900 },
  h2: { fontSize: 18, fontWeight: "800", color: C.deep900 },
  text: { color: C.ink, fontSize: 15, lineHeight: 21 },
  muted: { color: C.muted, fontSize: 13, lineHeight: 18 },
  label: { color: C.deep800, fontWeight: "600", fontSize: 13 },
  card: { backgroundColor: C.white, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: C.sage100, gap: 8, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2, alignSelf: "flex-start" },
  badgeText: { fontSize: 12, fontWeight: "700" },
  button: { borderRadius: 999, paddingVertical: 13, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", minHeight: 48 },
  buttonText: { fontWeight: "700", fontSize: 16 },
  input: { borderWidth: 1, borderColor: C.sage200, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 16, color: C.ink, backgroundColor: C.white },
  error: { backgroundColor: "#fef3f2", borderColor: "#fecdca", borderWidth: 1, borderRadius: 12, padding: 12 },
  notice: { backgroundColor: "#fdf0e6", borderColor: C.orange400, borderWidth: 1, borderRadius: 12, padding: 10 },
  chip: { borderWidth: 1, borderColor: C.sage200, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: C.white },
  row: { flexDirection: "row", gap: 10, alignItems: "center" },
  price: { fontSize: 28, fontWeight: "900", color: C.deep900 },
});
