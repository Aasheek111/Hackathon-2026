import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || label.replace(/\s+/g, '-').toLowerCase();

  return (
    <div className="w-full flex flex-col space-y-1.5 mb-4">
      <label htmlFor={inputId} className="text-sm font-medium text-gray-300">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={`w-full bg-dark-card border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${
            icon ? 'pl-10' : ''
          } ${
            error
              ? 'border-red-500 focus:border-red-500'
              : 'border-dark-border focus:border-primary'
          } ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
    </div>
  );
};

export default Input;
