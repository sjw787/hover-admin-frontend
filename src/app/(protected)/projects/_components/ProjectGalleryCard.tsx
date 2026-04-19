'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import type { ImageMetadata } from '@/lib/api';
import ProjectImageViewer from './ProjectImageViewer';

interface ProjectGalleryCardProps {
  images: ImageMetadata[];
  isLoading: boolean;
  error: string | null;
  isAdmin: boolean;
  onUpload: (file: File) => Promise<void>;
  onRefresh: () => Promise<void>;
  onDeleteImage: (key: string) => Promise<void>;
}

export default function ProjectGalleryCard({
  images,
  isLoading,
  error,
  isAdmin,
  onUpload,
  onRefresh,
  onDeleteImage,
}: ProjectGalleryCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadMessage(null);
    try {
      await onUpload(file);
      setUploadMessage({ type: 'success', text: 'Image uploaded successfully!' });
    } catch (err) {
      setUploadMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Upload failed',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteFromViewer = async (image: ImageMetadata) => {
    await onDeleteImage(image.key);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Project Images ({images.length})
        </h3>
        <div className="flex items-center gap-2">
          {isUploading && (
            <span className="text-sm text-gray-500 dark:text-gray-400">Uploading...</span>
          )}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            aria-label="Refresh images"
            className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-700 dark:text-gray-200 rounded-md text-sm font-medium transition-colors"
          >
            {isLoading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-md text-sm font-medium transition-colors"
          >
            Upload Image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            onChange={handleFile}
            className="hidden"
          />
        </div>
      </div>

      {uploadMessage && (
        <div
          className={`mb-4 p-3 rounded-md text-sm ${
            uploadMessage.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          }`}
        >
          {uploadMessage.text}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
        </div>
      )}

      {isLoading && images.length === 0 ? (
        <div className="flex justify-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : images.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
          No images yet. Upload the first image for this project.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img, index) => (
            <button
              key={img.key}
              onClick={() => setViewerIndex(index)}
              className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {img.url ? (
                <Image
                  src={img.url}
                  alt={img.metadata?.original_filename || img.key}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-xs text-center px-2">
                  No preview
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {viewerIndex !== null && images[viewerIndex] && (
        <ProjectImageViewer
          images={images}
          initialIndex={Math.min(viewerIndex, images.length - 1)}
          isAdmin={isAdmin}
          onClose={() => setViewerIndex(null)}
          onDelete={handleDeleteFromViewer}
        />
      )}
    </div>
  );
}
