---
marp: true
html: true
---

# Préparer les livraisons pour l’entrepôt

Le modèle attend une ligne par livraison. L’export terrain contient plusieurs versions, des heures écrites dans différents fuseaux et des valeurs à vérifier. Le lot préparé doit pouvoir être contrôlé ligne par ligne.

---

## Objectif

Combiner un CSV et des tables PostgreSQL, normaliser les valeurs et justifier chaque rejet. Produire un lot unique par livraison et vérifier qu’un second chargement donne le même résultat.

**Prérequis** — Grain de livraison, jointures, bases de Python et de SQL. Démarrer le [bac à sable](../index.html#atelier) pour exécuter les exemples.

---

## Trois étapes de préparation

| Étape | Entrée | Résultat vérifiable |
| --- | --- | --- |
| Profiler | CSV brut, traces et référentiels | Colonnes, types attendus, valeurs absentes, versions concurrentes |
| Normaliser et contrôler | Horaires, codes, coûts et distances | Une livraison valide par identifiant et un motif par ligne rejetée |
| Écrire en `staging` | Lignes préparées et rejets | Deux tables du même lot, chargées ensemble dans une transaction |

`staging` est la **zone de préparation** PostgreSQL. Les fichiers bruts et les tables du schéma `sources` permettent de retrouver la donnée d’origine.

---

## Suivre une ligne de la source au lot préparé

<figure class="course-diagram diagram-pipeline" aria-labelledby="flux-legende">
  <div class="diagram-branches">
    <div class="diagram-node"><strong>CSV du dispatch</strong><span>Versions, statuts, heures et coûts</span></div>
    <div class="diagram-node"><strong>PostgreSQL</strong><span>Distances GPS et référentiels</span></div>
  </div>
  <div class="diagram-junction" aria-hidden="true"></div>
  <div class="diagram-node diagram-focus diagram-center"><strong>Rapprocher et contrôler</strong><span>Identifiant, dernière version, formats et règles de qualité</span></div>
  <div class="diagram-junction diagram-split" aria-hidden="true"></div>
  <div class="diagram-branches">
    <div class="diagram-node"><strong>Livraisons préparées</strong><span>Une ligne par livraison retenue</span></div>
    <div class="diagram-node diagram-review"><strong>Rejets expliqués</strong><span>Numéro de ligne du CSV et motif</span></div>
  </div>
  <figcaption id="flux-legende">Les deux résultats sont écrits ensemble dans PostgreSQL, dans le schéma <code>staging</code>.</figcaption>
</figure>

---

## Profiler le CSV de livraison

```python
import pandas as pd

brutes = pd.read_csv("data/livraisons.csv", dtype="string", keep_default_na=False)
cles = brutes["livraison_id"].str.strip().str.upper()

print(len(brutes))
print(cles.value_counts().loc[lambda comptages: comptages > 1])
```

`dtype="string"` garde les codes et les textes dans leur forme brute. La conversion des dates et des coûts suit des règles choisies. `str.strip()` enlève les espaces en bordure, puis `str.upper()` unifie la casse des identifiants du cas.

**Résultat attendu** — 15 lignes, avec deux occurrences pour `L002` et deux pour `L011` après normalisation des clés.

---

## Lire PostgreSQL avec pandas et SQLAlchemy

```python
import pandas as pd
from sqlalchemy import create_engine

engine = create_engine(
    "postgresql+psycopg://student:student@postgres:5432/formation"
)

trajets = pd.read_sql(
    "SELECT livraison_id, distance_m FROM sources.trajets ORDER BY livraison_id",
    engine,
)
print(trajets.head())
```

**Fonctionnement** — `create_engine` prépare l’accès à la base `formation`. L’URL `postgresql+psycopg` choisit PostgreSQL comme dialecte et Psycopg comme pilote. `pd.read_sql` exécute la requête et retourne un `DataFrame` de deux colonnes.

**Résultat attendu** — La première ligne associe `L001` à `3200` mètres. La requête complète lit 11 mesures. Depuis JupyterLab, `postgres` est le nom du service Compose. Depuis l’ordinateur qui héberge Docker, utiliser `127.0.0.1` et le port publié. En fin de script, libérer le moteur avec `engine.dispose()`.

---

## SQLAlchemy et Psycopg ont des rôles distincts

| Outil | Rôle dans l’atelier | Usage |
| --- | --- | --- |
| **Psycopg** | Pilote Python qui communique avec PostgreSQL | Ouvrir une connexion, exécuter du SQL, lire les lignes et gérer une transaction |
| **SQLAlchemy Core** | Couche qui s’appuie sur le pilote et gère les connexions | Partager un moteur avec pandas, ouvrir une connexion ou une transaction |
| **pandas** | Bibliothèque de traitement tabulaire | Lire avec `read_sql`, préparer les données, écrire avec `to_sql` |

Pour le TP, choisissez **SQLAlchemy ou Psycopg direct**. Avec Psycopg direct, utilisez un curseur, construisez le `DataFrame` à partir des lignes et faites les écritures par `executemany` avec des paramètres SQL. Les contrôles du lot sont identiques.

<details><summary>Lire la même table avec Psycopg direct</summary>

```python
import pandas as pd
import psycopg

with psycopg.connect("postgresql://student:student@postgres:5432/formation") as connexion:
    with connexion.cursor() as curseur:
        curseur.execute(
            "SELECT livraison_id, distance_m FROM sources.trajets ORDER BY livraison_id"
        )
        colonnes = [colonne.name for colonne in curseur.description]
        trajets = pd.DataFrame(curseur.fetchall(), columns=colonnes)
```

Le pilote renvoie les lignes et la description des colonnes. Le bloc `with` ferme la connexion en sortie. Le résultat contient les mêmes 11 lignes.

</details>

[Documentation pandas](https://pandas.pydata.org/docs/reference/api/pandas.read_sql.html) · [Dialecte Psycopg de SQLAlchemy](https://docs.sqlalchemy.org/en/20/dialects/postgresql.html#module-sqlalchemy.dialects.postgresql.psycopg)

---

## Comparer deux heures sur la même échelle

Pour `L002`, la promesse est à `09:30+01:00` et la livraison réelle à `08:40Z`. `Z` indique UTC.

```python
heures = pd.Series(["2026-12-01T09:30:00+01:00", "2026-12-01T08:40:00Z"])
utc = pd.to_datetime(heures, format="ISO8601", utc=True)
ecart = (utc.iloc[1] - utc.iloc[0]).total_seconds() / 60
print(ecart)
```

La promesse vaut `08:30 UTC`. Le résultat est **10 minutes** de retard. Pour le regroupement par jour, convertir ensuite vers `Europe/Zurich` avant d’extraire la date. `L005` appartient ainsi au 1er décembre local.

Les horaires de ce lot doivent indiquer un décalage explicite. Sans ce décalage, la ligne reçoit un motif de rejet.

---

## Normaliser les formats, puis appliquer les règles

| Exemple brut | Préparation | Règle retenue |
| --- | --- | --- |
| `"12,40"` | `12.40` en décimal | Montant positif ou nul en CHF, avec au plus deux décimales |
| `" l002 "` | `L002` | Codes comparés sans espaces de bord et en majuscules |
| `3200` dans `distance_m` | `3200 m`, soit `3,2 km` | Distance en mètres dans la base |
| Trace absente pour `L006` | Distance inconnue | La livraison est exploitable avec un indicateur de couverture |
| `-250` pour `L010` | Rejet `distance_negative` | Une distance observée doit être positive ou nulle |

Les points de zone utilisent latitude puis longitude. Vérifier aussi les bornes de chaque coordonnée, la zone de référence et les unités avant toute analyse géographique.

---

## Départager les versions d’une livraison

1. Vérifier l’identifiant et l’horodatage d’export.
2. Chercher le dernier export par identifiant. Tracer les versions antérieures avec `version_ancienne`.
3. En cas d’égalité à la date d’export la plus récente, isoler les lignes en `version_ambigue`.
4. Appliquer les autres règles au dernier enregistrement retenu.

Pour `L002`, l’export de 11 h est la version à retenir. Pour `L011`, deux coûts sont associés au même export. Les deux lignes partent en rejet pour vérification auprès de la source.

---

## Contrôler la cardinalité de la jointure

```python
livraisons = brutes.assign(livraison_id=cles)
enrichies = livraisons.merge(
    trajets, how="left", on="livraison_id", validate="many_to_one"
)
print(len(enrichies))
```

La jointure gauche conserve les lignes du dispatch, y compris celles qui n’ont pas de trace. `validate="many_to_one"` exige un identifiant unique du côté des trajets. Le lot enrichi contient encore **15 lignes** à cette étape.

Après la sélection des versions et la validation métier, il doit rester une seule ligne par `livraison_id` dans le lot préparé. Vérifier aussi les codes `chauffeur_id`, `vehicule_id` et `zone_id` dans les référentiels.

---

## Écrire le lot dans une transaction

```python
from sqlalchemy import Date, Numeric

types_sql = {
    "cout_chf": Numeric(9, 2), "retard_minutes": Numeric(12, 2),
    "jour_promis_local": Date(), "jour_livre_local": Date(),
}

with engine.begin() as connexion:
    connexion.exec_driver_sql(
        "TRUNCATE staging.livraisons_preparees, staging.rejets_livraisons"
    )
    preparees.to_sql("livraisons_preparees", connexion,
                     schema="staging", if_exists="append", index=False, dtype=types_sql)
    rejets.to_sql("rejets_livraisons", connexion,
                  schema="staging", if_exists="append", index=False)
```

Le TP traite le fichier comme un lot complet. La transaction remplace ensemble les lignes préparées et les rejets du lot précédent. Si une insertion échoue, PostgreSQL annule aussi le remplacement. `dtype` associe explicitement les décimaux et les jours à leurs types PostgreSQL. `index=False` écrit les colonnes du lot sans ajouter l’index pandas.

`preparer_livraisons.py` fournit une réalisation de ces étapes. L’option `--charger` exécute l’écriture. Les tables recevant le lot sont créées par l’initialisation de PostgreSQL.

---

## Vérifier le résultat du traitement

```sh
docker compose -f sandbox/compose.yaml exec atelier python preparer_livraisons.py --charger
```

```sql
SELECT count(*) FILTER (WHERE statut = 'LIVREE') AS effectuees,
       count(*) FILTER (WHERE ponctuelle) AS ponctuelles,
       count(distance_m) FILTER (WHERE statut = 'LIVREE') AS distances_connues,
       sum(cout_chf) FILTER (WHERE statut = 'LIVREE') AS cout_total_chf
FROM staging.livraisons_preparees;
```

**Résultat attendu** — 15 lignes source, 7 préparées, 8 rejets. Sur 6 livraisons effectuées, 3 sont à l’heure, 5 ont une distance et leur coût total est de 80,00 CHF. Le coût moyen des six livraisons vaut 13,33 CHF. Relancer le traitement doit reproduire ces comptes.

---

## Erreurs fréquentes

- Comparer directement les chaînes `09:30+01:00` et `08:40Z`.
- Choisir arbitrairement la première occurrence d’un identifiant dans le CSV.
- Utiliser une jointure interne pour enrichir avec une distance facultative.
- Mélanger une colonne d’index pandas avec les champs attendus par la table.
- Charger les livraisons et les rejets dans deux transactions indépendantes.

---

## Exercice 1 — Prédire les résultats de la préparation

**Objectif** — Appliquer la normalisation, le choix de version et le fuseau. **Prérequis** — Lecture du CSV de départ.

Sur `L002`, indiquer la clé normalisée, la version retenue et le retard. Sur `L005`, donner le jour local de livraison. Utiliser les valeurs du CSV et justifier chaque réponse par une règle.

**Livrable et réussite** — Deux fiches courtes avec le résultat prévu et les champs qui le justifient.

<details><summary>Indices gradués</summary>

1. Pour `L002`, comparer les horodatages `exporte_a` après normalisation de l’identifiant.
2. Pour `L005`, convertir `23:20Z` en heure de Genève avant de lire la date.

</details>

<details><summary>Correction expliquée</summary>

La clé vaut `L002`. L’export de 11 h indique une livraison à `08:40Z` pour une promesse à `08:30Z`, soit 10 minutes de retard. `L005` est livrée le 1er décembre à `00:20` à Genève. La livraison correspond à cinq minutes d’avance sur `00:25`.

</details>

---

## Exercice 2 — Corriger une jointure qui perd des livraisons

**Objectif** — Déboguer l’enrichissement avec les traces. **Prérequis** — `merge`, cardinalité et trace facultative.

Un collègue exécute `livraisons.merge(trajets, on="livraison_id")`. Il obtient moins de lignes que dans le CSV. Corriger l’instruction, puis vérifier le nombre de lignes et la distance de `L006`.

**Livrable et réussite** — Une jointure corrigée qui garde les 15 lignes et détecte un identifiant dupliqué côté trajets.

<details><summary>Indices gradués</summary>

1. La jointure pandas est interne par défaut.
2. Vérifier la contrainte d’unicité attendue du côté des trajets.

</details>

<details><summary>Correction expliquée</summary>

```python
enrichies = livraisons.merge(
    trajets, how="left", on="livraison_id", validate="many_to_one"
)
assert len(enrichies) == 15
assert enrichies.loc[enrichies["livraison_id"].eq("L006"), "distance_m"].isna().all()
```

La jointure conserve les 15 entrées du dispatch. La distance de `L006` est manquante. En ajoutant volontairement un doublon côté trajets dans une copie du `DataFrame`, `validate` déclenche une erreur avant toute multiplication de lignes.

</details>

---

## Exercice 3 — Auditer le lot préparé

**Objectif** — Justifier les rejets et contrôler la relance. **Prérequis** — Mode `--charger` et requêtes avec `GROUP BY`.

Charger le lot, puis compter les rejets par motif et repérer les lignes qui concernent `L011`. Relancer le chargement et contrôler l’unicité du lot préparé. Choisir un rejet à expliquer au responsable d’exploitation.

**Livrable et réussite** — Une requête de contrôle, le bilan de `L011`, et la preuve que les 15 lignes sont réparties entre le lot préparé et le registre des rejets lors des deux exécutions.

<details><summary>Indices gradués</summary>

1. Le numéro de ligne du CSV se trouve dans `ligne_source`.
2. Comparer `count(*)` à `count(DISTINCT livraison_id)` dans le lot préparé.

</details>

<details><summary>Correction expliquée</summary>

```sql
SELECT motif, count(*) AS lignes
FROM staging.rejets_livraisons GROUP BY motif ORDER BY motif;

SELECT ligne_source, motif FROM staging.rejets_livraisons
WHERE livraison_id = 'L011' ORDER BY ligne_source;

SELECT count(*) AS lignes, count(DISTINCT livraison_id) AS livraisons
FROM staging.livraisons_preparees;
```

Les lignes 13 et 14 de `L011` partagent le même horodatage d’export, avec deux coûts. Elles sont en `version_ambigue`. On retrouve **7 lignes pour 7 livraisons** et **8 rejets** à chaque passage. `L011` reste à vérifier auprès du dispatch avant intégration à un lot ultérieur.

</details>

---

## Projet fil rouge — Livrer un lot vérifiable

**Livrables** — Une table de livraisons préparées, un registre de rejets avec numéro de ligne et motif, et une requête qui rapproche les volumes et les coûts avec le lot de départ.

**Validation** — L’identité de chaque livraison est stable. Les horaires se comparent en UTC et les jours métier se lisent à Genève. Les absences de distance restent visibles. Les deux tables `staging` correspondent au même lot à chaque relance.

---

## Jalon 3 — Contrôler les chiffres sur le lot complet

Reproduire le tableau du premier chapitre, cette fois sur les **15 lignes source**. Réconcilier d’abord le nombre de lignes entre versions écartées, anomalies et livraisons préparées. Regrouper ensuite les livraisons effectuées par tournée pour calculer la ponctualité, le coût et la couverture GPS.

```sql
SELECT tournee_id, count(*) AS effectuees,
       count(*) FILTER (WHERE ponctuelle) AS ponctuelles,
       count(distance_m) AS distances_connues,
       sum(distance_m) AS metres_observes,
       sum(cout_chf) AS cout_total_chf,
       sum(retard_minutes) AS retard_total_minutes
FROM staging.livraisons_preparees
WHERE statut = 'LIVREE'
GROUP BY tournee_id ORDER BY tournee_id;
```

Pour valider l’agrégation, reconstituer le total des coûts et la ponctualité globale à partir des effectifs et des sommes. Calculer le retard moyen des livraisons effectuées, puis celui des seules livraisons en retard.

<details><summary>Valeurs de contrôle</summary>

**15** lignes brutes, **3** versions écartées ou ambiguës, **5** autres rejets et **7** livraisons préparées, dont une annulée.

| Tournée | Effectuées | À l’heure | Distances connues | Distance observée | Coût total | Retard cumulé |
| --- | --- | --- | --- | --- | --- | --- |
| T-A | 3 | 2 | 3 | 10,1 km | 38,50 CHF | 10 min |
| T-B | 2 | 1 | 1 | 8,9 km | 23,50 CHF | 15 min |
| T-C | 1 | 0 | 1 | 23,8 km | 18,00 CHF | 50 min |
| Total | 6 | 3 | 5 | 42,8 km | 80,00 CHF | 75 min |

La ponctualité vaut **50 %**, la couverture GPS **83,3 %** et le coût moyen **13,33 CHF**. Le retard moyen vaut **12,5 minutes** pour l’ensemble des six livraisons effectuées et **25 minutes** pour les trois livraisons en retard.

</details>

---

## Fiche de révision

- **Profilage** — Observer les types, unités, valeurs absentes et doublons avant de transformer.
- **Règle de qualité** — Décider quoi conserver, corriger ou envoyer en rejet, puis tracer cette décision.
- **Transaction** — Rassembler les écritures qui doivent aboutir ensemble.
- **Cas d’usage** — Un transporteur rapproche ses exports de dispatch et ses GPS pour rendre la comparaison des tournées reproductible.

---

## Questions de révision

1. À quoi sert la zone `staging` ?
2. Quel lien unit SQLAlchemy et Psycopg ?
3. Pourquoi convertir les horaires en UTC avant de les soustraire ?
4. Que vérifie `validate="many_to_one"` ?
5. Comment démontrer que la relance ne duplique pas le lot ?

---

## QCM — Questions 1 à 3

1. Quel outil est le pilote PostgreSQL ? A. pandas · B. SQLAlchemy · C. Psycopg
2. Quelle jointure conserve le dispatch si une trace est absente ? A. Interne · B. Gauche · C. Croisée
3. Quelle date locale correspond à `2026-11-30T23:20:00Z` à Genève ? A. 30 novembre · B. 1er décembre · C. 2 décembre

<details><summary>Correction expliquée</summary>

1. **C**. L’URL SQLAlchemy désigne explicitement le pilote Psycopg.
2. **B**. Les lignes de gauche sont conservées, y compris quand la mesure manque.
3. **B**. À cette date, l’heure locale est `00:20` le lendemain de la date UTC affichée.

</details>

---

## QCM — Questions 4 et 5

4. Deux versions différentes partagent l’heure d’export la plus récente. Quelle règle suit le TP ? A. Isoler les deux · B. Prendre le coût le plus faible · C. Additionner les coûts
5. Une insertion échoue dans la transaction de remplacement. Qu’arrive-t-il au lot précédent ? A. Ses lignes doublent · B. Il est conservé · C. Seuls ses rejets disparaissent

<details><summary>Correction expliquée</summary>

4. **A**. Il faut faire vérifier la version et la valeur de référence.
5. **B**. La transaction annule à la fois le remplacement et les insertions du lot en échec.

</details>

---

## À retenir

Le modèle fixe ce qu’une livraison valide doit contenir. Le traitement prépare les valeurs et documente les écarts. Les contrôles de volume, d’unicité, de fuseau horaire et de couverture rendent le lot vérifiable avant le chargement de l’entrepôt.
