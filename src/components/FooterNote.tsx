import React from 'react';

export const FooterNote: React.FC = () => {
  return (
    <footer className="w-full text-center py-3 select-none pointer-events-none mt-auto">
      <p className="text-[11px] sm:text-xs font-sans-ui text-stone-500 dark:text-stone-400 font-medium tracking-wide">
        Dayline is for lifestyle tracking, not medical advice.
      </p>
    </footer>
  );
};
