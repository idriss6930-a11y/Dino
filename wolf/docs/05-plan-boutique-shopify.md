# Phase 5 — Plan de construction de la boutique

La boutique existe et elle est conforme sur l'essentiel (pages légales, rétractation, honnêteté de la fiche). Il ne s'agit pas de
la reconstruire mais de **la repositionner sur le duo, de combler les manques légaux et d'installer la mesure**.
Légende : 🟢 THE WOLF peut le faire (chaque écriture dans Shopify vous est soumise pour confirmation) · 🔑 accès ou information
nécessaire · ✋ votre autorisation indispensable.

## 1. Marque et identité

| Élément | Décision | Statut |
|---|---|---|
| Nom | **Nuitalys** conservé (domaine nuitalys.fr actif, pages légales, canaux installés) | ✅ |
| Promesse | « Le bon appui, que vous dormiez sur le dos ou sur le côté. » Confort et position, jamais de soin | 🟢 |
| Positionnement | L'oreiller papillon à deux : duo à 99 €, essai sans tracas, service client en français | 🟢 |
| Ton | Simple, précis, sans superlatif ni urgence artificielle (déjà le cas sur la fiche actuelle) | ✅ |
| Thème | « Nuitalys Nuit complete » (Horizon) conservé ; toute modification se fait sur une copie, publiée par vous | ✋ |

## 2. Architecture de l'offre

| Offre | Prix | Rôle | Statut |
|---|---|---|---|
| **Le Duo** (2 oreillers) | 99 € (49,50 € l'oreiller) | Offre principale, **présélectionnée** sur la fiche | 🟢 réordonner les variantes, après saisie du coût réel 🔑 |
| L'oreiller seul | 59 € | Entrée de gamme, pas de publicité dédiée | ✅ |
| Kit dormeur latéral | 84 € | Uniquement si coussin et masque partent de France pour ≤ 9 € de plus | 🔑 prix DSers |
| Housse de rechange | À fixer | Achat répété (les taies standard ne vont pas sur cette forme) | 🔑 disponibilité fournisseur |
| Remise Black Friday | Aucune remise fictive ; si remise, calculée sur le prix le plus bas des 30 derniers jours | ✋ |

## 3. Fiche produit (mobile d'abord)

Ordre recommandé, du haut vers le bas :

1. Titre, sélecteur **Duo / 1 oreiller** (duo coché), prix, « Livraison incluse, 3 à 7 jours (estimation) », bouton d'achat.
2. Réassurance en une ligne : 14 jours pour changer d'avis · paiement carte, Apple Pay, PayPal, Klarna · service client en France.
3. Visuels existants (8, avec textes alternatifs) puis vidéo de démonstration de la forme (dos, côté) dès qu'elle existe.
4. « Pour qui ? » : dormeurs sur le dos et sur le côté ; **pas** les dormeurs sur le ventre (honnêteté = moins de retours).
5. Caractéristiques (dimensions, mousse, housse, entretien) et **bloc Sécurité et fabricant (GPSR)** : fabricant, personne
   responsable dans l'UE, référence, avertissements. 🔑 informations du fournisseur.
6. FAQ courte (odeur au déballage, temps de reprise de forme, lavage de la housse, retours).
7. Avis : **uniquement de vrais avis** collectés après livraison (Judge.me gratuit). Aucune note affichée tant qu'il n'y en a pas.

Interdits : faux avis, faux compteurs de visiteurs, minuteries qui se relancent, prix barrés non justifiés, « le plus vendu » sans
données, allégations de soulagement ou de traitement. L'audit `npm run audit` contrôle une partie de ces points chaque jour.

## 4. Pages, conformité et réglages

| Tâche | Statut |
|---|---|
| Tarif de livraison aligné sur « livraison incluse » ; option express supprimée | ✅ fait le 06/11 |
| Bloc GPSR sur chaque fiche | 🔑 données fournisseur |
| IDU Ecomaison (literie) et Citeo (emballages) dans les CGV et les mentions légales | ✋ adhésions puis 🟢 mise à jour des pages |
| Médiateur de la consommation : nom et lien dans les CGV | ✋ adhésion puis 🟢 |
| Coût unitaire et poids réels dans chaque variante | 🔑 prix DSers, pesée |
| Stock : synchronisation DSers ou suivi désactivé (aujourd'hui 20 + 10 unités fictives, vente bloquée à zéro) | ✋ votre choix |
| Bandeau cookies : refus aussi simple que l'acceptation (CNIL) | 🟢 vérification |
| Mentions Klarna (paiement fractionné) conformes au crédit à la consommation | 🟢 vérification, règle à confirmer |

## 5. Tunnel et e-mails

| Flux | Contenu | Statut |
|---|---|---|
| Notifications Shopify (confirmation, expédition, livraison) | Relues en français, délai honnête, contact | 🟢 brouillon |
| Paiement abandonné | 1 h puis 24 h, sans remise automatique | 🟢 brouillon, ✋ activation |
| Demande d'avis | 10 jours après livraison, via Judge.me | ✋ installation |
| Housse de rechange | 30 jours après livraison, clients ayant acheté (prospection de produits analogues, désinscription en un clic) | ✋ |
| Montée en gamme après achat | Proposer le second oreiller à 40 € à qui a acheté l'unité (le duo à 99 € reste moins cher que deux unités) | ✋ prix |

## 6. Référencement et canaux gratuits

- **Google & YouTube (déjà installé)** : vérifier que le produit est approuvé dans Merchant Center, que livraison et retours y sont
  déclarés à l'identique du site, et que les fiches gratuites sont actives. 🔑 accès Merchant Center.
- Titre de flux : « Oreiller papillon mémoire de forme — dormeur dos et côté — lot de 2 » ; catégorie Google « Oreillers ».
- Contenus : trois articles utiles (« Quel oreiller quand on dort sur le côté ? », « Oreiller papillon ou classique ? »,
  « Comment entretenir un oreiller à mémoire de forme ? »), sans promesse de santé. 🟢 rédaction.
- **TikTok Shop** (canal TikTok installé) : vérifier l'éligibilité d'une micro-entreprise, les règles d'expédition et ce qu'elles
  imposent à un vendeur en dropshipping avant d'ouvrir un programme d'affiliation à 15 %. 🔑 compte vendeur.

## 7. Mesure (avant tout euro de publicité)

1. Pixel Meta + API Conversions via l'application officielle Meta de Shopify. 🔑 compte Business Meta.
2. Pixel TikTok et balises Google déjà possibles via les canaux installés : vérifier les événements achat. 🔑
3. Commande de test réelle remboursée, pour valider paiement, e-mails, DSers et événements de conversion de bout en bout. ✋
4. Jeton d'API en lecture pour THE WOLF (rapport et alertes quotidiens). 🔑
