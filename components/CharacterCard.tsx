import React from 'react';
import { Attire, CharacterAttributes, Race } from '../types';
import { OBJECT_ICONS } from '../constants';

interface CharacterCardProps {
  attributes: CharacterAttributes;
  imageUrl?: string;
  onClick: () => void;
  isVisible: boolean;
}

const SKIN_TONES: Record<Race, string> = {
  // Desaturated tones for the aesthetic
  [Race.White]: '#e5e5e5',
  [Race.Black]: '#404040',
  [Race.Asian]: '#d4d4d4',
  [Race.Latino]: '#a3a3a3',
};

// --- SVG Body Parts (Fallback) ---
// Using grayscale fills for fallback mode

const Head = ({ color }: { color: string }) => (
  <g>
    <circle cx="50" cy="30" r="18" fill={color} stroke="#000" strokeWidth="1.5" />
    {/* Eyes */}
    <circle cx="44" cy="28" r="2" fill="#000" />
    <circle cx="56" cy="28" r="2" fill="#000" />
  </g>
);

const Hand = ({ color, x, y }: { color: string, x: number, y: number }) => (
    <circle cx={x} cy={y} r="8" fill={color} stroke="#000" strokeWidth="1.5" />
);

const SuitBody = () => (
  <g>
    <path d="M50,48 L35,55 L50,65 L65,55 Z" fill="white" stroke="#000" strokeWidth="1" />
    <path d="M25,50 C20,55 15,65 15,100 L85,100 C85,65 80,55 75,50 L50,48 Z" fill="#262626" stroke="#000" strokeWidth="1" />
    <path d="M50,48 L46,55 L54,55 Z" fill="#525252" />
    <path d="M46,55 L54,55 L52,70 L48,70 Z" fill="#525252" />
  </g>
);

const UniformBody = () => (
  <g>
    <path d="M25,50 C20,55 15,65 15,100 L85,100 C85,65 80,55 75,50 L50,45 Z" fill="#525252" stroke="#000" strokeWidth="1" />
    <path d="M30,50 L50,55 L70,50 L75,45 L50,45 L25,45 Z" fill="#262626" stroke="#000" strokeWidth="1" />
    <path d="M30,60 L40,60 L40,72 L35,77 L30,72 Z" fill="#d4d4d4" stroke="#000" strokeWidth="1" />
  </g>
);

const HoodieBody = () => (
  <g>
    <path d="M30,30 Q50,15 70,30" fill="none" stroke="#404040" strokeWidth="20" strokeLinecap="round" />
    <path d="M20,50 C15,60 10,100 10,100 L90,100 C90,100 85,60 80,50 Q50,40 20,50" fill="#737373" stroke="#000" strokeWidth="1.5" />
  </g>
);

const TraditionalBody = () => (
  <g>
    <path d="M25,45 C20,55 15,100 15,100 L85,100 C85,100 80,55 75,45 Q50,40 25,45" fill="#e5e5e5" stroke="#000" strokeWidth="1.5" />
    <path d="M25,45 L35,100 L15,100 Z" fill="#404040" />
    <path d="M75,45 L65,100 L85,100 Z" fill="#404040" />
    <rect x="30" y="45" width="40" height="55" fill="#525252" opacity="0.8" rx="5" />
  </g>
);


export const CharacterCard: React.FC<CharacterCardProps> = ({ attributes, imageUrl, onClick, isVisible }) => {
  const skinColor = SKIN_TONES[attributes.race];
  const objectIcon = OBJECT_ICONS[attributes.object];

  const renderAttire = () => {
    switch (attributes.attire) {
      case Attire.Suit: return <SuitBody />;
      case Attire.Uniform: return <UniformBody />;
      case Attire.Hoodie: return <HoodieBody />;
      case Attire.Traditional: return <TraditionalBody />;
      default: return <HoodieBody />;
    }
  };

  if (!isVisible) {
    return <div className="w-full h-full rounded-none bg-transparent" />;
  }

  return (
    <div 
      className="relative w-full h-full flex items-end justify-center cursor-pointer active:scale-95 transition-transform overflow-hidden"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {imageUrl ? (
        // Render Generated Image
        <div className="w-full h-full relative border-2 border-black bg-white">
            <img 
                src={imageUrl} 
                alt={`${attributes.race} ${attributes.gender} with ${attributes.object}`}
                className="w-full h-full object-cover grayscale contrast-125" // CSS filter to make even generated images match the noir/paper aesthetic
                draggable={false}
            />
            <div className="absolute inset-0 bg-transparent mix-blend-multiply opacity-20 pointer-events-none"></div>
        </div>
      ) : (
        // Render SVG Fallback
        <div className="w-full h-full relative flex items-center justify-center border-2 border-black bg-white/50">
            <svg viewBox="0 0 100 100" className="w-full h-full">
            {renderAttire()}
            <Head color={skinColor} />
            <Hand color={skinColor} x={80} y={70} />
            <foreignObject x="70" y="55" width="30" height="30">
                <div className="w-full h-full flex items-center justify-center bg-white rounded-full border border-black shadow-sm">
                    <span className="text-xl select-none leading-none pt-1 grayscale">{objectIcon}</span>
                </div>
            </foreignObject>
            </svg>
        </div>
      )}
    </div>
  );
};