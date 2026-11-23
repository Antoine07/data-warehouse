---
marp: true
html: true
---

# Le problème d’exploitation

À Genève, un transporteur livre des colis en ville et dans les communes voisines. Chaque lundi, son responsable d’exploitation décide quelles tournées examiner. Une tournée regroupe les livraisons prévues pour un chauffeur et un véhicule.

<figure class="course-diagram diagram-problem" aria-labelledby="probleme-legende">
  <div class="diagram-branches">
    <div class="diagram-node"><strong>Retards signalés</strong><span>Des colis arrivent après l’heure promise.</span></div>
    <div class="diagram-node"><strong>Coûts différents</strong><span>Les tournées ont des volumes de livraison différents.</span></div>
    <div class="diagram-node"><strong>Distances incomplètes</strong><span>Certaines livraisons n’ont pas de trace GPS.</span></div>
  </div>
  <div class="diagram-junction" aria-hidden="true"></div>
  <div class="diagram-node diagram-focus diagram-center"><strong>Quelles tournées examiner en priorité ?</strong></div>
  <figcaption id="probleme-legende">Pour justifier son choix, l’exploitation doit décider quelles livraisons comparer et sur quelles informations s’appuyer.</figcaption>
</figure>

---

## Objectif de la journée

Le fil rouge consiste à réunir les livraisons et les trajets dans un entrepôt pour comparer l’activité par tournée et par zone.

Aujourd’hui, vous cadrez la décision, reconnaissez la structure des données et lisez une première table avec SQL. Vous calculez ensuite à la main un résultat que l’entrepôt devra reproduire.

| Horaire | Activité |
| --- | --- |
| 8 h 30 – 9 h 15 | Situation de départ et activité de cadrage |
| 9 h 15 – 10 h 30 | Mise en commun, repères sur l’entrepôt et les données, prise en main des outils |
| 10 h 30 – 12 h | Sources, conventions de calcul et premier exemple guidé |
| 13 h – 14 h 30 | Dates locales, distances et comparaison entre tournées |
| 14 h 30 – 16 h 30 | Exercices chiffrés et restitution de la fiche métier |

**Prérequis** — Lire un tableau et calculer une moyenne ou un pourcentage.

---

## Activité — Cadrer la décision

Vous disposez d’un **registre des livraisons** qui indique les statuts, les heures et les coûts, de **traces GPS** pour les distances et de **référentiels** pour les chauffeurs, les véhicules et les zones.

En quinze minutes, préparez une fiche pour le responsable d’exploitation.

1. Reformulez la décision à prendre et proposez une période de comparaison.
2. Indiquez quelles tournées ou livraisons vous compareriez. Comment tiendriez-vous compte de leurs volumes différents ?
3. Proposez des chiffres pour justifier le choix et indiquez de quelles sources ils viendraient.
4. Expliquez comment votre comparaison traiterait une livraison annulée et une distance manquante.

**Livrable** — Une fiche courte qui permet à une autre équipe de comprendre le périmètre et la raison de votre choix. Présentez-la avant d’appliquer en commun les conventions de calcul au premier extrait.

---

## Qu’est-ce qu’un Data Warehouse ?

Un **Data Warehouse**, ou **entrepôt de données**, réunit des données de plusieurs sources et conserve leur historique pour l’analyse. On y harmonise les identifiants, les dates et les unités pour pouvoir comparer des périodes, des zones ou des tournées.

| Usage | Exemple en logistique |
| --- | --- |
| **Transactionnel (OLTP)** — Enregistrer les opérations au fil de la journée | Le dispatch saisit une livraison ou corrige son statut. |
| **Analytique (OLAP)** — Regrouper et comparer des données historiques | L’exploitation calcule le taux de ponctualité par semaine et par zone sur plusieurs mois. |

