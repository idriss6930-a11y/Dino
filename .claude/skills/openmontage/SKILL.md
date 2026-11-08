---
name: openmontage
description: Produire une vidéo avec OpenMontage, le système open source de production vidéo piloté par agent (github.com/OpenMontageInc/OpenMontage). À utiliser dès que l'utilisateur veut faire, créer, monter ou générer une vidéo (explainer, trailer, teaser, pub produit, montage documentaire, clips courts, animation, avatar, doublage, démo d'écran), veut « une vidéo comme celle-ci » à partir d'une vidéo de référence, ou parle d'OpenMontage, de Remotion, de HyperFrames ou d'un pipeline vidéo. Triggers: "fais-moi une vidéo", "make a video", "explainer", "trailer", "montage", "clip", "OpenMontage".
---

# OpenMontage — produire une vidéo avec un agent

OpenMontage transforme l'assistant de code en studio vidéo : recherche, script,
génération ou récupération d'images et d'extraits, voix off, musique, montage et
rendu final. **L'agent est l'orchestrateur** : le Python ne fournit que des outils
et la persistance ; les décisions viennent des fichiers d'instructions (manifestes
YAML + skills Markdown) que l'agent lit et suit.

Ce skill est une **carte d'entrée**. La source de vérité reste le dépôt
OpenMontage lui-même, surtout `AGENT_GUIDE.md`. En cas de désaccord entre ce
fichier et le dépôt, **le dépôt gagne**.

## 0. Règles de base

- **Ne jamais mélanger OpenMontage avec le projet courant** (par ex. Dino). On le
  clone dans un dossier à part, on ne copie pas son code ailleurs.
- **Licence AGPLv3.** L'utiliser comme outil pour fabriquer des vidéos est sans
  problème. Copier son code dans une appli en ligne oblige à publier le code de
  cette appli sous AGPL : le signaler avant toute intégration.
- **Toujours annoncer avant de dépenser** : nom de l'outil, fournisseur, modèle,
  raison, échantillon ou lot. Pas de changement de fournisseur/modèle/moteur de
  rendu sans accord de l'utilisateur.

## 1. Installer (une fois par machine / session)

Prérequis : Python 3.10+, FFmpeg, Node.js 22.x récent (ou 24/26). Vérifier avec
`python3 --version`, `node --version`, `ffmpeg -version`.

```bash
# en dehors du projet courant, par ex. à côté de lui
git clone https://github.com/OpenMontageInc/OpenMontage.git
cd OpenMontage
make setup        # venv .venv, deps Python, Remotion (npm), Piper TTS, cache HyperFrames, .env
```

Sans `make` :
`python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && (cd remotion-composer && npm install) && pip install piper-tts && cp .env.example .env`

Toutes les commandes Python ci-dessous se lancent **depuis la racine
d'OpenMontage, avec `.venv` activé**.

Clés API : toutes optionnelles, dans `.env`. Ne jamais inventer la liste des clés :
la lire dans le registre (`install_instructions` de chaque outil). Sans aucune
clé on a déjà : narration Piper (hors ligne), images/vidéos libres
(Archive.org, NASA, Wikimedia), rendu Remotion / HyperFrames / FFmpeg,
sous-titres. Démo sans clé : `make demo`.

## 2. Première chose à faire dans le dépôt

**Lire `AGENT_GUIDE.md` en entier avant de répondre à la demande vidéo.** Le
`CLAUDE.md` du dépôt l'exige. Puis aiguiller :

| La demande… | Aller vers |
|---|---|
| est vague (« fais-moi une vidéo », « tu sais faire quoi ? ») | `skills/meta/onboarding.md` |
| donne une vidéo en exemple (« fais comme ça ») | `skills/meta/video-reference-analyst.md` → analyse, puis 2-3 concepts originaux (pas une copie) |
| fournit des rushes à monter | `source_media_review` + pipeline basé sur les rushes |
| est précise (« explainer de 60 s sur les trous noirs ») | directement la **Règle Zéro** |

## 3. Règle Zéro — tout passe par un pipeline

1. **Choisir le pipeline** dans `pipeline_defs/` (demander si ambigu).
2. **Lire le manifeste** `pipeline_defs/<pipeline>.yaml` : étapes, outils, portes de validation.
3. **Preflight** (voir §4) et présenter le menu des capacités.
4. **Étape par étape** : lire `skills/pipelines/<pipeline>/<étape>-director.md` **avant** de travailler dans l'étape.
5. **Avant chaque outil de génération**, lire ses skills de « couche 3 » (champ `agent_skills` → `.agents/skills/…`).

Interdit : scripts Python improvisés qui appellent les outils en direct, sauter
le preflight, générer sans avoir lu le skill directeur, contourner les validations.

### Pipelines

| Pipeline | Pour | Stabilité |
|---|---|---|
| `animated-explainer` | sujet → explainer entièrement généré | production |
| `animation` | motion design, typo animée | production |
| `cinematic` | trailer, teaser, film d'ambiance | production |
| `screen-demo` | démo logicielle, tutoriel d'écran | production |
| `hybrid` | rushes + visuels générés | production |
| `avatar-spokesperson` | présentateur avatar / lip-sync | production |
| `documentary-montage` | montage de vraies images libres (sans génération payante) | beta |
| `talking-head` | vidéos de quelqu'un qui parle | beta |
| `clip-factory` | plein de clips courts depuis une longue source | beta |
| `podcast-repurpose` | extraits de podcast en vidéo | beta |
| `character-animation` | personnages cartoon riggés en local | beta |
| `localization-dub` | sous-titres, doublage, traduction | beta |

