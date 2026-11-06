# Message au fournisseur AliExpress (via la messagerie de la commande ou de la boutique)

À envoyer par vous depuis le compte qui passe les commandes DSers. En anglais simple : c'est ce que les vendeurs comprennent le mieux.

---

Hello,

I sell your butterfly memory-foam pillow (64 × 38 × 14 cm, white/grey) in France and I want to order regularly from your
**France warehouse**. Could you please answer these points?

1. **Price** with shipping from the France warehouse to a French address: for 1 pillow, and for **2 pillows in one parcel**.
   Real delivery time from the France warehouse (days).
2. **Stock** available in the France warehouse today.
3. **EU product safety (GPSR)** — please send:
   - the manufacturer's name, postal address and email;
   - the name, postal address and email of the economic operator / responsible person in the EU;
   - the model or reference number printed on the product or label;
   - the safety warnings and care instructions provided with the product;
   - any test report or certificate (foam: OEKO-TEX, CertiPUR, flammability; cover composition).
4. Do you also have, **shipped from the France warehouse**: a knee pillow for side sleepers, a 3D contoured sleep mask,
   and a spare cover for this butterfly pillow? Prices with shipping, please.
5. Can you ship **without any invoice or advertising** in the parcel?

Thank you very much.

---

## Ce qu'il faut en faire

| Réponse | Où la reporter | Seuil |
|---|---|---|
| Prix livré de 2 oreillers | `config/offers.json` (`pillow-duo.landedCost`) et coût unitaire Shopify | **Lancer seulement si ≤ 31 €** |
| Prix livré de 1 oreiller | `pillow-1.landedCost` | Repère : 18 € |
| Fabricant, personne responsable UE, référence, avertissements | Bloc « Sécurité et fabricant » de la fiche produit | Obligatoire (GPSR) |
| Coussin de genoux + masque depuis la France | `kit-lateral-fr.landedCost` | Lancer le kit seulement si ≤ 9 € de plus que l'oreiller |
| Housse de rechange | Nouveau produit d'achat répété | Prix de vente ≥ 3 × coût livré |
| Pas de stock France pour les accessoires | Chercher chez CJ Dropshipping (compte déjà ouvert, entrepôts européens) | Même seuil |
