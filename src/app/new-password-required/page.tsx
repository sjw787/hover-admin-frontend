'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface NewPasswordRequiredPageProps {
  searchParams?: { username?: string };
}

export default function NewPasswordRequiredPage({ searchParams }: NewPasswordRequiredPageProps) {
  const [username, setUsername] = useState(searchParams?.username || '');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      // Call the login endpoint with the temporary password first
      // The backend should detect this is a new user and handle the password change
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password: temporaryPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to authenticate' }));
        
        // Check if it's the "new password required" challenge
        if (errorData.detail?.includes('New password required') || errorData.challenge === 'NEW_PASSWORD_REQUIRED') {
          // Now submit the new password
          const changeResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/complete-new-password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              username,
              temporary_password: temporaryPassword,
              new_password: newPassword,
            }),
          });

          if (!changeResponse.ok) {
            const changeError = await changeResponse.json().catch(() => ({ detail: 'Failed to set new password' }));
            throw new Error(changeError.detail || 'Failed to set new password');
          }

          // Password changed successfully, redirect to login
          alert('Password changed successfully! Please login with your new password.');
          router.push('/login');
          return;
        }
        
        throw new Error(errorData.detail || 'Authentication failed');
      }

      // If we got here, authentication succeeded somehow
      router.push('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mb-4">
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
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              New Password Required
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              This is your first login. Please set a new password.
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Username / Email
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="your@email.com"
                disabled={isLoading}
              />
            </div>

            <div>
              <label
                htmlFor="temp_password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Temporary Password
              </label>
              <input
                id="temp_password"
                type="password"
                value={temporaryPassword}
                onChange={(e) => setTemporaryPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="••••••••"
                disabled={isLoading}
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                The temporary password sent to your email
              </p>
            </div>

            <div>
              <label
                htmlFor="new_password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                New Password
              </label>
              <input
                id="new_password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="••••••••"
                disabled={isLoading}
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Must be at least 8 characters with uppercase, lowercase, number, and special character
              </p>
            </div>

            <div>
              <label
                htmlFor="confirm_password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Confirm New Password
              </label>
              <input
                id="confirm_password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
            >
              {isLoading ? 'Setting Password...' : 'Set New Password'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500"
              >
                Back to Login
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

