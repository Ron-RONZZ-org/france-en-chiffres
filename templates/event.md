---
# ── Identifiant unique ──────────────────────────────────
# En kebab-case, en minuscules, sans espaces.
# Exemple : "traite-rome", "loi-1905", "sacre-charlemagne"
id: ""

# ── Années ──────────────────────────────────────────────
# start / end : année numérique (négative pour av. J.-C.)
# Pour un événement ponctuel, start == end.
start:
end:

# Texte affiché pour la date — permet des formats précis
# comme "14 juillet 1789" ou "Printemps 1944"
yearDisplay: ""

# ── Titre ───────────────────────────────────────────────
# Court, lisible sur la frise (50 caractères max conseillé)
title: ""

# ── Catégorie ───────────────────────────────────────────
# Une valeur parmi : political, military, cultural, economic, scientific
category: ""

# ── Importance ──────────────────────────────────────────
# Entier de 1 (mineur) à 5 (majeur).
# Réservez 5 aux événements fondateurs ou charnières.
significance:

# ── Chiffre clé ─────────────────────────────────────────
# Une statistique emblématique associée à l'événement.
stats:
  label: ""     # ex: "Durée du règne"
  value:        # Valeur numérique
  suffix: ""    # Unité ou texte après le nombre (laisser "" si vide)
  format: ""    # "integer" ou "decimal"

# ── Source ──────────────────────────────────────────────
# Identifiant du fichier source dans src/content/sources/
# Le fichier doit exister au format CSL-JSON (ex: "bnf.json" → id: "bnf")
sourceId: ""

# ── Lien ────────────────────────────────────────────────
# URL vers article Wikipedia ou autre ressource (optionnel)
link: ""

# ── Aperçu au survol ────────────────────────────────────
# Apparaît dans le tooltip de la frise chronologique.
preview:
  summary: ""
  statLabel: ""
  statValue: ""

# ── Description courte ──────────────────────────────────
# 2 à 4 phrases, affichée sur la page événement.
# Optionnelle si le corps Markdown ci-dessous est suffisant.
description: ""
---

<!-- Corps de l'article en Markdown (optionnel si description ci-dessus suffit) -->
