# Data Warehouse · Transport et logistique

Support de formation Satom IT & Learning Solutions. Le cas fil rouge suit l’activité d’un transporteur autour de Genève à partir de données de livraison et de trajet préparées pour l’atelier.

## Consulter le cours

Ouvrir [docs/index.html](docs/index.html) dans un navigateur. Le parcours commence par [le besoin métier](docs/01_besoin_metier.html), se poursuit avec [la modélisation dimensionnelle](docs/02_modeliser.html), puis aborde [le nettoyage et la préparation des données](docs/03_preparer_donnees.html).

Les supports HTML s’ouvrent hors ligne. Ils reprennent les styles et la navigation du dépôt [maths-data](https://github.com/Antoine07/maths-data/tree/e7eb42f/docs). Sur GitHub Pages, le dossier `docs/` se publie directement.

## Démarrer le bac à sable

Depuis la racine du dépôt, avec Docker et son extension Compose :

```sh
docker compose -f sandbox/compose.yaml up --build --wait
docker compose -f sandbox/compose.yaml exec atelier jupyter server list
```

Ouvrir JupyterLab à `http://127.0.0.1:8888` avec le jeton affiché par `jupyter server list`. Les exercices Python se lancent depuis le conteneur `atelier` ou depuis un notebook dans JupyterLab.

```sh
docker compose -f sandbox/compose.yaml exec postgres psql -U student -d formation
docker compose -f sandbox/compose.yaml exec atelier python preparer_livraisons.py
docker compose -f sandbox/compose.yaml down
```

Depuis `atelier`, PostgreSQL écoute à `postgres:5432`. Depuis un client sur l’ordinateur, utiliser `127.0.0.1:5432`. Le compte de démonstration est `student` / `student`, sur la base `formation`. Les ports sont accessibles depuis l’ordinateur qui lance Docker. `POSTGRES_HOST_PORT` et `JUPYTER_HOST_PORT` permettent d’en changer si besoin.

Le script affiche **15 lignes lues, 7 lignes préparées et 8 rejets** sur le lot fourni. L’option `--charger` remplace le lot dans les deux tables de `staging` au sein d’une transaction. Les entrées du TP se trouvent dans `sandbox/data/` et le schéma `sources` de PostgreSQL. Le volume PostgreSQL est conservé après `docker compose down`.

## Modifier les supports

Les fichiers sous `docs/supports/` font référence. Chaque séparateur Markdown `---`, après l’en-tête Marp, commence une slide. Avec Node.js 18 ou supérieur, les deux commandes suivantes régénèrent les présentations :

```sh
npm ci
npm run build
```

Le fichier `docs/index.html` regroupe les chapitres et les instructions de l’atelier.
