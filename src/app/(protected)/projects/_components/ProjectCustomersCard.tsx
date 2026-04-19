'use client';

import { useState } from 'react';
import type { CustomerProfile, Project } from '@/lib/api';

interface ProjectCustomersCardProps {
  project: Project;
  allCustomers: CustomerProfile[];
  customerMap: Record<string, CustomerProfile>;
  onAssign: (customerIds: string[]) => Promise<void>;
  onRemove: (customerId: string) => Promise<void>;
}

export default function ProjectCustomersCard({
  project,
  allCustomers,
  customerMap,
  onAssign,
  onRemove,
}: ProjectCustomersCardProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const assigned = project.customer_ids ?? [];
  const unassigned = allCustomers.filter((c) => !assigned.includes(c.customer_id));

  const handleAdd = async () => {
    if (selected.length === 0) return;
    setIsAdding(true);
    setError(null);
    try {
      await onAssign(selected);
      setSelected([]);
      setShowAdd(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add customers');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    setError(null);
    try {
      await onRemove(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove customer');
    } finally {
      setRemovingId(null);
    }
  };

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Assigned Customers</h3>
        <button
          onClick={() => {
            setShowAdd(!showAdd);
            setSelected([]);
          }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors"
        >
          {showAdd ? 'Cancel' : 'Add Customers'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
        </div>
      )}

      {assigned.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No customers assigned yet.</p>
      ) : (
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {assigned.map((cid) => {
            const customer = customerMap[cid];
            return (
              <li key={cid} className="flex justify-between items-center py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {customer?.name ?? cid}
                  </p>
                  {customer && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{customer.email}</p>
                  )}
                </div>
                <button
                  onClick={() => handleRemove(cid)}
                  disabled={removingId === cid}
                  className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50 font-medium ml-4"
                >
                  {removingId === cid ? 'Removing...' : 'Remove'}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {showAdd && (
        <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-md p-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Select customers to add:
          </h4>
          {unassigned.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">All customers are already assigned.</p>
          ) : (
            <>
              <div className="max-h-48 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700 mb-3">
                {unassigned.map((customer) => (
                  <label
                    key={customer.customer_id}
                    className="flex items-center px-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(customer.customer_id)}
                      onChange={() => toggle(customer.customer_id)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <span className="ml-3 text-sm text-gray-900 dark:text-white">
                      {customer.name}
                      <span className="text-gray-500 dark:text-gray-400 ml-1">({customer.email})</span>
                    </span>
                  </label>
                ))}
              </div>
              <button
                onClick={handleAdd}
                disabled={isAdding || selected.length === 0}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-md text-sm font-medium transition-colors"
              >
                {isAdding ? 'Adding...' : `Add Selected (${selected.length})`}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
