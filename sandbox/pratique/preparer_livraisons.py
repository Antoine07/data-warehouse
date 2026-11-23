import argparse
import os
from decimal import Decimal
from pathlib import Path

import pandas as pd
from sqlalchemy import Date, Numeric, create_engine


def horodatage_utc(valeurs):
    """Accepte les horodatages ISO du lot avec un décalage explicite."""
    texte = valeurs.str.strip()
    avec_fuseau = texte.str.fullmatch(
        r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})"
    )
    return pd.to_datetime(texte.where(avec_fuseau), format="ISO8601", utc=True, errors="coerce")


def preparer_livraisons(brutes, trajets, *, chauffeurs, vehicules, zones):
    lignes = brutes.copy()
    lignes.insert(0, "ligne_source", range(2, len(lignes) + 2))
    for colonne in ("livraison_id", "tournee_id", "chauffeur_id", "vehicule_id", "zone_id", "statut"):
        lignes[colonne] = lignes[colonne].str.strip().str.upper()

    heure_livree_renseignee = lignes["livree_a"].str.strip().ne("").to_numpy()
    for colonne in ("promise_a", "livree_a", "exporte_a"):
        lignes[colonne] = horodatage_utc(lignes[colonne])

    montants = lignes["cout_chf"].str.strip().str.replace(",", ".", regex=False)
    format_chf = montants.str.fullmatch(r"[0-9]{1,7}(?:\.[0-9]{1,2})?")
    lignes["cout_chf"] = montants.where(format_chf).map(Decimal, na_action="ignore")
    lignes = lignes.merge(trajets, how="left", on="livraison_id", validate="many_to_one")
    lignes["distance_m"] = lignes["distance_m"].astype("Int64")

    motifs = pd.Series(pd.NA, index=lignes.index, dtype="string")

    def rejeter(masque, motif):
        motifs.loc[motifs.isna() & masque] = motif

    rejeter(lignes["livraison_id"].eq(""), "identifiant_manquant")
    rejeter(lignes["exporte_a"].isna(), "export_sans_horodatage_valide")

    exports_valides = lignes["exporte_a"].where(motifs.isna())
    dernier_export = exports_valides.groupby(lignes["livraison_id"]).transform("max")
    rejeter(exports_valides.lt(dernier_export), "version_ancienne")
    versions_recentes = lignes.loc[motifs.isna(), "livraison_id"]
    indices_ambigus = versions_recentes.index[versions_recentes.duplicated(keep=False)]
    rejeter(lignes.index.isin(indices_ambigus), "version_ambigue")

    livree = lignes["statut"].eq("LIVREE")
    rejeter(lignes["tournee_id"].eq(""), "tournee_manquante")
    rejeter(~lignes["statut"].isin(["LIVREE", "ANNULEE"]), "statut_inconnu")
    rejeter(lignes["promise_a"].isna(), "promesse_sans_horodatage_valide")
    rejeter(livree & lignes["livree_a"].isna(), "livraison_sans_horodatage_valide")
    rejeter(~livree & heure_livree_renseignee, "annulation_avec_heure_livree")
    rejeter(lignes["cout_chf"].isna(), "cout_invalide")
    rejeter(~lignes["chauffeur_id"].isin(chauffeurs), "chauffeur_inconnu")
    rejeter(~lignes["vehicule_id"].isin(vehicules), "vehicule_inconnu")
    rejeter(~lignes["zone_id"].isin(zones), "zone_inconnue")
    rejeter(lignes["distance_m"].lt(0).fillna(False), "distance_negative")

    preparees = lignes.loc[motifs.isna()].copy()
    ecart_minutes = (preparees["livree_a"] - preparees["promise_a"]).dt.total_seconds() / 60
    preparees["retard_minutes"] = ecart_minutes.clip(lower=0).round(2)
    preparees["ponctuelle"] = ecart_minutes.le(0).astype("boolean").where(ecart_minutes.notna())
    preparees["jour_promis_local"] = preparees["promise_a"].dt.tz_convert("Europe/Zurich").dt.date
    preparees["jour_livre_local"] = preparees["livree_a"].dt.tz_convert("Europe/Zurich").dt.date

    rejets = lignes.loc[motifs.notna(), ["ligne_source", "livraison_id"]].assign(motif=motifs)
    return preparees, rejets


def charger_staging(engine, preparees, rejets):
    types_sql = {
        "cout_chf": Numeric(9, 2),
        "retard_minutes": Numeric(12, 2),
        "jour_promis_local": Date(),
        "jour_livre_local": Date(),
    }
    # Les deux tables représentent le même lot et sont remplacées ensemble.
    with engine.begin() as connexion:
        connexion.exec_driver_sql("TRUNCATE staging.livraisons_preparees, staging.rejets_livraisons")
        preparees.to_sql(
            "livraisons_preparees", connexion, schema="staging",
            if_exists="append", index=False, dtype=types_sql,
        )
        rejets.to_sql("rejets_livraisons", connexion, schema="staging", if_exists="append", index=False)


def main():
    analyseur = argparse.ArgumentParser(description="Préparer le lot de livraisons de l’atelier.")
    analyseur.add_argument("--csv", type=Path, default=Path("data/livraisons.csv"))
    analyseur.add_argument("--charger", action="store_true", help="Remplacer le lot dans le schéma staging.")
    options = analyseur.parse_args()

    brutes = pd.read_csv(options.csv, dtype="string", keep_default_na=False)
    engine = create_engine(os.environ["DATABASE_URL"])
    try:
        with engine.connect() as connexion:
            trajets = pd.read_sql("SELECT livraison_id, distance_m FROM sources.trajets", connexion)
            chauffeurs = pd.read_sql("SELECT chauffeur_id FROM sources.chauffeurs", connexion)["chauffeur_id"]
            vehicules = pd.read_sql("SELECT vehicule_id FROM sources.vehicules", connexion)["vehicule_id"]
            zones = pd.read_sql("SELECT zone_id FROM sources.zones", connexion)["zone_id"]

        preparees, rejets = preparer_livraisons(
            brutes, trajets, chauffeurs=chauffeurs, vehicules=vehicules, zones=zones
        )
        print(f"{len(brutes)} lignes lues, {len(preparees)} préparées, {len(rejets)} rejetées.")
        if not rejets.empty:
            print(rejets.to_string(index=False))

        if options.charger:
            charger_staging(engine, preparees, rejets)
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
