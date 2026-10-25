import { useCallback, useEffect, useState } from "react";
import { Linking, Text, View } from "react-native";
import { Button, Card, Empty, ErrorBox, Field, Header, Loading, Screen, s } from "@/components/ui";
import { API_URL, ApiError, apiGet, apiPost } from "@/lib/api";
import { money } from "@/lib/format";
import type { Alert, Me } from "@/lib/types";

export default function Compte() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const m = await apiGet<Me>("/api/me");
      setMe(m);
      setAlerts((await apiGet<{ alerts: Alert[] }>("/api/alerts")).alerts);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setMe(null);
      else {
        setMe(null);
        setError((e as Error).message);
      }
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function login() {
    setBusy(true);
    setError("");
    try {
      await apiPost("/api/auth/login", { email: email.trim(), password });
      setPassword("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await apiPost("/api/auth/logout", {}).catch(() => {});
    setMe(null);
    setAlerts([]);
  }

  const web = API_URL || "";
  if (me === undefined)
    return (
      <Screen>
        <Loading label="Chargement…" />
      </Screen>
    );

  if (!me)
    return (
      <Screen>
        <Header title="Mon compte" subtitle="DINO fonctionne sans compte. Un compte sert à garder alertes, voyages et préférences." mood="explorer" />
        <Card>
          <Field label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <Field label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
          {error ? <ErrorBox message={error} /> : null}
          <Button label="Se connecter" onPress={login} loading={busy} disabled={!email || !password} />
        </Card>
        {web ? (
          <Button label="Créer un compte sur le site DINO" variant="ghost" onPress={() => Linking.openURL(`${web}/compte/inscription`)} />
        ) : null}
      </Screen>
    );

  return (
    <Screen>
      <Header title={`Bonjour ${me.user.displayName}`} subtitle={me.user.email} mood="happy" />
      <Text style={s.h2}>Mes alertes de prix</Text>
      {alerts.length === 0 && <Empty title="Aucune alerte">Créez-en une depuis une recherche de vols sur le site.</Empty>}
      {alerts.map((a) => (
        <Card key={a.id}>
          <Text style={{ fontWeight: "800" }}>{a.name}</Text>
          <Text style={s.muted}>
            {a.active ? "Active" : "En pause"}
            {a.lastPriceCents != null ? ` · dernier prix vu ${money(a.lastPriceCents, a.currency)}` : " · pas encore vérifiée"}
          </Text>
        </Card>
      ))}
      <View style={{ gap: 8 }}>
        {web ? <Button label="Gérer mon compte et mes données (site)" variant="ghost" onPress={() => Linking.openURL(`${web}/compte`)} /> : null}
        <Button label="Se déconnecter" variant="ghost" onPress={logout} />
      </View>
    </Screen>
  );
}
