'use client';

import { useState } from 'react';
import { api, type CreateCustomerRequest } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatPhoneWithCountry, formatPhoneForDisplay, validateE164, COUNTRY_CODES } from '@/lib/phoneValidation';
import Toast, { type ToastType } from '@/components/Toast';

export default function NewCustomerPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState<CreateCustomerRequest>({
    email: '',
    name: '',
    phone_number: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneHelp, setPhoneHelp] = useState<string | null>(null);
  const [phoneCountry, setPhoneCountry] = useState<string>('US');
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState<string>('');
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [showPasswordBox, setShowPasswordBox] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  if (!authLoading && !isAdmin) {
    router.push('/gallery');
    return null;
  }

  const handleCopyPassword = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
      setToast({
        message: 'Password copied to clipboard!',
        type: 'success'
      });
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validate phone number before submission
    if (formData.phone_number && formData.phone_number.trim() !== '') {
      const validation = validateE164(formData.phone_number);
      if (!validation.isValid) {
        setError(validation.error || 'Invalid phone number format');
        setIsSubmitting(false);
        return;
      }
    }

    try {
      // Prepare payload - remove phone_number if empty
      const payload: CreateCustomerRequest = {
        email: formData.email,
        name: formData.name,
      };

      // Only add phone_number if it has a value
      if (formData.phone_number && formData.phone_number.trim() !== '') {
        payload.phone_number = formData.phone_number.trim();
      }

      console.log('Creating customer with payload:', payload);
      const customer = await api.createCustomer(payload);
      console.log('✅ Customer created successfully:', customer);

      // Save the auto-generated password from response
      setGeneratedPassword(customer.temporary_password || null);
      setShowPasswordBox(!!customer.temporary_password);

      // Show success toast
      setToast({
        message: `Customer ${customer.name} created successfully!`,
        type: 'success'
      });

      // Log if password is missing
      if (!customer.temporary_password) {
        console.warn('⚠️ No temporary_password in response');
      }

      // Navigate to customer details page after a brief delay
      setTimeout(() => {
        router.push(`/customers/${customer.customer_id}`);
      }, 2000);
    } catch (err) {
      console.error('❌ Error creating customer:', err);
      setError(err instanceof Error ? err.message : 'Failed to create customer');
      setToast({
        message: err instanceof Error ? err.message : 'Failed to create customer',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="mb-8">
        <Link
          href="/customers"
          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm mb-4 inline-block"
        >
          ← Back to Customers
        </Link>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Create New Customer
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Add a new customer account. They will receive their temporary password and must change it on first login.
        </p>
      </div>

      {/* Temporary Password Display Box (shown after creation) */}
      {showPasswordBox && generatedPassword && (
        <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="text-yellow-600 dark:text-yellow-400 text-2xl">⚠️</div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                Temporary Password Generated
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                This password is shown only once. Copy it now before navigating away.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              Temporary Password:
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-base font-mono bg-gray-100 dark:bg-gray-900 px-4 py-3 rounded border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                {generatedPassword}
              </code>
              <button
                onClick={handleCopyPassword}
                className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email Address *
          </label>
          <input
            type="email"
            id="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="customer@example.com"
          />
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Full Name *
          </label>
          <input
            type="text"
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
              id="phone_number"
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

        {/* Info box about auto-generated password */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-blue-600 dark:text-blue-400 text-xl">ℹ️</div>
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Secure Password Auto-Generation
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                A secure 16-character temporary password will be automatically generated for this customer.
                You&apos;ll receive it after creation and can provide it to the customer securely.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-md font-medium transition-colors"
          >
            {isSubmitting ? 'Creating...' : 'Create Customer'}
          </button>
          <Link
            href="/customers"
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md font-medium transition-colors text-center"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
