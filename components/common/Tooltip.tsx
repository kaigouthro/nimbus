import React, { useState } from 'react';

interface TooltipProps {
  children: React.ReactElement; // The element that triggers the tooltip
  text: string; // The tooltip text
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const Tooltip: React.FC<TooltipProps> = ({ children, text, position = 'top' }) => {
  const [visible, setVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'left-1/2 -translate-x-1/2 bottom-[-4px] border-l-transparent border-r-transparent border-t-slate-700',
    bottom: 'left-1/2 -translate-x-1/2 top-[-4px] border-l-transparent border-r-transparent border-b-slate-700',
    left: 'top-1/2 -translate-y-1/2 right-[-4px] border-t-transparent border-b-transparent border-l-slate-700',
    right: 'top-1/2 -translate-y-1/2 left-[-4px] border-t-transparent border-b-transparent border-r-slate-700',
  };

  return (
    <div className="relative inline-block">
      <span
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        // tabIndex={0} // Make span focusable if children might not be. For now, assume children is interactive.
        className="inline-block" // Ensures layout and event capture
      >
        {children}
      </span>
      {visible && (
        <div
          role="tooltip"
          className={`absolute z-10 px-3 py-1.5 text-xs font-medium text-white bg-slate-700 rounded-md shadow-lg whitespace-nowrap ${positionClasses[position]}`}
        >
          {text}
          <div className={`absolute w-0 h-0 border-[4px] ${arrowClasses[position]}`}></div>
        </div>
      )}
    </div>
  );
};

export default Tooltip;