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
      "De la Gaule à aujourd'hui — une chronologie en chiffres",
    metaDesc:
      "L'histoire de France racontée par les nombres — des premiers humains en France à aujourd'hui",
  },
  {
    id: 'culture',
    href: '/culture',
    title: 'Culture',
    icon: '🎭',
    tileDesc:
      'Art, gastronomie, cinéma — la France culturelle en données',
    metaDesc:
      'La culture française en données — art, gastronomie, cinéma, tourisme',
  },
  {
    id: 'geographie',
    href: '/geographie',
    title: 'Géographie',
    icon: '🗺️',
    tileDesc:
      'Régions, climats, territoires — la diversité française',
    metaDesc:
      'La géographie de la France en données — régions, climats, territoires',
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
