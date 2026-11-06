# Lancement — pas à pas (30 minutes)

Test décidé le 06/11/2026 : campagne Meta sur le Duo, **32,50 € par jour, plafond 390 € HT**, jusqu'au 22 novembre. Décision le 23
sur le ROAS (≥ 2,5 pour continuer). Les arrêts sont programmés dans Meta (étape 4) : ils s'appliquent même si personne ne regarde.

## 0. Deux vérifications avant tout (5 minutes)

1. **DSers** : ouvrez le produit relié à l'oreiller papillon. Vérifiez que le fournisseur est bien celui qui expédie depuis la
   France, et **notez le prix livré pour 2 oreillers**. S'il dépasse 31 €, n'activez pas la campagne et envoyez-moi le chiffre :
   le duo perdrait de l'argent à chaque vente.
2. **Shopify > Paramètres > Paiements** : vérifiez que la carte bancaire, Apple Pay, PayPal et Klarna sont bien actifs, puisque la
   fiche produit les annonce.

## 1. Relier Shopify à Meta (10 minutes)

1. Shopify > Applications > boutique d'applications : installez **« Facebook & Instagram »** (éditeur : Meta).
2. Connectez votre compte Facebook, puis créez ou choisissez : le portefeuille Business, la page Facebook « Nuitalys »,
   le compte Instagram, le compte publicitaire (pays France, devise EUR, fuseau Paris).
3. Partage des données clients : choisissez **« Maximum »** (pixel + API Conversions).
4. Contrôle : Gestionnaire d'événements Meta > **Tester les événements** > ouvrez nuitalys.fr dans le même navigateur, ajoutez
   le duo au panier. Les événements PageView, ViewContent et AddToCart doivent apparaître. (Pas d'achat test : décision du 06/11.)

## 2. Moyen de paiement (2 minutes)

Compte publicitaire > Paramètres de paiement > ajoutez votre carte. Laissez le numéro de TVA vide pour l'instant :
Meta facturera la TVA française, le coût est le même (× 1,2).

## 3. La campagne (10 minutes)

Gestionnaire de publicités > Créer :

| Réglage | Valeur |
|---|---|
| Objectif | **Ventes** |
| Nom | `TEST DUO NOV26` |
| Budget | Budget de campagne Advantage, **32,50 € par jour** |
| Limite de dépenses de la campagne | **390 €** (le plafond du test, appliqué par Meta) |
| Dates | Début dès validation, **fin le 22/11/2026 à 23 h 59** |
| Conversion | Site web, pixel Nuitalys, événement **Achat** |
| Audience | Advantage+ ; suggestion : France, 25-65 ans, tous genres. Aucun intérêt « santé » |
| Placements | Advantage+ (automatiques) |
| Publicités | Les 4 ci-dessous, toutes actives |

Les images sont celles de la fiche produit (Shopify > Produits > L'oreiller papillon > Médias, clic droit > enregistrer).
Le lien de chaque publicité **présélectionne le duo** (paramètre `variant`) et indique d'où vient la vente (paramètres `utm`).

### Publicité A — Dormeur sur le côté

- Image : `nuitalys-position-cote` (personne allongée sur le côté)
- Texte principal : « Vous dormez sur le côté ? Les ailes de l'oreiller papillon accueillent l'épaule et la tête, le creux central
  sert quand vous êtes sur le dos. Mousse à mémoire de forme, housse lavable. Le Duo : 99 € les deux, livraison incluse en France,
  14 jours pour changer d'avis. »
- Titre : « Le Duo papillon — 99 € livré » · Description : « 14 jours pour changer d'avis » · Bouton : **Acheter**
- Lien : `https://nuitalys.fr/products/oreiller-papillon?variant=59130650329419&utm_source=meta&utm_medium=paid&utm_campaign=test-duo-nov26&utm_content=a-cote`

### Publicité B — À deux

- Image : vue de trois quarts (première image de la fiche)
- Texte principal : « On ne dort pas tous pareil. Avec le Duo, chacun a son oreiller papillon : 99 € les deux, soit 49,50 €
  l'oreiller au lieu de 59 €. Livraison incluse en France métropolitaine, 3 à 7 jours (estimation). »
- Titre : « Un oreiller chacun » · Description : « 49,50 € l'oreiller avec le Duo » · Bouton : **Acheter**
- Lien : `https://nuitalys.fr/products/oreiller-papillon?variant=59130650329419&utm_source=meta&utm_medium=paid&utm_campaign=test-duo-nov26&utm_content=b-duo`

### Publicité C — La forme expliquée (carrousel de 4 images)

- Cartes : 1 `nuitalys-position-dos` « Sur le dos : la tête dans le creux » · 2 `nuitalys-position-cote` « Sur le côté : l'épaule
  sous l'aile » · 3 `nuitalys-gros-plan-creux` « Mousse à mémoire de forme » · 4 `nuitalys-dimensions` « 64 × 38 × 14 cm »
- Texte principal : « Pourquoi cet oreiller a des ailes ? Pour passer du dos au côté sans plier son oreiller. Le Duo à 99 €,
  livraison incluse en France. »
- Bouton : **Acheter** · Lien : même lien avec `utm_content=c-forme`

### Publicité D — Sans risque

- Image : `nuitalys-vue-angle`
- Texte principal : « Commander un oreiller sans l'avoir essayé ? Livraison incluse en France, 14 jours après réception pour
  changer d'avis, service client en français. Le Duo papillon : 99 € les deux. »
- Titre : « Livré, et 14 jours pour décider » · Bouton : **Acheter** · Lien : même lien avec `utm_content=d-risque`

Interdits dans les textes : « soulage », « douleur », « cervicales », « ronflement », « médical », avant/après, faux avis,
fausse urgence, prix barré.

## 4. Les arrêts automatiques (3 minutes)

Gestionnaire de publicités > menu > **Règles automatisées** > Créer une règle :

| Règle | S'applique à | Conditions | Action |
|---|---|---|---|
| Couper une pub sans vente | Toutes les publicités actives de `TEST DUO NOV26` | Montant dépensé ≥ **117 €** ET Achats < 1, sur la durée de vie | **Désactiver** la publicité |
| Alerte CPA | Toutes les publicités actives de `TEST DUO NOV26` | Coût par achat > **39 €** ET Achats ≥ 3, sur la durée de vie | **Envoyer une notification** |

Le plafond de 390 € est déjà appliqué par la limite de dépenses de l'étape 3.

## 5. Ensuite

- Chaque jour : Meta coupe seul ce qui perd. Envoyez-moi une capture du tableau de la campagne (dépense, achats, coût par achat,
  ROAS) quand vous voulez un bilan.
- **23 novembre** : ROAS ≥ 2,5 → on continue pendant le Black Friday, seulement sur les personnes déjà venues sur le site.
  ROAS < 2,5 → on arrête la publicité payante sur l'oreiller et on prépare le plan B (kit Pilates pour janvier).
