# Phase 4 — Business plan

Tous les chiffres sortent du moteur testé (`npm run economics`, `npm run simulate`) et des hypothèses de `config/`,
où chaque valeur porte sa source et son statut. **Les coûts fournisseurs sont estimés** : remplacer `landedCost` par le prix DSers
réel et relancer les commandes avant de dépenser quoi que ce soit.

## 1. Hypothèses

| Poste | Valeur | Statut |
|---|---|---|
| Régime | Micro-entreprise BIC vente, franchise en base de TVA | Sourcé (boutique) |
| Cotisations sur le CA | 12,4 % (12,3 % + 0,1 % CFP) ; +1 % si versement libératoire | Sourcé |
| Publicité | Facture régie × 1,20 (TVA autoliquidée non déductible) | Sourcé |
| Frais de paiement | 2 % + 0,28 € par commande (mix carte, PayPal, Klarna) | Estimé |
| Remboursements | 6 % des commandes, 20 % du coût produit récupéré | Estimé |
| Litiges bancaires | 0,5 % des commandes, 15 € de frais | Frais sourcé, taux estimé |
| Coûts variables divers | 0,50 € par commande (service client, petits frais) | Estimé |
| Frais fixes | 68,45 € par mois (Shopify 43,20 € TVA autoliquidée comprise, domaine, médiateur, Citeo/Ecomaison, banque) | Shopify à vérifier sur facture ; le reste estimé |
| Coût débarqué | Oreiller 18 € ; duo 31 € (envoi groupé) ; kit stock France 27 € | **Estimé** |

## 2. Économie unitaire

| Offre | Prix | Coût débarqué | Contribution avant pub | CPA max (HT régie) | ROAS de rentabilité | Profit par commande à 28 / 40 / 55 € de CPA |
|---|---|---|---|---|---|---|
| Oreiller seul | 59 € | 18 € | 28,51 € | 23,75 € | 2,48 | −5,09 / −19,49 / −37,49 € |
| **Duo** | **99 €** | **31 €** | **47,62 €** | **39,69 €** | **2,49** | **+14,02 / −0,38 / −18,38 €** |
| Kit dormeur latéral, stock France | 84 € | 27 € | 39,59 € | 32,99 € | 2,55 | +5,99 / −8,41 / −26,41 € |
| Kit, accessoires de Chine | 84 € | 27 € + 10 € de douane | 29,59 € | 24,66 € | 3,41 | −4,01 / −18,41 / −36,41 € |
| Mix réaliste 60 % duo / 40 % unité | 83 € | 25,80 € | 39,98 € | 33,31 € | 2,49 | — |
| Plan B : Pilates, stock UE | 44,90 € | 8 € | 27,12 € | 22,60 € | 1,99 | −6,48 / −20,88 / −38,88 € |

Trois enseignements :

1. **L'oreiller seul ne peut pas être vendu par publicité payante** : il faudrait un CPA inférieur à 23,75 €.
2. **Le duo est la seule offre rentable dès la première commande à un CPA réaliste** (équilibre à 39,69 €).
3. **Un accessoire expédié de Chine détruit la marge** : 10 € de douane et frais font perdre 10 € de contribution au kit.

## 3. Le test de novembre (11 → 22 novembre)

Budget : 32,50 € HT par jour pendant 12 jours = 390 € HT facturés, **468 € de coût réel**. Frais de départ : 120 € (échantillon,
premières adhésions). Versements Shopify à J+3.

| Scénario (offre duo) | CPA | Commandes | CA conservé | Résultat net du test | Trésorerie mobilisée au pire moment |
|---|---|---|---|---|---|
| Pessimiste | 55 € | 7 | 656 € | **−278 €** | 359 € |
| Réaliste | 40 € | 10 | 903 € | **−151 €** | 321 € |
| Optimiste | 28 € | 14 | 1 289 € | **+48 €** | 354 € |

Le test n'est pas fait pour gagner de l'argent : il **achète une information** (le vrai CPA, la part de duos, la conversion de la fiche)
pour 150 à 280 € de perte maximale réaliste, avant la semaine du Black Friday où la même information coûterait 60 à 116 % plus cher.

## 4. Les 90 jours suivants (si le test passe : ROAS ≥ 2,5)

Simulation sur le mix 60 % duo / 40 % unité, frais fixes compris, versements à J+3.

| Scénario | Budget pub | CPA | Commandes | CA | Coût pub | Résultat net 90 jours | Trésorerie au pire |
|---|---|---|---|---|---|---|---|
| Pessimiste | 0 € (arrêt après le test) | — | — | — | — | perte du test uniquement | — |
| Réaliste | 30 € HT/jour | 36 € | 75 | 5 820 € | 3 240 € | **−447 €** | 659 € |
| Optimiste | 45 € HT/jour | 28 € | 145 | 11 225 € | 4 860 € | **+717 €** | 296 € |

