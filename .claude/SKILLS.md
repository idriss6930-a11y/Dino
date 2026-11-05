# Skills de design pour Claude Code

Ce dossier rend disponibles, dans chaque session Claude Code ouverte sur ce dépôt, trois ensembles de skills de design tiers.

| Source | Où | Version installée | Licence |
|---|---|---|---|
| [emilkowalski/skills](https://github.com/emilkowalski/skills) | `.claude/skills/<nom>/` (16 skills copiées) | commit `c8a7962` (4 nov. 2026) | MIT |
| [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | `.claude/skills/impeccable/` et `.claude/agents/impeccable-*.md` | 4.8.0 (moteur 0.1.18), commit `c8891a9` | Apache 2.0 |
| [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | plugin déclaré dans `.claude/settings.json`, non copié (40 Mo de photos) | dernière version du marketplace | MIT |

## Quand utiliser quoi

**Impeccable** (`/impeccable <commande> <cible>`) : la boîte à outils principale pour l'interface web de DINO.
- `critique` : revue UX notée, avec les corrections classées par priorité.
- `audit` : accessibilité, performance, thèmes, responsive (P0 à P3).
- `polish`, `harden`, `clarify`, `adapt`, `layout`, `typeset`, `quieter`, `bolder`… : une passe ciblée.
- `init` écrit `PRODUCT.md` et `document` écrit `DESIGN.md` ; toutes les commandes les lisent ensuite.
- Le moteur (binaire) est téléchargé au premier lancement dans `~/.impeccable/bin/`, sommes de contrôle vérifiées.

**Emil Kowalski** : animation et finition.
- `review-animations`, `improve-animations` : revue stricte / audit des animations existantes.
- `animate`, `choreograph`, `animation-performance` : créer ou corriger une animation.
- `animate-expo` : la même exigence pour l'application `mobile/` (Expo, React Native).
- `mobile-native` : faire « natif » le site web sur téléphone (100vh, zoom des champs, zones sûres…).
- `break-ui` : tester un composant avec des données extrêmes.
- `emil-design-eng`, `apple-design`, `animation-vocabulary`, `find-animation-opportunities`, `remove-animations`, `pick-ui-library`, `prototype`, `ask-sonner`.
- `write-swift` n'est pas installée (pas de Swift dans ce projet).

**Taste Skill** (`taste-skill:design-taste-frontend`) : conçue pour des pages vitrines (landing pages) ; utile pour une éventuelle page marketing de DINO, beaucoup moins pour les écrans produit. Elle demande Node 22+ et Chrome/Chromium.

## Ce qui n'est pas activé

Le crochet (hook) d'Impeccable, qui analyse chaque fichier modifié par l'agent, n'est pas versionné : il lancerait un binaire à chaque édition, dans toutes les sessions. Pour l'activer sur votre poste seulement, lancez `npx impeccable install --providers=claude --scope=project` et acceptez le hook : il est écrit dans `.claude/settings.local.json`, ignoré par git.

## Mettre à jour

- Emil Kowalski et Impeccable sont des copies : recopiez `skills/<nom>/` depuis le premier dépôt, et `plugin/skills/impeccable/` et `plugin/agents/` depuis le second.
- Taste Skill se met à jour par `/plugin update` dans Claude Code.
