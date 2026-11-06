# Phase 1 — Audit des outils, des accès et de la boutique

*Réalisé le 6 novembre 2026. Données lues en direct dans l'API Admin Shopify, sauf mention contraire.*

## 1. Outils et accès disponibles

| Outil ou accès | État | Ce que THE WOLF peut faire | Limite |
|---|---|---|---|
| Boutique Shopify « Nuitalys » (connecteur Shopify) | Connecté | Lire tout le catalogue, les pages, la livraison, les commandes et l'analytique ; modifier la boutique **après confirmation du propriétaire à chaque écriture** | Pas de publication de thème actif (bloqué par le connecteur) ; pas d'accès Shopify Payments (droit manquant) |
| Dépôt GitHub `idriss6930-a11y/dino` | Connecté | Écrire et pousser sur la branche de travail | Pas de création d'un nouveau dépôt depuis cette session |
| Gmail, Google Drive | Connectés | Non utilisés : rien ne l'exigeait | Aucun envoi sans votre accord |
| Recherche web | Partielle | Recherches avec citations | Budget d'environ 200 recherches par tour, épuisé pendant l'étude ; aucune page n'a pu être ouverte en entier : les preuves viennent d'extraits de résultats |
| Réseau du conteneur | Limité | Registres de paquets, serveurs MCP, API GitHub | Amazon, AliExpress, Google Trends, Meta Ad Library, TikTok Creative Center : refusés (403) |
| Meta Ads, TikTok Ads/Shop, Google Ads/Merchant Center | Non connectés | — | Aucune donnée publicitaire réelle ; aucune dépense possible (et aucune n'est engagée sans votre accord) |
| DSers / AliExpress | Non connectés | — | **Prix fournisseur réel inconnu : premier blocage pour la décision** |
| Environnement d'exécution | Disponible | Node 22, Python 3.13, Docker, PostgreSQL client | — |

## 2. État réel de la boutique

| Élément | Constat |
|---|---|
| Identité | Nuitalys, nuitalys.fr (SSL actif), plan Basic, EUR, fuseau Europe/Paris |
| Exploitant | Entrepreneur individuel, micro-entreprise, **franchise en base de TVA** (art. 293 B du CGI) |
| Visibilité | **Publique** (pas de mot de passe) |
| Catalogue | 1 produit actif : « L'oreiller papillon », 59 € l'unité, 99 € le duo ; 8 visuels avec textes alternatifs ; fiche honnête (« ce n'est pas un dispositif médical », origine Chine indiquée) |
| Approvisionnement | AliExpress via DSers, entrepôt fournisseur en France, 3 à 7 jours annoncés |
| Pages | Contact, À propos, FAQ, Livraison et retours, formulaire de rétractation, Mentions légales, CGV, Confidentialité : toutes publiées |
| Politiques de caisse | Contact, confidentialité, remboursement (14 jours, retour à la charge du client, garantie légale 2 ans), expédition, CGV, CGU |
| Thème | « Nuitalys Nuit complete » publié (dérivé d'Horizon) ; 4 autres thèmes non publiés |
| Canaux | Boutique en ligne, Point de vente, Shop, TikTok, Google & YouTube |
| Commandes | 0 |
| Trafic | 119 sessions du 4 au 6 novembre, **0 ajout au panier** (source du trafic non analysée : visites internes probables mais non prouvées) |

## 3. Problèmes détectés

| # | Problème | Gravité | Statut |
|---|---|---|---|
| 1 | Le site promettait « livraison incluse » partout, mais la caisse facturait **7,99 €** sous 65 € d'achat (donc pour l'oreiller seul à 59 €) et proposait un « Express 10,99 € » que le fournisseur ne garantit pas | Critique : pratique commerciale trompeuse et abandon de panier | **Corrigé le 06/11** (avec votre confirmation) : un seul tarif « Livraison standard incluse », 0 €, délai estimé 3 à 7 jours. Vérifié par l'API |
| 2 | Aucun coût unitaire saisi dans les variantes | Élevée : aucun calcul de marge possible | À faire : saisir le prix DSers livré |
| 3 | Poids à 0 kg | Moyenne | À faire : peser un colis réel (estimation 1,2 à 1,5 kg) |
| 4 | Stock suivi (20 + 10) avec vente bloquée à zéro sur un produit en dropshipping | Moyenne : rupture artificielle ou fausse rareté | **Corrigé le 06/11** : suivi désactivé |
| 5 | Fiche sans fabricant, personne responsable dans l'UE ni avertissements (GPSR) | Élevée : obligation légale depuis le 13/12/2024 | **Avertissements ajoutés le 06/11** ; fabricant et personne responsable : à obtenir du fournisseur |
| 6 | Responsabilité élargie du producteur : identifiant unique (IDU) Ecomaison pour la literie, Citeo pour les emballages, IDU dans les CGV | Élevée | À vérifier : adhésions non visibles dans la boutique |
| 7 | TVA autoliquidée sur Meta, Google, TikTok et Shopify (factures d'Irlande) : non récupérable en franchise, numéro de TVA intracommunautaire nécessaire | Élevée : +20 % sur chaque euro de publicité | À traiter avant toute campagne |
| 8 | 115 sessions les 4 et 5 novembre sans aucun ajout au panier | Expliqué | **Analysé le 06/11** : 100 % directes, 105 depuis les États-Unis, 101 sur ordinateur, 9 depuis la France : pas des acheteurs |

L'outil `npm run audit` reproduit automatiquement les contrôles 1 à 5 (voir `src/audit/storeAudit.ts`). Il a été testé sur l'état réel de la boutique avant et après la correction.

## 4. Blocages et ce qu'il faut pour les lever

| Blocage | Qui peut le lever | Pourquoi c'est bloquant |
|---|---|---|
| Prix fournisseur réel, délai et qualité (commande d'échantillon) | Vous (DSers) | Toute l'économie unitaire repose dessus |
| Comptes Meta Business, TikTok Ads/Shop, Google Merchant Center et Ads | Vous | Création de campagnes et lecture des performances |
| Jeton d'API Shopify en lecture (app personnalisée) | Vous | Faire tourner les rapports automatiques hors de cette session |
| Accès réseau de l'environnement cloud (`*.myshopify.com`, `graph.facebook.com`) | Vous (réglages de l'environnement) | Exécuter les scripts depuis ce conteneur |
| Numéro de TVA intracommunautaire, IDU Ecomaison et Citeo, médiateur de la consommation | Vous (démarches administratives) | Conformité avant de dépenser en publicité |
