'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, type Project } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import ProjectCard from './_components/ProjectCard';
import DeleteProjectDialog from './_components/DeleteProjectDialog';
import Toast from '@/components/Toast';

export default function ProjectsPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/gallery');
    }
  }, [isAdmin, authLoading, router]);

  const loadProjects = useCallback(async (opts?: { silent?: boolean }) => {
    if (opts?.silent) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);
    try {
      const response = await api.listProjects();
      setProjects(response.projects);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) loadProjects();
  }, [isAdmin, loadProjects]);

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteProject(projectToDelete.project_id);
      setProjects((prev) => prev.filter((p) => p.project_id !== projectToDelete.project_id));
      setToast({ type: 'success', message: `"${projectToDelete.name}" was deleted.` });
      setProjectToDelete(null);
    } catch (err) {
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to delete project',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (authLoading || !isAdmin) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {projectToDelete && (
        <DeleteProjectDialog
          projectName={projectToDelete.name}
          isDeleting={isDeleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => !isDeleting && setProjectToDelete(null)}
        />
      )}

      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Project Management</h2>
          <div className="flex gap-2">
            <button
              onClick={() => loadProjects({ silent: true })}
              disabled={isRefreshing}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-700 dark:text-gray-200 rounded-md text-sm font-medium transition-colors"
            >
              {isRefreshing ? 'Refreshing…' : 'Refresh'}
            </button>
            <Link
              href="/projects/new"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors text-center whitespace-nowrap"
            >
              New Project
            </Link>
          </div>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by name, description, or status..."
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

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Showing {filteredProjects.length} of {projects.length} projects
        </p>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
          <div className="text-5xl mb-3" aria-hidden>📁</div>
          {searchTerm ? (
            <p className="text-gray-500 dark:text-gray-400">No projects match your search.</p>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No Projects</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Create your first project to get started.
              </p>
              <Link
                href="/projects/new"
                className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors"
              >
                New Project
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.project_id}
              project={project}
              onDelete={setProjectToDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
