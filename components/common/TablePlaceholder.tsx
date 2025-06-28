
import React from 'react';
import { Table } from 'lucide-react';

interface TablePlaceholderProps {
  featureName: string;
  message?: string;
}

const TablePlaceholder: React.FC<TablePlaceholderProps> = ({ featureName, message }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-10 bg-slate-800 border-2 border-dashed border-slate-700 rounded-lg">
      <Table className="w-16 h-16 text-slate-600 mb-4" />
      <h3 className="text-xl font-semibold text-slate-300 mb-2">{featureName}</h3>
      <p className="text-slate-400">
        {message || `The ${featureName.toLowerCase()} management interface will be available here. Stay tuned for updates!`}
      </p>
    </div>
  );
};

export default TablePlaceholder;
