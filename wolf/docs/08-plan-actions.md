# Plan d'actions — à partir du 6 novembre 2026

Légende : ✅ fait · 🟢 THE WOLF peut le faire directement (les écritures dans Shopify vous sont soumises pour confirmation) ·
🔑 un accès ou une information de votre part est nécessaire · ✋ votre autorisation est indispensable (dépense, achat, contrat,
envoi aux clients, publication, changement irréversible).

## Déjà fait (6 novembre)

| Action | Statut |
|---|---|
| Audit des outils, des accès et de la boutique en direct | ✅ |
| Correction de la livraison : « livraison incluse » respectée à la caisse, express non garanti supprimé | ✅ (avec votre confirmation) |
| Diagnostic des 119 sessions : 100 % directes, 88 % depuis les États-Unis, 85 % sur ordinateur, 9 depuis la France : pas des acheteurs | ✅ |
| Étude de marché : 39 candidats, 20 retenus, rapport sourcé | ✅ |
| Sélection : n°1 duo Nuitalys, n°2 Pilates (plan B), n°3 portrait IA (2027) | ✅ |
| Moteur économique, simulation de trésorerie, audit automatique, P&L quotidien, 9 alertes, connecteurs Shopify et Meta, tableau de bord | ✅ (74 tests) |
| Business plan, architecture, plans boutique, publicité et automatisation | ✅ |

## Cette semaine (6 → 10 novembre) : préparer le test

| # | Action | Qui | Statut |
|---|---|---|---|
| 1 | Relever dans DSers le prix livré de 1 et 2 oreillers, le délai réel et l'existence d'un coussin de genoux et d'un masque en stock France | Vous | 🔑 |
| 2 | Saisir ces coûts dans Shopify et `config/offers.json`, relancer `npm run economics` ; **go si 2 oreillers livrés ≤ 31 €** | THE WOLF | 🟢 dès réception des prix |
| 3 | Commander un échantillon livré à Limoges (oreiller, et accessoires s'ils existent) | Vous | ✋ achat ≈ 30-50 € |
| 4 | Obtenir du fournisseur : fabricant, personne responsable dans l'UE, avertissements ; publier le bloc GPSR | Vous puis THE WOLF | 🔑 puis 🟢 |
| 5 | Fiche produit : duo présélectionné, réassurance, « pour qui », FAQ ; textes de confort uniquement | THE WOLF | 🟢 (écriture soumise à votre confirmation) |
| 6 | Décider du stock affiché : synchronisation DSers ou suivi désactivé | Vous | ✋ |
| 7 | Numéro de TVA intracommunautaire (autoliquidation de la TVA sur la publicité) | Vous | ✋ démarche |
| 8 | Adhésions Citeo et Ecomaison (IDU), médiateur de la consommation ; puis IDU et médiateur dans les CGV | Vous puis THE WOLF | ✋ contrats puis 🟢 |
| 9 | Créer l'app Shopify « THE WOLF (lecture) » et me transmettre le jeton par un canal sûr (secret GitHub ou `.env`), jamais dans la conversation | Vous | 🔑 |
| 10 | Installer pixel Meta + API Conversions, vérifier les événements TikTok et Google ; commande de test remboursée | Vous (accès), THE WOLF (vérification) | 🔑 ✋ |
| 11 | Vérifier Merchant Center : produit approuvé, fiches gratuites actives | Vous | 🔑 |
| 12 | Vérifier l'éligibilité TikTok Shop (micro-entreprise, règles d'expédition et de dropshipping) | Vous (compte), THE WOLF (analyse) | 🔑 |
| 13 | Rédiger les brouillons : relance de panier, notifications, demande d'avis, trois articles de blog | THE WOLF | 🟢 |
| 14 | Tourner trois vidéos selon les scripts de `06-strategie-publicitaire.md` | Vous ou un créateur rémunéré | ✋ si rémunéré |

## Test (11 → 22 novembre)

| # | Action | Statut |
|---|---|---|
| 15 | Lancer la campagne Meta à 32,50 € HT par jour, plafond 390 € HT (468 € réels) | ✋ **dépense** |
| 16 | Rapport et alertes chaque matin (`npm run report`, ou GitHub Actions une fois le dépôt dédié créé) | 🟢 avec le jeton |
| 17 | Couper toute publicité ayant dépensé 3 × le CPA maximal sans vente | 🟢 recommandation ; ✋ l'action dans le gestionnaire de publicités vous appartient tant que je n'y ai pas accès |

## Décision (23 novembre)

| Résultat | Suite |
|---|---|
| ROAS ≥ 2,5 et remboursements ≤ 8 % | Relance des visiteurs pendant le Black Friday, angle cadeau jusqu'à la date limite de livraison, montée par paliers de 20 à 30 % (✋ à chaque palier) |
| ROAS < 2,5 | Arrêt de la publicité payante sur l'oreiller ; fiches gratuites et affiliation seulement ; ouverture du plan B Pilates pour fin décembre (✋ nouvelle boutique : environ 27 à 89 € par mois) |

## Ce que je peux faire tout de suite si vous dites oui

1. Réécrire la fiche produit (duo présélectionné, réassurance, « pour qui ») et vous la soumettre en écriture Shopify.
2. Rédiger tous les e-mails et les trois articles en brouillon, non envoyés et non publiés.
3. Préparer la fiche « Kit dormeur latéral » en **brouillon non publié**, dès que les prix des accessoires sont connus.
4. Extraire THE WOLF dans un dépôt dédié dès que vous l'aurez créé sur GitHub.
