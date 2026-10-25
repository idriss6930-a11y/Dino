# Architecture

## Vue d'ensemble

DINO est une application **Next.js 16 (App Router)** en TypeScript strict : un seul déploiement sert les pages (rendu serveur React 19) et l'API (`src/app/api/*`). La logique métier ne vit pas dans les routes : elle est dans `src/lib/services`, testable sans serveur HTTP.

```
Navigateur ──► Pages (server components)  ──┐
          └──► Composants client ─► /api/* ──┤
                                             ▼
                                    src/lib/services  (métier pur + accès base)
                                     │            │
                    src/lib/providers (adaptateurs)   src/lib/db (Drizzle)
                     │  Duffel · Travelpayouts         PGlite (défaut) ou PostgreSQL
                     │  LiteAPI · Open-Meteo
                     │  Frankfurter · Démo
                    src/lib/ai (Claude + outils, ou règles sans clé)
```

## Dossiers

| Dossier | Contenu |
|---|---|
| `src/app` | Pages (`page.tsx`) et routes API (`route.ts`). Une route : validation Zod, appel d'un service, réponse JSON. |
| `src/components` | Interface. `ui.tsx` contient les briques communes (badges de source, états vides, erreurs). |
| `src/lib/api.ts` | Enveloppe de toutes les routes : contrôle d'origine (CSRF), limite de débit, traduction des erreurs, journal. |
| `src/lib/session.ts` | Session courante, cookies, rôles. |
| `src/lib/services` | Métier : recherche, comparaison, prévision, alertes, budget, communauté, comptes, RGPD, tendances. |
| `src/lib/providers` | Un adaptateur par fournisseur, qui convertit la réponse externe en types communs (`types.ts`). `registry.ts` choisit démo ou réel. |
| `src/lib/ai` | Assistant : `assistant.ts` (Claude), `tools.ts` (outils appelables), `parser.ts` (analyse sans IA). |
| `src/lib/db` | `schema.ts` (Drizzle), `client.ts` (connexion et migrations), `seed-reference.ts` (référentiel). |
| `src/data` | Référentiel embarqué : 3 244 aéroports (OurAirports), 53 pays, 50 destinations avec données éditoriales, géométries des pays (Natural Earth). |
| `drizzle/` | Migrations SQL versionnées. |
| `scripts/` | Migration, seed, worker, rafraîchissement climat. |
| `tests/` | `unit`, `integration` (Vitest), `e2e` (Playwright). |

## Flux d'une recherche de vols

1. `SearchPanel` construit l'URL `/vols?origin=…&destination=…`, que l'on peut partager et recharger.
2. `FlightsClient` appelle `GET /api/flights/search`.
3. `flight-search.ts` valide la requête (`flightQuerySchema`), puis interroge **en parallèle** les fournisseurs du mode courant (`run-providers.ts`, avec délai maximal et isolation des pannes : une source en échec n'empêche pas les autres de répondre).
4. Les offres sont converties dans la devise demandée, dédoublonnées entre sources (même vol, même horaire : on garde la moins chère et on liste les autres sous « aussi chez »), complétées par les bagages si besoin, filtrées et triées.
5. Chaque prix observé est enregistré dans `price_observations`, ce qui alimente la prévision et les alertes.
6. La réponse indique pour chaque source son état (ok, échec, non configurée) et sa fraîcheur.

## Démo et réel ne se mélangent jamais

`registry.ts` renvoie **soit** les fournisseurs démo, **soit** les fournisseurs réels, jamais les deux. Chaque offre porte `source.isDemo` et `source.freshness` (`live`, `cached`, `demo`). L'interface affiche un badge pour chaque offre, et un bandeau global en mode démo. Les offres démo n'ont **aucun lien de réservation**.

## Cache

- `TtlCache` en mémoire (LRU, 500 entrées par défaut) avec une durée par source : démo 10 min, Duffel 15 min (les offres expirent vite), Travelpayouts 2 h (données déjà en cache chez eux), LiteAPI 15 min.
- La table `cache_entries` existe pour un cache partagé entre instances (voir ROADMAP).
- Les taux de change sont gardés 12 h ; le climat est stocké en base.

## Planificateur

`src/instrumentation.ts` démarre `scheduler.ts` dans le processus Next : vérification des alertes dues chaque minute (première exécution après 15 s), purge des sessions et jetons expirés chaque heure. Un garde global empêche le double démarrage. Pour plusieurs instances : `DINO_SCHEDULER=off` sur le web, puis `npm run worker` dans un seul processus, ou un cron externe sur `POST /api/cron/alerts` avec `CRON_SECRET`.

## Journal

`src/lib/log.ts` écrit des lignes JSON. Les clés sensibles (`pass`, `secret`, `token`, `key`, `authorization`, `cookie`, `session`, `email`) sont masquées, ainsi que les jetons dans les URL (`?token=`, `Bearer …`).

## Prévision de prix (`price-history.ts`, exposée par `insight.ts`)

On garde le minimum quotidien observé pour une route et une anticipation comparable. Il faut au moins 7 relevés sur 6 jours, sinon la réponse est « données insuffisantes ». Le verdict se fonde sur la position du prix actuel dans la distribution observée (médiane, quartiles, percentile) et sur des facteurs de contexte (anticipation, saison), avec une fourchette de projection et le nombre de relevés affichés. DINO ne promet jamais de baisse : « attendre » signifie que le prix est haut par rapport à ce qu'il a déjà vu.

## Alertes (`alerts.ts`)

`decide()` est une fonction pure (testée) : notification si le prix passe sous le maximum fixé ou baisse d'au moins X % par rapport à la référence. Le premier relevé devient la référence et ne déclenche rien. Anti-spam : empreinte du niveau de prix (pas de doublon), délai de 12 h entre deux notifications d'une même alerte sauf nouvelle baisse d'au moins 5 %, plafond quotidien réglable par l'utilisateur (5 par défaut), fréquence minimale selon la formule (gratuite : toutes les 6 h, 10 alertes ; premium : toutes les heures, 100 alertes). Les alertes « bon plan » exigent un prix au moins 25 % sous la médiane d'au moins 7 relevés comparables.
