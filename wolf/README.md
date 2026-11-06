# THE WOLF — système d'exploitation e-commerce

Cerveau stratégique et outillage technique de **Nuitalys** (nuitalys.fr, Shopify Basic) et des boutiques suivantes.
Indicateur principal : **le bénéfice net réel** après coût produit, frais de paiement, cotisations sur le chiffre d'affaires,
publicité TVA autoliquidée comprise, remboursements et frais fixes. Pas le chiffre d'affaires.

> **État honnête.** Le moteur économique, l'audit de boutique, le P&L quotidien, les alertes et les connecteurs Shopify et Meta
> sont écrits et couverts par des tests automatisés (`npm test`). Les requêtes Shopify ont été validées contre le schéma
> Admin 2026-10 de la vraie boutique. En revanche, **les scripts n'ont pas encore tourné avec un vrai jeton** : il faut créer
> l'app Shopify en lecture (voir `.env.example`). Les coûts fournisseurs de `config/offers.json` sont des **estimations**
> tant que le prix DSers réel n'est pas saisi.

## Démarrer

```bash
cd wolf
npm install
npm test               # tests unitaires (Vitest)
npm run typecheck      # vérification TypeScript stricte
npm run economics      # économie unitaire des offres de config/offers.json
npm run simulate -- --offer pillow-duo --days 21 --budget 20 --payout 3 --oneoff 150
npm run score          # classement des opportunités (data/opportunities.json)
npm run audit          # audit de conformité de la boutique (jeton Shopify requis, ou --snapshot fichier.json)
npm run report         # P&L quotidien + alertes de rentabilité (jeton Shopify, Meta en option)
```

## Organisation

| Dossier | Contenu |
|---|---|
| `docs/` | Audit, étude de marché, sélection, business plan, architecture, plan boutique, stratégie publicitaire, automatisation, plan d'actions |
| `reports/`, `research_notes/` | Rapport d'étude de marché et notes sourcées des six axes de recherche |
| `src/economics/` | Économie unitaire, simulation de campagne et besoin de trésorerie, grille de notation sur 100 points |
| `src/audit/` | Contrôles automatiques : promesse de livraison contre caisse, GPSR, pages légales, prix barrés, allégations santé, coûts manquants |
| `src/shopify/`, `src/ads/` | Clients API Admin Shopify (réessais, limitation) et Marketing API Meta |
| `src/pnl/`, `src/monitoring/` | P&L quotidien, rapport, règles d'alerte (couper une pub perdante, CPA, ROAS, remboursements, entonnoir, expédition) |
| `config/` | Paramètres fiscaux (avec source et statut de chaque valeur), offres, seuils d'alerte |
| `ops/` | Modèle de tâche planifiée GitHub Actions (inactif dans ce dépôt) |
| `tests/` | Tests, dont un instantané réel de la boutique avant et après la correction de la livraison |

## Règles de sécurité

- Aucun secret dans le dépôt : `.env` est ignoré, seul `.env.example` (vide) est versionné.
- Jetons en **lecture seule** : les scripts n'écrivent jamais dans Shopify ni dans les régies publicitaires.
- Aucune dépense, aucun achat, aucune publication ne part d'ici sans validation explicite du propriétaire.
- Chaque exécution du rapport est journalisée dans `out/runs.log` (succès, durée, alertes, erreur éventuelle).

## Pourquoi un dossier `wolf/` dans le dépôt DINO

Cette session ne peut pas créer de dépôt GitHub. THE WOLF est donc autonome dans `wolf/` (son propre `package.json`, ses tests,
son `tsconfig`), et exclu de la vérification TypeScript de DINO. Pour l'extraire dans un dépôt dédié :
`git subtree split --prefix=wolf -b wolf-only`, puis pousser cette branche vers le nouveau dépôt et déplacer
`ops/github-actions/wolf-daily.yml` dans `.github/workflows/`.
