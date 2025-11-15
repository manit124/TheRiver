export type Mode = {
  id: string;
  name: string;
  subtitle: string;
  route?: string; // defined if playable now
  status: 'available' | 'comingSoon' | 'production';
  variant?: 'texas' | 'omaha' | 'shortdeck' | 'razz' | '5card' | 'pineapple';
};

export const MODES: Mode[] = [
  {
    id: 'texas',
    name: 'Texas Hold\'em',
    subtitle: 'No-limit classic',
    route: '/lobby?game=texas',
    status: 'available',
    variant: 'texas',
  },
  {
    id: 'omaha',
    name: 'Omaha',
    subtitle: 'Four-card action',
    route: '/lobby?game=omaha',
    status: 'production',
    variant: 'omaha',
  },
  {
    id: 'shortdeck',
    name: 'Short Deck',
    subtitle: 'Six-plus Hold\'em',
    status: 'comingSoon',
    variant: 'shortdeck',
  },
  {
    id: 'razz',
    name: 'Razz',
    subtitle: 'A-to-5 lowball',
    status: 'comingSoon',
  },
  {
    id: '5card',
    name: 'Five-Card Draw',
    subtitle: 'Old-school draw',
    status: 'comingSoon',
  },
  {
    id: 'pineapple',
    name: 'Pineapple',
    subtitle: 'Spicier Hold\'em',
    status: 'comingSoon',
  },
];

