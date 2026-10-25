# 🦖 DINO — le compagnon de voyage intelligent

DINO compare les vols et les hôtels de plusieurs sources, affiche le **coût total réel** (billet, frais connus, bagages), dit s'il vaut mieux **acheter ou attendre**, prévient quand un prix baisse **sans spammer**, et aide à choisir **où et quand partir**. Chaque chiffre affiché indique d'où il vient : donnée en direct, en cache, estimation, prévision ou démonstration.

> **État honnête du projet.** Le produit est complet et testé **en mode démonstration**. Les connecteurs réels (Duffel, Travelpayouts, LiteAPI, Claude, Open-Meteo, Frankfurter, SMTP, Web Push) sont écrits et testés sur des réponses d'exemple, mais **n'ont jamais été appelés avec de vraies clés** pendant le développement. Voir « Ce qui fonctionne réellement ».

## Démarrer en 2 minutes

Prérequis : Node.js 20.9 ou plus récent. Aucune base de données à installer.

```bash
npm install
npm run db:setup     # migrations + données de démonstration (affiche le mot de passe du compte démo)
npm run dev          # http://localhost:3000
```

Sans aucune variable d'environnement, tout fonctionne en **mode démonstration** : les vols et hôtels sont fictifs, marqués d'un badge orange « Démo », et ne sont pas réservables. Un bandeau le rappelle sur chaque page.

