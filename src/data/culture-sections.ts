export interface CultureSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: string;
}

export const cultureSections: CultureSection[] = [
  {
    id: 'litterature',
    title: 'Littérature',
    description: 'Œuvres, auteurs et courants littéraires qui ont façonné la France.',
    icon: '📚',
    href: '/culture/litterature',
  },
  // Future sections can be added here:
  // { id: 'cinema', title: 'Cinéma', icon: '🎬', ... },
  // { id: 'gastronomie', title: 'Gastronomie', icon: '🍷', ... },
];
