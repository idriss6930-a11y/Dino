# 30 idées de revenus passifs et semi-passifs

Analyse rédigée à partir de ce que montre ce dépôt. Les compétences et ressources prises en compte sont les suivantes.

- **Compétences** : développement full-stack TypeScript (Next.js 16, React 19), mobile (Expo / React Native), PostgreSQL et Drizzle, intégration de l'IA (API Claude), connecteurs d'API tierces (Duffel, Travelpayouts, LiteAPI, Open-Meteo, Frankfurter), notifications (e-mail, Web Push), workers en tâche de fond, tests (Vitest, Playwright).
- **Ressources** : DINO, un produit web et mobile déjà construit et testé en mode démonstration, avec un moteur d'alertes de prix qui évite le spam, un calcul du « coût total réel », un avis « acheter ou attendre », des données climat par destination, l'affiliation Travelpayouts déjà branchée et une colonne `users.plan` prête pour une offre premium.
- **Contexte** : un marché francophone, moins saturé que le marché anglophone pour le contenu technique et les outils de niche.

> Les montants sont des **ordres de grandeur** pour un projet bien exécuté au bout de 12 à 24 mois. Ce ne sont pas des promesses. La plupart des projets de ce type rapportent peu, voire rien, pendant les 3 à 6 premiers mois.

## Légende

- **Difficulté technique, évolutivité, récurrence** : notes de 1 (faible) à 5 (forte).
- **Maintenance** : Faible, Moyenne ou Élevée.
- **Rapidité** (lancement), **Durabilité** (résistance dans le temps) et **Automatisation** (potentiel) : notes sur 10. Le **Total** est sur 30.

## Le tableau complet

### A. Monétiser DINO directement

| # | Opportunité | Coût de démarrage | Mise en œuvre | Diff. | Évol. | Récur. | Maintenance | Concurrence | Potentiel long terme | Rapidité | Durabilité | Autom. | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **Activer l'affiliation dans DINO** (Travelpayouts déjà branché, ajouter Booking, assurances, eSIM, location de voitures) | 0–200 € | 2–4 sem. | 2 | 5 | 3 | Moyenne | Élevée | 500–5 000 €/mois | 9 | 7 | 9 | **25** |
| 2 | **Offre DINO Premium** par abonnement (Stripe, `PLAN_LIMITS` déjà prêt) | 0–300 € | 4–8 sem. | 3 | 5 | 5 | Moyenne | Élevée | 1 000–15 000 €/mois | 6 | 8 | 8 | **22** |
| 3 | **API B2B « coût total réel » et « acheter ou attendre »** vendue aux comparateurs et aux blogs | 100–500 € | 2–3 mois | 4 | 5 | 5 | Moyenne | Moyenne | 2 000–20 000 €/mois | 3 | 8 | 8 | **19** |
| 4 | **Widget comparateur intégrable** pour blogueurs voyage, avec partage des commissions | 0–200 € | 4–6 sem. | 3 | 5 | 4 | Moyenne | Moyenne | 500–5 000 €/mois | 5 | 7 | 8 | **20** |
| 5 | **Newsletter automatisée de bons plans** et d'erreurs de prix depuis chaque aéroport, alimentée par le worker (gratuite + payante + sponsors) | 0–100 € | 2–3 sem. | 2 | 5 | 5 | Faible | Élevée | 1 000–10 000 €/mois | 8 | 7 | 9 | **24** |
| 6 | **Pages SEO générées automatiquement** (« Où partir en mars ? », « Météo à Lisbonne en mai ») à partir des données climat, avec affiliation | 50–200 € | 3–6 sem. | 3 | 5 | 3 | Faible | Moyenne | 500–8 000 €/mois | 7 | 7 | 9 | **23** |
| 7 | **App mobile DINO en freemium** sur les stores (achats intégrés) | 125 € (comptes Apple et Google) | 4–8 sem. | 3 | 5 | 4 | Moyenne | Élevée | 500–8 000 €/mois | 6 | 7 | 8 | **21** |
| 28 | **DINO en marque blanche** pour agences de voyage, CSE et mutuelles (licence mensuelle) | 0–500 € | 2–3 mois | 3 | 4 | 5 | Moyenne | Faible | 1 000–15 000 €/mois | 4 | 9 | 7 | **20** |

