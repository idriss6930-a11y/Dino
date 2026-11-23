"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowLeft, ExternalLink, ImagePlus, X } from "lucide-react";
import { apiSend } from "@/lib/client/fetcher";
import { uploadPhoto } from "@/lib/client/photos";
import { MAX_PHOTOS, PLATFORM_IDS, type PlatformId } from "@/lib/listing/constants";
import type { ItemBundle, ItemDTO, ListingDTO } from "@/lib/listing/dto";
import { PLATFORMS, sheetFor } from "@/lib/listing/platforms";
import { estimateFeesCents, minPriceCents, netProfitCents } from "@/lib/listing/profit";
import { TITLE_MAX } from "@/lib/listing/types";
import { centsToInput, formatEur, parseEurToCents } from "@/lib/utils/money";
import { CopyField } from "./CopyField";
import { FactsFields, type FactsForm } from "./FactsFields";
import { factsPayload } from "./NewItemForm";
import { ErrorBox, ITEM_STATUS, ListingPill, Notice } from "./ui";

type Config = { ai: boolean; ebayReady: boolean; ebayConnected: boolean };
type TextForm = { title: string; description: string; hashtags: string; price: string };

const factsFrom = (i: ItemDTO): FactsForm => ({ kind: i.kind, brand: i.brand, size: i.size, color: i.color, material: i.material, audience: i.audience, condition: i.condition, defects: i.defects, notes: i.notes, purchase: centsToInput(i.purchaseCents) });
const textFrom = (i: ItemDTO): TextForm => ({ title: i.title, description: i.description, hashtags: i.hashtags.join(" "), price: centsToInput(i.priceCents) });
const WRITTEN_BY = { manual: "Rédigé à la main", rules: "Rédigé par les règles automatiques", claude: "Rédigé par l'IA" } as const;

