'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Toast from '@/components/Toast';
import ProjectStatusBadge, { STATUS_LABEL, type ProjectStatus } from '../_components/ProjectStatusBadge';
import ProjectDetailsCard from '../_components/ProjectDetailsCard';
import ProjectCustomersCard from '../_components/ProjectCustomersCard';
import ProjectGalleryCard from '../_components/ProjectGalleryCard';
import DeleteProjectDialog from '../_components/DeleteProjectDialog';
import { useProjectDetail } from '../_components/useProjectDetail';

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [projectId, setProjectId] = useState('');

  useEffect(() => {
    params.then((p) => setProjectId(p.id));
  }, [params]);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/gallery');
    }
  }, [isAdmin, authLoading, router]);

  const detail = useProjectDetail(projectId);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (authLoading || !isAdmin) return null;

  if (detail.isLoading && !detail.project) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading project...</p>
        </div>
      </div>
    );
  }

  if (detail.loadError && !detail.project) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-red-800 dark:text-red-200">{detail.loadError}</p>
        </div>
        <Link href="/projects" className="mt-4 inline-block text-indigo-600 dark:text-indigo-400">
          ← Back to Projects
        </Link>
      </div>
    );
  }

  const project = detail.project;
  if (!project) return null;

  const handleSave = async (data: Parameters<typeof detail.updateProject>[0]) => {
    await detail.updateProject(data);
    setToast({ type: 'success', message: 'Project updated successfully.' });
  };

  const handleQuickStatus = async (status: ProjectStatus) => {
    await detail.updateStatus(status);
    setToast({ type: 'success', message: `Status updated to ${STATUS_LABEL[status]}.` });
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await detail.deleteProject();
      router.push('/projects');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete project');
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {showDeleteConfirm && (
        <DeleteProjectDialog
          projectName={project.name}
          isDeleting={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => {
            if (!isDeleting) {
              setShowDeleteConfirm(false);
              setDeleteError(null);
            }
          }}
        />
      )}

      {/* Header */}
      <div className="mb-6">
        <Link
          href="/projects"
          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm mb-4 inline-block"
        >
          ← Back to Projects
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{project.name}</h2>
          <ProjectStatusBadge status={project.status} />
        </div>
      </div>

      {detail.loadError && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-red-800 dark:text-red-200">{detail.loadError}</p>
        </div>
      )}
      {deleteError && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-red-800 dark:text-red-200">{deleteError}</p>
        </div>
      )}

      <ProjectDetailsCard
        project={project}
        onSave={handleSave}
        onQuickStatusChange={handleQuickStatus}
      />

      <ProjectCustomersCard
        project={project}
        allCustomers={detail.allCustomers}
        customerMap={detail.customerMap}
        onAssign={async (ids) => { await detail.assignCustomers(ids); }}
        onRemove={async (id) => { await detail.removeCustomer(id); }}
      />

      <ProjectGalleryCard
        images={detail.images}
        isLoading={detail.isLoadingImages}
        error={detail.imageError}
        isAdmin={isAdmin}
        onUpload={detail.uploadImage}
        onRefresh={detail.reloadImages}
        onDeleteImage={detail.deleteImage}
      />

      {/* Danger Zone */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-red-200 dark:border-red-800">
        <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-4">Danger Zone</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Permanently delete this project. This action cannot be undone.
        </p>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors"
        >
          Delete Project
        </button>
      </div>
    </div>
  );
}
