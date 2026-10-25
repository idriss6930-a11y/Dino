/**
 * Contenu de DÉMONSTRATION, clairement marqué comme tel (isDemo = true, badge « Démo » dans l'interface).
 * Ces conseils sont des exemples génériques rédigés pour illustrer la communauté : ce ne sont pas des avis de vrais voyageurs.
 * Usage : npm run db:seed   (idempotent ; DEMO_SEED_PASSWORD optionnel, sinon un mot de passe aléatoire est affiché une fois)
 * Optionnel : ADMIN_EMAIL + ADMIN_PASSWORD pour créer (ou promouvoir) un compte administrateur.
 */
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import * as s from "@/lib/db/schema";
import { hashPassword, registerUser } from "@/lib/services/auth";
import { newId, randomToken, sha256 } from "@/lib/utils/ids";
import { getDestination } from "@/data/destinations";
import { normalizeForHash } from "@/lib/services/community";

const DEMO_TIPS: { slug: string; category: (typeof s.TIP_CATEGORIES)[number]; title: string; body: string }[] = [
  { slug: "lisbonne", category: "transports", title: "Exemple : le tram 28 tôt le matin", body: "Exemple de démonstration. Le tram 28 est souvent bondé en journée : y monter au terminus avant 9 h laisse plus de chances d'avoir une place. Pensez à la carte rechargeable plutôt qu'au ticket à bord." },
  { slug: "rome", category: "erreurs", title: "Exemple : vérifier l'addition près des sites", body: "Exemple de démonstration. Près des grands monuments, regardez le menu affiché et les éventuels frais de couvert avant de vous asseoir. S'éloigner de quelques rues change souvent les prix." },
  { slug: "tokyo", category: "economies", title: "Exemple : les menus du midi", body: "Exemple de démonstration. Beaucoup de restaurants proposent des formules du midi bien moins chères que le soir. C'est une bonne façon de goûter des adresses réputées avec un petit budget." },
  { slug: "reykjavik", category: "pratique", title: "Exemple : consulter la météo routière", body: "Exemple de démonstration. En hiver, consultez chaque matin les sites officiels de météo et d'état des routes avant de prendre le volant ; les conditions changent très vite." },
  { slug: "marrakech", category: "pratique", title: "Exemple : négocier avec le sourire", body: "Exemple de démonstration. Dans les souks, la négociation fait partie de l'échange. Fixez-vous un prix maximum avant de commencer et restez courtois." },
  { slug: "bangkok", category: "transports", title: "Exemple : le bateau sur la rivière", body: "Exemple de démonstration. Les bateaux qui remontent la rivière Chao Phraya sont une alternative pratique aux embouteillages pour rejoindre les temples du vieux centre." },
];

async function main() {
  const db = await getDb();
  const email = "demo@dino.example";
  let [demo] = await db.select().from(s.users).where(eq(s.users.email, email));
  let password: string | undefined;
  if (!demo) {
    password = process.env.DEMO_SEED_PASSWORD ?? `Dino-${randomToken(9)}`;
    await registerUser({ email, password, displayName: "Compte démo DINO", acceptTerms: true });
    [demo] = await db.select().from(s.users).where(eq(s.users.email, email));
    await db.update(s.users).set({ bio: "Compte de démonstration : son contenu sert d'exemple et n'est pas un vrai témoignage." }).where(eq(s.users.id, demo.id));
  }
  let added = 0;
  for (const t of DEMO_TIPS) {
    const d = getDestination(t.slug);
    if (!d) continue;
    const hash = sha256(normalizeForHash(t.body));
    const exists = await db.select({ id: s.tips.id }).from(s.tips).where(eq(s.tips.contentHash, hash));
    if (exists.length) continue;
    await db.insert(s.tips).values({ id: newId(), authorId: demo.id, destinationSlug: d.slug, countryIso: d.countryIso, category: t.category, kind: "experience", title: t.title, body: t.body, contentHash: hash, isDemo: true });
    added++;
  }
  console.log(`✓ ${added} conseil(s) de démonstration ajouté(s) (marqués « Démo »).`);
  if (password) console.log(`  Compte démo : ${email} / ${password}  (affiché une seule fois)`);

  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const adminEmail = process.env.ADMIN_EMAIL.trim().toLowerCase();
    let [admin] = await db.select().from(s.users).where(eq(s.users.email, adminEmail));
    if (!admin) {
      await registerUser({ email: adminEmail, password: process.env.ADMIN_PASSWORD, displayName: "Modération DINO", acceptTerms: true });
      [admin] = await db.select().from(s.users).where(eq(s.users.email, adminEmail));
    } else {
      await db.update(s.users).set({ passwordHash: await hashPassword(process.env.ADMIN_PASSWORD) }).where(eq(s.users.id, admin.id));
    }
    await db.update(s.users).set({ role: "admin" }).where(eq(s.users.id, admin.id));
    console.log(`✓ Compte administrateur prêt : ${adminEmail}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("Échec du seed :", e instanceof Error ? e.message : e);
  process.exit(1);
});
