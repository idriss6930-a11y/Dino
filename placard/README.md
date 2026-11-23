# Placard — une annonce, quatre plateformes

Placard aide les particuliers à revendre des articles **qu'ils ont en main** : il rédige l'annonce à partir des photos, la met au format de Vinted, eBay, Depop et Vestiaire Collective, suit ce qui est en ligne et vendu, et calcule le bénéfice réel. Il se finance par un abonnement.

Application indépendante de DINO, rangée dans ce sous-dossier du même dépôt.

> **État honnête.** Tout fonctionne et est testé **sans aucune clé**, en mode démonstration signalé dans l'interface. Les connexions à Claude, eBay, Stripe et à un serveur d'e-mail sont écrites et testées sur des réponses d'exemple, mais **n'ont jamais été appelées avec de vraies clés**.

## Démarrer

Node.js 20.9 ou plus récent. Aucune base de données à installer.

```bash
cd placard
npm install
npm run dev          # http://localhost:3100
```

Pour brancher de vrais services : `cp .env.example .env.local`, remplissez, redémarrez.

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` puis `npm start` | Build et serveur de production |
| `npm run lint` | Vérification TypeScript stricte |
| `npm test` | Tests unitaires et d'intégration (base PGlite en mémoire) |
| `npm run test:e2e` | Tests dans un navigateur, sur le build de production (`npm run build` avant) |
| `npm run db:generate` | Génère une migration après modification de `src/lib/db/schema.ts` |

## Ce que fait le produit

- **Rédaction** : titre de 80 caractères au plus, description, mots-clés. Avec une clé Claude, l'IA regarde les photos, signale les défauts visibles et donne une fourchette de prix étiquetée « estimation ». Sans clé, le texte est assemblé par des règles à partir de ce que le vendeur a saisi, sans prix conseillé.
- **Quatre plateformes** : pour chacune, les champs prêts à copier dans son vocabulaire (états, limite de 1000 caractères et 5 mots-clés sur Depop, pas de titre libre sur Vestiaire).
- **eBay en un clic** : publication par l'API officielle (OAuth + Sell Inventory) si le vendeur connecte son compte.
- **Suivi** : un statut par plateforme. Marquer « vendu » fait passer les autres annonces en « à retirer », avec rappel sur le tableau de bord ; une annonce publiée par l'API eBay est retirée automatiquement.
- **Bénéfice** : prix de vente moins frais, envoi et prix d'achat. Prix plancher par plateforme.
- **Abonnement** : gratuit jusqu'à 10 articles par mois, Premium sans limite (Stripe Checkout, portail client, webhook signé).
- **Compte** : export des données, suppression immédiate, réinitialisation du mot de passe.

## Ce que le produit refuse de faire

- **Pas de dropshipping.** Vinted interdit de publier un article indisponible et de faire entrer un produit sur le marché européen par sa plateforme ; Depop interdit le dropshipping. Les conditions d'utilisation engagent le vendeur à ne lister que ce qu'il possède.
- **Pas de publication automatique** sur Vinted, Depop ou Vestiaire Collective : elles n'offrent pas d'interface officielle pour cela. Le vendeur colle et valide lui-même.
- **Pas de chiffre sans étiquette** : les estimations de prix et les barèmes de frais sont marqués comme estimations.

## Ce qui est vérifié

- 33 tests Vitest (16 unitaires, 17 d'intégration sur une vraie base PostgreSQL embarquée).
- 9 tests Playwright sur le build de production : parcours complet de la photo à la vente, annulation, quota gratuit, cloisonnement entre comptes, en-têtes de sécurité, contrôle d'origine, export et suppression du compte, absence de secret dans le code envoyé au navigateur, absence de lien cassé, affichage sur téléphone.
- `npm run build` et `npm run lint` sans erreur.

## Avant d'ouvrir au public

| À faire | Pourquoi |
|---|---|
| Valider eBay en bac à sable (`EBAY_ENV=sandbox`) | Le connecteur n'a jamais parlé à eBay. Points à surveiller : catégories qui exigent d'autres caractéristiques que marque, taille, couleur, matière ; règles de vente et lieu d'expédition du compte vendeur. |
| Tester Stripe en mode test, webhook compris | Événements à envoyer à `/api/billing/webhook` : `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. |
| Vérifier les barèmes de frais dans `src/lib/listing/platforms.ts` | Ce sont des estimations prudentes saisies à la main, pas des grilles officielles. |
| Vérifier les adresses de dépôt d'annonce et les libellés d'état des plateformes | Écrits de mémoire ; un libellé qui change côté plateforme ne casse rien mais déroute. |
| Renseigner `PLACARD_LEGAL_NAME` et faire relire `/conditions` | Un site qui encaisse doit identifier son éditeur ; le texte actuel est un résumé, pas un document juridique. |
| Mettre un stockage partagé pour la limitation de débit | Elle est en mémoire, par processus. |
| Sortir les photos de la base si le volume grossit | Elles y sont stockées en base64 : simple, mais lourd au-delà de quelques milliers d'articles. |

## Coût de l'IA

Le modèle par défaut est `claude-opus-5-5` (4 $ par million de jetons en entrée, 20 $ en sortie). Une rédaction avec quatre photos représente de l'ordre de quelques centimes de dollar — ordre de grandeur estimé, pas mesuré. À 9,90 € par mois, un abonné qui crée plusieurs centaines d'articles peut donc coûter plus qu'il ne rapporte. Deux réglages existent : `PLACARD_AI_MODEL` pour choisir un modèle moins cher, et les plafonds mensuels dans `src/lib/services/plans.ts`. Mesurez le coût réel sur une vingtaine d'articles avant de fixer le prix.

## Organisation du code

- `src/lib/listing/` — le cœur : règles de rédaction, appel à Claude, fiches par plateforme, calculs d'argent. Sans dépendance au serveur, donc réutilisé tel quel dans le navigateur.
- `src/lib/services/` — comptes, articles, quotas, paiement, chiffrement.
- `src/lib/ebay/` — OAuth et publication eBay.
- `src/app/api/` — routes HTTP, toutes passées par `api()` (contrôle d'origine, limitation de débit, erreurs sans détail interne), sauf le webhook Stripe, authentifié par sa signature.
- `drizzle/` — migrations SQL, appliquées au démarrage.

Conception d'origine : [`../docs/superpowers/specs/2026-11-23-placard-design.md`](../docs/superpowers/specs/2026-11-23-placard-design.md).