export function ItemWorkspace({ initial, config, problem }: { initial: ItemBundle; config: Config; problem?: string }) {
  const [item, setItem] = useState(initial.item);
  const [listings, setListings] = useState(initial.listings);
  const [photoIds, setPhotoIds] = useState(initial.photoIds);
  const [facts, setFacts] = useState(() => factsFrom(initial.item));
  const [text, setText] = useState(() => textFrom(initial.item));
  const [cautions, setCautions] = useState<string[]>([]);
  const [notice, setNotice] = useState(problem ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<PlatformId>("vinted");
  const fileInput = useRef<HTMLInputElement>(null);

  const dirty = JSON.stringify([factsFrom(item), textFrom(item)]) !== JSON.stringify([facts, text]);
  const sold = item.status === "sold";
  const priceCents = parseEurToCents(text.price);
  const purchaseCents = parseEurToCents(facts.purchase);

  function apply(bundle: { item: ItemDTO; listings?: ListingDTO[] }) {
    setItem(bundle.item);
    setFacts(factsFrom(bundle.item));
    setText(textFrom(bundle.item));
    if (bundle.listings) setListings(bundle.listings);
  }

  /** Exécute une action serveur en affichant l'attente et l'erreur éventuelle. */
  async function act(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setError("");
    setSaved(false);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function save() {
    const body = { ...factsPayload(facts), title: text.title, description: text.description, hashtags: text.hashtags.split(/[\s,#]+/).filter(Boolean), priceCents };
    apply(await apiSend<{ item: ItemDTO }>(`/api/items/${item.id}`, "PATCH", body));
  }
  const saveIfDirty = async () => {
    if (dirty) await save();
  };

  const generate = () =>
    act("generate", async () => {
      if (item.title && !window.confirm("Remplacer le titre, la description et les mots-clés actuels par une nouvelle rédaction ?")) return;
      await saveIfDirty();
      const out = await apiSend<{ item: ItemDTO; cautions: string[]; notice: string | null }>(`/api/items/${item.id}/generate`, "POST");
      apply(out);
      setCautions(out.cautions);
      setNotice(out.notice ?? "");
    });

  const setListing = (platform: PlatformId, status: "online" | "removed") =>
    act(`listing-${platform}`, async () => {
      await saveIfDirty();
      apply(await apiSend<ItemBundle>(`/api/items/${item.id}/listings`, "POST", { platform, status }));
    });

  const publishEbay = () =>
    act("listing-ebay", async () => {
      await saveIfDirty();
      apply(await apiSend<ItemBundle>(`/api/items/${item.id}/ebay`, "POST"));
    });

  async function addPhotos(files: File[]) {
    await act("photos", async () => {
      for (const file of files.slice(0, MAX_PHOTOS - photoIds.length)) {
        const id = await uploadPhoto(item.id, file);
        setPhotoIds((ids) => [...ids, id]);
      }
    });
  }

  const sheet = useMemo(() => {
    const current = { title: text.title, description: text.description, hashtags: text.hashtags.split(/[\s,#]+/).filter(Boolean) };
    const { purchase: _p, ...f } = facts;
    void _p;
    return sheetFor(tab, current, f, priceCents);
  }, [tab, text, facts, priceCents]);
  const listingOf = (p: PlatformId) => listings.find((l) => l.platform === p);
  const current = listingOf(tab);
  const toRemove = listings.filter((l) => l.status === "to_remove");

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app" className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
          <ArrowLeft size={16} aria-hidden /> Mes articles
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-3xl font-bold break-words">{item.title || item.kind}</h1>
          <span className="rounded-full border border-line bg-white px-2.5 py-0.5 text-xs font-semibold">{ITEM_STATUS[item.status]}</span>
        </div>
      </div>

      {notice && <Notice tone="warn">{notice}</Notice>}
      {toRemove.length > 0 && (
        <Notice tone="warn">
          <strong>Cet article est vendu.</strong> Retirez l&apos;annonce sur {toRemove.map((l) => PLATFORMS[l.platform].label).join(" et ")} pour ne pas le vendre deux fois, puis confirmez ci-dessous.
        </Notice>
      )}

      <section className="card p-5 sm:p-6" aria-labelledby="h-photos">
        <h2 id="h-photos" className="text-xl font-bold">Photos</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {photoIds.map((id, i) => (
            <li key={id} className="relative size-24 overflow-hidden rounded-lg border border-line bg-paper">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/photos/${id}`} alt={`Photo ${i + 1} de l'article`} className="size-full object-cover" />
              <button
                type="button"
                aria-label={`Supprimer la photo ${i + 1}`}
                className="absolute top-1 right-1 grid size-7 place-items-center rounded-full bg-ink/80 text-white"
                onClick={() => act("photos", async () => {
                  await apiSend(`/api/photos/${id}`, "DELETE");
                  setPhotoIds((ids) => ids.filter((x) => x !== id));
                })}
              >
                <X size={14} />
              </button>
            </li>
          ))}
          {photoIds.length < MAX_PHOTOS && (
            <li>
              <button type="button" disabled={busy === "photos"} className="grid size-24 place-items-center rounded-lg border border-dashed border-muted/50 bg-white text-muted hover:border-denim-600 hover:text-denim-600" onClick={() => fileInput.current?.click()}>
                <span className="flex flex-col items-center gap-1 text-xs font-semibold">
                  <ImagePlus size={22} aria-hidden />
                  {busy === "photos" ? "Envoi…" : "Ajouter"}
                </span>
              </button>
            </li>
          )}
        </ul>
        <input ref={fileInput} type="file" accept="image/*" multiple className="sr-only" aria-label="Ajouter des photos" onChange={(e) => { const files = Array.from(e.target.files ?? []); e.target.value = ""; void addPhotos(files); }} />
      </section>

      <section className="card p-5 sm:p-6" aria-labelledby="h-annonce">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="h-annonce" className="text-xl font-bold">L&apos;annonce</h2>
          {item.title && <span className="text-xs font-semibold text-muted">{WRITTEN_BY[item.writtenBy]}</span>}
        </div>
        {!config.ai && <p className="mt-1 text-sm text-muted">La rédaction par IA n&apos;est pas activée sur ce site : le texte est assemblé à partir de ce que vous avez saisi, sans analyse des photos ni estimation de prix.</p>}
        <div className="mt-4 grid gap-3">
          <label className="field">
            <span className="flex justify-between">Titre <span className={clsx("hint tabular-nums", text.title.length > TITLE_MAX && "!text-tag-700")}>{text.title.length} / {TITLE_MAX}</span></span>
            <input className="input" maxLength={200} value={text.title} onChange={(e) => setText({ ...text, title: e.target.value })} />
          </label>
          <label className="field">
            Description
            <textarea className="input min-h-40" maxLength={3000} value={text.description} onChange={(e) => setText({ ...text, description: e.target.value })} />
          </label>
          <label className="field">
            Mots-clés
            <input className="input" value={text.hashtags} onChange={(e) => setText({ ...text, hashtags: e.target.value })} />
            <span className="hint">Séparés par des espaces. Ajoutés en fin de description sur Vinted et Depop.</span>
          </label>
          <label className="field max-w-48">
            Prix demandé (€)
            <input className="input" inputMode="decimal" value={text.price} onChange={(e) => setText({ ...text, price: e.target.value })} />
          </label>
        </div>

        {item.estimateLowCents !== null && item.estimateHighCents !== null && (
          <div className="mt-4 rounded-lg border border-denim-100 bg-denim-50 p-3 text-sm">
            <strong>Estimation de l&apos;IA : {formatEur(item.estimateLowCents)} à {formatEur(item.estimateHighCents)}.</strong> {item.estimateNote}
            <div className="mt-1 text-xs text-denim-900/80">Ce n&apos;est pas un relevé de prix : comparez avec quelques annonces semblables avant de fixer le vôtre.</div>
          </div>
        )}
        {purchaseCents !== null && purchaseCents > 0 && (
          <div className="mt-3 rounded-lg border border-line bg-paper p-3 text-sm">
            <strong>Prix plancher</strong> pour ne pas perdre d&apos;argent sur un achat à {formatEur(purchaseCents)}, frais estimés déduits :{" "}
            {PLATFORM_IDS.map((p) => `${PLATFORMS[p].label} ${formatEur(minPriceCents(purchaseCents, p))}`).join(" · ")}.
          </div>
        )}
        {cautions.length > 0 && (
          <div className="mt-3">
            <Notice>
              <strong>À vérifier avant de publier :</strong>
              <ul className="mt-1 list-disc pl-5">{cautions.map((c) => <li key={c}>{c}</li>)}</ul>
            </Notice>
          </div>
        )}

        <details className="mt-5 border-t border-line pt-4">
          <summary className="cursor-pointer text-sm font-semibold">Modifier les caractéristiques de l&apos;article</summary>
          <div className="mt-4"><FactsFields value={facts} onChange={setFacts} /></div>
        </details>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" className="btn-primary" disabled={!dirty || Boolean(busy)} onClick={() => act("save", async () => { await save(); setSaved(true); })}>Enregistrer</button>
          <button type="button" className="btn-ghost" disabled={Boolean(busy)} onClick={generate}>{busy === "generate" ? "Rédaction en cours…" : item.title ? "Rédiger à nouveau" : "Rédiger l'annonce"}</button>
          <span role="status" className="text-sm text-muted">{saved && !dirty ? "Enregistré." : dirty ? "Modifications non enregistrées." : ""}</span>
        </div>
      </section>

      <ErrorBox message={error} />

      <section className="card p-5 sm:p-6" aria-labelledby="h-plateformes">
        <h2 id="h-plateformes" className="text-xl font-bold">Mettre en ligne</h2>
        <p className="mt-1 text-sm text-muted">Copiez chaque champ dans le formulaire de la plateforme, puis indiquez ici que l&apos;annonce est en ligne.</p>
        <div role="tablist" aria-label="Plateformes" className="mt-4 flex flex-wrap gap-2">
          {PLATFORM_IDS.map((p) => {
            const l = listingOf(p);
            return (
              <button key={p} role="tab" id={`tab-${p}`} aria-selected={tab === p} aria-controls="panneau-plateforme" className={clsx("btn border", tab === p ? "border-ink bg-ink text-white" : "border-line bg-white hover:bg-paper")} onClick={() => setTab(p)}>
                {PLATFORMS[p].label}
                {l && l.status !== "removed" && <span aria-hidden className={clsx("size-2 rounded-full", l.status === "to_remove" ? "bg-tag-500" : l.status === "sold" ? "bg-leaf-700" : "bg-denim-600", tab === p && l.status === "online" && "bg-white")} />}
              </button>
            );
          })}
        </div>

        <div role="tabpanel" id="panneau-plateforme" aria-labelledby={`tab-${tab}`} className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>{current ? <ListingPill label={PLATFORMS[tab].label} status={current.status} /> : <span className="text-sm text-muted">Pas encore en ligne sur {PLATFORMS[tab].label}.</span>}</div>
            <div className="flex flex-wrap gap-2">
              {current?.externalUrl ? (
                <a className="btn-ghost" href={current.externalUrl} target="_blank" rel="noopener noreferrer">Voir l&apos;annonce <ExternalLink size={15} aria-hidden /></a>
              ) : (
                <a className="btn-ghost" href={PLATFORMS[tab].sellUrl} target="_blank" rel="noopener noreferrer">Ouvrir {PLATFORMS[tab].label} <ExternalLink size={15} aria-hidden /></a>
              )}
              {!sold && (!current || current.status === "removed") && tab === "ebay" && config.ebayReady && config.ebayConnected && (
                <button type="button" className="btn-accent" disabled={Boolean(busy)} onClick={publishEbay}>{busy === "listing-ebay" ? "Publication…" : "Publier sur eBay"}</button>
              )}
              {!sold && (!current || current.status === "removed") && (
                <button type="button" className={tab === "ebay" && config.ebayReady && config.ebayConnected ? "btn-ghost" : "btn-accent"} disabled={Boolean(busy)} onClick={() => setListing(tab, "online")}>J&apos;ai mis l&apos;annonce en ligne</button>
              )}
              {current?.status === "online" && <button type="button" className="btn-ghost" disabled={Boolean(busy)} onClick={() => setListing(tab, "removed")}>Je l&apos;ai retirée</button>}
              {current?.status === "to_remove" && <button type="button" className="btn-accent" disabled={Boolean(busy)} onClick={() => setListing(tab, "removed")}>C&apos;est retiré</button>}
            </div>
          </div>
          {tab === "ebay" && config.ebayReady && !config.ebayConnected && (
            <p className="mt-3 text-sm text-muted">Pour publier sur eBay en un clic, <Link className="link" href="/app/compte">connectez votre compte eBay</Link>.</p>
          )}
          {sheet.warnings.map((w) => <p key={w} className="mt-3 text-sm text-tag-700">{w}</p>)}
          <div className="mt-3 rounded-lg border border-line px-3">
            {text.title || text.description ? sheet.fields.map((f) => <CopyField key={f.key} label={f.label} value={f.value} multiline={f.multiline} />) : <p className="py-4 text-sm text-muted">Rédigez d&apos;abord l&apos;annonce ci-dessus.</p>}
          </div>
        </div>
      </section>

      <SaleSection item={item} busy={Boolean(busy)} suggestedPrice={priceCents} onSold={(body) => act("sale", async () => { await saveIfDirty(); apply(await apiSend<ItemBundle>(`/api/items/${item.id}/sold`, "POST", body)); })} onCancel={() => act("sale", async () => apply(await apiSend<ItemBundle>(`/api/items/${item.id}/sold`, "DELETE")))} />

      <div className="flex justify-end">
        <button
          type="button"
          className="btn-danger"
          disabled={Boolean(busy)}
          onClick={() => act("delete", async () => {
            if (!window.confirm("Supprimer définitivement cet article, ses photos et son historique ?")) return;
            await apiSend(`/api/items/${item.id}`, "DELETE");
            window.location.href = "/app";
          })}
        >
          Supprimer l&apos;article
        </button>
      </div>
    </div>
  );
}

function SaleSection({ item, busy, suggestedPrice, onSold, onCancel }: { item: ItemDTO; busy: boolean; suggestedPrice: number | null; onSold: (body: { platform: string; soldCents: number; feesCents: number; shippingCents: number }) => void; onCancel: () => void }) {
  const [platform, setPlatform] = useState<PlatformId | "other">("vinted");
  const [price, setPrice] = useState("");
  const [fees, setFees] = useState<string | null>(null); // null : on suit l'estimation tant que le vendeur n'a rien saisi
  const [shipping, setShipping] = useState("");

  if (item.status === "sold" && item.soldCents !== null) {
    const net = netProfitCents({ soldCents: item.soldCents, feesCents: item.soldFeesCents, shippingCents: item.soldShippingCents, purchaseCents: item.purchaseCents });
    return (
      <section className="card p-5 sm:p-6" aria-labelledby="h-vente">
        <h2 id="h-vente" className="text-xl font-bold">Vente</h2>
        <dl className="mt-3 grid max-w-sm grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm tabular-nums">
          <dt>Vendu{item.soldPlatform && item.soldPlatform !== "other" ? ` sur ${PLATFORMS[item.soldPlatform].label}` : ""}</dt><dd className="text-right">{formatEur(item.soldCents)}</dd>
          <dt className="text-muted">Frais de la plateforme</dt><dd className="text-right text-muted">− {formatEur(item.soldFeesCents ?? 0)}</dd>
          <dt className="text-muted">Envoi à votre charge</dt><dd className="text-right text-muted">− {formatEur(item.soldShippingCents ?? 0)}</dd>
          <dt className="text-muted">Prix d&apos;achat</dt><dd className="text-right text-muted">{item.purchaseCents === null ? "non renseigné" : `− ${formatEur(item.purchaseCents)}`}</dd>
          <dt className="border-t border-line pt-1 font-bold">Bénéfice net</dt><dd className={clsx("border-t border-line pt-1 text-right font-bold", net < 0 && "text-tag-700")}>{formatEur(net)}</dd>
        </dl>
        {item.purchaseCents === null && <p className="mt-2 text-sm text-muted">Sans prix d&apos;achat, ce bénéfice est surestimé. Ajoutez-le dans les caractéristiques de l&apos;article.</p>}
        <button type="button" className="btn-ghost mt-4" disabled={busy} onClick={onCancel}>Annuler la vente</button>
      </section>
    );
  }

  const soldCents = parseEurToCents(price) ?? suggestedPrice;
  const estimated = soldCents !== null ? estimateFeesCents(platform, soldCents) : 0;
  const feesCents = fees === null ? estimated : (parseEurToCents(fees) ?? 0);
  const shippingCents = parseEurToCents(shipping) ?? 0;
  const net = soldCents !== null ? netProfitCents({ soldCents, feesCents, shippingCents, purchaseCents: item.purchaseCents }) : null;
  return (
    <section className="card p-5 sm:p-6" aria-labelledby="h-vente">
      <h2 id="h-vente" className="text-xl font-bold">C&apos;est vendu ?</h2>
      <p className="mt-1 text-sm text-muted">Indiquez où et à quel prix : les autres annonces passeront en « à retirer » et votre bénéfice sera calculé.</p>
      <form className="mt-4 grid gap-3 sm:grid-cols-4" onSubmit={(e) => { e.preventDefault(); if (soldCents !== null) onSold({ platform, soldCents, feesCents, shippingCents }); }}>
        <label className="field">
          Vendu sur
          <select className="input" value={platform} onChange={(e) => setPlatform(e.target.value as PlatformId | "other")}>
            {PLATFORM_IDS.map((p) => <option key={p} value={p}>{PLATFORMS[p].label}</option>)}
            <option value="other">Ailleurs</option>
          </select>
        </label>
        <label className="field">
          Prix de vente (€)
          <input className="input" inputMode="decimal" required={suggestedPrice === null} placeholder={centsToInput(suggestedPrice)} value={price} onChange={(e) => setPrice(e.target.value)} />
        </label>
        <label className="field">
          Frais de la plateforme (€)
          <input className="input" inputMode="decimal" value={fees ?? centsToInput(estimated)} onChange={(e) => setFees(e.target.value)} />
        </label>
        <label className="field">
          Envoi à votre charge (€)
          <input className="input" inputMode="decimal" placeholder="0" value={shipping} onChange={(e) => setShipping(e.target.value)} />
        </label>
        {platform !== "other" && <p className="hint sm:col-span-4">{PLATFORMS[platform].feeNote} Corrigez le montant avec celui réellement prélevé.</p>}
        <div className="flex flex-wrap items-center gap-3 sm:col-span-4">
          <button type="submit" className="btn-primary" disabled={busy || soldCents === null}>Marquer comme vendu</button>
          {net !== null && <span className="text-sm">Bénéfice net : <strong className={clsx("tabular-nums", net < 0 && "text-tag-700")}>{formatEur(net)}</strong>{item.purchaseCents === null && <span className="text-muted"> (prix d&apos;achat non renseigné)</span>}</span>}
        </div>
      </form>
    </section>
  );
}
