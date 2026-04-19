'use client';

import { useState, useEffect } from 'react';
import { api, type CreateProjectRequest, type CustomerProfile } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewProjectPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState<CreateProjectRequest>({
    name: '',
    description: '',
    shoot_start_date: '',
    shoot_end_date: '',
    status: 'draft',
    customer_ids: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/gallery');
    }
  }, [isAdmin, authLoading, router]);

  useEffect(() => {
    if (isAdmin) {
      setIsLoadingCustomers(true);
      api.listCustomers()
        .then((res) => setCustomers(res.customers))
        .catch(() => {})
        .finally(() => setIsLoadingCustomers(false));
    }
  }, [isAdmin]);

  if (authLoading || !isAdmin) {
    return null;
  }

  const toggleCustomer = (id: string) => {
    setFormData((prev) => {
      const ids = prev.customer_ids ?? [];
      return {
        ...prev,
        customer_ids: ids.includes(id) ? ids.filter((c) => c !== id) : [...ids, id],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const project = await api.createProject(formData);
      router.push(`/projects/${project.project_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <Link
          href="/projects"
          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm mb-4 inline-block"
        >
          ← Back to Projects
        </Link>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Create New Project
        </h2>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Project Name *
          </label>
          <input
            type="text"
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Summer Wedding 2025"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            id="description"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Optional project description..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="shoot_start_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Shoot Start Date *
            </label>
            <input
              type="date"
              id="shoot_start_date"
              required
              value={formData.shoot_start_date}
              onChange={(e) => setFormData({ ...formData, shoot_start_date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="shoot_end_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Shoot End Date *
            </label>
            <input
              type="date"
              id="shoot_end_date"
              required
              value={formData.shoot_end_date}
              onChange={(e) => setFormData({ ...formData, shoot_end_date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Status
          </label>
          <select
            id="status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="draft">Draft</option>
            <option value="in_progress">In Progress</option>
            <option value="delivered">Delivered</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Assign Customers
          </label>
          {isLoadingCustomers ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading customers...</p>
          ) : customers.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No customers available.</p>
          ) : (
            <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md divide-y divide-gray-200 dark:divide-gray-700">
              {customers.map((customer) => (
                <label key={customer.customer_id} className="flex items-center px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(formData.customer_ids ?? []).includes(customer.customer_id)}
                    onChange={() => toggleCustomer(customer.customer_id)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="ml-3 text-sm text-gray-900 dark:text-white">
                    {customer.name}
                    <span className="text-gray-500 dark:text-gray-400 ml-1">({customer.email})</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-md font-medium transition-colors"
          >
            {isSubmitting ? 'Creating...' : 'Create Project'}
          </button>
          <Link
            href="/projects"
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md font-medium transition-colors text-center"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
