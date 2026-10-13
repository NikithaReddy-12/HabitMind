import React from 'react';
import { ActiveAurora } from '../context/ThemeContext';

interface AuroraMeshProps {
  aurora: ActiveAurora;
}

export const AuroraMesh: React.FC<AuroraMeshProps> = ({ aurora }) => {
  // Define ambient background base and gradient blurs
  const getAuroraStyles = () => {
    switch (aurora) {
      case 'dawn':
        return {
          baseBg: 'bg-[#fff5f2]',
          textTone: 'text-stone-800',
          blobs: [
            'bg-gradient-to-tr from-rose-300/40 via-orange-200/35 to-amber-100/30 top-[-10%] left-[-10%] w-[70vw] h-[70vw]',
            'bg-gradient-to-br from-pink-300/35 via-rose-200/40 to-peach-100/30 bottom-[-15%] right-[-10%] w-[65vw] h-[65vw]',
            'bg-gradient-to-r from-amber-200/30 via-rose-100/40 to-indigo-100/25 top-[30%] left-[20%] w-[50vw] h-[50vw]',
          ],
        };
      case 'day':
        return {
          baseBg: 'bg-[#f4fbf9]',
          textTone: 'text-slate-800',
          blobs: [
            'bg-gradient-to-tr from-sky-200/40 via-teal-100/45 to-emerald-100/30 top-[-15%] left-[-5%] w-[75vw] h-[75vw]',
            'bg-gradient-to-bl from-cyan-200/35 via-sky-100/40 to-blue-200/30 bottom-[-10%] right-[-15%] w-[65vw] h-[65vw]',
            'bg-gradient-to-r from-emerald-100/40 via-teal-100/30 to-sky-100/30 top-[25%] left-[25%] w-[55vw] h-[55vw]',
          ],
        };
      case 'dusk':
        return {
          baseBg: 'bg-[#120a22]',
          textTone: 'text-amber-50',
          blobs: [
            'bg-gradient-to-tr from-amber-500/25 via-violet-600/30 to-purple-800/35 top-[-10%] left-[-10%] w-[75vw] h-[75vw]',
            'bg-gradient-to-bl from-purple-700/30 via-fuchsia-600/25 to-amber-600/20 bottom-[-15%] right-[-10%] w-[70vw] h-[70vw]',
            'bg-gradient-to-r from-indigo-800/35 via-purple-700/25 to-amber-500/20 top-[30%] left-[20%] w-[50vw] h-[50vw]',
          ],
        };
      case 'night':
      default:
        return {
          baseBg: 'bg-[#050b18]',
          textTone: 'text-slate-100',
          blobs: [
            'bg-gradient-to-tr from-teal-500/20 via-cyan-600/15 to-indigo-950/30 top-[-15%] left-[-10%] w-[75vw] h-[75vw]',
            'bg-gradient-to-bl from-teal-600/20 via-sky-800/25 to-blue-950/40 bottom-[-10%] right-[-15%] w-[70vw] h-[70vw]',
            'bg-gradient-to-r from-emerald-600/15 via-teal-700/20 to-indigo-900/30 top-[30%] left-[25%] w-[55vw] h-[55vw]',
          ],
        };
    }
  };

  const current = getAuroraStyles();

  return (
    <div
      className={`fixed inset-0 pointer-events-none transition-colors duration-1000 ease-in-out -z-10 overflow-hidden ${current.baseBg}`}
      aria-hidden="true"
    >
      {/* Dynamic gradient mesh orbs */}
      <div className="absolute inset-0 filter blur-[90px] opacity-90 animate-aurora-mesh">
        {current.blobs.map((blobClass, i) => (
          <div
            key={i}
            className={`absolute rounded-full transform-gpu transition-all duration-1000 ease-in-out ${blobClass}`}
          />
        ))}
      </div>

      {/* Subtle organic noise/stipple overlay for tactile, non-flat elegance */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};