Signaler à l'utilisateur quand il choisit un pipeline **beta**.
Liste à jour : `ls pipeline_defs/`.

Étapes typiques : `research → proposal → script → scene_plan → assets → edit → compose (→ publish)`.

## 4. Preflight (obligatoire avant tout travail créatif)

```bash
python -c "
from tools.tool_registry import registry
import json
registry.discover()
print(json.dumps(registry.provider_menu_summary(), indent=2))
"
```

Ne **pas** coller la sortie brute : la traduire en menu lisible.
- `composition_runtimes` → Remotion / HyperFrames / FFmpeg disponibles ?
- `capabilities[]` → afficher « X sur Y configurés » par famille (vidéo, image, voix, musique…).
- `setup_offers[]` → déblocages en 1 minute (une variable d'env), regroupés par clé.
- `runtime_warnings[]` → les répéter mot pour mot.

Détail si besoin : `registry.provider_menu()`, `registry.capability_catalog()`,
`registry.provider_catalog()`. Éviter `support_envelope()` (énorme), sauf pour déboguer.
Ensuite, pour le pipeline choisi : `capability_coverage(...)` et
`uncovered_capabilities(...)` par étape, puis conclure **passed / degraded / blocked**.

## 5. Proposition à faire valider avant de générer

Présenter : 4-5 pistes créatives si le brief est ouvert, le pipeline conseillé,
les outils (et alternatives vraiment disponibles), le coût estimé, **le plan
musique** (bibliothèque `music_library/`, recherche libre de droits, génération
par API, ou sans musique), le plan par étape. Puis **attendre l'accord**.

Décisions qui exigent l'utilisateur :
- **Moteur de rendu** : si Remotion *et* HyperFrames sont dispos, présenter les
  deux (point fort + limite pour ce brief + recommandation), jamais de choix silencieux.
  Remotion = composants React, graphiques, sous-titres mot à mot. HyperFrames =
  HTML/CSS/GSAP, typo cinétique, promos produit. FFmpeg = coupes/concat simples.
- **Mode de composition** : *templated* (scènes toutes faites, rapide, look
  standard) ou *atelier* (composition sur mesure, recommandée pour les vidéos
  « vitrine », plus coûteuse en tokens) → lire `skills/meta/taste-direction.md`
  puis `skills/meta/bespoke-composition.md`.
- **Vidéo qui doit bouger** (trailer, teaser, avatar…) : interdit de retomber
  en silence sur des images fixes animées (Ken Burns). Si c'est bloqué, le dire.

## 6. Exécuter : projet, checkpoints, validations

```bash
python -c "from lib.checkpoint import init_project; init_project('<projet-kebab-case>', title='<Titre>', pipeline_type='<pipeline>')"
python -m backlot open <projet>   # tableau de suivi en direct ; s'il échoue, continuer
```

- Tout fichier produit va sous `projects/<projet>/` (passer un `output_path` explicite).
  Rendu final : `projects/<projet>/renders/final.mp4`.
- Outils Python : classes en PascalCase sans suffixe `Tool`, appel par
  `.execute({...})` → `ToolResult(.success, .data, .error)`.
- Chaque étape : checkpoint `in_progress` → travail → auto-revue
  (`skills/meta/reviewer.md`, 2 tours max) → checkpoint.
- Étape avec `human_approval_default: true` : écrire le checkpoint
  `awaiting_human`, résumer (artefact, remarques, coût), puis **finir le tour et
  attendre**. Un « vas-y » ancien ne vaut pas pour les validations suivantes.
- Une décision change en cours de route → **ajouter** une entrée au
  `decision_log` avec la même `category` et le même `subject` (jamais éditer l'ancienne).
- Blocage → dire : ce qui a été tenté, ce qui a échoué, le type (auth, accès
  fournisseur, bug d'outil, qualité du prompt), les options, la recommandation.
  Ne pas basculer sur une alternative sans accord.

## 7. Session cloud Claude Code (conteneur éphémère)

- Pas de GPU : oublier la génération vidéo locale (`make install-gpu`).
- Les clés API se donnent via les secrets de l'environnement, jamais collées dans le chat.
- `projects/` est ignoré par git et le conteneur disparaît : **envoyer la vidéo
  finale à l'utilisateur** (outil d'envoi de fichier) dès qu'elle est rendue.
- Si l'installation ou l'exécution du code OpenMontage est refusée par les
  permissions, l'expliquer et laisser l'utilisateur décider.

## Repères rapides

| Question | Où regarder |
|---|---|
| Règles complètes | `AGENT_GUIDE.md`, `PROJECT_CONTEXT.md` |
| Quels outils existent ? | le registre (`tools/tool_registry.py`) — jamais de mémoire |
| Comment mener une étape ? | `skills/pipelines/<pipeline>/<étape>-director.md` |
| Validation / revue | `skills/meta/checkpoint-protocol.md`, `skills/meta/reviewer.md` |
| Styles visuels | `styles/*.yaml` (clean-professional, flat-motion-graphics, anime-ghibli…) |
| Exemples de prompts | `PROMPT_GALLERY.md` |
| Schémas des artefacts | `schemas/artifacts/` |
