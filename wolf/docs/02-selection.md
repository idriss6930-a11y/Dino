# Phase 3 — Sélection : les 3 finalistes et le n°1

## Les trois finalistes

| | N°1 — Gamme Nuitalys repositionnée (duo et kit) | N°2 — Kit Pilates (plan B) | N°3 — Portrait d'animal IA |
|---|---|---|---|
| Note harmonisée | 60 (55 à 66 selon l'offre et le stock ; 63 si l'on note le duo) | 60 (64 avec un stock UE) | 61 (58 à 63) |
| Contribution avant pub, réaliste | **46,92 €** (duo 99 €) ; 39,24 € (kit stock France) | 15,16 € (Chine) ; 27,12 € (UE) | 11,64 € |
| CPA maximal HT régie | **39,10 €** (duo) ; 32,70 € (kit) | 12,63 € (Chine) ; 22,60 € (UE) | 9,70 € |
| ROAS de rentabilité | 2,53 (duo) | 3,16 (Chine) ; 1,99 (UE) | 5,66 |
| Délai de mise en vente | Quelques jours | Fin décembre (nouvelle boutique, échantillon) | Du 27 novembre au 10 décembre environ |
| Coûts fixes supplémentaires | Aucun | 27 à 89 € par mois + inscription Ecologic | Idem + imprimeur + IA |
| Saisonnalité | Test avant le Black Friday, cadeau en décembre | Pic de janvier, coûts publicitaires au plus bas | Semaines les plus chères de l'année |
| Verdict | **Lancer le test** | Préparer pour janvier si le n°1 échoue | Reporter à la fête des Mères 2027 |

*Chiffres : `npm run economics` (hypothèses de `config/`, coûts fournisseurs estimés). Les écarts avec le rapport viennent d'hypothèses de
retours et de frais un peu plus prudentes ; ils ne changent pas le classement.*

## Le n°1 : relancer Nuitalys autour du duo, pas de l'oreiller seul

**Décision.** Le produit n°1 est l'oreiller papillon de Nuitalys, mais **vendu d'abord en duo à 99 €** (et en kit dormeur latéral
uniquement si le coussin et le masque partent aussi de l'entrepôt français). L'oreiller seul à 59 € reste au catalogue,
sans publicité dédiée : il ne supporte que 23,46 € d'acquisition.

**Les preuves :**

1. **Demande réelle et prouvée.** Un oreiller papillon quasi identique est n°1 de sa catégorie sur Amazon.fr et 39e de toute la
   catégorie Cuisine et Maison, avec environ 2 936 avis sur une seule variante. Conforama, IKEA, Emma, Tediber, Nature & Découvertes
   en vendent ; Derila y consacre des campagnes massives (une seule publicité : environ 185 800 personnes touchées).
2. **La meilleure économie unitaire de l'étude.** Le duo dégage 46,92 € avant publicité : le second oreiller ajoute 40 € de recette
   pour environ 13 € de coût, sans douane. C'est 60 % au-dessus du panier moyen français (62 € en 2025).
3. **Le seul stock France confirmé du panel.** Pas de 5 € de douane par ligne, livraison en 3 à 7 jours au lieu de 7 à 25.
4. **Le plus court délai et aucun coût fixe en plus.** Domaine, pages légales, paiement, canaux Google et TikTok déjà en place.
5. **Un échec coûte peu et se voit vite.** Le test plafonné à 390 € HT se lit le 23 novembre, avant le Black Friday.

**Pourquoi pas la meilleure note brute (le portrait) ?** Un point d'écart pour cinq d'incertitude ; une contribution réaliste de
11,64 € qui n'autorise que 9,70 € d'acquisition ; une nouvelle boutique, une chaîne d'IA dont les modèles sont retirés le
1er décembre, et une fenêtre de vente de deux semaines au moment où la publicité coûte le plus cher.

**Le temps et l'argent déjà investis dans l'oreiller ne comptent pas dans ce choix.** S'il échoue au test, on l'arrête.

## Ce que THE WOLF conteste dans son propre choix

| Objection | Réponse ou garde-fou |
|---|---|
| La catégorie est la plus saturée du panel (Amazon à 49,99 €, Lidl à 8,99 €, Derila) | On ne se bat pas sur l'unité : le duo et le kit sortent de la comparaison directe avec la fiche Amazon |
| Toutes les marges sont estimées | Aucun euro de publicité avant la saisie du vrai prix DSers. Seuil : **duo livré ≤ 31 €** |
| On ignore quelle part des clients prendra le duo | Le test le mesure. Avec 60 % de duos, le CPA maximal tombe à 32,85 € : c'est le seuil retenu pour les alertes de mix |
| 119 sessions et aucun ajout au panier | **Vérifié le 6/11** : 100 % de trafic « direct », 105 sessions depuis les États-Unis, 101 sur ordinateur, 9 depuis la France. Ce ne sont pas des acheteurs ; la fiche n'a encore jamais été testée sur un vrai public |
| Le payant seul est à peine rentable (le mix perd 480 € sur 90 jours à 36 € de CPA) | Le plan mise aussi sur les canaux à coût variable : fiches gratuites Google, affiliés payés à la commission, contenu non sponsorisé |
| Une garantie d'essai de 30 nuits peut faire monter les retours | À tester seulement après le premier test, en mesurant le taux de retour (alerte au-delà de 8 %) |

## Conditions de lancement (toutes obligatoires)

1. Coût réel saisi dans Shopify : **2 oreillers livrés ≤ 31 €** (sinon revoir le prix ou le fournisseur).
2. Produit contrôlé à distance, sans échantillon (décision du 06/11) : photos et vidéo réelles demandées au fournisseur, avis clients avec photos,
   note du vendeur. Les premières commandes réelles sont suivies une à une (délai, état, retours).
3. Bloc GPSR (fabricant, personne responsable dans l'UE, avertissements) publié sur la fiche.
4. ~~Numéro de TVA intracommunautaire~~ : non bloquant (même coût × 1,2 sans lui), à demander ensuite.
5. Pixel Meta et API Conversions installés ; événements vérifiés avec l'outil « Tester les événements » de Meta (pas d'achat test, décision du 06/11).

## Règles d'arrêt du test (11 → 22 novembre)

- Couper un ensemble de publicités après **3 × CPA maximal dépensés sans vente** (environ 117 € HT pour le duo) : à CPA réel égal au
  CPA maximal, cette situation n'arrive qu'environ 5 fois sur 100.
- Plafond total : **390 € HT** (468 € avec la TVA autoliquidée).
- Le 23 novembre : continuer seulement si le **ROAS mesuré ≥ 2,5**. Sinon, plus aucune publicité payante sur l'oreiller, et ouverture
  du plan B Pilates pour fin décembre.
