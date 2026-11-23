---
marp: true
html: true
---

# Une ligne par livraison

Le responsable d’exploitation veut filtrer la ponctualité par semaine, zone, véhicule et chauffeur. Le modèle doit conserver chaque livraison et permettre ces regroupements.

---

## Objectif

Déclarer le grain, dessiner le schéma en étoile et identifier les clés qui relient chaque livraison aux dimensions. Décrire le comportement du modèle pour une annulation et une livraison avec une trace manquante.

**Prérequis** — Indicateurs du premier chapitre, lecture d’une clé primaire et d’une jointure SQL.

---

## Fixer le grain avant de choisir les colonnes

Le **grain** indique ce que représente une ligne. Dans `fait_livraison`, une ligne représente une livraison identifiée par `livraison_id`, dans son état retenu pour ce lot.

`L001` et `L002` appartiennent toutes les deux à `T-A`. Elles occupent deux lignes et possèdent des coûts et des horaires distincts. Une future analyse à l’échelle de la tournée pourra les regrouper.

Le fichier du dispatch peut contenir deux versions de `L002`. La table de faits attend une seule ligne pour cet identifiant.

---

## Faits, mesures et dimensions

| Rôle | Élément du modèle | Utilité |
| --- | --- | --- |
| Fait | `fait_livraison` | Regrouper les mesures d’une livraison et ses liens vers les dimensions |
| Mesure | `cout_chf`, `distance_m`, `retard_minutes` | Calculer des totaux ou des moyennes sur un périmètre explicite |
| Attribut du fait | `statut`, `ponctuelle`, `tournee_id` | Filtrer ou regrouper les événements |
| Dimension | Jour, zone, véhicule, chauffeur | Décrire les axes d’analyse par des attributs lisibles |

La ponctualité se recalcule avec un numérateur et un dénominateur après chaque regroupement. Pour combiner deux tournées de tailles différentes, additionner leurs nombres de livraisons à l’heure et leurs nombres de livraisons évaluables.

---

## Lire une étoile

<figure class="course-diagram diagram-star" aria-labelledby="etoile-legende">
  <div class="diagram-node diagram-focus star-fait"><strong><code>fait_livraison</code></strong><span>Une ligne par livraison</span></div>
  <div class="diagram-node star-jour"><strong><code>dim_jour</code></strong><span>Jour promis et jour livré</span></div>
  <div class="diagram-node star-chauffeur"><strong><code>dim_chauffeur</code></strong><span>Chauffeur et agence</span></div>
  <div class="diagram-node star-vehicule"><strong><code>dim_vehicule</code></strong><span>Véhicule et type</span></div>
  <div class="diagram-node star-zone"><strong><code>dim_zone</code></strong><span>Zone et coordonnées</span></div>
  <figcaption id="etoile-legende">Chaque liaison représente une clé étrangère du fait vers une dimension.</figcaption>
</figure>

Une même zone peut être référencée par plusieurs livraisons. Les coordonnées sont un attribut de `dim_zone`.

La dimension jour joue deux rôles. `jour_promis` fixe la période de l’indicateur. `jour_livre` donne la date locale de la remise effective et reste vide pour une annulation.

---

## Relier les clés et traiter les absences

`vehicule_id` est la **clé métier** fournie par le dispatch, par exemple `V01`. `vehicule_sk` est une **clé technique** attribuée dans l’entrepôt. Le chargement cherchera la clé technique à partir du code métier. Le chauffeur et la zone suivent la même règle.

| Situation | Règle du modèle |
| --- | --- |
| `L004` est annulée | Conserver le statut et la date promise. Laisser le jour livré et la ponctualité à `NULL`. |
| `L006` a été livrée avec une trace manquante | Garder la livraison et laisser la distance à `NULL`. |
| Le code chauffeur est inconnu | Isoler la ligne à la préparation pour vérification du référentiel. |

---

## Lire les contraintes PostgreSQL

```sql
CREATE TABLE exemple_livraison (
    livraison_id text PRIMARY KEY,
    vehicule_sk bigint NOT NULL REFERENCES entrepot.dim_vehicule,
    distance_m integer CHECK (distance_m >= 0)
);
```

`PRIMARY KEY` impose une valeur unique et renseignée. `REFERENCES` exige un véhicule présent dans la dimension. `CHECK` refuse une distance négative et la colonne accepte `NULL`.

Pour exécuter la correction complète de l’atelier, créer les dimensions et le fait à l’aide de `sandbox/pratique/modele_etoile.sql` depuis la racine du dépôt.

