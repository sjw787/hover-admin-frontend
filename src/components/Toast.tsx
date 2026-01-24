'use client';

import { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

export default function Toast({ message, type = 'info', duration = 5000, onClose }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const bgColor = {
    success: 'bg-green-50 dark:bg-green-900/90 border-green-500',
    error: 'bg-red-50 dark:bg-red-900/90 border-red-500',
    warning: 'bg-yellow-50 dark:bg-yellow-900/90 border-yellow-500',
    info: 'bg-blue-50 dark:bg-blue-900/90 border-blue-500',
  }[type];

  const textColor = {
    success: 'text-green-800 dark:text-green-200',
    error: 'text-red-800 dark:text-red-200',
    warning: 'text-yellow-800 dark:text-yellow-200',
    info: 'text-blue-800 dark:text-blue-200',
  }[type];

  const icon = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ',
  }[type];

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-md w-full mx-4 sm:mx-0 animate-slide-in-right`}>
      <div className={`${bgColor} ${textColor} border-l-4 rounded-lg shadow-lg p-4 flex items-start gap-3`}>
        <div className="text-2xl flex-shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium break-words">{message}</p>
        </div>
        <button
          onClick={onClose}
          className={`${textColor} hover:opacity-70 transition-opacity flex-shrink-0`}
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
