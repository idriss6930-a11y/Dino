# 🦖 DINO mobile (React Native + Expo)

L'application mobile de DINO pour Android et iPhone. Elle utilise **le même serveur** que le site DINO : aucune clé et aucune donnée de voyage ne sont stockées dans l'application.

## Écrans

- **Accueil** : recherche de vols, raccourcis vers « Je ne sais pas où partir », hôtels, destinations et assistant.
- **Vols** : résultats triables (meilleur choix, moins cher, plus rapide), billet / options / coût total séparés, horaires locaux.
- **Hôtels** : comparaison par ville et par dates, avec un score qualité-prix expliqué.
- **Où partir** : idées selon le budget, le mois et la durée, marquées « Estimation ».
- **Destinations** : liste, puis calendrier sur 12 mois (météo, prix, affluence).
- **Assistant** : réponses en sections séparées (faits, estimations, prévisions, recommandations).
- **Compte** : connexion et liste des alertes. L'inscription, l'export et la suppression se font sur le site.

Le mode démonstration est rappelé en haut des écrans, et chaque offre porte son badge (« Démo », « En direct », « Prix en cache »).

## Essayer sur votre téléphone (Expo Go)

Il faut un ordinateur (Windows, Mac ou Linux) avec Node.js 20.9 ou plus récent, sur le même Wi-Fi que le téléphone.

1. Installez **Expo Go** sur le téléphone (Play Store ou App Store).
2. Sur l'ordinateur, lancez le serveur DINO :
   ```bash
   cd dino && npm install && npm run db:setup && npm run dev
   ```
3. Dans un second terminal, lancez l'application :
   ```bash
   cd dino-mobile && npm install && npx expo start
   ```
4. Scannez le QR code affiché avec Expo Go (Android) ou avec l'appareil photo (iPhone).

L'application trouve toute seule le serveur DINO sur l'ordinateur (même adresse, port 3000). Pour un serveur en ligne, définissez l'adresse avant de lancer :

```bash
EXPO_PUBLIC_DINO_API_URL=https://votre-dino.exemple.com npx expo start
```

## Commandes

| Commande | Rôle |
|---|---|
| `npx expo start` | Serveur de développement (QR code pour Expo Go) |
| `npm run typecheck` | Vérification TypeScript |
| `npm run export:web` | Version web statique dans `dist/` |

Pour publier sur les stores, utilisez EAS Build (`npx eas build`), qui demande un compte Expo et, pour iOS, un compte Apple Developer.

## Ce qui a été vérifié

- TypeScript strict sans erreur.
- Export web réussi. Avec le serveur DINO en mode démo, tous les parcours ont été testés automatiquement dans un navigateur au format téléphone (Pixel 7) : accueil, recherche de vols depuis le formulaire, tris, hôtels, « Où partir », fiche Lisbonne, assistant et compte.
- **Pas encore testé sur un vrai téléphone ni dans Expo Go** : il faut le faire en suivant la procédure ci-dessus.

## Limites

- Les dates se saisissent au format AAAA-MM-JJ : pas encore de calendrier natif.
- Pas de carte ni de notifications push dans l'application pour l'instant.
- Sans serveur DINO joignable, l'application affiche une erreur claire au lieu de données.
