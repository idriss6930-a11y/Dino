# Journal des modifications de la boutique nuitalys.fr

Chaque modification faite par THE WOLF sur la boutique en ligne, avec sa raison et la façon de revenir en arrière.
Les états d'origine exacts sont sauvegardés dans [`backups/2026-11-06/`](../backups/2026-11-06/).

| Date | Modification | Raison | Retour arrière |
|---|---|---|---|
| 06/11/2026 | Livraison France : un seul tarif « Livraison standard incluse », 0 €, « Délai estimé : 3 à 7 jours ». Supprimés : Standard 7,99 € (gratuit dès 65 €) et Express 10,99 € | Le site promettait « livraison incluse » alors que la caisse facturait 7,99 € à l'oreiller seul ; l'express n'était pas garanti par le fournisseur | Paramètres > Expédition et livraison > Profil général : recréer les tarifs de `backups/2026-11-06/livraison.json` |
| 06/11/2026 | Fiche « L'oreiller papillon » : nouvelle description (duo en tête, « pour qui », caractéristiques, entretien et consignes de sécurité) et nouvelle description pour les moteurs de recherche | Mettre en avant la seule offre qui supporte la publicité ; ajouter les avertissements exigés par la GPSR ; rester sur des allégations de confort | Coller la description et le SEO de `backups/2026-11-06/produit-oreiller-papillon.json` |
| 06/11/2026 | Ordre des variantes : « Le Duo (2 oreillers) » en premier, donc présélectionné | Le duo dégage 46,92 € avant publicité contre 28,16 € pour l'unité | Produit > Options > glisser « 1 oreiller » en premier |
| 06/11/2026 | Suivi de stock désactivé sur les deux variantes (les 20 + 10 unités étaient fictives) | Éviter une rupture artificielle et tout affichage de fausse rareté ; la rupture réelle du fournisseur déclenche l'alerte `FULFILLMENT_DELAY` | Variante > Inventaire > cocher « Suivre la quantité » (quantités d'origine dans la sauvegarde) |
| 06/11/2026 | Blog « Actualités » : trois guides publiés (`choisir-oreiller-dormeur-cote`, `oreiller-papillon-ou-classique`, `entretenir-oreiller-memoire-de-forme`) | Trafic gratuit depuis les moteurs de recherche, réponses aux questions d'achat, aucune promesse de santé | Boutique en ligne > Articles de blog > masquer ou supprimer |

## Vérification après modifications

Audit de la boutique en ligne le 06/11/2026, avec la chaîne utilisée par l'automatisation (`toStoreSnapshot` puis `auditStore`) :
6 constats avant les modifications, **3 après**, tous liés aux données que seul le fournisseur peut donner :

- `MISSING_UNIT_COST` : coût unitaire réel à saisir (prix DSers livré) ;
- `ZERO_WEIGHT` : poids réel à saisir après réception de l'échantillon ;
- `GPSR_INFO_MISSING` : fabricant et personne responsable dans l'UE (les avertissements sont désormais présents).
