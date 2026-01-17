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
    phone_number: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneHelp, setPhoneHelp] = useState<string | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [createdCustomerId, setCreatedCustomerId] = useState<string | null>(null);

  if (!authLoading && !isAdmin) {
    router.push('/gallery');
    return null;
  }

  // Auto-format phone number to E.164 format
  const formatToE164 = (phone: string): string => {
    if (!phone) return '';

    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');

    // If already starts with +, validate and return
    if (cleaned.startsWith('+')) {
      return cleaned;
    }

    // Extract only digits
    const digitsOnly = cleaned.replace(/\+/g, '');

    // US/Canada formats (10 or 11 digits)
    if (digitsOnly.length === 10) {
      // (555) 123-4567 or 555-123-4567 → +15551234567
      return `+1${digitsOnly}`;
    }

    if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
      // 1-555-123-4567 → +15551234567
      return `+${digitsOnly}`;
    }

    // If it looks like it might have a country code already
    if (digitsOnly.length > 10 && digitsOnly.length <= 15) {
      // Assume first 1-3 digits are country code
      return `+${digitsOnly}`;
    }

    // Default: assume US/Canada for 10 digit numbers
    if (digitsOnly.length === 10) {
      return `+1${digitsOnly}`;
    }

    // Return with + prefix if it has any digits
    return digitsOnly ? `+${digitsOnly}` : cleaned;
  };

  const validateE164 = (phone: string): { isValid: boolean; error?: string } => {
    if (!phone || phone.trim() === '') {
      return { isValid: true }; // Optional field
    }

    const trimmed = phone.trim();

    // E.164 format: +[country code 1-3 digits][subscriber number]
    // Total length: 8-15 characters (including +)
    const e164Regex = /^\+[1-9]\d{1,14}$/;

    if (e164Regex.test(trimmed)) {
      return { isValid: true };
    }

    if (!trimmed.startsWith('+')) {
      return {
        isValid: false,
        error: 'Phone number must start with +'
      };
    }

    if (trimmed.length < 8) {
      return {
        isValid: false,
        error: 'Phone number is too short'
      };
    }

    if (trimmed.length > 15) {
      return {
        isValid: false,
        error: 'Phone number is too long'
      };
    }

    if (!/^\+[0-9]+$/.test(trimmed)) {
      return {
        isValid: false,
        error: 'Phone number can only contain + and digits'
      };
    }

    return {
      isValid: false,
      error: 'Invalid phone number format'
    };
  };

  const handlePhoneChange = (value: string) => {
    // Auto-format as user types
    const formatted = formatToE164(value);
    setFormData({ ...formData, phone_number: formatted });

    if (!formatted || formatted.trim() === '') {
      setPhoneError(null);
      setPhoneHelp(null);
      return;
    }

    const validation = validateE164(formatted);
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
      setCreatedCustomerId(customer.customer_id);
      setSuccess(true);
      setIsSubmitting(false);

      // Log if password is missing
      if (!customer.temporary_password) {
        console.warn('⚠️ No temporary_password in response');
      }

      // Don't auto-redirect - let admin copy the password first
    } catch (err) {
      console.error('❌ Error creating customer:', err);
      setError(err instanceof Error ? err.message : 'Failed to create customer');
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <div className="text-green-600 dark:text-green-400 text-5xl mb-4 text-center">✓</div>
          <h2 className="text-2xl font-bold text-green-900 dark:text-green-100 mb-4 text-center">
            Customer Created Successfully!
          </h2>

          {generatedPassword ? (
            <>
              {/* Generated Password Section */}
              <div className="bg-white dark:bg-gray-800 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg p-6 mb-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="text-yellow-600 dark:text-yellow-400 text-2xl">⚠️</div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                      Important: Temporary Password
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                      This password is shown only once. Please copy it and provide it to the customer securely.
                      The customer must change this password on first login.
                    </p>
                  </div>
                </div>

                <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 mb-4">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Temporary Password:
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-lg font-mono bg-white dark:bg-gray-800 px-4 py-3 rounded border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                      {generatedPassword}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedPassword);
                        alert('Password copied to clipboard!');
                      }}
                      className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
              <div className="flex items-start gap-3">
                <div className="text-blue-600 dark:text-blue-400 text-2xl">ℹ️</div>
                <div>
                  <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-2">
                    Welcome Email Sent
                  </h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    A welcome email with the temporary password has been sent to the customer.
                    If they don&apos;t receive it, you can resend it from the customer details page.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href={`/customers/${createdCustomerId}`}
              className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors text-center"
            >
              View Customer Details
            </Link>
            <Link
              href="/customers/new"
              onClick={() => {
                setSuccess(false);
                setGeneratedPassword(null);
                setCreatedCustomerId(null);
                setFormData({ email: '', name: '', phone_number: '' });
              }}
              className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors text-center"
            >
              Create Another Customer
            </Link>
            <Link
              href="/customers"
              className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors text-center"
            >
              Back to Customers
            </Link>
          </div>
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
            placeholder="(555) 123-4567 or +12345678900"
          />

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
              Enter any format - we&apos;ll automatically format it (e.g., (555) 123-4567 becomes +15551234567)
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

