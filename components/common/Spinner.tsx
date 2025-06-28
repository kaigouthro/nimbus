
import React from 'react';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className, text }) => {
  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className={`flex flex-col items-center justify-center text-slate-400 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-teal-500`} />
      {text && <p className="mt-2 text-sm">{text}</p>}
    </div>
  );
};

export default Spinner;