```sh
docker compose -f sandbox/compose.yaml exec -T postgres \
  psql -v ON_ERROR_STOP=1 -U student -d formation \
  < sandbox/pratique/modele_etoile.sql
```

**Résultat attendu** — Cinq tables vides dans `entrepot`. Leurs contraintes sont prêtes à accueillir les données préparées.

---

## Définir la frontière du modèle

Le fait décrit les livraisons. Si l’on reçoit plus tard le coût total d’une tournée, on peut étudier un fait au grain **une ligne par tournée** ou une règle d’allocation explicite.

Copier un coût de tournée de 60 CHF sur trois livraisons ferait apparaître 180 CHF à l’agrégation. Le grain de la source et celui de la mesure doivent correspondre.

Les zones et les heures du modèle répondent aux premiers besoins. Étudier un itinéraire détaillé demandera en plus la séquence des arrêts et les distances entre arrêts.

---

## Erreurs fréquentes

- Dessiner la table avant de définir ce que représente une ligne.
- Confondre une tournée avec une livraison et répéter son coût.
- Joindre le fait sur un libellé de zone qui peut changer.
- Remplacer une distance inconnue par zéro.
- Confondre le jour promis et le jour effectivement livré.

---

## Exercice 1 — Choisir où ranger les champs

**Objectif** — Relier chaque champ à son rôle. **Prérequis** — Lecture du schéma en étoile.

Classer `distance_m`, `type_vehicule`, `agence`, `zone_id`, `cout_chf` et `jour_promis`. Indiquer la table et expliquer comment afficher le coût par type de véhicule.

**Livrable et réussite** — Un tableau des champs et le chemin de jointure utilisé pour le regroupement.

<details><summary>Indices gradués</summary>

1. Séparer les mesures observées sur une livraison des descriptions qui servent à filtrer.
2. Relier l’événement au véhicule par la clé étrangère du fait.

</details>

<details><summary>Correction expliquée</summary>

`distance_m`, `cout_chf` et `jour_promis` sont dans `fait_livraison`. `jour_promis` référence `dim_jour`. `type_vehicule` est dans `dim_vehicule`, `agence` dans `dim_chauffeur`, `zone_id` dans `dim_zone`. Pour le coût moyen, joindre le fait au véhicule sur `vehicule_sk` et regrouper les livraisons effectuées par `type_vehicule`.

</details>

---

## Exercice 2 — Dessiner le modèle de suivi

**Objectif** — Proposer une étoile exploitable. **Prérequis** — Grain, clé primaire et clé étrangère.

Dessiner le modèle nécessaire pour suivre le coût et les retards par semaine, véhicule et zone. Prévoir les dates promise et livrée, le lien avec le chauffeur et le traitement des annulations. Étiqueter chaque clé et sa cardinalité.

**Livrable et réussite** — Un schéma avec une ligne par livraison et des clés qui permettent de retrouver chaque axe de l’indicateur.

<details><summary>Indices gradués</summary>

1. Placer `fait_livraison` au centre.
2. Relier les deux dates à la même table de jours, en précisant leur rôle.

</details>

<details><summary>Correction expliquée</summary>

`fait_livraison` est unique par `livraison_id`. Chaque fait pointe vers un chauffeur, un véhicule, une zone et un jour promis. Le jour livré est facultatif et référence aussi `dim_jour`. Un même jour, chauffeur, véhicule ou zone peut apparaître dans plusieurs faits. Le script `sandbox/pratique/modele_etoile.sql` est une réalisation de ce schéma.

</details>

---

## Exercice 3 — Corriger un coût multiplié après une jointure

**Objectif** — Repérer une incohérence de grains. **Prérequis** — Grain de livraison et cardinalité.

La tournée `T-A` a trois livraisons. Une nouvelle table de préparation contient deux mesures pour cette tournée, une par rapport transmis. Une jointure par `tournee_id` produit six lignes. Expliquez le problème et proposez une règle qui préserve le grain de la mesure que vous voulez agréger.

**Livrable et réussite** — Le nombre de lignes attendu, le niveau de regroupement retenu et un contrôle avant et après la jointure.

<details><summary>Indices gradués</summary>

1. Comparer les nombres de lignes de chaque côté de la jointure.
2. Déterminer si les deux rapports sont des versions ou des mesures indépendantes avant de les agréger.

</details>

<details><summary>Correction expliquée</summary>