Pour brancher de vraies données : `cp .env.example .env.local`, ajoutez vos clés, redémarrez. Détails dans [docs/PROVIDERS.md](docs/PROVIDERS.md).

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` puis `npm start` | Build et serveur de production |
| `npm run lint` | Vérification TypeScript stricte |
| `npm test` | Tests unitaires et d'intégration (Vitest, base PGlite en mémoire) |
| `npm run test:e2e` | Tests de bout en bout (Playwright) sur le build de production — lancer `npm run build` avant |
| `npm run db:migrate` | Applique les migrations SQL (`drizzle/`) |
| `npm run db:seed` | Compte et contenus de démonstration (idempotent) |
| `npm run db:generate` | Génère une migration après modification de `src/lib/db/schema.ts` |
| `npm run worker` | Planificateur séparé (alertes, purge) pour PostgreSQL et plusieurs instances |
| `npm run climate:refresh` | Récupère les normales climatiques Open-Meteo pour les destinations |

## Fonctionnalités

- **Accueil** : moteur de recherche (vols, hôtels, « Je ne sais pas où partir »), bons plans depuis votre aéroport, destinations par budget, meilleure période, vos alertes et voyages.
- **Vols** : multi-fournisseurs avec dédoublonnage, aller simple / aller-retour / multi-destinations, calendrier flexible du mois, aéroports proches, horaires en heure locale avec « +1 », billet / frais / total séparés, bagages, filtres, tri « meilleur choix » expliqué, liens affiliés signalés.
- **Prévision de prix** : acheter / attendre / pas assez de données, avec fourchette, nombre de relevés et période. Jamais de promesse de baisse.
- **Hôtels** : comparaison entre fournisseurs avec rapprochement du même établissement, carte, score qualité-prix sur 10 expliqué, taxes payables sur place séparées.
- **Alertes** : route, destination flexible, « partout », hôtel ; anti-spam (empreinte, délai de 12 h, plafond quotidien) ; canaux in-app, e-mail, push.
- **Assistant DINO** : Claude côté serveur avec outils (recherche, saisons, budget), réponses en 4 sections séparées : faits vérifiés, estimations, prévisions, recommandations. Sans clé : analyse automatique par règles.
- **Destinations** : calendrier 12 mois (météo, prix, affluence, événements séparés), carte du monde, inspiration par budget et envies.
- **Budget total** : 3 scénarios (économique, confort, premium), chaque ligne étiquetée selon sa source.
- **Mon monde** : pays et villes visités, envies, statistiques ; privé par défaut.
- **Communauté** : conseils, commentaires sur 2 niveaux, likes, abonnements, signalements, modération (automatique + file humaine), classement expliqué, contenus sponsorisés déclarés.
- **Compte** : inscription facultative, préférences, export RGPD JSON, suppression immédiate, recommandations personnalisées désactivables.
- **Tendances** : uniquement sur des agrégats réels avec seuil d'anonymat (5 utilisateurs minimum). Aucune statistique inventée.

## Ce qui fonctionne réellement

Vérifié dans l'environnement de développement :

- 70 tests Vitest (54 unitaires, 16 d'intégration sur une vraie base PostgreSQL embarquée) : **tous passent**.
- 24 tests Playwright sur le build de production (desktop et mobile) : **tous passent**. Ils couvrent la recherche de vols via le formulaire, les hôtels, l'assistant sans clé, l'inscription, la création d'alerte, l'export RGPD, la suppression de compte, la publication et le commentaire d'un conseil, le refus d'un contenu promotionnel, l'absence de défilement horizontal sur mobile, les en-têtes de sécurité, la protection CSRF, les routes protégées, **l'absence de secret serveur dans le code envoyé au navigateur**, **l'absence de bouton sans action** et **l'absence de lien interne cassé**.
- `npm run build` et `tsc --noEmit` : sans erreur.

## Ce qui nécessite des clés ou un service

| Fonction | Variable | Sans elle |
|---|---|---|
| Vols réels en direct | `DUFFEL_API_TOKEN` | Mode démo |
| Prix récents + liens affiliés | `TRAVELPAYOUTS_TOKEN`, `TRAVELPAYOUTS_MARKER` | Mode démo |
| Hôtels réels | `LITEAPI_KEY` | Mode démo |
| Assistant conversationnel complet | `ANTHROPIC_API_KEY` | Analyse automatique par règles |
| E-mails (alertes, réinitialisation) | `SMTP_URL` | Affichés dans le terminal en dev, non envoyés en prod |
| Notifications push | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | In-app et e-mail seulement |
| Météo mesurée | accès réseau à Open-Meteo, `npm run climate:refresh` | Estimations éditoriales marquées comme telles |
| Taux de change du jour | accès réseau à Frankfurter | Table intégrée, signalée comme approximative |

## Limites connues

- Les connecteurs réels n'ont pas été appelés avec de vraies clés : il faut les valider en sandbox (Duffel `duffel_test_`, LiteAPI `sand_`) avant toute mise en production.
- La prévision de prix ne repose que sur les prix que DINO a lui-même observés : elle reste « données insuffisantes » tant que l'historique est court (7 relevés sur 6 jours au minimum).
- Les données climatiques par défaut sont des estimations éditoriales tant que `climate:refresh` n'a pas tourné.
- Les limites de débit sont en mémoire, par processus : derrière plusieurs instances, utilisez un stockage partagé (voir [docs/ROADMAP.md](docs/ROADMAP.md)).
- La CSP autorise `'unsafe-inline'` pour les scripts d'hydratation de Next.js (passage aux nonces prévu).
- DINO ne vend pas de billets : la réservation se fait chez le partenaire.
- Pas de paiement : la formule « premium » existe dans le modèle (limites d'alertes) mais aucune facturation n'est branchée.

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — organisation du code, flux de données, cache, planificateur
- [docs/PROVIDERS.md](docs/PROVIDERS.md) — fournisseurs, obtention des clés, règles d'usage
- [docs/DATA_MODEL.md](docs/DATA_MODEL.md) — tables et conventions (centimes, dates, fuseaux)
- [docs/SECURITY.md](docs/SECURITY.md) — sécurité, vie privée, RGPD
- [docs/BUSINESS.md](docs/BUSINESS.md) — modèle économique et transparence
- [docs/DECISIONS.md](docs/DECISIONS.md) — choix techniques et pourquoi
- [docs/ROADMAP.md](docs/ROADMAP.md) — prochaines étapes
