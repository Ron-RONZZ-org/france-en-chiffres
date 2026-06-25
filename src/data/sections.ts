export interface SectionMeta {
  id: string;
  href: string;
  title: string;
  icon: string;
  tileDesc: string;
  metaDesc: string;
}

const sections: SectionMeta[] = [
  {
    id: 'histoire',
    href: '/histoire',
    title: 'Histoire',
    icon: '📜',
    tileDesc:
      "De l'arrivée des premiers humains en France à la Ve République — une grande Histoire de la France, chiffrée et animée.",
    metaDesc:
      "Une grande Histoire de la France racontée par les histoires et les nombres — des premiers humains en France à aujourd'hui",
  },
  {
    id: 'culture',
    href: '/culture',
    title: 'Culture',
    icon: '🎭',
    tileDesc:
      'Art, gastronomie, cinéma — la France culturelle en données',
    metaDesc:
      'La culture française racontée par les histoires mais aussi des nombres — art, gastronomie, cinéma, tourisme',
  },
  {
    id: 'geographie',
    href: '/geographie',
    title: 'Géographie',
    icon: '🗺️',
    tileDesc:
      'Régions, populations, routes, chemins ferroviaires, voie navigables, climats... — la diversité française visualisée',
    metaDesc:
      'La géographie de la France à travers des cartes et données interactives',
  },
  {
    id: 'monde',
    href: '/monde',
    title: 'Monde',
    icon: '🌍',
    tileDesc:
      'La France dans le monde — cartes thématiques, données comparatives et profils par pays',
    metaDesc:
      'La France dans le monde — cartes interactives, indicateurs de développement et profils par pays',
  },
  {
    id: 'actualites',
    href: '/actualites',
    title: 'Actualité',
    icon: '📊',
    tileDesc:
      'Économie, société, environnement — la France contemporaine',
    metaDesc:
      'La France contemporaine en données — économie, société, environnement',
  },
];

export default sections;
