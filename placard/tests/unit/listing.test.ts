import { describe, expect, it } from "vitest";
import { fitTitle, normalizeHashtags, writeWithRules } from "@/lib/listing/rules";
import { PLATFORMS, sheetFor } from "@/lib/listing/platforms";
import { estimateFeesCents, minPriceCents, netProfitCents } from "@/lib/listing/profit";
import { fromDraft, generateListing } from "@/lib/listing/generate";
import { AiUnavailableError, factsBlock } from "@/lib/listing/claude";
import { formatEur, parseEurToCents } from "@/lib/utils/money";
import type { ItemFacts } from "@/lib/listing/types";

const facts: ItemFacts = { kind: "veste en jean", brand: "Levi's", size: "M", color: "Bleu", material: "coton", audience: "femme", condition: "good", defects: "petite tache sur la manche", notes: "" };
const field = (sheet: ReturnType<typeof sheetFor>, key: string) => sheet.fields.find((f) => f.key === key)?.value;

describe("rédaction par règles", () => {
  it("compose un titre avec les mots cherchés, sans dépasser 80 caractères", () => {
    const t = writeWithRules(facts);
    expect(t.title).toBe("Veste en jean Levi's bleu en coton taille M femme");
    expect(writeWithRules({ ...facts, kind: "x".repeat(70), brand: "Marque très longue" }).title.length).toBeLessThanOrEqual(80);
  });
  it("reprend le défaut signalé et n'invente aucune promesse", () => {
    const d = writeWithRules(facts).description;
    expect(d).toContain("petite tache sur la manche");
    expect(d).toContain("État : bon état");
    expect(d).not.toMatch(/envoi|authenti|rapide/i);
  });
  it("ne cite pas de marque quand le vendeur n'en donne pas", () => {
    const t = writeWithRules({ ...facts, brand: "" });
    expect(t.title).toBe("Veste en jean bleu en coton taille M femme");
    expect(t.hashtags).not.toContain("levis");
  });
  it("normalise les mots-clés (accents, doublons, nombre)", () => {
    expect(normalizeHashtags(["Été", "#été", "Levi's", "a", "veste en jean"])).toEqual(["ete", "levis", "vesteenjean"]);
    expect(normalizeHashtags(Array.from({ length: 20 }, (_, i) => `mot${i}`))).toHaveLength(8);
  });
  it("coupe un titre trop long sur un mot entier", () => {
    const long = "Veste en jean Levi's bleu délavé coupe droite années quatre-vingt-dix taille M femme vintage rare";
    const cut = fitTitle(long);
    expect(cut.length).toBeLessThanOrEqual(80);
    expect(long.startsWith(cut)).toBe(true);
    expect(long[cut.length]).toBe(" ");
  });
});

