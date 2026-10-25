# Sécurité et vie privée

## Secrets

- Toutes les clés (fournisseurs, Claude, SMTP, VAPID privée, `CRON_SECRET`) sont lues **uniquement côté serveur** (`process.env` dans `src/lib`). Aucune n'est préfixée `NEXT_PUBLIC_`.
- Le test e2e `tests/e2e/security.spec.ts` charge les pages principales sur le build de production, puis vérifie que la valeur de `CRON_SECRET` et les motifs de clés connus (`sk-ant-…`, `duffel_live_…`, `duffel_test_…`, clés privées PEM) n'apparaissent dans **aucune** réponse envoyée au navigateur (HTML, JS, JSON, CSS).
- Le journal masque les champs sensibles et les jetons dans les URL (`src/lib/log.ts`).
- `.env`, `.env.local` et `.env*.local` sont ignorés par git. Seul `.env.example`, sans aucune valeur secrète, est versionné.

## Authentification

- Mots de passe : **scrypt** (N = 2¹⁵, r = 8, p = 1, sel unique de 16 octets), normalisation NFKC, 10 caractères minimum, refus des mots de passe les plus courants. Comparaison en temps constant.
- Sessions : jeton aléatoire de 32 octets dans un cookie `httpOnly`, `SameSite=Lax`, `Secure` en production. Seul le **haché SHA-256** du jeton est stocké. Durée : 30 jours.
- Anti-force brute : 5 échecs par compte ou 25 par IP en 15 minutes bloquent temporairement la connexion. Un hachage factice est calculé quand l'e-mail est inconnu, pour ne pas révéler l'existence d'un compte par le temps de réponse.
- Mot de passe oublié : réponse identique que le compte existe ou non. Jeton à usage unique, haché, valable 1 heure. La réinitialisation ferme toutes les sessions.
- Redirection après connexion : `safeNext()` n'accepte que des chemins internes, ce qui empêche les redirections ouvertes (test e2e).
- Rôles : `user`, `moderator`, `admin`. La modération et `/api/admin/*` vérifient le rôle côté serveur.

## Protection des requêtes

- **CSRF** : toute requête qui modifie des données (`POST`, `PATCH`, `PUT`, `DELETE`) doit venir de la même origine (en-tête `Origin` ou `Sec-Fetch-Site`). Sinon : 403 (test e2e).
- **Validation** : chaque entrée est validée par un schéma Zod. Les erreurs renvoient un message lisible, jamais une trace interne.
- **Limites de débit** par IP et par route (ex. inscription 5 par heure, recherche de vols 30 par minute, assistant 15 par minute). Elles sont en mémoire, par processus.
- **Cloisonnement** : chaque requête sur une donnée personnelle filtre par `user_id` de la session (test d'intégration « empêche un utilisateur de modifier les données d'un autre »).
- `/api/cron/alerts` exige `Authorization: Bearer <CRON_SECRET>` (16 caractères minimum, comparaison en temps constant).

## En-têtes HTTP

`next.config.ts` : `Content-Security-Policy` (aucun script tiers ; images limitées à l'origine et aux tuiles OpenStreetMap ; `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, HSTS en production, `Cache-Control: no-store` sur l'API, en-tête `X-Powered-By` retiré.

Limite connue : `script-src` contient `'unsafe-inline'` pour les scripts d'hydratation de Next.js. Pour l'éviter, passer aux nonces avec un middleware (voir ROADMAP).

## Contenus des utilisateurs

- React échappe tout le texte affiché. Aucun `dangerouslySetInnerHTML` sur un contenu d'utilisateur.
- Les liens des conseils sont rendus avec `rel="noopener noreferrer nofollow ugc"`.
- Modération automatique : refus de la promotion non déclarée et des messages avec plus de 2 liens ; mise en attente des motifs d'arnaque (contact privé, paiement inhabituel), des liens publiés par des comptes de moins de 24 h et des informations « officielles » non confirmées. Masquage automatique après plusieurs signalements, puis décision humaine.

## Vie privée (RGPD)

- **Utilisable sans compte** : recherche, comparaison, calendrier, budget, assistant et lecture de la communauté.
- **Privé par défaut** : profil, carte « Mon monde », voyages. L'utilisateur choisit public, amis ou privé.
- **Minimisation** : historique de recherche **désactivé par défaut** (90 jours s'il est activé). Personnalisation désactivable : la désactiver efface les signaux. Aucun traceur publicitaire ni outil d'analyse tiers.
- **Droit d'accès et de portabilité** : export JSON complet depuis le compte.
- **Droit à l'effacement** : suppression immédiate et définitive (mot de passe + saisie de « SUPPRIMER »), en cascade sur toutes les tables.
- **Tendances** : seulement des agrégats réels, publiés à partir de 5 utilisateurs distincts (k-anonymat). Sinon, rien n'est affiché.
- **Purge** : sessions expirées, jetons de réinitialisation et tentatives de connexion de plus de 30 jours sont supprimés chaque heure.
- **Assistant** : les messages sont envoyés à l'API Claude d'Anthropic seulement si `ANTHROPIC_API_KEY` est configurée. La page de confidentialité le précise. Ils ne sont pas stockés par DINO.

## Signaler une vulnérabilité

Ouvrez un ticket privé ou écrivez au responsable du dépôt. Ne publiez pas les détails avant correction.
