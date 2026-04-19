'use client';

interface DeleteProjectDialogProps {
  projectName: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteProjectDialog({
  projectName,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteProjectDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Project?</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          &ldquo;{projectName}&rdquo; and all its data will be permanently deleted. This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-md font-medium transition-colors"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
