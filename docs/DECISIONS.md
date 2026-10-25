# Décisions techniques

Chaque décision : le choix, la raison, ce qu'on accepte en échange.

**1. Next.js (App Router) en une seule application.** Pages et API dans le même déploiement, rendu serveur pour la vitesse et le référencement, routes API pour les composants client. En échange : on dépend des conventions de Next 16.

**2. PGlite par défaut, PostgreSQL en production.** `npm install && npm run dev` doit marcher sans rien installer. PGlite est un vrai PostgreSQL (WebAssembly) : mêmes migrations, mêmes requêtes, les tests d'intégration tournent sur un vrai moteur. En échange : PGlite ne supporte qu'un seul processus. Le worker refuse donc de tourner dessus.

**3. Drizzle ORM et migrations SQL versionnées.** Types inférés depuis le schéma, SQL lisible et relu dans `drizzle/`.

**4. Montants en centimes entiers.** Pas d'erreurs d'arrondi (0,1 + 0,2). Les conversions de devises arrondissent une seule fois.

**5. Horaires de vol en heure locale + fuseau IANA.** C'est ce que voit le voyageur sur son billet. L'heure UTC est dérivée pour les durées et le tri. Les tests couvrent les changements d'heure et l'arrivée le lendemain.

**6. Démo et réel séparés au niveau du registre.** Un seul endroit décide du mode : impossible de mélanger un faux tarif avec un vrai dans une même réponse. Chaque offre porte sa provenance, affichée par un badge.

**7. Fournisseur de démonstration déterministe.** Même requête, même prix : les tests sont stables et l'interface ne « danse » pas. Les noms sont marqués « (fictive) » et aucun lien n'est proposé.

**8. Tri « Meilleur choix » à écarts relatifs.** Score = 0,65 × écart de prix relatif au moins cher (plafonné à +50 %) + 0,25 × écart de durée relatif au plus rapide + 0,1 × escales. Une première version min-max favorisait des vols lents à peine moins chers ; les écarts relatifs reflètent mieux ce que ressent un voyageur. L'explication est affichée.

**9. Prévision prudente.** Pas de modèle opaque : statistiques sur les prix réellement observés (minimum quotidien), avec un seuil minimal de données. « Données insuffisantes » vaut mieux qu'une fausse certitude.

**10. Assistant : Claude avec outils, réponse structurée.** L'IA appelle les mêmes services que l'interface (recherche, saisons, budget) au lieu d'inventer des chiffres, et répond en 4 sections (faits, estimations, prévisions, recommandations). Une source éditoriale va dans « Estimations », jamais dans « Faits vérifiés ». Sans clé, un analyseur par règles prend le relais : le produit reste utile.

**11. Planificateur dans le processus par défaut.** Les alertes marchent dès `npm run dev`. En production multi-instances : `DINO_SCHEDULER=off` et un seul worker, ou un cron externe sur `/api/cron/alerts`.

**12. Cache mémoire avec durées par source.** Simple et suffisant pour une instance. Les durées suivent la validité des données (offres Duffel courtes, prix Travelpayouts déjà en cache chez eux).

**13. Sessions en base plutôt que JWT.** Révocation immédiate (déconnexion, réinitialisation du mot de passe, suppression du compte). Seul le haché du jeton est stocké.

**14. Tendances avec k-anonymat.** Aucune tendance n'est publiée en dessous de 5 utilisateurs distincts. Avec peu d'utilisateurs, la page le dit au lieu d'inventer.

**15. Tests e2e sur le build de production.** Ils détectent ce que le mode développement masque : secrets dans les bundles, en-têtes, erreurs de production. Ils ont trouvé un vrai bug : un `useEffect` qui renvoyait la promesse de `scrollIntoView` faisait planter l'assistant dans Chromium.
