'use client';

import { useState, useEffect } from 'react';
import { api, type CustomerProfile, type UpdateCustomerRequest } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatPhoneWithCountry, formatPhoneForDisplay, validateE164, COUNTRY_CODES } from '@/lib/phoneValidation';
import Toast, { type ToastType } from '@/components/Toast';

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<UpdateCustomerRequest>( {
    name: '',
    phone_number: '',
    enabled: true,
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string>('');
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [newTemporaryPassword, setNewTemporaryPassword] = useState<string | null>(null);
  const [showPasswordBox, setShowPasswordBox] = useState(false);

  // Phone validation state
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneHelp, setPhoneHelp] = useState<string | null>(null);
  const [phoneCountry, setPhoneCountry] = useState<string>('US');
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState<string>('');

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  // Unwrap params Promise (Next.js 15+)
  useEffect(() => {
    params.then(p => setCustomerId(p.id));
  }, [params]);

  // Helper function to determine if resend welcome email is allowed
  const canResendWelcomeEmail = (status?: string): boolean => {
    console.log('🔍 canResendWelcomeEmail called with status:', status);

    // If status is undefined/missing, assume it's a new customer (FORCE_CHANGE_PASSWORD)
    // This handles cases where the backend doesn't return user_status immediately after creation
    if (status === undefined) {
      console.log('✅ Status is undefined, allowing resend (new customer)');
      return true; // Allow resend for new customers
    }

    const canResend = status === 'FORCE_CHANGE_PASSWORD' || status === 'RESET_REQUIRED';
    console.log(`${canResend ? '✅' : '❌'} Can resend:`, canResend);
    return canResend;
  };

  // Helper function to get user-friendly status display
  const getUserStatusDisplay = (status?: string): { text: string; color: string } => {
    // Log the actual status for debugging
    if (customer) {
      console.log('🔍 getUserStatusDisplay called with status:', status, 'Type:', typeof status);
    }

    switch (status) {
      case 'FORCE_CHANGE_PASSWORD':
        return { text: 'Temporary Password', color: 'yellow' };
      case 'CONFIRMED':
        return { text: 'Active', color: 'green' };
      case 'RESET_REQUIRED':
        return { text: 'Reset Required', color: 'red' };
      case undefined:
        // Only treat truly undefined status as new customer
        // Don't treat empty string or other values as new customer
        return { text: 'Temporary Password', color: 'yellow' };
      case '':
        // Empty string should be treated as unknown, not new customer
        console.warn('⚠️ Received empty string for user_status');
        return { text: 'Unknown', color: 'gray' };
      default:
        console.warn('⚠️ Unknown user_status:', status);
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
      console.log('📦 Customer data received:', data);
      console.log('👤 user_status:', data.user_status, 'Type:', typeof data.user_status);
      setCustomer(data);
      setFormData({
        name: data.name,
        phone_number: data.phone_number || '',
        enabled: data.enabled,
      });

      // Set display phone number
      if (data.phone_number) {
        setDisplayPhoneNumber(formatPhoneForDisplay(data.phone_number, phoneCountry));
      }
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

  const handlePhoneChange = (value: string) => {
    // Store E.164 format
    const e164Formatted = formatPhoneWithCountry(value, phoneCountry);
    setFormData({ ...formData, phone_number: e164Formatted });

    // Format for display
    const displayFormatted = formatPhoneForDisplay(e164Formatted, phoneCountry);
    setDisplayPhoneNumber(displayFormatted);

    if (!e164Formatted || e164Formatted.trim() === '') {
      setPhoneError(null);
      setPhoneHelp(null);
      return;
    }

    const validation = validateE164(e164Formatted);
    if (!validation.isValid) {
      setPhoneError(validation.error || null);
      setPhoneHelp(null);
    } else {
      setPhoneError(null);
      setPhoneHelp('✓ Valid');
    }
  };

  const handleSave = async () => {
    if (!customer) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    // Validate phone number before submission
    if (formData.phone_number && formData.phone_number.trim() !== '') {
      const validation = validateE164(formData.phone_number);
      if (!validation.isValid) {
        setError(validation.error || 'Invalid phone number format');
        setIsSaving(false);
        return;
      }
    }

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
    if (!canResendWelcomeEmail(customer.user_status)) {
      if (customer.user_status === 'CONFIRMED') {
        setToast({
          message: 'Customer has already set their own password. They should use the "Forgot Password" feature on the login page.',
          type: 'warning'
        });
      } else {
        setToast({
          message: `Cannot resend welcome email for customers with status: ${customer.user_status || 'unknown'}`,
          type: 'warning'
        });
      }
      return;
    }

    setIsResendingEmail(true);
    setError(null);
    setSuccessMessage(null);
    setNewTemporaryPassword(null);

    try {
      const result = await api.resendWelcomeEmail(customer.customer_id);
      setNewTemporaryPassword(result.temporary_password);
      setShowPasswordBox(true);

      // Show toast notification
      setToast({ message: 'Welcome email resent successfully!', type: 'success' });

      // Reload customer data to get updated status
      await loadCustomer();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resend welcome email';

      if (errorMessage.includes('already set their own password') ||
          errorMessage.includes('already set their password')) {
        setToast({
          message: 'Cannot resend welcome email. Customer has already set their password.',
          type: 'error'
        });
      } else {
        setToast({
          message: errorMessage,
          type: 'error'
        });
      }
    } finally {
      setIsResendingEmail(false);
    }
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

      {/* Temporary Password Display Box (shown after resend) */}
      {showPasswordBox && newTemporaryPassword && (
        <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="text-yellow-600 dark:text-yellow-400 text-2xl">⚠️</div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                New Temporary Password Generated
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                A new welcome email has been sent to {customer.email}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                The password below has been emailed to the customer. You can also provide it directly if needed.
              </p>
            </div>
            <button
              onClick={() => {
                setShowPasswordBox(false);
                setNewTemporaryPassword(null);
              }}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              Temporary Password:
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-base font-mono bg-gray-100 dark:bg-gray-900 px-4 py-3 rounded border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white break-all">
                {newTemporaryPassword}
              </code>
              <button
                onClick={() => {
                  if (newTemporaryPassword) {
                    navigator.clipboard.writeText(newTemporaryPassword);
                    setToast({ message: 'Password copied to clipboard!', type: 'success' });
                  }
                }}
                className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
              >
                Copy
              </button>
            </div>
          </div>
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
                Phone Number (Optional)
              </label>
              <div className="flex gap-2">
                {/* Country dropdown */}
                <select
                  value={phoneCountry}
                  onChange={(e) => {
                    const newCountry = e.target.value;
                    setPhoneCountry(newCountry);
                    // Re-format phone with new country code
                    if (formData.phone_number) {
                      const formatted = formatPhoneWithCountry(formData.phone_number.replace(/^\+\d+/, ''), newCountry);
                      setFormData({ ...formData, phone_number: formatted });
                      setDisplayPhoneNumber(formatPhoneForDisplay(formatted, newCountry));
                    }
                  }}
                  className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                >
                  {Object.entries(COUNTRY_CODES).map(([code, country]) => (
                    <option key={code} value={code}>
                      {code} +{country.code}
                    </option>
                  ))}
                </select>

                {/* Phone input */}
                <input
                  type="tel"
                  value={displayPhoneNumber}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className={`flex-1 px-4 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                    phoneError 
                      ? 'border-red-500 dark:border-red-500' 
                      : phoneHelp && phoneHelp.startsWith('✓')
                      ? 'border-green-500 dark:border-green-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder={phoneCountry === 'US' ? '(555) 123-4567' : 'Phone number'}
                />
              </div>

              {/* Error message */}
              {phoneError && (
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">{phoneError}</p>
              )}

              {/* Success message */}
              {!phoneError && phoneHelp && phoneHelp.startsWith('✓') && (
                <p className="mt-1 text-sm text-green-600 dark:text-green-400">{phoneHelp}</p>
              )}

              {/* Help text */}
              {!phoneError && !phoneHelp && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Select your country and enter your phone number. We&apos;ll format it automatically.
                </p>
              )}
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
                  Resends welcome email with a new temporary password. Only works if the customer hasn&apos;t set their own password yet.
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

      {/* Toast Notification */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}

