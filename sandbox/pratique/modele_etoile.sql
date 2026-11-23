BEGIN;

CREATE SCHEMA IF NOT EXISTS entrepot;

CREATE TABLE IF NOT EXISTS entrepot.dim_jour (
    jour date PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS entrepot.dim_chauffeur (
    chauffeur_sk bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    chauffeur_id text NOT NULL UNIQUE,
    agence text NOT NULL
);

CREATE TABLE IF NOT EXISTS entrepot.dim_vehicule (
    vehicule_sk bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    vehicule_id text NOT NULL UNIQUE,
    type_vehicule text NOT NULL
);

CREATE TABLE IF NOT EXISTS entrepot.dim_zone (
    zone_sk bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    zone_id text NOT NULL UNIQUE,
    libelle text NOT NULL,
    latitude numeric(7, 4) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude numeric(7, 4) NOT NULL CHECK (longitude BETWEEN -180 AND 180)
);

CREATE TABLE IF NOT EXISTS entrepot.fait_livraison (
    livraison_id text PRIMARY KEY,
    tournee_id text NOT NULL,
    chauffeur_sk bigint NOT NULL REFERENCES entrepot.dim_chauffeur,
    vehicule_sk bigint NOT NULL REFERENCES entrepot.dim_vehicule,
    zone_sk bigint NOT NULL REFERENCES entrepot.dim_zone,
    jour_promis date NOT NULL REFERENCES entrepot.dim_jour,
    jour_livre date REFERENCES entrepot.dim_jour,
    statut text NOT NULL CHECK (statut IN ('LIVREE', 'ANNULEE')),
    cout_chf numeric(9, 2) NOT NULL CHECK (cout_chf >= 0),
    distance_m integer CHECK (distance_m >= 0),
    retard_minutes numeric(12, 2) CHECK (retard_minutes >= 0),
    ponctuelle boolean,
    CHECK ((statut = 'LIVREE') = (jour_livre IS NOT NULL)),
    CHECK ((statut = 'LIVREE') = (retard_minutes IS NOT NULL)),
    CHECK ((statut = 'LIVREE') = (ponctuelle IS NOT NULL))
);

COMMIT;
