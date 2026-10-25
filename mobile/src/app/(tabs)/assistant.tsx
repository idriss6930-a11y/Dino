import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View, type ScrollViewInstance } from "react-native";
import { Dino } from "@/components/Dino";
import { Badge, Button, Card, Chip, ErrorBox, s } from "@/components/ui";
import { apiPost } from "@/lib/api";
import { C } from "@/lib/theme";
import type { AssistantReply } from "@/lib/types";

type Msg = { role: "user"; content: string } | { role: "assistant"; content: string; reply: AssistantReply };

const EXAMPLES = ["Une semaine au soleil en mai pour 800 € depuis Paris", "Quel est le meilleur mois pour Lisbonne ?", "Un week-end pas cher en novembre"];
const SECTION_BADGE: Record<string, "estimation" | "live" | "cached" | undefined> = { Estimations: "estimation" };

export default function Assistant() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scroll = useRef<ScrollViewInstance>(null);

  async function send(content: string) {
    if (!content.trim() || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content }];
    setMsgs(next);
    setText("");
    setBusy(true);
    setError("");
    try {
      const reply = await apiPost<AssistantReply>("/api/assistant", { messages: next.map((m) => ({ role: m.role, content: m.content })) });
      const summary = reply.text ?? reply.sections.map((x) => `${x.title} : ${x.items.join(" ")}`).join("\n");
      setMsgs([...next, { role: "assistant", content: summary.slice(0, 1900), reply }]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.cream50 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <View style={[s.row, { backgroundColor: C.sage50, padding: 12, borderRadius: 16 }]}>
          <Dino mood="happy" size={48} />
          <Text style={[s.text, { flex: 1 }]}>Bonjour, je suis DINO ! Décrivez votre envie de voyage. Je sépare toujours les faits, les estimations, les prévisions et mes recommandations.</Text>
        </View>
        {msgs.length === 0 && (
          <View style={{ gap: 8 }}>
            {EXAMPLES.map((e) => (
              <Chip key={e} label={e} onPress={() => send(e)} />
            ))}
          </View>
        )}
        {msgs.map((m, i) =>
          m.role === "user" ? (
            <View key={i} style={{ alignSelf: "flex-end", maxWidth: "85%", backgroundColor: C.deep800, borderRadius: 16, padding: 10 }}>
              <Text style={{ color: C.white }}>{m.content}</Text>
            </View>
          ) : (
            <Card key={i}>
              <View style={s.row}>
                <Dino mood="explorer" size={32} />
                <Text style={s.muted}>{m.reply.mode === "ia" ? "Réponse de l'IA DINO" : "Analyse automatique (sans IA générative)"}</Text>
              </View>
              {m.reply.text && !m.reply.sections.length ? <Text style={s.text}>{m.reply.text}</Text> : null}
              {m.reply.sections.map((sec) => (
                <View key={sec.title} style={{ gap: 4 }}>
                  <View style={s.row}>
                    <Text style={{ fontWeight: "800", color: C.deep900 }}>{sec.title}</Text>
                    {SECTION_BADGE[sec.title] ? <Badge kind="estimation" /> : null}
                  </View>
                  {sec.items.map((it, j) => (
                    <Text key={j} style={s.text}>
                      • {it}
                    </Text>
                  ))}
                </View>
              ))}
              {m.reply.uncertainties.length > 0 && <Text style={s.muted}>Incertitudes : {m.reply.uncertainties.join(" ")}</Text>}
            </Card>
          ),
        )}
        {busy && <Text style={s.muted}>DINO réfléchit…</Text>}
        {error ? <ErrorBox message={error} /> : null}
      </ScrollView>
      <View style={{ flexDirection: "row", gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: C.sage100, backgroundColor: C.white }}>
        <TextInput
          style={[s.input, { flex: 1 }]}
          value={text}
          onChangeText={setText}
          placeholder="Ex. un week-end romantique en mai"
          placeholderTextColor="#94a39a"
          accessibilityLabel="Votre message"
          maxLength={2000}
          onSubmitEditing={() => send(text)}
          returnKeyType="send"
        />
        <Button label="Envoyer" variant="accent" onPress={() => send(text)} disabled={!text.trim()} loading={busy} />
      </View>
    </KeyboardAvoidingView>
  );
}
