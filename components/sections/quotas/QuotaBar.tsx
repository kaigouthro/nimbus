
import React from 'react';

interface QuotaBarProps {
  used: number;
  limit: number;
  height?: string; // e.g., 'h-2', 'h-4'
}

const QuotaBar: React.FC<QuotaBarProps> = ({ used, limit, height = 'h-3' }) => {
  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  
  let barColor = 'bg-teal-500';
  if (percentage > 90) {
    barColor = 'bg-red-500';
  } else if (percentage > 75) {
    barColor = 'bg-yellow-500';
  }

  if (limit <= 0) { // Unlimited or no limit defined
    return (
      <div className={`w-full bg-slate-700 rounded-full ${height} overflow-hidden`}>
        <div className="bg-slate-500 h-full w-full flex items-center justify-center">
           <span className="text-xs text-slate-200 px-2">Unlimited</span>
        </div>
      </div>
    );
  }

  return (
    <div title={`${used} / ${limit} (${percentage.toFixed(1)}%)`} className={`w-full bg-slate-700 rounded-full ${height} overflow-hidden relative`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
        style={{ width: `${percentage}%` }}
      >
      </div>
       <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-slate-100 mix-blend-difference px-2">
          {percentage.toFixed(0)}% used
        </span>
    </div>
  );
};

export default QuotaBar;
