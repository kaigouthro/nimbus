import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  actions?: React.ReactNode; // For buttons or links in the header
  contentClassName?: string; // Allow custom classes for the content wrapper
}

const Card: React.FC<CardProps> = ({ children, title, className, actions, contentClassName }) => {
  return (
    <div className={`bg-slate-800 shadow-lg rounded-lg border border-slate-700 flex flex-col ${className}`}>
      {(title || actions) && (
        <div className="px-4 py-3 sm:px-6 border-b border-slate-700 flex justify-between items-center">
          {title && <h3 className="text-lg leading-6 font-medium text-slate-100">{title}</h3>}
          {actions && <div className="ml-4 flex-shrink-0">{actions}</div>}
        </div>
      )}
      <div className={`p-4 sm:p-6 flex-1 flex flex-col ${contentClassName || ''}`}>
        {children}
      </div>
    </div>
  );
};

export default Card;