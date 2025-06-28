
import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  id: string;
  error?: string;
  containerClassName?: string;
  children: React.ReactNode; // To pass <option> elements
}

const Select: React.FC<SelectProps> = ({ label, id, error, className, containerClassName, children, ...props }) => {
  const baseStyles = "block w-full pl-3 pr-10 py-2 border border-slate-700 rounded-md shadow-sm bg-slate-700 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm appearance-none";
  // Custom arrow using background SVG
  const customArrowStyle = {
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
    backgroundPosition: 'right 0.5rem center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '1.5em 1.5em',
  };
  const errorStyles = error ? "border-red-500 focus:ring-red-500 focus:border-red-500" : "";

  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          className={`${baseStyles} ${errorStyles} ${className}`}
          style={customArrowStyle}
          {...props}
        >
          {children}
        </select>
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
};

export default Select;