**Lecture sans complaisance** : en publicité payante seule, même dans le bon scénario, l'activité dégage environ 240 € par mois.
Ce n'est pas une entreprise, c'est un point de départ. Ce qui la rend rentable :

| Levier | Effet attendu (calculé) | Statut |
|---|---|---|
| Part de duos de 60 % à 80 % | Panier de 83 € à 91 €, CPA max de 33,31 € à environ 36,50 € | Fiche produit : duo présélectionné |
| Affiliés TikTok Shop (9 % plateforme TVA autoliquidée comprise + 15 % créateur) | **18,56 € par commande sur le mix, 22,08 € sur le duo, sans aucune dépense préalable** | Règles d'expédition et d'éligibilité en France à vérifier |
| Fiches gratuites Google (canal déjà installé) | Ventes sans coût d'acquisition | À activer et contrôler |
| E-mails : relance panier, demande d'avis, housse de rechange | Ventes répétées sans coût d'acquisition | Contenus à écrire, envoi sur votre accord |
| Coût fournisseur −3 € sur le duo | +3 € par commande, CPA max +2,50 € | Négociation ou second fournisseur France |

## 5. Budget et capital nécessaire

| Poste | Montant | Quand | Votre accord |
|---|---|---|---|
| Échantillon (oreiller, éventuellement accessoires) | 30 à 50 € (estimé) | Immédiat | Oui (achat) |
| Adhésions REP (Citeo 80 à 110 € HT par an ; Ecomaison non chiffré) | 80 à 150 € (estimé) | Avant le test | Oui (engagement) |
| Médiateur de la consommation | Non chiffré (à vérifier) | Avant le test | Oui (contrat) |
| Test publicitaire | 390 € HT facturés, 468 € réels | 11 → 22 novembre | **Oui (dépense)** |
| Frais fixes | 68,45 € par mois | En continu | Déjà engagés |
| Réserve de trésorerie (décalage des versements, remboursements) | 350 € | Pendant le test | — |
| **Trésorerie à prévoir pour novembre** | **≈ 1 000 à 1 100 €** hors médiateur (dont 350 € de réserve qui revient) | | |
| **Perte si le test échoue** | **≈ 230 à 430 €** (résultat du test de −151 à −278 € + adhésions REP de 80 à 150 €) | | |
| Si le test passe : montée en charge décembre-janvier | 30 à 45 € HT par jour, soit 1 100 à 1 650 € réels par mois, autofinancés à partir du 2e mois en scénario optimiste | Décembre | Oui, palier par palier |

## 6. Cadre juridique et fiscal

- Plafond de chiffre d'affaires micro (vente) : 203 100 € par an (2026-2028). Franchise de TVA : 85 000 € (tolérance 93 500 €) ;
  au-delà de 93 500 €, la TVA est due dès le jour du dépassement : les prix devront alors intégrer 20 % de TVA.
- La TVA autoliquidée sur la publicité suppose un **numéro de TVA intracommunautaire** et une déclaration : à faire avant le test.
- Passage en société (EURL ou SASU à l'IS) : les cotisations porteraient sur le bénéfice et non sur le CA. Le modèle des notes
  (hypothèses non vérifiées) le rend intéressant entre 20 000 et 55 000 € de CA selon la marge : **rendez-vous expert-comptable à
  30 000 € de CA**.

## 7. Indicateurs et règles de pilotage

| Indicateur | Seuil | Source |
|---|---|---|
| ROAS régie | ≥ 2,5 (sinon arrêt) | Rapport quotidien |
| CPA | ≤ 39,69 € (duo) ; ≤ 33,31 € (mix) | Rapport quotidien |
| Dépense depuis la dernière vente | < 3 × CPA max | Alerte `KILL_NO_SALES` |
| Taux de remboursement (14 jours) | ≤ 8 % | Alerte `REFUND_RATE_HIGH` |
| Taux d'ajout au panier | ≥ 4 à 5 % des sessions françaises | ShopifyQL |
| Bénéfice net quotidien | > 0 sur 3 jours glissants | Alerte `CONSECUTIVE_LOSSES` |

## 8. Risques

| Risque | Probabilité | Impact | Parade |
|---|---|---|---|
| Coût fournisseur réel > 31 € pour le duo | Moyenne | Élevé | Seuil de lancement ; second fournisseur France |
| CPA réel > 40 € | Élevée en novembre | Élevé | Plafond de test et arrêt automatique |
| Concurrence Derila / Amazon sur le prix | Certaine | Moyen | Duo et kit, pas l'unité ; essai, service en français |
| Qualité ou délai fournisseur décevants | Moyenne | Élevé | Échantillon avant le test ; alerte 48 h |
| Contrôle DGCCRF (GPSR, prix de référence, allégations) | Faible à moyenne | Élevé | Audit automatique, allégations de confort uniquement |
| Dépendance à un seul produit | Certaine | Élevé | Plan B Pilates prêt pour janvier |
