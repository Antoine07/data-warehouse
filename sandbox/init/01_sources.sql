BEGIN;

CREATE SCHEMA sources;
CREATE SCHEMA staging;

CREATE TABLE sources.chauffeurs (
    chauffeur_id text PRIMARY KEY,
    agence text NOT NULL
);

CREATE TABLE sources.vehicules (
    vehicule_id text PRIMARY KEY,
    type_vehicule text NOT NULL
);

CREATE TABLE sources.zones (
    zone_id text PRIMARY KEY,
    libelle text NOT NULL,
    latitude numeric(7, 4) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude numeric(7, 4) NOT NULL CHECK (longitude BETWEEN -180 AND 180)
);

CREATE TABLE sources.trajets (
    livraison_id text PRIMARY KEY,
    distance_m integer NOT NULL
);

INSERT INTO sources.chauffeurs VALUES
    ('C01', 'Genève'), ('C02', 'Genève'), ('C03', 'Vaud');

INSERT INTO sources.vehicules VALUES
    ('V01', 'Vélo cargo'), ('V02', 'Utilitaire léger'), ('V03', 'Fourgon');

INSERT INTO sources.zones VALUES
    ('Z-GE-C', 'Genève Centre', 46.2044, 6.1432),
    ('Z-GE-O', 'Genève Ouest', 46.1980, 6.0910),
    ('Z-VD', 'Nyon', 46.3832, 6.2396);

INSERT INTO sources.trajets VALUES
    ('L001', 3200), ('L002', 4700), ('L003', 8900), ('L005', 2200),
    ('L007', 9100), ('L008', 22300), ('L009', 21200), ('L010', -250),
    ('L011', 20000), ('L012', 20600), ('L013', 23800);

CREATE TABLE staging.livraisons_preparees (
    livraison_id text PRIMARY KEY,
    tournee_id text NOT NULL,
    chauffeur_id text NOT NULL REFERENCES sources.chauffeurs,
    vehicule_id text NOT NULL REFERENCES sources.vehicules,
    zone_id text NOT NULL REFERENCES sources.zones,
    statut text NOT NULL CHECK (statut IN ('LIVREE', 'ANNULEE')),
    promise_a timestamptz NOT NULL,
    livree_a timestamptz,
    jour_promis_local date NOT NULL,
    jour_livre_local date,
    cout_chf numeric(9, 2) NOT NULL CHECK (cout_chf >= 0),
    distance_m integer CHECK (distance_m >= 0),
    retard_minutes numeric(12, 2) CHECK (retard_minutes >= 0),
    ponctuelle boolean,
    exporte_a timestamptz NOT NULL,
    ligne_source integer NOT NULL,
    CHECK ((statut = 'LIVREE') = (livree_a IS NOT NULL))
);

CREATE TABLE staging.rejets_livraisons (
    ligne_source integer PRIMARY KEY,
    livraison_id text NOT NULL,
    motif text NOT NULL
);

COMMIT;
