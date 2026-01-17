'use client';

import { useState } from 'react';
import { api, type CreateCustomerRequest } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewCustomerPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState<CreateCustomerRequest>({
    email: '',
    name: '',
    temporary_password: '',
    phone_number: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneHelp, setPhoneHelp] = useState<string | null>(null);

  if (!authLoading && !isAdmin) {
    router.push('/gallery');
    return null;
  }

  // E.164 phone number validation and helper
  const validatePhoneNumber = (phone: string): { isValid: boolean; error?: string; suggestion?: string } => {
    if (!phone || phone.trim() === '') {
      return { isValid: true }; // Optional field
    }

    const trimmed = phone.trim();

    // E.164 format: +[country code 1-3 digits][subscriber number 4-14 digits]
    // Total length: 8-15 characters (including +)
    const e164Regex = /^\+[1-9]\d{1,14}$/;

    if (e164Regex.test(trimmed)) {
      return { isValid: true };
    }

    // Provide helpful suggestions
    if (!trimmed.startsWith('+')) {
      // Try to guess country code
      if (/^\d{10}$/.test(trimmed)) {
        return {
          isValid: false,
          error: 'Phone number must include country code',
          suggestion: `+1${trimmed}`
        };
      }
      return {
        isValid: false,
        error: 'Phone number must start with + and country code (e.g., +1 for US)',
        suggestion: trimmed.startsWith('1') ? `+${trimmed}` : `+1${trimmed}`
      };
    }

    if (trimmed.length < 8) {
      return {
        isValid: false,
        error: 'Phone number is too short (minimum 8 digits including country code)'
      };
    }

    if (trimmed.length > 15) {
      return {
        isValid: false,
        error: 'Phone number is too long (maximum 15 digits including country code)'
      };
    }

    if (!/^\+[0-9]+$/.test(trimmed)) {
      return {
        isValid: false,
        error: 'Phone number can only contain + and digits (no spaces, dashes, or parentheses)'
      };
    }

    if (/^\+0/.test(trimmed)) {
      return {
        isValid: false,
        error: 'Country code cannot start with 0'
      };
    }

    return {
      isValid: false,
      error: 'Invalid phone number format. Use E.164 format: +[country code][number]'
    };
  };

  const handlePhoneChange = (value: string) => {
    setFormData({ ...formData, phone_number: value });

    if (!value || value.trim() === '') {
      setPhoneError(null);
      setPhoneHelp(null);
      return;
    }

    const validation = validatePhoneNumber(value);
    if (!validation.isValid) {
      setPhoneError(validation.error || null);
      setPhoneHelp(validation.suggestion ? `Try: ${validation.suggestion}` : null);
    } else {
      setPhoneError(null);
      setPhoneHelp('✓ Valid E.164 format');
    }
  };

  const applySuggestion = () => {
    const validation = validatePhoneNumber(formData.phone_number || '');
    if (validation.suggestion) {
      setFormData({ ...formData, phone_number: validation.suggestion });
      setPhoneError(null);
      setPhoneHelp('✓ Valid E.164 format');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validate phone number before submission
    if (formData.phone_number && formData.phone_number.trim() !== '') {
      const validation = validatePhoneNumber(formData.phone_number);
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
        temporary_password: formData.temporary_password,
      };

      // Only add phone_number if it has a value
      if (formData.phone_number && formData.phone_number.trim() !== '') {
        payload.phone_number = formData.phone_number.trim();
      }

      console.log('Creating customer with payload:', { ...payload, temporary_password: '***' });
      const customer = await api.createCustomer(payload);
      setSuccess(true);

      // Redirect to customer detail page after 2 seconds
      setTimeout(() => {
        router.push(`/customers/${customer.customer_id}`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create customer');
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
          <div className="text-green-600 dark:text-green-400 text-5xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-green-900 dark:text-green-100 mb-2">
            Customer Created Successfully!
          </h2>
          <p className="text-green-700 dark:text-green-300">
            Redirecting to customer details...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
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
          <input
            type="tel"
            id="phone_number"
            value={formData.phone_number}
            onChange={(e) => handlePhoneChange(e.target.value)}
            className={`w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
              phoneError 
                ? 'border-red-500 dark:border-red-500' 
                : phoneHelp && phoneHelp.startsWith('✓')
                ? 'border-green-500 dark:border-green-500'
                : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="+12345678900"
          />

          {/* Error message */}
          {phoneError && (
            <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm">
              <p className="text-red-700 dark:text-red-300">{phoneError}</p>
              {phoneHelp && (
                <div className="mt-2 flex items-center gap-2">
                  <p className="text-red-600 dark:text-red-400 font-medium">{phoneHelp}</p>
                  <button
                    type="button"
                    onClick={applySuggestion}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                  >
                    Use This
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Success message */}
          {!phoneError && phoneHelp && phoneHelp.startsWith('✓') && (
            <p className="mt-1 text-sm text-green-600 dark:text-green-400">{phoneHelp}</p>
          )}

          {/* Help text */}
          {!phoneError && !phoneHelp && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              E.164 format: +[country code][number] (e.g., +12345678900 for US)
            </p>
          )}
        </div>

        <div>
          <label htmlFor="temporary_password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Temporary Password *
          </label>
          <input
            type="password"
            id="temporary_password"
            required
            value={formData.temporary_password}
            onChange={(e) => setFormData({ ...formData, temporary_password: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="TempPass123!"
            minLength={8}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Must be at least 8 characters with uppercase, lowercase, number, and special character
          </p>
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