### B. Produits numériques pour développeurs

| # | Opportunité | Coût de démarrage | Mise en œuvre | Diff. | Évol. | Récur. | Maintenance | Concurrence | Potentiel long terme | Rapidité | Durabilité | Autom. | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 8 | **Kit de démarrage Next.js 16** tiré de DINO (Drizzle, PGlite, authentification, Web Push, worker, version mobile Expo) | 0–50 € | 2–4 sem. | 3 | 5 | 2 | Moyenne | Élevée | 500–5 000 €/mois | 8 | 6 | 9 | **23** |
| 9 | **Composants et modèles d'interface** (cartes Leaflet, graphiques Recharts, tableaux de bord) sur Gumroad ou Lemon Squeezy | 0 € | 1–3 sem. | 2 | 5 | 1 | Faible | Élevée | 200–2 000 €/mois | 9 | 4 | 10 | **23** |
| 10 | **Cours en ligne en français** : « Construire une app full-stack avec l'IA » (le cas DINO) | 0–300 € | 1–2 mois | 2 | 5 | 2 | Faible | Moyenne | 1 000–10 000 €/mois | 5 | 6 | 9 | **20** |
| 11 | **Ebook technique** (intégrer Claude proprement, Web Push, prévisions de prix honnêtes) | 0 € | 2–4 sem. | 1 | 5 | 1 | Faible | Moyenne | 100–1 500 €/mois | 9 | 3 | 10 | **22** |
| 12 | **Paquets npm open-core** (connecteurs Duffel, Travelpayouts et LiteAPI typés avec Zod), avec version pro et sponsors | 0 € | 2–4 sem. | 3 | 4 | 3 | Moyenne | Faible | 100–3 000 €/mois | 7 | 5 | 7 | **19** |
| 13 | **Serveurs MCP et skills payants** (par exemple un MCP voyage pour assistants IA) | 0–50 € | 1–3 sem. | 3 | 4 | 3 | Moyenne | Faible à moyenne | 200–5 000 €/mois | 8 | 5 | 8 | **21** |
| 14 | **Modèles Notion ou Google Sheets** de planification de voyage et de budget | 0 € | 1 sem. | 1 | 4 | 1 | Faible | Élevée | 50–1 000 €/mois | 10 | 3 | 10 | **23** |
| 30 | **Affiliation SaaS pour développeurs** (hébergeurs, bases de données, API) via le contenu, souvent avec des commissions récurrentes à vie | 0 € | 1–2 sem. | 1 | 4 | 4 | Faible | Élevée | 200–3 000 €/mois | 9 | 6 | 8 | **23** |

### C. Micro-SaaS (réutilisation du code de DINO)

