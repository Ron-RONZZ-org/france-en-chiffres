---
# ── Identifiant unique ──────────────────────────────────
# En kebab-case, en minuscules, sans espaces.
# Exemple : "traite-rome", "loi-1905", "sacre-charlemagne"
id: "mon-evenement"

# ── Années ──────────────────────────────────────────────
# start / end : année numérique (négative pour av. J.-C.)
# Pour un événement ponctuel, start == end.
start: 2024
end: 2024

# Texte affiché pour la date — permet des formats précis
# comme "14 juillet 1789" ou "Printemps 1944"
yearDisplay: "1er janvier 2024"

# ── Titre ───────────────────────────────────────────────
# Court, lisible sur la frise (50 caractères max conseillé)
title: "Titre de l'événement"

# ── Catégorie ───────────────────────────────────────────
# Une valeur parmi : political, military, cultural, economic, scientific
category: "cultural"

# ── Importance ──────────────────────────────────────────
# Entier de 1 (mineur) à 5 (majeur).
# Réservez 5 aux événements fondateurs ou charnières.
significance: 3

# ── Chiffre clé ─────────────────────────────────────────
# Une statistique emblématique associée à l'événement.
stats:
  label: "Intitulé du chiffre"   # ex: "Durée du règne"
  value: 42                       # Valeur numérique
  suffix: " unité"                # Unité ou texte après le nombre (laisser "" si vide)
  format: "integer"               # "integer" ou "decimal"

# ── Source ──────────────────────────────────────────────
# Identifiant du fichier source dans src/content/sources/
# Le fichier doit exister au format CSL-JSON (ex: "bnf.json" → id: "bnf")
sourceId: "ma-source"

# ── Lien ────────────────────────────────────────────────
# URL vers article Wikipedia ou autre ressource (optionnel)
link: "https://fr.wikipedia.org/wiki/..."

# ── Aperçu au survol ────────────────────────────────────
# Apparaît dans le tooltip de la frise chronologique.
preview:
  summary: "Résumé en une phrase de l'événement."
  statLabel: "Intitulé du tooltip"
  statValue: "Valeur textuelle du tooltip"

# ── Description courte ──────────────────────────────────
# 2 à 4 phrases, affichée sur la page événement.
# Optionnelle si le corps Markdown ci-dessous est suffisant.
description: "Description détaillée de l'événement, en 2 à 4 phrases."
---

<!-- Corps de l'article — complétez en Markdown si nécessaire -->
<!-- Si description ci-dessus suffit, laissez cette section vide. -->

Rédigez ici le contenu détaillé de l'événement.  
Utilisez la syntaxe **Markdown** pour la mise en forme.

**Exemples** : listes, citations, paragraphes, liens, etc.
