export function SpadeIcon({ className }: { className?: string }) {
  return (
    <span className={className} style={{ fontFamily: 'serif' }}>
      ♠
    </span>
  );
}

export function HeartIcon({ className }: { className?: string }) {
  return (
    <span className={className} style={{ fontFamily: 'serif', color: '#ef4444' }}>
      ♥
    </span>
  );
}

export function DiamondIcon({ className }: { className?: string }) {
  return (
    <span className={className} style={{ fontFamily: 'serif', color: '#ef4444' }}>
      ♦
    </span>
  );
}

export function ClubIcon({ className }: { className?: string }) {
  return (
    <span className={className} style={{ fontFamily: 'serif' }}>
      ♣
    </span>
  );
}

export function SuitIcon({ suit, className }: { suit: '♠' | '♥' | '♦' | '♣'; className?: string }) {
  switch (suit) {
    case '♠':
      return <SpadeIcon className={className} />;
    case '♥':
      return <HeartIcon className={className} />;
    case '♦':
      return <DiamondIcon className={className} />;
    case '♣':
      return <ClubIcon className={className} />;
  }
}

