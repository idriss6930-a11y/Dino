import { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { apiGet } from "@/lib/api";
import type { Place } from "@/lib/types";
import { C } from "@/lib/theme";
import { s } from "./ui";

type Suggestion = Place & { kind: "metro" | "airport" };

/** Champ ville ou aéroport avec suggestions de l'API DINO. */
export function PlaceInput({ label, value, onChange, placeholder }: { label: string; value: Place | null; onChange: (p: Place | null) => void; placeholder?: string }) {
  const [text, setText] = useState(value?.label ?? "");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [focused, setFocused] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setText(value?.label ?? "");
  }, [value?.label]);

  function query(t: string) {
    setText(t);
    onChange(null);
    if (timer.current) clearTimeout(timer.current);
    if (t.trim().length < 2) return setItems([]);
    timer.current = setTimeout(() => {
      apiGet<{ suggestions: Suggestion[] }>(`/api/places?q=${encodeURIComponent(t)}`)
        .then((r) => setItems(r.suggestions))
        .catch(() => setItems([]));
    }, 220);
  }

  const open = focused && items.length > 0 && !value;
  return (
    <View style={{ gap: 4 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={s.input}
        value={text}
        placeholder={placeholder}
        placeholderTextColor="#94a39a"
        accessibilityLabel={label}
        autoCorrect={false}
        onChangeText={query}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 200)}
      />
      {open && (
        <View style={[s.card, { padding: 4, gap: 0 }]} accessibilityRole="list">
          {items.map((it) => (
            <Pressable
              key={it.code}
              accessibilityRole="button"
              onPress={() => {
                onChange({ code: it.code, label: it.label });
                setItems([]);
              }}
              style={({ pressed }) => ({ padding: 10, borderRadius: 10, backgroundColor: pressed ? C.sage100 : "transparent" })}
            >
              <Text style={{ fontWeight: "600", color: C.deep900 }}>
                {it.kind === "metro" ? "📍 " : "✈️ "}
                {it.label}
              </Text>
              {it.sub ? <Text style={s.muted}>{it.sub}</Text> : null}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