| # | Opportunité | Coût de démarrage | Mise en œuvre | Diff. | Évol. | Récur. | Maintenance | Concurrence | Potentiel long terme | Rapidité | Durabilité | Autom. | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 15 | **Alertes de prix pour l'e-commerce** (même moteur d'alertes sans spam, appliqué à des produits) | 50–200 € | 6–8 sem. | 3 | 5 | 5 | Moyenne | Moyenne | 1 000–10 000 €/mois | 5 | 7 | 8 | **20** |
| 16 | **Générateur d'itinéraires IA en marque blanche** pour agences, conciergeries et offices de tourisme | 100–300 € | 6–8 sem. | 3 | 4 | 5 | Moyenne | Moyenne | 1 000–8 000 €/mois | 5 | 7 | 7 | **19** |
| 17 | **Indemnisation des vols retardés** (règlement européen CE 261/2004), payée par une commission sur les sommes obtenues | 200–1 000 € | 2–3 mois | 4 | 4 | 3 | Élevée | Élevée | 1 000–20 000 €/mois | 4 | 8 | 6 | **18** |
| 18 | **Extension Chrome** qui affiche le coût total réel (bagages, frais) sur les sites des compagnies, avec affiliation | 0–50 € | 3–5 sem. | 3 | 5 | 3 | Moyenne | Moyenne | 300–5 000 €/mois | 6 | 6 | 8 | **20** |
| 19 | **Bot Telegram ou WhatsApp d'alertes de vols** sur abonnement | 0–50 € | 2–3 sem. | 2 | 5 | 5 | Faible | Moyenne | 300–5 000 €/mois | 8 | 6 | 9 | **23** |
| 20 | **Service de Web Push clé en main** pour petits sites et boutiques | 50–200 € | 2 mois | 4 | 5 | 5 | Moyenne | Élevée | 500–5 000 €/mois | 4 | 6 | 8 | **18** |
| 21 | **Outil IA d'annonces pour hôtes Airbnb** (descriptions, guides d'accueil traduits) | 0–100 € | 2–3 sem. | 2 | 5 | 4 | Faible | Élevée | 200–3 000 €/mois | 8 | 4 | 9 | **21** |

### D. Contenu et audience

| # | Opportunité | Coût de démarrage | Mise en œuvre | Diff. | Évol. | Récur. | Maintenance | Concurrence | Potentiel long terme | Rapidité | Durabilité | Autom. | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 22 | **Chaîne YouTube ou TikTok « build in public »** en français (DINO de A à Z) | 0–500 € | En continu | 1 | 5 | 3 | Élevée | Moyenne | 500–10 000 €/mois | 6 | 8 | 3 | **17** |
| 23 | **Newsletter technique payante** en français (veille Next.js et IA appliquée) | 0 € | 1–2 sem. | 1 | 4 | 5 | Élevée | Moyenne | 300–5 000 €/mois | 7 | 6 | 4 | **17** |
| 24 | **Annuaire de niche** (par exemple outils pour nomades numériques) avec fiches payantes et mises en avant | 0–100 € | 2–4 sem. | 2 | 4 | 4 | Faible | Moyenne | 300–3 000 €/mois | 8 | 6 | 8 | **22** |
| 25 | **Baromètre des prix du voyage** (rapports agrégés et anonymes, vendus ou sponsorisés auprès des médias) | 0–200 € | 1 mois | 3 | 4 | 3 | Faible | Faible | 200–3 000 €/mois | 6 | 5 | 9 | **20** |

### E. Services productisés et actifs récurrents

| # | Opportunité | Coût de démarrage | Mise en œuvre | Diff. | Évol. | Récur. | Maintenance | Concurrence | Potentiel long terme | Rapidité | Durabilité | Autom. | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 26 | **MVP en 4 semaines** à prix fixe, suivi d'un contrat de maintenance mensuel | 0 € | 1 sem. | 3 | 2 | 4 | Élevée | Élevée | 3 000–15 000 €/mois | 9 | 7 | 2 | **18** |
| 27 | **Hébergement et maintenance gérés** d'applications Next.js pour des clients (abonnement) | 0–100 € | 2 sem. | 3 | 3 | 5 | Moyenne | Moyenne | 1 000–6 000 €/mois | 7 | 8 | 6 | **21** |
| 29 | **Petites apps mobiles utilitaires** (convertisseur de devises hors ligne via Frankfurter, liste de bagages), avec publicité ou achat unique | 125 € | 2–4 sem. chacune | 2 | 4 | 2 | Faible | Élevée | 100–2 000 €/mois | 7 | 5 | 9 | **21** |

## Les trois classements

### 1. Par rapidité de lancement (premiers euros en moins d'un mois)

