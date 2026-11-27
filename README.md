# AGOOJIYÉ — prototype de plateforme de gestion intégrée

Prototype de démonstration d'une plateforme qui relie, dans un même outil, l'organisation, les projets, l'ingénierie (prototypes, essais, anomalies), les achats et la finance.

> **Démonstration de travail, données fictives.**
> Ce projet illustre une approche possible. Il n'est pas déployé chez AGOOJIYÉ et ses processus (rôles, seuils de validation, circuits) sont des hypothèses à confronter aux pratiques réelles. Il n'est **pas prêt pour la production** : voir [Limites](#limites).

## Ce que montre la démonstration

Un fil conducteur relie les modules : un essai de freinage révèle un écart, l'écart devient une anomalie, l'anomalie une tâche corrective ; la réparation demande des pièces, qui suivent tout le circuit d'achat jusqu'à la Finance. Le journal garde la trace de chaque étape.

| Module | Fonctionnalités |
|---|---|
| **Organisation** | Départements, équipes, responsables hiérarchiques, 10 rôles et 20 collaborateurs fictifs. Espace d'accueil propre à chaque rôle. |
| **Projets et tâches** | Membres, tâches (Kanban et liste), priorités, échéances, retards. Avancement calculé à partir des tâches terminées. Validation par une personne autre que l'auteur, rejet motivé. |
| **Ingénierie** | Synthèse des indicateurs, prototypes, composants, essais et mesures (consultation). Avancement technique du prototype distinct de l'avancement du projet. |
| **Anomalies** | Gravité, cycle de vie daté (déclarée → en analyse → action corrective → vérification → résolue), lien vers le prototype, le composant et l'essai. Tâches correctives créées depuis l'anomalie, rangées dans le projet du prototype. |
| **Achats** | Demande liée à un projet et à une tâche ; circuit de validation selon le montant ; fournisseurs ; devis comparés ; bon de commande ; réceptions partielles avec rejets motivés ; factures rapprochées automatiquement (litige en cas d'écart) ; transmission à la Finance ; rapports par projet et par fournisseur. |
| **Suivi** | Notifications ciblées générées par les événements métier, journal d'activité (auteur et heure de chaque action), espace Finance en lecture. |

Le déroulé conseillé pour présenter la plateforme est décrit dans [`docs/scenario-demonstration.md`](docs/scenario-demonstration.md).

## Démarrer

Prérequis : Node.js 18.18 ou plus (20 ou plus pour les tests de bout en bout) et pnpm 10. Aucune variable d'environnement, aucune base de données.

```bash
pnpm install
pnpm dev                      # http://localhost:3000
```

Version de production locale :

```bash
pnpm build
pnpm start                    # ou : pnpm start -p 3005
```

Pour repartir des données initiales : profil **Administrateur** (sélecteur en haut à droite) → **Paramètres** → **Réinitialiser la démo**.

### Déployer (Vercel)

Importer le dépôt dans Vercel : le préréglage Next.js et pnpm sont détectés, aucune configuration supplémentaire n'est nécessaire.

## Vérifications

```bash
pnpm typecheck    # TypeScript strict
pnpm lint         # ESLint
pnpm test         # tests unitaires (Vitest)
pnpm build        # build de production
pnpm verify       # les quatre, dans l'ordre
pnpm e2e          # parcours de bout en bout (Playwright) sur un build dédié, port 3005
```

Playwright demande Chromium : `pnpm exec playwright install chromium` s'il manque.

## Technologies

Next.js 14 (App Router), React 18, TypeScript strict, Tailwind CSS, Zod (validation), Recharts (graphiques), lucide-react (icônes), Vitest et Playwright (tests).

L'architecture sépare les vues, les services métier (règles et permissions), des dépôts de données derrière une interface, et des événements métier qui alimentent notifications et journal. Elle est conçue pour qu'un backend remplace le stockage local sans toucher aux vues : voir [`docs/architecture.md`](docs/architecture.md).

## Limites

- **Données fictives** : collaborateurs, projets, fournisseurs, montants et mesures sont inventés. Les seuils et règles (validation Finance dès 500 000 FCFA HT, Direction dès 5 000 000 FCFA HT, deux devis au-delà de 1 000 000 FCFA HT, TVA 18 %) sont provisoires.
- **Stockage local** : les données vivent dans le navigateur (`localStorage`). Les modifications ne sont partagées ni entre utilisateurs, ni entre navigateurs ou appareils.
- **Pas d'authentification réelle** : le sélecteur de profil permet de prendre n'importe quel rôle, sans mot de passe. Les permissions sont appliquées par les services de l'application, mais uniquement dans le navigateur : elles ne constituent pas une sécurité serveur.
- **Pas de backend** : une exploitation réelle demande un serveur (API), une base de données, une authentification, la réapplication des permissions côté serveur et un travail de sécurisation.
- **Périmètre** : saisie des résultats d'essais, stock, budgets et paiements, pièces jointes et e-mails ne sont pas couverts. Prototypes, composants et essais sont en lecture seule.

## Licence

Aucune licence n'est accordée à ce stade : tous droits réservés.
