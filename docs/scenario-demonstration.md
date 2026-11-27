# AGOOJIYÉ — Scénario de démonstration (15 à 20 minutes)

- Objectif : montrer, dans un **parcours continu**, comment une information née sur le terrain circule entre l'ingénierie, les projets, les validations, les achats et la finance, jusqu'à la direction.
- Ce que l'on dit en ouverture : « Les données et les règles sont fictives et provisoires. Elles servent à montrer le fonctionnement et seront confrontées à vos processus réels. Les profils sont simulés : il n'y a pas encore d'authentification. »

## Préparation (avant la séance)

| Élément | Action |
|---|---|
| Version | Build de production (`pnpm build && pnpm start`) |
| Données | Profil Administrateur → Paramètres → **Réinitialiser la démo**, de préférence le jour même |
| Écran | 1280 px minimum ; un second onglet ouvert, pour montrer la mise à jour croisée (facultatif) |

## Fil conducteur : la distance de freinage de l'utilitaire AG-02

Ce fil existe déjà dans les données fictives :
- l'essai **TES-003** (freinage) a échoué ;
- l'anomalie **ANO-002** est critique, au stade « Action corrective » ;
- la tâche **TSK-009** « Corriger la distance de freinage » ;
- le projet **PRJ-02** est piloté par Nadia Sossou ;
- la demande d'achat **DA-2026-007** (disques et plaquettes), avec une réception partiellement non conforme.

Pour la démonstration en direct, on crée une **nouvelle** demande liée à la même correction, afin de montrer chaque étape.

## Déroulé

| # | Durée | Profil | Où | Action | Ce que cela montre |
|---|---|---|---|---|---|
| 1 | 2 min | **Hervé Agbodjan**, Directeur | Accueil | Indicateurs de l'organisation, projets à surveiller, anomalies critiques, validations en attente. Ouvrir Organisation (départements, équipes, hiérarchie). | Visibilité de la direction ; structure organisationnelle ; rôle système et fonction |
| 2 | 2 min | Directeur | Projets → PRJ-02 | Avancement calculé, membres, onglet Achats (montant engagé), prototype AG-02 rattaché | Gestion de projet ; lien projet ↔ prototype ↔ achats |
| 3 | 2 min | Directeur | Ingénierie → Essais → TES-003 → ANO-002 | Mesure 8,4 m pour une cible de 7,5 m ; anomalie critique, chronologie | Suivi technique ; traçabilité de l'essai à l'anomalie |
| 4 | 2 min | **Nadia Sossou**, cheffe de projet | ANO-002 → Créer une tâche corrective | « Contrôler le montage des disques après remplacement », attribuée à Espérance Houngbo, validateur Ségla Ahouansou. Créée depuis ANO-002 (« Créer une tâche corrective »). | Attribution ; notification immédiate à l'exécutante ; lien anomalie → tâche |
| 5 | 2 min | **Espérance Houngbo**, technicienne | Cloche → tâche | Démarrer ; constater le besoin de pièces ; **Demandes d'achat → Nouvelle** sur PRJ-02 et la tâche (6 disques × 120 000 FCFA = 720 000 HT). Montrer l'aperçu du circuit (Responsable puis Finance). | La technicienne voit uniquement son périmètre ; la demande d'achat naît du terrain ; le circuit s'affiche avant soumission |
| 6 | 2 min | **Nadia** puis **Olivier Dansou** (Finance) | Validations | Nadia approuve ; Olivier approuve depuis sa boîte. Montrer qu'**Hervé (Directeur) ne peut pas décider à leur place**. | Validations hiérarchiques ; séparation des tâches ; notifications à chaque étape |
| 7 | 3 min | **Josiane Akplogan**, Achats | Demande → Saisir un devis ×2 | Deux devis ; comparaison (moins cher, plus rapide) ; retenir le moins cher ; émettre le bon de commande (TVA 18 %) | Circuit Achats ; montants HT, TVA et TTC exacts ; engagement |
| 8 | 2 min | **Ulrich Tchibozo**, magasinier | Commandes → BC | Réception partielle : 5 acceptés, 1 rejeté (« voile au contrôle ») | Réception ; non-conformité notifiée aux Achats **et à la Qualité** ; seules les quantités acceptées compteront pour le futur Stock |
| 9 | 2 min | Josiane (Achats) | BC → Saisir une facture | Facture au mauvais prix → **litige** automatique ; correction → conforme → **Transmettre à la Finance** | Rapprochement automatique ; contrôle avant paiement |
| 10 | 1 min | Olivier (Finance) | Espace Finance | La facture transmise et l'engagement de PRJ-02 apparaissent | Information transmise à la Finance, en lecture seule |
| 11 | 1 min | Directeur | Journal d'activité, Accueil | Toutes les actions de la séance, avec leur auteur et leur heure ; indicateurs mis à jour | Traçabilité ; vision consolidée |

Total : 21 minutes au plus. Pour tenir 15 minutes, on regroupe les étapes 2 et 3, et on montre l'étape 9 sans le litige.

## Ce qu'il faut présenter comme simulé (honnêteté)

- **Profils** : choisis librement, sans mot de passe.
- **Données** : fictives, stockées dans le navigateur.
- **Ingénierie** : prototypes, composants et essais en lecture seule ; les actions correctives sont des tâches liées à l'anomalie.
- **Finance** : lecture seule ; ni bon à payer ni paiement.
- **Stock** : non implémenté. La réception émet l'information qui l'alimentera.
- **Seuils et règles** (500 000, 5 000 000, 10 %, TVA 18 %) : provisoires.

## Questions à poser à AGOOJIYÉ pendant ou après la séance

1. Qui valide réellement un achat, et à partir de quels montants ?
2. Les actions correctives d'anomalie sont-elles suivies comme des tâches ?
3. Existe-t-il un magasin ou un stock ? Qui réceptionne ?
4. Quels documents doivent accompagner un essai ou une facture (pièces jointes) ?
5. Quelles informations la Finance attend-elle, et sous quelle forme ?

## Plan de secours

- **Si une étape échoue** : Administrateur → Réinitialiser la démo, puis reprendre à l'étape 4 (2 minutes).
- **Si le réseau est absent** : aucun impact, l'application fonctionne entièrement en local après le chargement.