Chaque livraison rencontre deux rapports, ce qui explique `3 × 2`. Si ce sont des versions, retenir une version par tournée avec une règle de priorité documentée. Pour analyser un coût global de tournée, travailler au grain tournée et regrouper les livraisons à ce niveau avant la jointure. Vérifier l’unicité de la clé au niveau retenu et réconcilier la somme du coût avec sa source.

</details>

---

## Projet fil rouge — La cible de l’entrepôt

Le schéma part de la fiche métier. La livraison est le fait central. Les dates, véhicules, chauffeurs et zones rendent les indicateurs comparables.

**Livrables** — Le schéma en étoile, une liste des règles `NULL` et unicité, et la correspondance des champs de source vers les champs cibles.

**Validation** — Le modèle représente `L004` sans jour livré et `L006` sans distance. Il offre une place à chacune des mesures nécessaires au responsable d’exploitation. Une seule ligne du fait peut porter l’identifiant `L002`.

---

## Jalon 2 — Recalculer les indicateurs au bon grain

Reprendre le tableau de contrôle du premier chapitre. Prévoir une ligne de fait pour chacune des quatre livraisons. Annoter chacune avec sa tournée, ses clés de dimensions, son coût et sa ponctualité.

1. Compter les lignes avant et après une jointure vers les zones ou les véhicules. Justifier le nombre attendu par la cardinalité.
2. Reconstituer le coût moyen et la ponctualité de l’extrait à partir des deux tournées. Comparer à la moyenne simple des deux taux de ponctualité.
3. Simuler un doublon de zone au moment d’une jointure. Identifier les lignes et les coûts que le doublon multiplierait, puis écrire le contrôle de clé qui l’empêche.

<details><summary>Valeurs de contrôle</summary>

Il y a **quatre faits** avec l’annulation. Une jointure vers une dimension conserve ces quatre lignes. Parmi les trois livraisons effectuées, on calcule `(1 + 1) / (2 + 1) = 66,7 %`. La moyenne simple des taux `50 %` et `100 %` donne `75 %` car elle donne le même poids à chaque tournée. Le coût moyen correct vaut `(27,50 + 9,50) / 3 = 12,33 CHF`.

Si la jointure dédouble `Z-GE-C`, les deux faits de `T-A` seraient répétés. Le nombre de faits passerait à **six** et le coût des livraisons effectuées à **64,50 CHF**. L’unicité de `zone_sk` dans la dimension et de `zone_id` lors de la recherche du code métier protège le grain.

</details>

---

## Fiche de révision

- **Grain** — La nature d’une ligne.
- **Fait** — L’événement mesuré, associé à ses clés et à son statut.
- **Dimension** — Le contexte descriptif qui sert à filtrer et à regrouper.
- **Cas d’usage** — Dans la distribution, une étoile par ligne de commande permet aussi de comparer des mesures par dépôt, date et produit.

---

## Questions de révision

1. Quel grain a `fait_livraison` ?
2. Quelle différence entre `vehicule_id` et `vehicule_sk` ?
3. Pourquoi deux clés pointent-elles vers `dim_jour` ?
4. Pourquoi le fait garde-t-il une distance à `NULL` ?
5. Pourquoi additionner les effectifs avant de recalculer la ponctualité ?

---

## QCM — Questions 1 à 3

1. Quelle est la clé primaire du fait ? A. `tournee_id` · B. `vehicule_sk` · C. `livraison_id`
2. Où stocker le type de véhicule ? A. `dim_vehicule` · B. `dim_jour` · C. `dim_zone`
3. Quelle date groupe les indicateurs par jour dans le cas fil rouge ? A. Le jour livré · B. Le jour promis · C. Le jour de génération du rapport

<details><summary>Correction expliquée</summary>

1. **C**. L’identifiant est unique au grain d’une livraison.
2. **A**. Le type décrit le véhicule et permet de regrouper les faits.
3. **B**. La règle métier est fixée sur la date promise locale.

</details>

---

## QCM — Questions 4 et 5

4. Un trajet manque. Quelle valeur donner à `distance_m` ? A. `NULL` · B. `0` · C. La moyenne de la tournée
5. Que garantit `REFERENCES entrepot.dim_vehicule` ? A. Le tri des faits · B. L’unicité de la tournée · C. L’existence du véhicule référencé

<details><summary>Correction expliquée</summary>

4. **A**. Une absence de mesure est représentée explicitement.
5. **C**. La clé est recherchée dans la table référencée.

</details>

---

## À retenir avant de préparer les sources

Le schéma en étoile fixe le grain et les relations. Les clés, types et règles de nullité donnent des critères pour détecter les anomalies avant le chargement.
