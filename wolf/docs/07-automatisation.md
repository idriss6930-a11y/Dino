# Plan d'automatisation

Principe : automatiser d'abord ce qui protège l'argent (alertes, P&L, conformité), ensuite ce qui fait gagner du temps.
Une automatisation n'est « en place » que si elle est testée, journalisée et surveillée.

## Les 15 chantiers du cahier des charges

| # | Chantier | Solution | État au 06/11/2026 |
|---|---|---|---|
| 1 | Recherche d'opportunités | Grille de notation codée (`src/economics/scoring.ts`), données dans `data/opportunities.json`, recherche par agents à la demande | **Codé et testé** ; recherche relancée chaque trimestre |
| 2 | Surveillance des tendances | Revue mensuelle TikTok Creative Center, Google Trends, meilleures ventes Amazon.fr, TikTok Shop | Manuel (sources inaccessibles depuis le conteneur) |
| 3 | Surveillance concurrentielle | Bibliothèque publicitaire Meta : relevé mensuel des publicités de Derila, Emma, Mulisoft et des nouveaux entrants | Manuel ; l'API Ad Library exige une vérification d'identité |
| 4 | Prix fournisseurs | Notifications de changement de prix DSers ; contrôle `MISSING_UNIT_COST` de l'audit | Audit **codé et testé** ; notifications DSers à activer |
| 5 | Stocks | Synchronisation de stock DSers ; contrôle `TRACKED_INVENTORY_DROPSHIPPING` | Audit **codé et testé** ; réglage DSers à faire |
| 6 | Synchronisation des commandes | Commande automatique DSers | **Autorisation nécessaire** : elle déclenche des paiements fournisseur |
| 7 | Suivi des livraisons | Synchronisation du suivi DSers vers Shopify, e-mails d'expédition Shopify ; alerte `FULFILLMENT_DELAY` | Alerte **codée et testée** |
| 8 | E-mails clients | Notifications Shopify en français (confirmation, expédition, livraison) | À relire et personnaliser |
| 9 | Support niveau 1 | FAQ, Shopify Inbox, modèles de réponses ; brouillons de réponse rédigés par IA **validés par un humain** | Modèles à rédiger |
| 10 | Paniers abandonnés | Automatisation Shopify Email « paiement abandonné » (1 h puis 24 h) | À activer (gratuit) |
| 11 | Rapports financiers | `npm run report` : P&L quotidien, bénéfice net, alertes | **Codé et testé** ; attend le jeton Shopify |
| 12 | Analyse publicitaire | Connecteur Meta Insights (`src/ads/meta.ts`) ; TikTok et Google ensuite | Meta **codé et testé** ; TikTok/Google à faire quand les comptes existeront |
| 13 | Détection d'anomalies | 9 règles : pic de dépense, entonnoir bloqué, caisse en échec, remboursements, retards… | **Codé et testé** |
| 14 | Alertes de rentabilité | Arrêt d'une publicité sans vente, CPA au-dessus du maximum, ROAS sous le seuil, pertes consécutives | **Codé et testé** ; webhook optionnel |
| 15 | Suggestions d'amélioration | Chaque alerte et chaque constat d'audit contient l'action corrective ; revue hebdomadaire | **Codé** (messages) ; revue hebdomadaire à planifier |

## Les règles d'alerte (évaluées chaque jour)

| Code | Déclenchement | Gravité | Action attendue |
|---|---|---|---|
| `KILL_NO_SALES` | 3 jours de dépense ≥ 1,5 × CPA maximal sans vente | critique | Couper la publicité testée |
| `CPA_ABOVE_MAX` | CPA sur 3 jours > CPA maximal | alerte | Baisser le budget, changer de création ou d'audience |
| `ROAS_BELOW_BREAKEVEN` | ROAS sur 3 jours < ROAS de rentabilité | alerte | Idem |
| `REFUND_RATE_HIGH` | Remboursements sur 14 jours > 8 % (à partir de 10 commandes) | alerte | Contrôler produit, délais, promesse |
| `NO_ADD_TO_CART` | ≥ 80 sessions et aucun ajout au panier | critique | Contrôler page produit, prix, bouton |
| `CHECKOUT_DROP` | < 30 % des paiements commencés aboutissent (≥ 10) | critique | Contrôler port, moyens de paiement, erreurs |
| `SPEND_SPIKE` | Dépense du jour > 2 × moyenne des 7 jours précédents | alerte | Vérifier les budgets et les règles automatiques des régies |
| `CONSECUTIVE_LOSSES` | 3 jours de suite en perte nette | alerte | Revoir offre, créations, budget |
| `FULFILLMENT_DELAY` | Commande payée non expédiée depuis plus de 48 h | critique | Passer la commande à la main, prévenir le client |

## Exécution, journal et surveillance

- **Planification** : GitHub Actions, tous les jours à 7 h 13 (modèle `ops/github-actions/wolf-daily.yml`). Gratuit, journalisé,
  e-mail automatique de GitHub en cas d'échec. n8n (auto-hébergé, environ 5 € par mois de serveur) ou Make deviendront utiles
  quand il faudra des scénarios événementiels (webhooks de commande, SAV) ; pas avant.
- **Journal** : `out/runs.log`, une ligne JSON par exécution (horodatage, durée, commandes, alertes, erreur).
- **Codes de sortie** : `audit` renvoie 1 en cas de constat critique ; `report` renvoie 2 en cas d'alerte critique et 1 en cas d'erreur.
  Le planificateur signale donc les problèmes même si personne ne lit le rapport.
- **Historique** : rapports conservés 90 jours comme artefacts GitHub Actions.

## Mise en route (ce qu'il vous faut faire une fois)

1. Shopify Admin > Paramètres > Applications > Développer des applications : créer « THE WOLF (lecture) » avec les droits listés
   dans `.env.example`, installer, copier le jeton d'accès Admin.
2. Mettre `SHOPIFY_SHOP_DOMAIN` et `SHOPIFY_ADMIN_TOKEN` en secrets (GitHub Actions) ou dans `wolf/.env`.
3. Saisir le coût fournisseur livré de chaque variante dans Shopify (sinon les marges du rapport sont fausses : le rapport le signale).
4. Plus tard : jeton Meta `ads_read` (utilisateur système) et webhook Discord ou Slack pour recevoir les alertes.