describe("fiches par plateforme", () => {
  const text = writeWithRules(facts);
  it("eBay : titre de 80 caractères au plus, pas de mots-clés dans la description", () => {
    const s = sheetFor("ebay", { ...text, title: "t".repeat(40) + " " + "u".repeat(60) }, facts, 2500);
    expect(field(s, "title")!.length).toBeLessThanOrEqual(80);
    expect(field(s, "description")).not.toContain("#");
    expect(field(s, "condition")).toBe("D'occasion");
    expect(field(s, "price")).toBe("25");
  });
  it("Depop : pas de champ titre, 5 mots-clés au plus, 1000 caractères au plus", () => {
    const s = sheetFor("depop", { ...text, description: "mot ".repeat(400) }, facts, 1250);
    expect(field(s, "title")).toBeUndefined();
    const d = field(s, "description")!;
    expect(d.length).toBeLessThanOrEqual(1000);
    expect(d.match(/#/g)).toHaveLength(5);
    expect(d.startsWith(text.title)).toBe(true);
    expect(s.warnings.join(" ")).toContain("1000");
    expect(field(s, "price")).toBe("12,50");
  });
  it("Vinted : mots-clés en fin de description, état dans le vocabulaire de la plateforme", () => {
    const s = sheetFor("vinted", text, facts, null);
    expect(field(s, "description")!.endsWith("#secondemain")).toBe(true);
    expect(field(s, "condition")).toBe("Bon état");
    expect(s.warnings).toContain("Aucun prix renseigné.");
  });
  it("chaque plateforme a une adresse de dépôt en https", () => {
    for (const p of Object.values(PLATFORMS)) expect(p.sellUrl).toMatch(/^https:\/\//);
  });
});

describe("argent", () => {
  it("estime les frais et le bénéfice net", () => {
    expect(estimateFeesCents("vinted", 2000)).toBe(0);
    expect(estimateFeesCents("ebay", 2000)).toBe(195);
    expect(estimateFeesCents("other", 2000)).toBe(0);
    expect(netProfitCents({ soldCents: 2000, feesCents: 195, shippingCents: 450, purchaseCents: 500 })).toBe(855);
    expect(netProfitCents({ soldCents: 2000 })).toBe(2000);
  });
  it("calcule un prix plancher qui couvre réellement l'achat et les frais", () => {
    for (const platform of ["vinted", "ebay", "depop", "vestiaire"] as const) {
      const min = minPriceCents(1000, platform, 50);
      expect(min % 50).toBe(0);
      expect(min - estimateFeesCents(platform, min) - 1000).toBeGreaterThanOrEqual(500 - 1);
    }
    expect(minPriceCents(1000, "vinted")).toBe(1000);
  });
  it("lit et affiche les montants en euros", () => {
    expect(parseEurToCents("12,50 €")).toBe(1250);
    expect(parseEurToCents("1 200")).toBe(120000);
    expect(parseEurToCents("abc")).toBeNull();
    expect(parseEurToCents("")).toBeNull();
    expect(formatEur(1250)).toMatch(/^12,50\s€$/);
    expect(formatEur(2000)).toMatch(/^20\s€$/);
    expect(formatEur(null)).toBe("—");
  });
});

describe("rédaction par IA", () => {
  const draft = { title: "T".repeat(120), description: " Belle veste. ", hashtags: ["#Veste", "veste", "Été"], priceLowEur: 30, priceHighEur: 18, priceNote: "Estimation générale.", cautions: ["", "Étiquette illisible"] };
  it("nettoie la réponse du modèle", () => {
    const g = fromDraft(draft);
    expect(g.text.title.length).toBeLessThanOrEqual(80);
    expect(g.text.hashtags).toEqual(["veste", "ete"]);
    expect(g.estimate).toEqual({ lowCents: 1800, highCents: 3000 });
    expect(g.cautions).toEqual(["Étiquette illisible"]);
    expect(fromDraft({ ...draft, priceLowEur: null }).estimate).toBeNull();
  });
  it("sans clé, utilise les règles et ne donne aucune estimation de prix", async () => {
    const g = await generateListing(facts, [], async () => { throw new Error("ne doit pas être appelé"); });
    expect(g.writtenBy).toBe("rules");
    expect(g.estimate).toBeNull();
    expect(g.notice).toBeNull();
  });
  it("avec une clé, utilise le modèle, et retombe sur les règles en le disant si le service échoue", async () => {
    process.env.ANTHROPIC_API_KEY = "test";
    try {
      expect((await generateListing(facts, [], async () => draft)).writtenBy).toBe("claude");
      const g = await generateListing(facts, [], async () => { throw new AiUnavailableError("Le service d'IA est saturé pour le moment."); });
      expect(g.writtenBy).toBe("rules");
      expect(g.notice).toContain("saturé");
    } finally {
      process.env.ANTHROPIC_API_KEY = "";
    }
  });
  it("ne transmet au modèle que les champs renseignés", () => {
    const b = factsBlock({ ...facts, brand: "", material: "" });
    expect(b).not.toContain("Marque");
    expect(b).toContain("Défauts signalés : petite tache sur la manche");
  });
});