Dans l’atelier, PostgreSQL héberge les tables sources, les données préparées et le modèle analytique. Extraire les données, les transformer et les charger constitue un **ETL**. [Présentation d’un entrepôt de données](https://aws.amazon.com/fr/what-is/data-warehouse/)

---

## Les architectures autour de l’entrepôt

| Architecture | À quoi elle sert | Exemple en logistique |
| --- | --- | --- |
| **Data mart** | Servir les analyses d’un métier ou d’une équipe, souvent à partir d’un entrepôt commun | Mettre à disposition de l’exploitation les seules données utiles au suivi des tournées. |
| **Data lake** ou lac de données | Stocker des données variées, y compris dans leur format d’origine, pour plusieurs usages | Conserver des exports de livraison, des événements GPS et des photos de remise. |
| **Lakehouse** | Organiser des tables sur le stockage d’un lac pour effectuer des analyses SQL et gérer leurs mises à jour | Interroger l’historique des trajets et des livraisons dans des tables construites sur le lac. |

Notre projet construit un **entrepôt relationnel** pour suivre les livraisons. [Data mart](https://aws.amazon.com/fr/what-is/data-mart/) · [Lac de données](https://aws.amazon.com/fr/what-is/data-lake/) · [Lakehouse](https://docs.databricks.com/aws/en/lakehouse/)

---

## Reconnaître la structure des données

| Famille | Comment la reconnaître | Exemple en logistique |
| --- | --- | --- |
| **Structurées** | Des lignes et des champs réguliers, dont on connaît le sens et le type | Le registre CSV des livraisons et la table PostgreSQL des véhicules. |
| **Semi-structurées** | Des champs nommés, parfois imbriqués ou facultatifs | Un événement GPS en JSON avec une heure et une position. |
| **Non structurées** | Le contenu demande une interprétation avant d’en tirer des champs exploitables | Une photo de remise du colis. |

Dans le registre de l’atelier, le coût est **numérique**, l’heure promise est **temporelle** et le statut est **catégoriel**. Le référentiel des zones ajoute des coordonnées **géographiques**. Ces distinctions déterminent les contrôles utiles, comme vérifier une unité ou conserver le fuseau d’un horaire. [Structure des données](https://aws.amazon.com/compare/the-difference-between-structured-data-and-unstructured-data/)

---

## Les outils et les gestes à maîtriser

| Outil | Ce que vous ferez pendant les TP |
| --- | --- |
| **Docker Compose** | Lancer les deux services de l’atelier, vérifier leur état et les arrêter à la fin du travail. |
| **PostgreSQL et `psql`** | Consulter la base et ses tables, puis créer le modèle avec ses clés et ses contraintes. `psql` est le client en ligne de commande. |
| **SQL** | Sélectionner des champs, joindre des tables et calculer des indicateurs par tournée ou par zone. |
| **Python et pandas** | Lire les sources, convertir les horaires, traiter les doublons et justifier les rejets. |
| **Psycopg et SQLAlchemy** | Relier Python à PostgreSQL. Psycopg est le pilote. SQLAlchemy peut s’appuyer sur lui pour faciliter les lectures et les écritures avec pandas. |
| **JupyterLab** | Exécuter des cellules Python et inspecter les résultats intermédiaires dans un notebook. |

Le TP propose SQLAlchemy comme option. On peut aussi ouvrir une connexion directement avec Psycopg. [Documentation Docker Compose](https://docs.docker.com/compose/) · [Prise en main de JupyterLab](https://jupyterlab.readthedocs.io/en/stable/getting_started/overview.html)

---

## Prise en main — Lire les zones en SQL

Démarrer le [bac à sable](../index.html#atelier), puis ouvrir le client `psql` depuis la racine du dépôt.

```sh
docker compose -f sandbox/compose.yaml exec postgres psql -U student -d formation
```

```sql
SELECT zone_id, libelle
FROM sources.zones
ORDER BY zone_id;
```

Avant d’exécuter la requête, repérer les deux colonnes choisies par `SELECT`, la table lue par `FROM` et la colonne utilisée pour le tri. Vérifier le résultat, puis essayer de n’afficher que la zone de Nyon avec `WHERE`.

<details><summary>Résultat attendu et filtre corrigé</summary>

La première requête affiche `Z-GE-C` (Genève Centre), `Z-GE-O` (Genève Ouest) et `Z-VD` (Nyon), dans cet ordre. Le filtre `WHERE` sélectionne la ligne dont le code est `Z-VD`.

```sql
SELECT zone_id, libelle
FROM sources.zones
WHERE zone_id = 'Z-VD';
```

</details>

Pour quitter `psql`, taper `\q`. [Lire une table avec SQL](https://www.postgresql.org/docs/17/tutorial-select.html)

---

## Les décisions à outiller

- **Planification** — Dans quelles zones les retards se répètent-ils à une même heure ? Où tester un créneau différent ?
- **Flotte** — Sur quelles tournées le coût par livraison est-il le plus élevé ? Quel type de véhicule comparer sur des tournées comparables ?
- **Trajets** — Où observe-t-on à la fois un kilométrage élevé et des retards ? Quelles tournées faut-il examiner avant de modifier leurs étapes ?

Chaque comparaison indique sa période, le volume de livraisons et la couverture des distances. Un écart observé sert à orienter l’enquête.

---

## Recenser les sources

| Source | Champs utiles | Questions à vérifier |
| --- | --- | --- |
| Export du dispatch `data/livraisons.csv` | Identifiant, tournée, statut, heures, coût, date d’export | Comment reconnaître une nouvelle version ? Quelle horloge fait foi ? |
| PostgreSQL `sources.trajets` | Identifiant de livraison et distance observée en mètres | Toutes les livraisons ont-elles une trace ? Que mesure la distance ? |
| PostgreSQL `sources.chauffeurs`, `sources.vehicules`, `sources.zones` | Codes, agence, type de véhicule et coordonnées de zone | Quels codes sont valides ? Quelle est la précision des coordonnées ? |

**Clé de rapprochement** — L’identifiant de livraison relie le dispatch au trajet. Les codes chauffeur, véhicule et zone relient le dispatch aux référentiels correspondants.

---

## Écrire la règle de chaque indicateur

| Indicateur | Calcul dans ce cours | Périmètre |
| --- | --- | --- |
| Coût par livraison | Somme des coûts ÷ nombre de livraisons | Livraisons effectuées, coûts connus en CHF |
| Ponctualité | Livraisons effectuées à l’heure ÷ livraisons évaluables | Une livraison est à l’heure si son horodatage réel est inférieur ou égal à l’heure promise |
| Retard | Écart entre l’heure réelle et l’heure promise, ramené à zéro en cas d’avance | Minutes, pour une livraison évaluable |
| Couverture des distances | Livraisons avec une distance renseignée et valide ÷ livraisons effectuées | Le kilométrage affiché porte sur les trajets couverts |

Pour une comparaison par jour, la période se lit sur la **date promise à Genève**. Si le dénominateur vaut zéro, on affiche « sans observation ».

---

## De l’heure promise à l’heure réelle

Le 1er décembre, le registre de la livraison `L002` donne deux horaires. Les voici ramenés à l’heure locale de Genève.

<figure class="course-diagram" aria-labelledby="retard-legende">
  <div class="diagram-timeline">
    <div class="diagram-node">
      <span>Heure promise</span>
      <time datetime="2026-12-01T09:30:00+01:00">9 h 30</time>
    </div>
    <div class="diagram-duration"><strong>10 min</strong><span aria-hidden="true"></span></div>
    <div class="diagram-node diagram-review">
      <span>Heure réelle</span>
      <time datetime="2026-12-01T09:40:00+01:00">9 h 40</time>
    </div>
  </div>
  <figcaption id="retard-legende">Les deux heures sont connues. Cette livraison compte parmi les livraisons évaluables et parmi celles en retard.</figcaption>
</figure>

---

## Un extrait du registre des livraisons

Le tableau présente quatre livraisons de la journée du 1er décembre, avec les heures converties à Genève. La version de `L002` est celle retenue en fin de matinée.

| Livraison | Tournée | Heure promise | Heure réelle | Coût | Distance observée |
| --- | --- | --- | --- | --- | --- |
| L001 | T-A | 9 h 00 | 8 h 55 | 12,40 CHF | 3 200 m |
| L002 | T-A | 9 h 30 | 9 h 40 | 15,10 CHF | 4 700 m |
| L003 | T-B | 10 h 00 | 10 h 00 | 9,50 CHF | 8 900 m |
| L004 | T-B | 11 h 00 | Annulée | 0,00 CHF | — |

Le coût moyen vaut `(12,40 + 15,10 + 9,50) / 3`, soit **12,33 CHF**. Deux des trois livraisons évaluables sont à l’heure, soit **66,7 %**.

---

## Lire le temps et la géographie

La livraison `L005` est enregistrée le 30 novembre à `23:20 UTC`. À Genève, il est alors `00:20` le 1er décembre. Un regroupement journalier utilise la date locale annoncée dans la définition de l’indicateur.

Les points de latitude et de longitude représentent des **zones** du cas. Une distance observée de `3 200 m` correspond à `3,2 km`. Pour comparer des tournées, on distingue la distance attribuée à chaque livraison, le coût associé et le nombre de trajets effectivement mesurés.

Pour tester une nouvelle tournée, le transporteur tient aussi compte des créneaux, de la capacité des véhicules et du temps de service aux arrêts.

---

## Erreurs fréquentes

- Compter les annulations dans le dénominateur de la ponctualité.
- Présenter un taux sans le nombre de livraisons évaluables.
- Attribuer une distance nulle à une trace GPS manquante.
- Comparer des jours UTC à des jours d’exploitation à Genève.
- Tirer une conclusion sur un véhicule à partir d’une seule tournée.

---

## Exercice 1 — Recalculer le taux de la tournée T-A

**Objectif** — Appliquer une règle d’indicateur à un sous-ensemble. **Prérequis** — Le tableau des quatre livraisons et la définition de ponctualité.

Sur le tableau d’exemple, calculer le taux de ponctualité et le coût moyen de `T-A`. Donner le nombre de livraisons au dénominateur et expliquer le cas d’une livraison effectuée exactement à l’heure promise.

**Livrable et réussite** — Deux résultats chiffrés avec le calcul et les unités.

<details><summary>Indices gradués</summary>

1. Filtrer les lignes sur `T-A`.
2. Compter les livraisons à l’heure parmi les livraisons évaluables.

</details>

<details><summary>Correction expliquée</summary>

`L001` est à l’heure et `L002` en retard. La ponctualité vaut `1 / 2`, soit **50 %**. Le coût vaut `(12,40 + 15,10) / 2`, soit **13,75 CHF**. Une livraison effectuée exactement à l’heure promise respecte la promesse.

</details>

---

## Exercice 2 — Définir une comparaison entre zones

**Objectif** — Formuler un besoin vérifiable. **Prérequis** — Les règles de ponctualité et l’inventaire des sources.

L’exploitation veut comparer Genève Centre et Genève Ouest sur une semaine. Rédiger la définition de l’indicateur à calculer et indiquer les colonnes et la clé nécessaires. Préciser la date utilisée pour choisir la semaine et le traitement des annulations.

**Livrable et réussite** — Une fiche qui permet à une autre personne de reproduire le même chiffre et de retrouver le volume sur lequel il repose.

<details><summary>Indices gradués</summary>

1. Identifier la date métier et la population observée.
2. Vérifier le rôle de `zone_id` et celui des deux horaires.

</details>

<details><summary>Correction expliquée</summary>

Filtrer sur la semaine de **date promise en `Europe/Zurich`**. Regrouper par `zone_id`, puis joindre `sources.zones` pour afficher les libellés. Pour chaque zone, calculer le rapport des livraisons à l’heure aux livraisons effectuées évaluables. Afficher aussi les effectifs. Présenter les annulations avec leur propre compteur.

</details>

---

## Exercice 3 — Examiner une alerte de tournée

**Objectif** — Détecter une comparaison trompeuse. **Prérequis** — Distance, couverture et choix du dénominateur.

Sur une journée, `T-A` totalise 48 km observés pour 8 livraisons, toutes couvertes. `T-B` totalise 30 km observés pour 10 livraisons, dont 5 seulement ont une trace. Un tableau conseille de revoir `T-A` car `48 / 8 > 30 / 10`.

**Livrable et réussite** — Donner les couvertures, recalculer les deux distances moyennes parmi les livraisons observées et proposer une vérification avant décision.

<details><summary>Indices gradués</summary>

1. Repérer le nombre de distances effectivement mesurées.
2. Utiliser ce nombre dans une moyenne des distances observées.

</details>

<details><summary>Correction expliquée</summary>

Les couvertures sont **100 %** et **50 %**. Les moyennes observées sont `48 / 8 = 6 km` et `30 / 5 = 6 km`. Il faut d’abord enquêter sur les cinq traces manquantes de `T-B`, puis comparer des tournées semblables en volume, créneaux et type de véhicule.

</details>

---

## Projet fil rouge — Le cadrage attendu

**Utilisateur** — Le responsable d’exploitation du transporteur.

**Livrable** — Reprendre la fiche de cadrage. Y préciser les indicateurs retenus, leurs unités et leurs périmètres. Ajouter la source de chaque champ, la couverture des mesures et un calcul de référence vérifiable à la main.

**Validation** — Une autre équipe retrouve le même dénominateur et les mêmes valeurs sur l’extrait. Elle sait aussi quelles données demander avant d’évaluer une optimisation de tournée.

---

## Jalon 1 — Construire le tableau de référence à la main

Reprendre les quatre livraisons de l’extrait. Ce tableau servira ensuite à vérifier le schéma en étoile.

1. Pour chaque livraison effectuée, calculer l’écart entre heure réelle et heure promise, puis le retard et le statut de ponctualité.
2. Pour chaque tournée, compter les livraisons effectuées et ponctuelles, puis calculer le coût total et le coût moyen.
3. Convertir les distances en kilomètres. Calculer la couverture et la distance totale observée pour chaque tournée.
4. Reconstituer les totaux puis les taux de l’extrait entier à partir des effectifs et des sommes.

<details><summary>Valeurs de contrôle</summary>

| Tournée | Effectuées | À l’heure | Coût total | Distance observée | Couverture |
| --- | --- | --- | --- | --- | --- |
| T-A | 2 | 1 | 27,50 CHF | 7,9 km | 2 sur 2 |
| T-B | 1 | 1 | 9,50 CHF | 8,9 km | 1 sur 1 |
| Total | 3 | 2 | 37,00 CHF | 16,8 km | 3 sur 3 |

Les écarts sont **−5, +10 et 0 minutes**. La ponctualité de l’extrait est **66,7 %** et le coût moyen est **12,33 CHF**. `L004` reste dans le décompte des annulations.

</details>

---

## Fiche de révision

- **Entrepôt de données** — Plusieurs sources harmonisées et un historique organisé pour l’analyse.
- **Outils** — SQL interroge les tables PostgreSQL. Python et pandas préparent les données de l’atelier.
- **Grain métier** — L’unité observée ici est la livraison. Une tournée regroupe plusieurs livraisons.
- **Indicateur** — Une définition précise l’unité, le périmètre, la date et les règles d’inclusion.
- **Source** — L’export du dispatch, les trajets et les référentiels se rapprochent par des identifiants.
- **Cas d’usage** — Un transporteur compare ses zones et ses tournées pour cibler des actions de planification.

---

## Questions de révision

1. Quel rapport entre une livraison et une tournée ?
2. Quelle date sert au découpage journalier ?
3. Quel est le dénominateur du taux de ponctualité ?
4. Que renseigne le taux de couverture GPS ?
5. Quelle décision peut suivre un retard récurrent dans un créneau ?
6. Quel usage de l’entrepôt demande de conserver un historique ?
7. À quoi servent les clauses `SELECT`, `FROM` et `WHERE` ?

---

## QCM — Questions 1 à 3

1. Quel niveau d’observation choisit-on ? A. Le chauffeur · B. La livraison · C. Le véhicule
2. Une livraison effectuée exactement à l’heure promise est-elle à l’heure ? A. Oui · B. Non · C. Cela dépend de la zone
3. Quelle unité utilise le champ `distance_m` ? A. Le kilomètre · B. La minute · C. Le mètre

<details><summary>Correction expliquée</summary>

1. **B**. Chaque livraison est un événement qui peut être relié à une tournée.
2. **A**. La règle inclut l’égalité avec l’heure promise.
3. **C**. On divise la distance par `1 000` pour l’afficher en kilomètres.

</details>

---

## QCM — Questions 4 et 5

4. Quel champ rapproche les trajets et le dispatch ? A. Le coût · B. Le jour · C. L’identifiant de livraison
5. Une tournée a zéro livraison évaluable. Quelle ponctualité afficher ? A. 0 % · B. Sans observation · C. 100 %

<details><summary>Correction expliquée</summary>

4. **C**. L’identifiant désigne le même événement dans les deux sources.
5. **B**. Le rapport est indéfini lorsque son dénominateur vaut zéro.

</details>

---

## QCM — Repères sur les données et les outils

6. Où comparer la ponctualité par zone sur plusieurs mois ? A. Dans l’entrepôt · B. Dans l’écran de saisie de tournée · C. Dans un seul événement GPS
7. Comment qualifier un événement GPS envoyé sous forme d’objet JSON à champs facultatifs ? A. Structuré en tableau · B. Semi-structuré · C. Non structuré
8. Que lance Docker Compose pendant cet atelier ? A. Les calculs métier · B. Les corrections du cours · C. PostgreSQL et JupyterLab

<details><summary>Correction expliquée</summary>

6. **A**. L’entrepôt rassemble un historique adapté aux comparaisons sur plusieurs périodes.
7. **B**. Les clés décrivent les champs, qui peuvent être imbriqués ou facultatifs.
8. **C**. Le fichier Compose déclare les deux services de l’atelier.

</details>

---

## À retenir avant de modéliser

Les décisions d’exploitation déterminent les indicateurs. Leurs règles de calcul déterminent les champs, le grain et les clés nécessaires. Le modèle du prochain chapitre s’appuie sur cette fiche.
