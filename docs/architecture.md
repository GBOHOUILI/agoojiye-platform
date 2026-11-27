# Architecture et règles métier

Document de maintenance du prototype. Pour une présentation générale, voir le [README](../README.md).

## Architecture
```
src/app                    routes (App Router) ; vues clientes dans components/<module>
src/types                  entités du domaine (organisation, travail, événements, ingénierie)
src/data                   seed.ts (ingénierie), seed-org.ts, seed-work.ts, seed-purchasing.ts (fictifs, cohérents entre eux)
src/lib/access-simulation  rôles, matrice rôles × permissions, périmètres, permissions des routes
src/domain                 événements métier → règles de notification et de journal → dispatch
src/services               logique métier (contrôle des permissions simulées, validation Zod, événements)
src/repositories           interfaces asynchrones + implémentation localStorage (local/) + fabrique (index.ts)
src/hooks/demo-store.tsx   provider React : instantané des données, profil actif, commandes
```
Flux d’une action : vue → `useDemoStore()` → service (règles + permissions) → repositories → événements → notifications et journal.

### Stockage et migration
- Données : `agj-demo-next-v3` (document JSON versionné). Profil simulé : `agj-demo-session`.
- Au premier chargement, les anomalies et observations de `agj-demo-next-v1` (première version) sont reprises. **La clé v1 n’est jamais modifiée ni supprimée.**
- Décalage des dates : un document v3 enregistré avant ce champ retrouve son décalage à partir d’une anomalie fictive (0 pour des données non décalées). Les migrations v1 et v2 gardent un décalage nul, pour que les données reprises et le jeu ajouté restent sur la même base de temps.
- Deux onglets ouverts sur deux profils se mettent à jour mutuellement (événement `storage`).
- « Réinitialiser la démo » restaure le jeu fictif initial.

### Passage à une API NestJS + PostgreSQL
1. Écrire `src/repositories/http/` qui implémente l’interface `Repositories` (`src/repositories/types.ts`) par des appels HTTP, puis changer la fabrique `getRepositories()`. Vues et services restent inchangés.
2. Côté serveur : un module NestJS par repository (users, organization, projects, tasks, validations, notifications, activity) structuré en controller / service / repository / dto. Les schémas Zod de `src/lib/validations` servent de référence pour les DTO.
3. Déplacer côté serveur les règles `src/domain/*-rules.ts`, qui sont pures et portables.
4. **Réappliquer les permissions côté serveur** (guards NestJS) à partir de la matrice `ROLE_PERMISSIONS` : c’est la seule façon d’obtenir une vraie sécurité. Ajouter l’authentification.

### Dates des données fictives
Les données fictives sont écrites comme si l’on était le 26/11/2026. À la création du jeu (premier chargement ou réinitialisation), elles sont décalées au jour réel et ce décalage est enregistré dans le document (`seedOffsetDays`). Essais et prototypes, non stockés, sont datés avec ce même décalage : tous les modules restent sur la même base de temps. Un rechargement, un autre jour ou un autre onglet ne décalent plus rien ; les données saisies ne sont jamais décalées. Réinitialiser pour recaler la démo sur le jour courant.

## Organisation, projets et suivi
- **Profils simulés** : 10 rôles système (Directeur, Chef de projet, Responsable d’équipe, Technicien, Ingénieur, Responsable qualité, RH, Finance, Achats, Administrateur), 20 collaborateurs fictifs. Sélecteur en haut à droite.
- **Distinction des notions** : rôle système (permissions), fonction professionnelle (intitulé), département, équipe (facultative), responsable hiérarchique.
- **Espaces** : `/espace` compose un accueil propre à chaque rôle. RH, Finance et Achats disposent d’un espace minimal (indicateurs et « module à venir »).
- **Projets** : création, membres (un collaborateur peut participer à plusieurs projets), avancement calculé depuis les tâches, rattachement **facultatif** d’un prototype (un prototype appartient au plus à un projet).
- **Tâches** : tableau Kanban et liste, attribution, priorité, échéance, avancement, retards. Une tâche peut être l’action corrective d’une anomalie ; elle appartient alors au projet du prototype concerné.
- **Validation** : auteur, responsable, validateur. Une tâche avec validateur doit être soumise puis approuvée, et un rejet exige un motif.
- **Notifications** : priorité, état lu/non lu, date, lien vers l’objet. Elles sont générées automatiquement par les événements métier (tâche attribuée, incident signalé, validation attendue ou décidée, etc.).
- **Journal d’activité** : chaque action est tracée avec son auteur réel. Il est global pour Directeur, Qualité et Administrateur, limité au périmètre de l’utilisateur pour les autres profils.
- **Ingénierie** : synthèse, prototypes, composants, essais, anomalies, analyse, rapports.

