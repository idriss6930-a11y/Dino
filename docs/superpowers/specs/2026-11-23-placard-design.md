# Placard — assistant d'annonces pour la revente de seconde main

Date : 23 novembre 2026. Dossier : `placard/` (application indépendante de DINO).

## Pourquoi

La demande de départ était de « mettre en place le business » d'une vidéo TikTok qui annonce un site de
dropshipping automatisé sur Vinted, eBay, Vestiaire Collective et Depop. Ce modèle est interdit par Vinted
(article indisponible, première entrée sur le marché européen) et par Depop (politique dédiée), et il revient à
présenter du neuf d'usine comme de la seconde main. Il n'est donc pas construit.

L'idée retenue, choisie comme « celle qui peut rapporter le plus » : vendre l'outil plutôt que faire la revente
soi-même, à des gens qui revendent des articles qu'ils ont réellement en main. Revenu par abonnement.

## Objectifs

- Créer une annonce complète à partir de photos et de quelques faits (titre, description, mots-clés, prix).
- Diffuser la même annonce sur quatre plateformes sans tout ressaisir.
- Suivre le stock, éviter de vendre deux fois le même article, connaître son bénéfice réel.
- Encaisser un abonnement.

## Non-objectifs

- Trouver des fournisseurs, importer des catalogues, expédier depuis un tiers.
- Gérer plusieurs devises (euro seulement), la messagerie acheteur, les étiquettes d'expédition.

## Anti-objectifs (échec même si ça marche techniquement)

- Publier automatiquement sur une plateforme qui ne l'autorise pas (robot, faux navigateur, API privée).
- Inventer une information : marque non visible, authenticité, prix « du marché » sans source.
- Laisser croire qu'une fonction est réelle alors qu'elle tourne sans clé.

## Approches envisagées

1. **Outil par abonnement pour revendeurs** — retenu. Revenu récurrent, plafond élevé, concurrents existants.
2. Dropshipping eBay avec un grossiste — autorisé, mais faible marge et marché saturé.
3. Achat-revente de seconde main — bonne marge, plafonnée par le temps passé.

## Conception

- **Application** : Next.js 16, TypeScript, Drizzle, PGlite ou PostgreSQL — les mêmes choix que DINO, dont
  l'authentification (scrypt, sessions opaques, contrôle d'origine) est reprise.
- **Rédaction** : Claude (vision + sortie structurée) si `ANTHROPIC_API_KEY` est présent ; sinon un générateur
  par règles, signalé comme tel. Le prix conseillé par l'IA est une estimation étiquetée ; sans IA, l'outil ne
  donne qu'un prix plancher calculé (prix d'achat, frais, marge visée).
- **Plateformes** : eBay par son API officielle (OAuth + Sell Inventory) ; Vinted, Depop et Vestiaire
  Collective en « prêt à copier », champ par champ, avec lien vers la page de dépôt.
- **Suivi** : un statut par plateforme. Marquer « vendu » quelque part fait passer les autres annonces en
  « à retirer » (retrait automatique sur eBay si l'annonce a été publiée par l'API).
- **Abonnement** : gratuit limité à 10 articles par mois ; Premium illimité via Stripe Checkout + webhook.
- **Photos** : redimensionnées dans le navigateur, stockées en base, servies par une adresse non devinable
  (nécessaire pour qu'eBay puisse les lire).

## Laissé au constructeur

Mise en page, textes de l'interface, découpage des fichiers, barèmes de frais par défaut (modifiables et
marqués comme estimations).

## État attendu à la livraison

Tout fonctionne sans aucune clé, en mode démonstration signalé. Claude, eBay, Stripe et l'envoi d'e-mails sont
écrits et testés sur des réponses d'exemple, mais ne sont pas appelés avec de vraies clés.
