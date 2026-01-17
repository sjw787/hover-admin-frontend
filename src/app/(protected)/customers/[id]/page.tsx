'use client';

import { useState, useEffect } from 'react';
import { api, type CustomerProfile, type UpdateCustomerRequest } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<UpdateCustomerRequest>({
    name: '',
    phone_number: '',
    enabled: true,
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string>('');
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [newTemporaryPassword, setNewTemporaryPassword] = useState<string | null>(null);

  // Unwrap params Promise (Next.js 15+)
  useEffect(() => {
    params.then(p => setCustomerId(p.id));
  }, [params]);

  // Helper function to determine if resend welcome email is allowed
  const canResendWelcomeEmail = (status?: string): boolean => {
    return status === 'FORCE_CHANGE_PASSWORD' || status === 'RESET_REQUIRED';
  };

  // Helper function to get user-friendly status display
  const getUserStatusDisplay = (status?: string): { text: string; color: string } => {
    switch (status) {
      case 'FORCE_CHANGE_PASSWORD':
        return { text: 'Temporary Password', color: 'yellow' };
      case 'CONFIRMED':
        return { text: 'Active', color: 'green' };
      case 'RESET_REQUIRED':
        return { text: 'Reset Required', color: 'red' };
      default:
        return { text: status || 'Unknown', color: 'gray' };
    }
  };

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/gallery');
    }
  }, [isAdmin, authLoading, router]);

  const loadCustomer = async () => {
    if (!customerId) return; // Wait for customerId to be set

    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getCustomer(customerId);
      setCustomer(data);
      setFormData({
        name: data.name,
        phone_number: data.phone_number || '',
        enabled: data.enabled,
      });
    } catch (err) {
      console.error('Error loading customer:', err);
      setError(err instanceof Error ? err.message : 'Failed to load customer');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin && customerId) {
      loadCustomer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, customerId]);

  const handleSave = async () => {
    if (!customer) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const payload: UpdateCustomerRequest = {
        name: formData.name,
        phone_number: formData.phone_number || undefined,
        enabled: formData.enabled,
      };

      const updated = await api.updateCustomer(customer.customer_id, payload);
      setCustomer(updated);
      setIsEditing(false);
      setSuccessMessage('Customer updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update customer');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (customer) {
      setFormData({
        name: customer.name,
        phone_number: customer.phone_number || '',
        enabled: customer.enabled,
      });
    }
    setIsEditing(false);
    setError(null);
  };

  const handleResendWelcomeEmail = async () => {
    if (!customer) return;

    // Check if resend is allowed based on user_status
    // Per API spec: Only allow resend for FORCE_CHANGE_PASSWORD or RESET_REQUIRED
    if (!canResendWelcomeEmail(customer.user_status)) {
      if (customer.user_status === 'CONFIRMED') {
        alert('Customer has already set their own password.\n\nThey should use the "Forgot Password" feature on the login page if they need to reset it.');
      } else {
        alert(`Cannot resend welcome email for customers with status: ${customer.user_status || 'unknown'}\n\nPlease contact support if you need assistance.`);
      }
      return;
    }

    if (!confirm(`Resend welcome email to ${customer.email}?\n\nThis will generate a new temporary password and send it to the customer.`)) {
      return;
    }

    setIsResendingEmail(true);
    setError(null);
    setSuccessMessage(null);
    setResendSuccess(false);

    try {
      const result = await api.resendWelcomeEmail(customer.customer_id);
      setNewTemporaryPassword(result.temporary_password);
      setResendSuccess(true);
      setSuccessMessage(result.message);

      // Reload customer data to get updated status
      await loadCustomer();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resend welcome email';

      // Check if it's the "already set password" error
      if (errorMessage.includes('already set their own password') ||
          errorMessage.includes('already set their password')) {
        setError('Cannot resend welcome email. Customer has already set their own password. They should use the "Forgot Password" feature on the login page instead.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsResendingEmail(false);
    }
  };

  const handleClosePasswordModal = () => {
    setResendSuccess(false);
    setNewTemporaryPassword(null);
  };

  if (authLoading || !isAdmin) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading customer...</p>
        </div>
      </div>
    );
  }

  if (error && !customer) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-4">
          <Link
            href="/customers"
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm"
          >
            ← Back to Customers
          </Link>
        </div>
        <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <Link
          href="/customers"
          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm mb-4 inline-block"
        >
          ← Back to Customers
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Customer Details
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              View and manage customer information
            </p>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors"
            >
              Edit Customer
            </button>
          )}
        </div>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
          <p className="text-green-800 dark:text-green-200">{successMessage}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
        {isEditing ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="+12345678900"
              />
            </div>

            <div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Account Enabled
                </span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-7">
                Disabled accounts cannot log in
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-md font-medium transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Customer ID
                </label>
                <p className="text-gray-900 dark:text-white font-mono text-sm">
                  {customer.customer_id}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Account Status
                </label>
                <span
                  className={`inline-block px-3 py-1 text-sm font-medium rounded ${
                    customer.enabled
                      ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200'
                      : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200'
                  }`}
                >
                  {customer.enabled ? 'Active' : 'Disabled'}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  User Status
                </label>
                {customer.user_status ? (
                  <span
                    className={`inline-block px-3 py-1 text-sm font-medium rounded ${
                      getUserStatusDisplay(customer.user_status).color === 'green'
                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200'
                        : getUserStatusDisplay(customer.user_status).color === 'yellow'
                        ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200'
                        : getUserStatusDisplay(customer.user_status).color === 'red'
                        ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200'
                        : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {getUserStatusDisplay(customer.user_status).text}
                  </span>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400 text-sm">Not available</span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Full Name
                </label>
                <p className="text-gray-900 dark:text-white">{customer.name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Email Address
                </label>
                <p className="text-gray-900 dark:text-white">{customer.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Phone Number
                </label>
                <p className="text-gray-900 dark:text-white">
                  {customer.phone_number || 'Not provided'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Created Date
                </label>
                <p className="text-gray-900 dark:text-white">
                  {new Date(customer.created_date).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                S3 Folder Path
              </label>
              <p className="text-gray-900 dark:text-white font-mono text-sm bg-gray-50 dark:bg-gray-900 p-3 rounded">
                {customer.customer_folder}
              </p>
            </div>

            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href={`/gallery?customer=${customer.customer_id}`}
                  className="inline-block px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium transition-colors text-center"
                >
                  View Customer Files →
                </Link>
                <button
                  onClick={handleResendWelcomeEmail}
                  disabled={isResendingEmail || !canResendWelcomeEmail(customer.user_status)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    canResendWelcomeEmail(customer.user_status)
                      ? 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  }`}
                  title={
                    customer.user_status === 'CONFIRMED'
                      ? 'Customer has already set their password'
                      : !canResendWelcomeEmail(customer.user_status)
                      ? `Cannot resend for status: ${customer.user_status || 'unknown'}`
                      : undefined
                  }
                >
                  {isResendingEmail ? 'Sending...' : '📧 Resend Welcome Email'}
                </button>
              </div>
              {customer.user_status === 'CONFIRMED' ? (
                <div className="mt-2 flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400">✓</span>
                  <div className="text-xs">
                    <p className="text-green-600 dark:text-green-400 font-medium mb-1">
                      Customer has already set their password and can log in normally
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      If they forgot their password, they should use the &quot;Forgot Password&quot; link on the login page
                    </p>
                  </div>
                </div>
              ) : canResendWelcomeEmail(customer.user_status) ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Resends welcome email with a new temporary password. Only works if customer hasn&apos;t set their own password yet.
                  <br />
                  Use this if the customer didn&apos;t receive the original email or if the temporary password expired (7 days)
                </p>
              ) : (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  Resend welcome email is not available for this customer&apos;s current status: {customer.user_status || 'unknown'}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Password Modal */}
      {resendSuccess && newTemporaryPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="text-green-600 dark:text-green-400 text-5xl mb-4">✓</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome Email Sent!
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                A new welcome email has been sent to {customer.email}
              </p>
            </div>

            {/* Generated Password Section */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-2 mb-3">
                <div className="text-yellow-600 dark:text-yellow-400 text-xl">⚠️</div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-1">
                    New Temporary Password
                  </h4>
                  <p className="text-xs text-gray-700 dark:text-gray-300">
                    This password has been emailed to the customer. You can also provide it directly if needed.
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded p-3 mb-3">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Password:
                </label>
                <code className="block text-base font-mono bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white break-all">
                  {newTemporaryPassword}
                </code>
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(newTemporaryPassword);
                  alert('Password copied to clipboard!');
                }}
                className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors text-sm"
              >
                📋 Copy Password
              </button>
            </div>

            <button
              onClick={handleClosePasswordModal}
              className="w-full px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

