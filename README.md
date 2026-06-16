# 🇫🇷 France en Chiffres

Histoire, culture, géographie, actualité — racontées par les nombres.

Un site web éducatif animé qui explore la France à travers ses données statistiques. Construit avec **[Astro](https://astro.build)** + **Tailwind CSS** + **vanilla JS / GSAP**.

---

## 🧑‍💻 Pour les éditeurs de contenu

Tout le contenu du site vit dans `src/content/` sous forme de **fichiers Markdown** (événements) et **JSON** (époques, sources, médias).  
Pas besoin de toucher au code HTML ou aux composants pour modifier le texte ou les chiffres.

### Ajouter un événement à la frise chronologique

Chaque événement est un fichier `.md` dans `src/content/events/`.  
Le **raccordement aux époques est automatique** : les événements sont affectés à une époque selon leur plage d'années (`start`–`end`).

#### Utiliser le modèle

```bash
cp templates/event.md src/content/events/nouvel-evenement.md
```

Puis ouvrir le fichier et remplacer les valeurs.  
Le modèle contient des commentaires expliquant chaque champ.

#### Structure d'un événement

```yaml
---
id: "mon-evenement"
start: 2024
end: 2024
yearDisplay: "14 juillet 2024"
title: "Titre de l'événement"
category: "cultural"
significance: 3
stats:
  label: "Intitulé"
  value: 42
  suffix: " unité"
  format: "integer"
sourceId: "ma-source"
link: "https://..."
preview:
  summary: "Résumé en une phrase."
  statLabel: "Intitulé du tooltip"
  statValue: "Valeur textuelle"
description: "Description détaillée (2-4 phrases)."
---
```

| Champ | Description | Obligatoire |
|-------|-------------|-------------|
| `id` | Identifiant unique (kebab-case, minuscules) | ✅ |
| `start` | Année de début (nombre négatif pour av. J.-C.) | ✅ |
| `end` | Année de fin (identique à `start` pour un événement ponctuel) | ✅ |
| `yearDisplay` | Texte affiché pour la date (ex: `"14 juillet 1789"`) | ✅ |
| `title` | Titre de l'événement (≤ 50 car.) | ✅ |
| `category` | `political`, `military`, `cultural`, `economic` ou `scientific` | ✅ |
| `significance` | Importance de 1 à 5 (5 = événement fondateur) | ✅ |
| `stats` | Chiffre clé associé à l'événement | ✅ |
| `stats.label` | Intitulé de la statistique | ✅ |
| `stats.value` | Valeur numérique | ✅ |
| `stats.suffix` | Unité ou texte après le nombre | optionnel |
| `stats.format` | `"integer"` ou `"decimal"` | optionnel |
| `sourceId` | Identifiant de la source (dans `src/content/sources/`) | ✅ |
| `link` | URL Wikipedia ou autre ressource | optionnel |
| `preview` | Contenu affiché au survol sur la frise | ✅ |
| `preview.summary` | Résumé en une phrase | ✅ |
| `preview.statLabel` | Intitulé de la statistique du tooltip | ✅ |
| `preview.statValue` | Valeur textuelle du tooltip | ✅ |
| `description` | Description détaillée (2-4 phrases) | optionnel |
| `mediaId` | Identifiant média (dans `src/content/media/`) | optionnel |

#### Ajouter une époque

Les époques sont des fichiers JSON dans `src/content/eras/` :

```json
{
  "id": "mon-nouvel-era",
  "label": "Mon Époque",
  "period": "1900 à 1950",
  "color": "#a855f7",
  "start": 1900,
  "end": 1950
}
```

Le site supporte un nombre illimité d'époques et d'événements.

#### Ajouter une source

Les sources sont des fichiers CSL-JSON dans `src/content/sources/`.  
Consultez les fichiers existants dans ce dossier pour connaître le format attendu.

---

### Modifier les statistiques de la page d'accueil

Le fichier : **`src/data/france.json`**

```json
{
  "keyStats": [
    {
      "id": "population",
      "value": 68,
      "label": "Millions d'habitants",
      "suffix": " M",
      "format": "decimal",
      "icon": "👥",
      "source": "INSEE, 2024"
    }
  ]
}
```

| Champ | Description |
|-------|-------------|
| `id` | Identifiant unique |
| `value` | Valeur numérique (le compteur animé part de 0) |
| `label` | Texte sous le chiffre |
| `suffix` | Unité affichée après le nombre |
| `format` | `"integer"` ou `"decimal"` |
| `icon` | Emoji ou icône (optionnel) |
| `source` | Source de la donnée |

---

## ⚙️ Pour les développeurs

### Prérequis

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/Ron-RONZZ-org/france-en-chiffres.git
cd france-en-chiffres
npm install
```

### Commandes

| Commande | Description |
|----------|-------------|
| `npm run dev` | Lance le serveur de développement avec HMR (`http://localhost:4321`) |
| `npm run build` | Génère le site statique dans `dist/` |
| `npm run preview` | Prévisualise le build en local |
| `npm run test` | Exécute les tests de validation (données, build) |
| `npm run test:all` | Build + tests (vérification complète avant commit) |

### Ajouter une nouvelle page

1. Créer un fichier dans `src/pages/` (ex: `src/pages/art.astro`)
2. Utiliser le layout existant :

```astro
---
import Base from '../layouts/Base.astro';
---

<Base title="Mon Titre — France en Chiffres">
  <section class="...">
    <!-- Ton contenu ici -->
  </section>
</Base>
```

3. Ajouter un lien dans le tableau `navItems` dans `src/layouts/Base.astro`

---

## 🏗️ Architecture du projet

```
france-en-chiffres/
├── public/                    # Static assets (images, fonts, favicon)
│   └── France_departements.svg
├── templates/                 # Modèles pour les éditeurs de contenu
│   └── event.md               # Modèle d'événement (YAML + Markdown)
├── src/
│   ├── content/               # Content Collections (Zod-validated)
│   │   ├── config.ts          # Schémas de validation
│   │   ├── eras/              # Époques (fichiers JSON)
│   │   ├── events/            # Événements (fichiers .md)
│   │   ├── sources/           # Sources CSL-JSON
│   │   └── media/             # Médias (métadonnées + fichiers)
│   ├── pages/                 # Routes du site (1 fichier = 1 page)
│   ├── components/            # Composants réutilisables
│   │   ├── Counter.astro
│   │   ├── InteractiveFranceMap.astro
│   │   ├── Timeline.astro
│   │   ├── TimelineEra.astro
│   │   ├── TimelineEvent.astro
│   │   ├── MediaFigure.astro
│   │   └── Nav.astro
│   ├── layouts/
│   │   └── Base.astro
│   ├── data/                  # Données non-content + utilitaires
│   │   ├── france.json        # Stats de la page d'accueil
│   │   ├── france-map-data.json
│   │   ├── france-departments.json
│   │   ├── history.ts         # Agrégation époques + événements
│   │   ├── sources.ts         # Résolution des sources
│   │   └── media.ts           # Résolution des médias
│   ├── scripts/               # Scripts de build
│   │   └── extract-france-map.js
│   ├── tests/                 # Tests de validation
│   │   ├── france-map.test.cjs
│   │   ├── sources.test.cjs
│   │   └── media.test.cjs
│   └── styles/
│       └── global.css
├── AGENTS.md                  # Règles du projet pour l'IA
├── astro.config.mjs
├── tailwind.config.js
└── package.json
```

### Stack technique

| Technologie | Usage |
|-------------|-------|
| [Astro](https://astro.build) | Framework statique (multi-pages, zéro JS par défaut) |
| [Tailwind CSS](https://tailwindcss.com) | Styles utilitaires (layout, espacement, typographie) |
| [GSAP](https://gsap.com) | Animations avancées (ScrollTrigger, stagger) |
| Vanilla JS | Compteurs animés, interactions tactiles |

---

## 🌐 Déploiement

Le site est statique. Après `npm run build`, déposez le dossier `dist/` sur n'importe quel hébergeur :

- **Netlify** : connecter le repo GitHub, build command `npm run build`, publish directory `dist/`
- **Vercel** : idem
- **GitHub Pages** : utiliser `npm run build` et push le dossier `dist/`

---

## 📚 Sources

Les données proviennent de :
- INSEE (Institut national de la statistique et des études économiques)
- Banque Mondiale
- Organisation Mondiale du Tourisme
- IGN (Institut national de l'information géographique et forestière)
- Sources historiques diverses (citées par événement)

---

## 📄 Licence

AGPL-3.0 — voir le fichier [LICENSE](LICENSE).
