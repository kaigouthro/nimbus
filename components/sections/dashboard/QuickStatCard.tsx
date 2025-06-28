
import React from 'react';
import Card from '../../common/Card';

interface QuickStatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  total?: number;
  unit?: string;
  className?: string;
}

const QuickStatCard: React.FC<QuickStatCardProps> = ({ title, value, icon, total, unit, className }) => {
  return (
    <Card className={`shadow-lg ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-bold text-slate-100">{value}
            {total !== undefined && <span className="text-lg text-slate-500"> / {total}</span>}
            {unit && <span className="text-lg text-slate-400 ml-1">{unit}</span>}
          </p>
        </div>
        <div className="p-3 bg-slate-700 rounded-full">
          {icon}
        </div>
      </div>
    </Card>
  );
};

export default QuickStatCard;
