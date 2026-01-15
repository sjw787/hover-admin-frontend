'use client';

import { useState, useEffect } from 'react';
import { api, type ImageMetadata } from '@/lib/api';

export default function GalleryPage() {
  const [images, setImages] = useState<ImageMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prefix, setPrefix] = useState('');
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [imageLoading, setImageLoading] = useState<Set<string>>(new Set());
  const imagesPerPage = 12;

  const loadImages = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.listImages(prefix || undefined);

      // Reset error and loading states for new images
      setImageErrors(new Set());
      setImageLoading(new Set());
      setImages(response.images);
    } catch (err) {
      console.error('Error loading images:', err);
      setError(err instanceof Error ? err.message : 'Failed to load images');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefix]);

  const handleDelete = async (key: string) => {
    if (deleteConfirm !== key) {
      setDeleteConfirm(key);
      return;
    }

    setDeletingKey(key);
    try {
      await api.deleteImage(key);
      setImages((prev) => prev.filter((img) => img.key !== key));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete image');
    } finally {
      setDeletingKey(null);
    }
  };

  const handleImageError = (key: string) => {
    setImageErrors((prev) => new Set(prev).add(key));
    setImageLoading((prev) => {
      const newSet = new Set(prev);
      newSet.delete(key);
      return newSet;
    });
  };

  const handleImageLoad = (key: string) => {
    setImageLoading((prev) => {
      const newSet = new Set(prev);
      newSet.delete(key);
      return newSet;
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  // Pagination logic
  const indexOfLastImage = currentPage * imagesPerPage;
  const indexOfFirstImage = indexOfLastImage - imagesPerPage;
  const currentImages = images.slice(indexOfFirstImage, indexOfLastImage);
  const totalPages = Math.ceil(images.length / imagesPerPage);

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Image Gallery
        </h2>

        {/* Filter Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <div className="flex items-center space-x-4">
            <label
              htmlFor="prefix"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Filter by prefix:
            </label>
            <input
              id="prefix"
              type="text"
              value={prefix}
              onChange={(e) => {
                setPrefix(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="e.g., 2026/01/"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
            {prefix && (
              <button
                onClick={() => {
                  setPrefix('');
                  setCurrentPage(1);
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {images.length} {images.length === 1 ? 'image' : 'images'} found
          {prefix && ` (filtered by "${prefix}")`}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg">
          {error}
          <button
            onClick={loadImages}
            className="ml-4 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden animate-pulse"
            >
              <div className="w-full h-48 bg-gray-200 dark:bg-gray-700"></div>
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && images.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-300">
            No images found
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {prefix
              ? 'Try adjusting your filter or upload new images.'
              : 'Get started by uploading an image.'}
          </p>
        </div>
      )}

      {/* Image Grid */}
      {!isLoading && currentImages.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {currentImages.map((image) => (
              <div
                key={image.key}
                className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
              >
                {/* Image */}
                <div className="relative w-full h-48 bg-gray-100 dark:bg-gray-700">
                  {image.url && image.url.trim() !== '' ? (
                    <>
                      {imageLoading.has(image.key) && (
                        <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-100 dark:bg-gray-700">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                      )}
                      <div
                        className="w-full h-full bg-cover bg-center bg-no-repeat"
                        style={{ backgroundImage: `url(${image.url})` }}
                        title={image.key}
                        onLoad={() => handleImageLoad(image.key)}
                      />
                      {/* Hidden img tag to trigger load events */}
                      <img
                        src={image.url}
                        alt={image.key}
                        className="hidden"
                        referrerPolicy="no-referrer"
                        onError={() => handleImageError(image.key)}
                        onLoad={() => handleImageLoad(image.key)}
                      />
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center flex-col space-y-2">
                      <svg
                        className="h-12 w-12 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="text-xs text-gray-500 dark:text-gray-400">No URL available</span>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="p-4">
                  <h3
                    className="text-sm font-medium text-gray-900 dark:text-white truncate mb-2"
                    title={image.key}
                  >
                    {image.key.split('/').pop()}
                  </h3>
                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <p>Size: {formatFileSize(image.size)}</p>
                    <p>Modified: {formatDate(image.last_modified)}</p>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex space-x-2">
                    {image.url && image.url.trim() !== '' ? (
                      <a
                        href={image.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center px-3 py-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded text-xs font-medium transition-colors"
                      >
                        View
                      </a>
                    ) : (
                      <button
                        disabled
                        className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded text-xs font-medium cursor-not-allowed"
                      >
                        No URL
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(image.key)}
                      disabled={deletingKey === image.key}
                      className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors ${
                        deleteConfirm === image.key
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {deletingKey === image.key
                        ? 'Deleting...'
                        : deleteConfirm === image.key
                        ? 'Confirm?'
                        : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center items-center space-x-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

