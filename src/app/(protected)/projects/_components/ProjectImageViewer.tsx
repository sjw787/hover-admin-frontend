'use client';

import { useState } from 'react';
import Lightbox, { type Slide } from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import type { ImageMetadata } from '@/lib/api';

interface ProjectImageViewerProps {
  images: ImageMetadata[];
  initialIndex: number;
  isAdmin: boolean;
  onClose: () => void;
  onDelete: (image: ImageMetadata) => Promise<void>;
}

interface ProjectSlide extends Slide {
  key: string;
  metaKey: string;
}

export default function ProjectImageViewer({
  images,
  initialIndex,
  isAdmin,
  onClose,
  onDelete,
}: ProjectImageViewerProps) {
  const [index, setIndex] = useState(initialIndex);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slides: ProjectSlide[] = images
    .filter((img) => img.url && img.url.trim() !== '')
    .map((img) => ({
      key: img.key,
      metaKey: img.key,
      src: img.url,
      alt: img.metadata?.original_filename || img.key,
    }));

  const current = images[index];

  const handleDelete = async () => {
    if (!current) return;
    setIsDeleting(true);
    setError(null);
    try {
      await onDelete(current);
      setConfirmOpen(false);
      if (images.length <= 1) {
        onClose();
        return;
      }
      // Keep index in range for the next render (images prop updates from parent)
      setIndex((i) => Math.min(i, images.length - 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete image');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Lightbox
        open
        close={onClose}
        slides={slides}
        index={index}
        on={{ view: ({ index: i }) => setIndex(i) }}
        toolbar={{
          buttons: [
            ...(isAdmin
              ? [
                  <button
                    key="delete"
                    type="button"
                    className="yarl__button"
                    aria-label="Delete image"
                    title="Delete image"
                    onClick={() => setConfirmOpen(true)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>,
                ]
              : []),
            'close',
          ],
        }}
      />

      {confirmOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) setConfirmOpen(false);
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Image?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This image will be permanently deleted. This action cannot be undone.
            </p>
            {error && (
              <div className="mb-4 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
                {error}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-md font-medium transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
