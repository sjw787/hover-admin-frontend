'use client';

import { useEffect, useState } from 'react';

interface SessionTimeoutModalProps {
  isOpen: boolean;
  remainingSeconds: number;
  onStayLoggedIn: () => void;
  onLogout: () => void;
}

export default function SessionTimeoutModal({
  isOpen,
  remainingSeconds,
  onStayLoggedIn,
  onLogout,
}: SessionTimeoutModalProps) {
  const [countdown, setCountdown] = useState(remainingSeconds);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(remainingSeconds);
      return;
    }

    // Reset countdown when modal opens
    if (countdown !== remainingSeconds) {
      setCountdown(remainingSeconds);
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, onLogout]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full mx-4 p-6 animate-in fade-in zoom-in duration-200">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-yellow-600 dark:text-yellow-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Are you still there?
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Your session is about to expire due to inactivity.
          </p>
          <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-500 mb-2">
            {countdown}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            seconds remaining
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onLogout}
            className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
          >
            Logout
          </button>
          <button
            onClick={onStayLoggedIn}
            className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-indigo-500/30"
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  );
}

