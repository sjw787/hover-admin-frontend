'use client';

import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { api, type CustomerProfile } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function UploadPage() {
  const { isAdmin, isCustomer, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Admin-only features
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [uploadTarget, setUploadTarget] = useState<'general' | 'customer'>('general');
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);

  // Redirect customers away from upload page
  useEffect(() => {
    if (!authLoading && isCustomer) {
      router.push('/gallery');
    }
  }, [isCustomer, authLoading, router]);

  // Load customers for admin
  useEffect(() => {
    if (isAdmin) {
      loadCustomers();
    }
  }, [isAdmin]);

  const loadCustomers = async () => {
    setIsLoadingCustomers(true);
    try {
      const response = await api.listCustomers();
      setCustomers(response.customers);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setMessage(null);

    if (!file) {
      return;
    }

    // Validate file type
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setMessage({
        type: 'error',
        text: 'Invalid file type. Please select a JPG, PNG, GIF, or WebP image.',
      });
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setMessage({
        type: 'error',
        text: 'File is too large. Maximum size is 10MB.',
      });
      return;
    }

    setSelectedFile(file);

    // Generate preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      return;
    }

    // Validate customer selection if uploading to customer folder
    if (uploadTarget === 'customer' && !selectedCustomerId) {
      setMessage({
        type: 'error',
        text: 'Please select a customer to upload to.',
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setMessage(null);

    // Simulate progress (since we can't track actual upload progress with fetch easily)
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 10, 90));
    }, 200);

    try {
      const customerId = uploadTarget === 'customer' ? selectedCustomerId : undefined;
      await api.uploadImage(selectedFile, customerId);
      setUploadProgress(100);

      const targetFolder = uploadTarget === 'customer'
        ? `customer folder (${customers.find(c => c.customer_id === selectedCustomerId)?.name})`
        : 'general folder';

      setMessage({
        type: 'success',
        text: `Image uploaded successfully to ${targetFolder}!`,
      });

      // Reset form after successful upload
      setTimeout(() => {
        setSelectedFile(null);
        setPreview(null);
        setUploadProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 2000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Upload failed. Please try again.',
      });
    } finally {
      clearInterval(progressInterval);
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreview(null);
    setMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Don't render for customers
  if (authLoading || isCustomer) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Upload Image
        </h2>

        {/* Admin: Upload Target Selection */}
        {isAdmin && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Upload Destination
            </label>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="uploadTarget"
                  value="general"
                  checked={uploadTarget === 'general'}
                  onChange={(e) => setUploadTarget(e.target.value as 'general' | 'customer')}
                  className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                />
                <span className="ml-3 text-sm text-gray-900 dark:text-white">
                  General Folder (visible to all customers)
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="uploadTarget"
                  value="customer"
                  checked={uploadTarget === 'customer'}
                  onChange={(e) => setUploadTarget(e.target.value as 'general' | 'customer')}
                  className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                />
                <span className="ml-3 text-sm text-gray-900 dark:text-white">
                  Customer Folder (specific customer only)
                </span>
              </label>
            </div>

            {/* Customer Selection Dropdown */}
            {uploadTarget === 'customer' && (
              <div className="mt-4">
                <label htmlFor="customer" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Customer
                </label>
                {isLoadingCustomers ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Loading customers...</p>
                ) : (
                  <select
                    id="customer"
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">-- Select a customer --</option>
                    {customers.map((customer) => (
                      <option key={customer.customer_id} value={customer.customer_id}>
                        {customer.name} ({customer.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        )}

        {/* Message Display */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* File Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Image
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            onChange={handleFileSelect}
            disabled={isUploading}
            className="block w-full text-sm text-gray-900 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900 dark:file:text-indigo-200"
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Accepted formats: JPG, PNG, GIF, WebP (max 10MB)
          </p>
        </div>

        {/* Preview */}
        {preview && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Preview
            </label>
            <div className="relative w-full h-64 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
              <Image
                src={preview}
                alt="Preview"
                fill
                className="object-contain"
              />
            </div>
            {selectedFile && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Uploading...
              </span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {uploadProgress}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            {isUploading ? 'Uploading...' : 'Upload Image'}
          </button>
          {selectedFile && !isUploading && (
            <button
              onClick={handleCancel}
              className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors duration-200"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

