# Fournisseurs de données

Règles de DINO, quel que soit le fournisseur :

- **Uniquement des API officielles**, utilisées selon leurs conditions. Aucun scraping de site.
- **Aucun identifiant de compte tiers** n'est demandé à l'utilisateur.
- Chaque donnée affichée porte sa source et sa fraîcheur. Les données de test et de sandbox sont marquées « Bac à sable ».
- Une source en panne n'empêche pas les autres de répondre. L'interface indique quelle source a échoué.
- Les clés restent côté serveur. Le test e2e `security.spec.ts` vérifie qu'aucun secret n'apparaît dans ce qui est envoyé au navigateur.

> Les adaptateurs réels ont été écrits d'après la documentation publique et testés sur des **réponses d'exemple** (`tests/unit/flights.test.ts`, `tests/unit/hotels.test.ts`). Ils **n'ont pas encore été appelés avec de vraies clés**. Commencez par les clés de test et de sandbox, puis vérifiez les résultats avant la production.

## Vols

### Duffel — offres en temps réel
- Fichier : `src/lib/providers/flights/duffel.ts` · Variable : `DUFFEL_API_TOKEN`
- Inscription : https://app.duffel.com → *Developers* → *Access tokens*. Un jeton `duffel_test_…` renvoie des offres de test (compagnie fictive *Duffel Airways*), marquées « Bac à sable » dans DINO.
- Appel : `POST https://api.duffel.com/air/offer_requests?return_offers=true`. Horaires convertis en heure locale avec le fuseau de chaque aéroport, taxes séparées, conditions de remboursement et de modification, bagages inclus.
- Réservation : non implémentée (paiement et données passagers requis). L'offre affiche « Réservation via DINO pas encore activée » : pas de faux bouton.
- Coût : Duffel facture selon le ratio recherches/réservations. DINO limite donc la fréquence des alertes Duffel à 6 h minimum.

### Travelpayouts / Aviasales Data API — prix récents et liens affiliés
- Fichier : `src/lib/providers/flights/travelpayouts.ts` · Variables : `TRAVELPAYOUTS_TOKEN`, `TRAVELPAYOUTS_MARKER`
- Inscription : https://www.travelpayouts.com → programme Aviasales → *API token* et *marker*.
- Appels : `aviasales/v3/prices_for_dates` (recherche) et `v2/prices/month-matrix` (calendrier flexible).
- **Ce sont des prix trouvés récemment par d'autres utilisateurs (cache de 48 h environ), pas des tarifs garantis.** DINO les affiche avec le badge « Prix en cache » et le prix est à confirmer chez le partenaire.
- Les liens de réservation sont des **liens affiliés** et sont signalés comme tels (badge « affilié », `rel="sponsored"`).

### Démo
- `src/lib/providers/flights/demo.ts` : tarifs synthétiques **déterministes** (même requête, même prix), modulés par distance, saison, anticipation, classe et escales. Compagnies suffixées « (fictive) ». Jamais de lien de réservation.

## Hôtels

### LiteAPI (Nuitee)
- Fichier : `src/lib/providers/hotels/liteapi.ts` · Variables : `LITEAPI_KEY`, `LITEAPI_GUEST_NATIONALITY`
- Inscription : https://dashboard.liteapi.travel. Une clé `sand_…` renvoie des données sandbox, marquées « Bac à sable ».
- Appels : `GET /data/hotels` (établissements d'une ville) puis `POST /hotels/rates` (tarifs). Les taxes à payer sur place (`included: false`) sont séparées du total payé en ligne.
- Réservation (prebook/book) : non implémentée.

### Démo
- Deux sources synthétiques (`demo`, `demo-b`) qui partagent une partie des établissements avec de légères variations de nom et de position. Cela permet de tester réellement le rapprochement entre fournisseurs.

## Données de référence et services gratuits

| Source | Usage | Licence | Clé |
|---|---|---|---|
| Open-Meteo (archives ERA5) | Normales climatiques mensuelles, via `npm run climate:refresh` | CC BY 4.0, usage non commercial gratuit (offre commerciale payante) | Non |
| Frankfurter | Taux de change de référence BCE (cache de 12 h) | Données BCE | Non |
| OurAirports | 3 244 aéroports (code, ville, coordonnées) | Domaine public | — |
| Natural Earth | Contours des pays pour la carte | Domaine public | — |
| OpenStreetMap | Tuiles du fond de carte | ODbL, attribution affichée | Non (respecter la politique d'usage des tuiles ; prévoir un fournisseur de tuiles pour un trafic important) |

Les informations éditoriales des destinations (périodes, affluence, événements, estimations de budget) sont des **estimations de la rédaction DINO**, marquées « Estimation » et listées sur `/sources`.

## Ajouter un fournisseur

1. Implémenter `FlightProvider` ou `HotelProvider` (`src/lib/providers/types.ts`) : `isConfigured()`, `search(params, signal)`, `capabilities`, `minCheckIntervalMinutes`.
2. Convertir la réponse en `FlightOffer` / `HotelOffer` : montants en centimes, horaires locaux avec fuseau IANA, `source.isDemo` et `source.freshness` exacts.
3. Ajouter un test sur une réponse d'exemple réelle (anonymisée).
4. L'enregistrer dans `registry.ts` et dans `SOURCE_CATALOG`.
