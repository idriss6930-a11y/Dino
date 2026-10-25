# Modèle économique

Principe : **DINO ne gagne jamais d'argent en trompant l'utilisateur.** Le classement des offres ne dépend pas des commissions, et toute relation commerciale est affichée.

## Sources de revenus prévues

| Source | État dans le code | Règle de transparence |
|---|---|---|
| **Liens affiliés** (Travelpayouts / Aviasales, puis d'autres programmes) | Branché : `TRAVELPAYOUTS_MARKER` est ajouté aux liens. | Badge « affilié » sur le bouton, `rel="sponsored"`, explication sur `/sources`. Le tri « Meilleur choix » ignore la commission. |
| **Formule premium** (plus d'alertes, vérification plus fréquente) | Préparé : colonne `users.plan` et `PLAN_LIMITS` (gratuite : 10 alertes vérifiées au plus toutes les 6 h ; premium : 100 alertes, toutes les heures). | **Aucun paiement n'est branché.** Il faut intégrer un prestataire (par exemple Stripe) et une page de gestion de l'abonnement. |
| **Réservation directe** (Duffel, LiteAPI) | Non implémentée : les offres affichent « Réservation via DINO pas encore activée ». | Implique le paiement, les données passagers, le service client et des obligations légales d'agence de voyage. |
| **Contenus sponsorisés** dans la communauté | Branché : type « sponsorisé » avec nom du partenaire obligatoire. | Badge violet, léger déclassement dans le classement, jamais mêlé aux expériences personnelles. |

## Ce que DINO refuse de faire

- Afficher de faux prix, faux avis, fausses statistiques ou faux comptes à rebours (« plus que 2 places ! »).
- Classer une offre plus haut parce qu'elle rapporte une commission.
- Revendre des données personnelles ou utiliser des traceurs publicitaires.
- Prétendre qu'un prix va baisser : la prévision dit « attendre » seulement quand le prix est haut par rapport à ce qui a été observé, avec ses limites affichées.

## Coûts à prévoir

- **Duffel** : facturation selon le volume de recherches par rapport aux réservations. D'où la fréquence limitée des alertes et le cache.
- **Claude (Anthropic)** : facturé au jeton. `ANTHROPIC_EFFORT=low` par défaut, historique limité aux 10 derniers messages, limite de 15 requêtes par minute et par IP.
- **Open-Meteo** : gratuit pour un usage non commercial. Un usage commercial demande l'offre payante.
- **Tuiles de carte** : les serveurs OpenStreetMap ne conviennent pas à un trafic important. Prévoir un fournisseur de tuiles.
- **Hébergement** : un serveur Node.js et PostgreSQL. Un worker séparé dès qu'il y a plusieurs instances.