## Règles du module Achats
Parcours : demande d’achat → circuit de validation → devis et comparaison → bon de commande → réceptions → factures → transmission à la Finance → clôture.

- **Circuit de validation** (`src/lib/purchasing/approval.ts`) :
  - les étapes sont Responsable (chef du projet lié, sinon responsable hiérarchique), Finance à partir de 500 000 FCFA HT, Direction à partir de 5 000 000 FCFA HT ;
  - elles sont séquentielles et le rejet exige un motif ;
  - le demandeur ne valide jamais sa propre demande, et une personne ne décide qu’une fois par demande (une étape Responsable tenue par le validateur d’une étape supérieure est fusionnée) ;
  - aucun passe-droit pour le Directeur ou l’Administrateur sur les achats. L’Administrateur consulte le module, mais ne gère ni fournisseurs, ni devis, ni commandes, ni réceptions, ni factures, et ne valide aucun achat.
- **Devis** :
  - au moins 2 devis au-delà de 1 000 000 FCFA HT, sauf exception justifiée ;
  - retenir un devis qui n’est pas le moins cher exige une justification ;
  - un dépassement de plus de 10 % de l’estimation validée exige une justification et notifie la Finance ;
  - tout seuil franchi par le devis retenu déclenche des validations complémentaires, et le bon de commande reste bloqué jusqu’à leur approbation.
- **Réceptions** : partielles, avec quantités reçues, acceptées et rejetées (motif obligatoire) ; impossible de recevoir plus que le reliquat. La fonction « Magasinier » est portée par un Technicien ; la permission `purchase:receive` est distincte et extensible.
- **Factures** :
  - plusieurs factures par bon de commande, avec lignes ;
  - rapprochement automatique sur le prix du bon de commande, les quantités acceptées cumulées, le taux de TVA et le TTC déclaré ;
  - double facturation et numéro fournisseur en double refusés ;
  - un écart place la facture en litige ; elle est alors corrigée ou annulée ;
  - seule une facture conforme peut être transmise à la Finance.
- **Clôture** : automatique quand tout est livré, facturé et transmis ; sinon « avec solde » (motif obligatoire), ce qui annule le reliquat et libère son montant.
- **Montants** : FCFA entiers ; HT, TVA et TTC stockés séparément ; TVA arrondie une seule fois par document, si bien que HT + TVA = TTC. Le taux est enregistré sur chaque devis, bon de commande et facture (18 % par défaut, configurable).
- **Paramètres provisoires de démonstration**, à confirmer avec AGOOJIYÉ : `src/lib/purchasing/rules.ts`.

### Contrats avec les futurs modules Stock et Finance
Achats n’écrit jamais dans leurs données ; il émet des événements (`src/domain/events.ts`) :

| Événement | Destinataire futur | Contenu |
|---|---|---|
| `purchase.goods_received` | Stock | par ligne : `received`, `accepted`, `rejected`, `rejectReason`, `itemRef`, `unit`. **Seul `accepted` peut alimenter le stock.** |
| `purchase.order_issued` | Finance | engagement : bon de commande avec HT, TVA et TTC |
| `purchase.order_closed` | Finance | `releasedHT` : montant dégagé par une clôture avec solde |
| `purchase.invoice_transmitted` | Finance | facture conforme à prendre en charge (bon à payer et paiement hors périmètre Achats) |

### Passage à PostgreSQL
Les lignes des demandes, devis, bons de commande, réceptions et factures sont stockées dans leur document côté démonstration. En base, elles deviendront des tables de lignes (`purchase_request_lines`, `quote_prices`, `purchase_order_lines`, `receipt_lines`, `invoice_lines`) reliées à leur document parent. La contrainte d’unicité (fournisseur, numéro de facture fournisseur) et le verrou de soumission unique deviendront des contraintes de base de données.


## Identité visuelle
- Logo officiel : `public/brand/agoojiye-logo.png` (fond transparent). Variante claire pour fonds sombres : `agoojiye-logo-light.png`, générée à partir du logo (traits blancs, accents or conservés). Icônes `src/app/icon.png` et `apple-icon.png` tirées du « A ».
- Couleurs relevées sur le logo (`tailwind.config.ts`) : `ink` #0c0c0c (barre latérale, bouton principal) et `gold` #c79a2b (accents, état actif, avancement). Pour du texte sur fond blanc, utiliser `gold-700` ou `gold-800` (contraste AA) ; `gold-500` est réservé aux aplats et aux accents.
- Les couleurs de rôle (avatars, badges) restent distinctes de la marque pour identifier le profil simulé d’un coup d’œil.