1. **#14** Modèles Notion ou Sheets (10)
2. **#1** Affiliation dans DINO (9)
3. **#9** Composants d'interface (9)
4. **#11** Ebook technique (9)
5. **#26** MVP productisé (9)
6. **#30** Affiliation SaaS pour développeurs (9)
7. **#5** Newsletter de bons plans (8)
8. **#8** Kit de démarrage Next.js (8)
9. **#19** Bot Telegram d'alertes (8)
10. **#13** Serveurs MCP et skills (8)

### 2. Par durabilité (revenus qui résistent dans le temps)

1. **#28** DINO en marque blanche (9) : contrats B2B, faible concurrence, clients fidèles
2. **#2** DINO Premium (8)
3. **#3** API B2B (8)
4. **#17** Indemnisation CE 261 (8) : droit européen stable
5. **#22** Chaîne YouTube (8) : l'audience est un actif
6. **#27** Hébergement géré (8)
7. **#1, #4, #5, #6, #7, #15, #16, #26** (7)

### 3. Par potentiel d'automatisation

1. **#9, #11, #14** (10) : produits numériques, rien à livrer après la vente
2. **#1, #5, #6, #8, #10, #19, #21, #25, #29** (9)
3. **#2, #3, #4, #7, #13, #15, #18, #20, #24, #30** (8)

### Classement global (total sur 30)

| Rang | Opportunité | Total |
|---|---|---|
| 1 | #1 Affiliation dans DINO | 25 |
| 2 | #5 Newsletter de bons plans automatisée | 24 |
| 3 | #6 Pages SEO générées automatiquement | 23 |
| 3 | #19 Bot Telegram d'alertes | 23 |
| 3 | #8 Kit de démarrage Next.js | 23 |
| 3 | #30 Affiliation SaaS pour développeurs | 23 |
| 7 | #2 DINO Premium | 22 |
| 7 | #24 Annuaire de niche | 22 |

## Recommandation du stratège

Le meilleur levier n'est pas une idée isolée. C'est **un volant d'inertie autour de DINO**, parce que le code existe déjà et que les idées #1, #5, #6 et #19 partagent le même moteur.

1. **Mois 1, encaisser vite.** Brancher de vraies clés et activer l'affiliation (#1). Lancer les pages SEO (#6) et la newsletter de bons plans (#5) alimentées par le worker existant.
2. **Mois 2–3, rendre récurrent.** Brancher Stripe pour l'offre Premium (#2), dont le plan est déjà modélisé. Ajouter le bot Telegram (#19), qui sert de canal d'alertes de plus.
3. **Mois 3–6, valoriser les compétences.** Extraire le kit de démarrage (#8) du code de DINO et documenter la construction en public (#22 ou #10). Chaque contenu fait venir des utilisateurs à DINO.
4. **Mois 6–12, sécuriser.** Proposer la marque blanche (#28) et l'API (#3) aux agences et aux CSE une fois la traction prouvée. C'est là que se trouvent les revenus les plus durables.
5. **Toujours.** Réinvestir automatiquement une part fixe des gains (par exemple 30 %) dans un placement diversifié (ETF via un PEA). C'est le seul revenu réellement passif de cette liste.

## Points de vigilance

- **Conditions d'utilisation des fournisseurs.** Open-Meteo demande une offre payante pour un usage commercial (voir `docs/BUSINESS.md`). Les données de prix de Duffel ou Travelpayouts ne peuvent généralement pas être revendues telles quelles : à vérifier avant les idées #3, #4 et #25.
- **Coûts variables.** Duffel facture selon le ratio recherches / réservations et Claude au jeton. Un succès mal maîtrisé peut coûter plus qu'il ne rapporte, donc il faut garder le cache et la fréquence limitée des alertes.
- **Éthique de DINO.** Les principes de `docs/BUSINESS.md` (pas de classement guidé par les commissions, pas de revente de données personnelles) sont un argument commercial, surtout pour la marque blanche et les CSE. Ils sont à conserver dans toutes les déclinaisons.
- **Statut juridique.** La réservation directe ferait de DINO une agence de voyage (immatriculation Atout France, garantie financière). L'affiliation évite ces obligations.
