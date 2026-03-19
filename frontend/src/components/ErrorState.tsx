import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 gap-4 text-center">
      <div className="text-error opacity-85">
        <AlertCircle size={48} aria-hidden="true" />
      </div>
      <p className="text-base text-text-secondary max-w-sm">
        {message}
      </p>
      <button
        onClick={onRetry}
        aria-label="Retry"
        className="mt-2 px-5 py-2 bg-accent-gradient text-white rounded-md text-sm font-medium transition-opacity hover:opacity-85"
      >
        Retry
      </button>
    </div>
  );
};

export default ErrorState;
