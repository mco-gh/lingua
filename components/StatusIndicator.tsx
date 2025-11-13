import React from 'react';
import { AppState } from '../types';

interface StatusIndicatorProps {
  state: AppState;
  error?: string | null;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ state, error }) => {
  const getStatusContent = () => {
    switch (state) {
      case AppState.Connecting:
        return (
          <div className="flex items-center space-x-2">
            <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Connecting...</span>
          </div>
        );
      case AppState.Listening:
        return (
            <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 dark:bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-600 dark:bg-green-500"></span>
                </span>
                <span>Listening... Start speaking!</span>
            </div>
        );
      case AppState.Error:
        return <span className="text-red-600 dark:text-red-400">Error: {error || 'An unknown error occurred.'}</span>;
      case AppState.Idle:
      default:
        return <span className="text-gray-500 dark:text-gray-400">Press start to begin your lesson.</span>;
    }
  };

  return (
    <div className="h-8 flex items-center justify-center text-center px-4 transition-colors">
      {getStatusContent()}
    </div>
  );
};

export default StatusIndicator;