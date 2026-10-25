# Prochaines étapes

## Avant une mise en production
1. **Valider les connecteurs réels** avec des clés de test : Duffel (`duffel_test_…`), LiteAPI (`sand_…`), Travelpayouts. Comparer quelques résultats à la main avec le site du fournisseur.
2. **Activer Claude** (`ANTHROPIC_API_KEY`) et relire une vingtaine de réponses de l'assistant, en particulier la séparation faits / estimations.
3. **Lancer `npm run climate:refresh`** depuis un serveur avec accès réseau, pour remplacer les estimations climatiques éditoriales par des mesures.
4. **PostgreSQL géré** + `DINO_SCHEDULER=off` + `npm run worker` (ou cron externe).
5. **Limites de débit partagées** (Redis ou table) si plusieurs instances.
6. **CSP avec nonces** via un middleware, pour retirer `'unsafe-inline'`.
7. **SMTP** (vérification d'adresse e-mail à l'inscription, à ajouter) et **clés VAPID**.
8. **Fournisseur de tuiles** de carte adapté au trafic.
9. Faire valider la **politique de confidentialité** et les mentions légales, et y indiquer l'identité de l'exploitant.

## Produit
- Réservation directe via Duffel et LiteAPI (paiement, données passagers, e-mails de confirmation).
- Paiement de la formule premium.
- Plus de fournisseurs : autres API officielles de vols, trains, location de voitures.
- Alertes « partout » sur plusieurs mois avec résumé hebdomadaire.
- Application mobile (PWA installable : le service worker existe déjà pour le push).
- Traduction de l'interface (le référentiel des destinations est déjà structuré par langue).
- Plus de destinations éditoriales (50 aujourd'hui) et calendrier d'événements sourcé.

## Qualité
- Tests e2e de l'alerte de bout en bout avec un faux serveur SMTP.
- Tests de charge sur la recherche multi-fournisseurs.
- Audit d'accessibilité complet (lecteur d'écran, contrastes, navigation clavier).
