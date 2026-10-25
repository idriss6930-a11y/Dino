# Modèle de données

Schéma : `src/lib/db/schema.ts` (Drizzle ORM). Migrations SQL : `drizzle/`. Le même schéma tourne sur **PGlite** (PostgreSQL embarqué, par défaut) et sur **PostgreSQL**.

## Conventions

- **Argent** : entiers en centimes (`…_cents`) avec une colonne `currency` (ISO 4217). Aucun calcul en virgule flottante sur les montants.
- **Dates de voyage** : chaînes `YYYY-MM-DD` (date calendaire, sans fuseau).
- **Horaires de vol** : heure locale `YYYY-MM-DDTHH:mm` et fuseau IANA de l'aéroport ; l'heure UTC est calculée à partir des deux.
- **Horodatages techniques** : `timestamptz`.
- **Identifiants** : UUID v4 aléatoires. Les jetons (session, réinitialisation) sont stockés **hachés** en SHA-256.
- **Suppression** : toutes les données personnelles sont liées à `users` avec `ON DELETE CASCADE`. Supprimer le compte supprime tout.

## Tables

| Domaine | Tables | Notes |
|---|---|---|
| Comptes | `users`, `sessions`, `login_attempts`, `password_resets` | `role` : user, moderator ou admin. `plan` : free ou premium (limites d'alertes). |
| Préférences et vie privée | `user_preferences`, `privacy_settings` | Personnalisation et historique de recherche désactivables ; carte privée par défaut. |
| Référentiel | `countries`, `cities`, `airports`, `destinations` | Chargés depuis `src/data` au démarrage (`seed-reference.ts`, idempotent). |
| Sources | `data_sources`, `api_usage` | Catalogue public des sources et compteur d'appels par fournisseur et par jour (suivi des quotas). |
| Cache | `cache_entries` | Cache partagé optionnel entre instances. |
| Offres | `flight_offers`, `properties`, `property_source_refs`, `hotel_offers` | Un établissement peut avoir plusieurs références fournisseur (rapprochement). |
| Historique de prix | `price_observations` | Chaque prix vu, avec route, dates, anticipation, source et indicateur démo. Alimente la prévision et les alertes. Les relevés démo ne sont jamais mêlés aux réels. |
| Climat | `climate_normals` | Normales mensuelles par destination, avec la source (Open-Meteo ou estimation éditoriale). |
| Alertes | `alerts`, `alert_events`, `notifications`, `push_subscriptions` | `alert_events` garde l'empreinte de chaque notification pour éviter les doublons. |
| Voyages | `trips`, `visited_places`, `wishlist_items`, `saved_searches`, `search_history` | `search_history` n'est rempli que si l'utilisateur l'a activé (90 jours). |
| Recommandations | `interactions` | Signaux explicites (vu, aimé, écarté). Effacés quand la personnalisation est désactivée. |
| Communauté | `tips`, `comments`, `tip_likes`, `tip_saves`, `follows`, `reports` | `tips.status` : published, pending ou hidden. `kind` : experience, official, verified ou sponsored. `is_demo` marque les contenus d'exemple du seed. |

## Évolution du schéma

1. Modifier `src/lib/db/schema.ts`.
2. `npm run db:generate` crée une migration SQL dans `drizzle/`.
3. Relire le SQL, le commiter, puis `npm run db:migrate` (ou démarrage automatique).

## Export RGPD

`GET /api/me/export` renvoie un JSON avec le profil, les préférences, les alertes, les notifications, les voyages, la carte, les envies, les recherches enregistrées, l'historique, les interactions, les appareils push (sans leurs clés), les contributions, les likes, les signalements, les abonnements et les sessions (date et navigateur seulement). Le hachage du mot de passe et les jetons de session sont exclus (vérifié par un test d'intégration et un test e2e).
