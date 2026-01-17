'use client';

import { useState, useEffect } from 'react';
import { api, type CustomerProfile } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CustomersPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Helper function to get user-friendly status display
  const getUserStatusDisplay = (status?: string): { text: string; color: string } => {
    switch (status) {
      case 'FORCE_CHANGE_PASSWORD':
        return { text: 'Needs Setup', color: 'yellow' };
      case 'CONFIRMED':
        return { text: 'Setup Complete', color: 'green' };
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

  const loadCustomers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.listCustomers();
      console.log('📦 Customers loaded in page:', response.customers.length);
      console.log('📋 First customer:', response.customers[0]);

      // Verify all customers have customer_id
      const invalidCustomers = response.customers.filter(c => !c.customer_id);
      if (invalidCustomers.length > 0) {
        console.error('⚠️ Found customers without customer_id:', invalidCustomers);
      }

      setCustomers(response.customers);
    } catch (err) {
      console.error('Error loading customers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load customers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadCustomers();
    }
  }, [isAdmin]);

  const filteredCustomers = customers
    .filter(customer => customer.customer_id) // Only include customers with valid IDs
    .filter(customer =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.customer_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

  if (authLoading || !isAdmin) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Customer Management
          </h2>
          <Link
            href="/customers/new"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors text-center whitespace-nowrap"
          >
            Add New Customer
          </Link>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by name, email, or customer ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Customer Count */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Showing {filteredCustomers.length} of {customers.length} customers
        </p>
      </div>

      {/* Customers List */}
      {filteredCustomers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm ? 'No customers match your search.' : 'No customers yet. Add your first customer to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCustomers.map((customer) => {
            // Debug logging
            if (!customer.customer_id) {
              console.error('🚨 Rendering customer without ID:', customer);
            }

            return (
              <Link
                key={customer.customer_id}
                href={`/customers/${customer.customer_id}`}
                className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {customer.name}
                  </h3>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      customer.enabled
                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200'
                        : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200'
                    }`}
                  >
                    {customer.enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  {customer.email}
                </p>
                {customer.phone_number && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {customer.phone_number}
                  </p>
                )}
                {customer.user_status && (
                  <div className="mb-2">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                        getUserStatusDisplay(customer.user_status).color === 'green'
                          ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                          : getUserStatusDisplay(customer.user_status).color === 'yellow'
                          ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800'
                          : getUserStatusDisplay(customer.user_status).color === 'red'
                          ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                          : 'bg-gray-50 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800'
                      }`}
                    >
                      {getUserStatusDisplay(customer.user_status).text}
                    </span>
                  </div>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">
                  ID: {customer.customer_id}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Created: {new Date(customer.created_date).toLocaleDateString()}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

