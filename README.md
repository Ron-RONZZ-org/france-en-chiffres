# 🇫🇷 France en Chiffres

Histoire, culture, géographie, actualité — racontées par les nombres.

Un site web éducatif animé qui explore la France à travers ses données statistiques. Construit avec **[Astro](https://astro.build)** + **Tailwind CSS** + **vanilla JS / GSAP**.

---

## 🧑‍💻 Pour les éditeurs de contenu

Tout le contenu du site vit dans des fichiers **JSON** sous `src/data/`.  
Pas besoin de toucher au code HTML ou aux composants pour modifier le texte ou les chiffres.

### Modifier la frise chronologique (`/history`)

Le fichier à ouvrir : **`src/data/history.json`**

#### Structure d'une époque

```json
{
  "id": "moyen-age",
  "label": "Moyen Âge",
  "period": "486 à 1453",
  "color": "#8b5cf6",
  "events": [ ... ]
}
```

| Champ | Description |
|-------|-------------|
| `id` | Identifiant unique (utilisé en interne, ne pas changer après publication) |
| `label` | Nom affiché de l'époque |
| `period` | Période affichée sous le nom |
| `color` | Code hexadécimal de la couleur du point sur la timeline |
| `events[]` | Tableau des événements de cette époque |

#### Structure d'un événement

```json
{
  "id": "azincourt",
  "year": 1415,
  "yearDisplay": "1415",
  "title": "Bataille d'Azincourt",
  "description": "Défaite française majeure face aux Anglais...",
  "category": "military",
  "significance": 4,
  "stats": {
    "label": "Pertes françaises",
    "value": 6000,
    "suffix": " hommes",
    "format": "integer"
  },
  "source": "Enguerrand de Monstrelet, Chroniques",
  "preview": {
    "summary": "Désastre militaire de la guerre de Cent Ans.",
    "statLabel": "Durée du conflit",
    "statValue": "116 ans"
  }
}
```

| Champ | Description | Obligatoire |
|-------|-------------|-------------|
| `id` | Identifiant unique de l'événement | ✅ |
| `year` | Année (numérique, négative pour av. J.-C.) | ✅ |
| `yearDisplay` | Texte affiché pour l'année (ex: `"14 juillet 1789"`) | ✅ |
| `title` | Titre de l'événement | ✅ |
| `description` | Description détaillée (3-4 lignes max) | ✅ |
| `category` | Catégorie : `political`, `military`, `cultural`, `economic`, `scientific` | ✅ |
| `significance` | Importance de 1 à 5 (réserve 5 aux événements majeurs) | ✅ |
| `stats` | Chiffre clé associé à l'événement | ✅ |
| `stats.label` | Intitulé de la statistique | ✅ |
| `stats.value` | Valeur numérique | ✅ |
| `stats.suffix` | Unité ou suffixe (ex: `" hommes"`, `" km²"`) | optionnel |
| `stats.format` | `"integer"` ou `"decimal"` | optionnel |
| `source` | Source de l'information | ✅ |
| `preview` | Contenu affiché au survol (tooltip) | ✅ |
| `preview.summary` | Résumé en une phrase | ✅ |
| `preview.statLabel` | Intitulé de la statistique du tooltip | ✅ |
| `preview.statValue` | Valeur textuelle de la statistique du tooltip | ✅ |

#### Ajouter un événement

1. Ouvrir `src/data/history.json`
2. Trouver l'époque concernée (ex: `"france-contemporaine"`)
3. Ajouter un nouvel objet dans le tableau `events`
4. Respecter la structure ci-dessus
5. Sauvegarder → le site se met à jour automatiquement au prochain build

#### Ajouter une nouvelle époque

Ajouter un objet dans le tableau `eras` :

```json
{
  "id": "mon-nouvel-era",
  "label": "Mon Époque",
  "period": "1900 à 1950",
  "color": "#a855f7",
  "events": [ ... ]
}
```

Le site supporte un nombre illimité d'époques et d'événements.

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
├── src/
│   ├── pages/            # Routes du site (1 fichier = 1 page)
│   ├── components/       # Composants réutilisables
│   │   ├── Counter.astro      # Compteur animé
│   │   ├── InteractiveFranceMap.astro  # Carte interactive (héros + géographie)
│   │   ├── Timeline.astro     # Conteneur de la frise
│   │   ├── TimelineEra.astro  # Section d'époque
│   │   ├── TimelineEvent.astro # Événement individuel
│   │   ├── HoverPreview.astro # Tooltip au survol
│   │   └── Nav.astro          # Navigation fixe
│   ├── layouts/
│   │   └── Base.astro         # Layout principal (nav, footer, fonts)
│   ├── scripts/           # Build-time helper scripts
│   │   └── extract-france-map.js  # Extrait les chemins SVG depuis France_departements.svg
│   ├── tests/             # Tests de validation automatisés
│   │   └── france-map.test.cjs
│   ├── data/
│   │   ├── france.json        # Stats de la page d'accueil
│   │   ├── france-map-data.json # Chemins SVG extraits (Métropole + DOM-COM)
│   │   │   ├── france-departments.json # 96 départements métropolitains
│   │   ├── history.json       # Données de la frise chronologique
│   │   └── history.types.ts   # Types TypeScript (pour l'éditeur de code)
│   └── styles/
│       └── global.css         # Variables CSS, reset, utilitaires
├── tailwind.config.js         # Configuration Tailwind (couleurs, fonts)
├── astro.config.mjs
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
