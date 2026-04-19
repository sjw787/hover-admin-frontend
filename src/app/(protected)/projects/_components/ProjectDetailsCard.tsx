'use client';

import { useEffect, useState } from 'react';
import type { Project, UpdateProjectRequest } from '@/lib/api';
import ProjectStatusBadge, {
  PROJECT_STATUSES,
  STATUS_BADGE,
  STATUS_LABEL,
  type ProjectStatus,
} from './ProjectStatusBadge';

interface ProjectDetailsCardProps {
  project: Project;
  onSave: (data: UpdateProjectRequest) => Promise<void>;
  onQuickStatusChange: (status: ProjectStatus) => Promise<void>;
}

export default function ProjectDetailsCard({
  project,
  onSave,
  onQuickStatusChange,
}: ProjectDetailsCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<ProjectStatus | null>(null);
  const [editData, setEditData] = useState<UpdateProjectRequest>(() => ({
    name: project.name,
    description: project.description,
    shoot_start_date: project.shoot_start_date,
    shoot_end_date: project.shoot_end_date,
    status: project.status,
  }));

  useEffect(() => {
    if (!isEditing) {
      setEditData({
        name: project.name,
        description: project.description,
        shoot_start_date: project.shoot_start_date,
        shoot_end_date: project.shoot_end_date,
        status: project.status,
      });
    }
  }, [project, isEditing]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave(editData);
      setIsEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditData({
      name: project.name,
      description: project.description,
      shoot_start_date: project.shoot_start_date,
      shoot_end_date: project.shoot_end_date,
      status: project.status,
    });
    setSaveError(null);
    setIsEditing(false);
  };

  const handleQuickStatus = async (status: ProjectStatus) => {
    if (status === project.status || updatingStatus) return;
    setUpdatingStatus(status);
    try {
      await onQuickStatusChange(status);
    } finally {
      setUpdatingStatus(null);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Project Details</h3>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md text-sm font-medium transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {saveError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-red-800 dark:text-red-200 text-sm">{saveError}</p>
        </div>
      )}

      {!isEditing ? (
        <dl className="space-y-3">
          <div>
            <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Name</dt>
            <dd className="text-gray-900 dark:text-white mt-1">{project.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Description</dt>
            <dd className="text-gray-900 dark:text-white mt-1">{project.description || '—'}</dd>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Shoot Start</dt>
              <dd className="text-gray-900 dark:text-white mt-1">{new Date(project.shoot_start_date).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Shoot End</dt>
              <dd className="text-gray-900 dark:text-white mt-1">{new Date(project.shoot_end_date).toLocaleDateString()}</dd>
            </div>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</dt>
            <dd className="mt-1">
              <ProjectStatusBadge status={project.status} />
            </dd>
          </div>
        </dl>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
            <input
              type="text"
              required
              value={editData.name ?? ''}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              rows={3}
              value={editData.description ?? ''}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Shoot Start Date *</label>
              <input
                type="date"
                required
                value={editData.shoot_start_date ?? ''}
                onChange={(e) => setEditData({ ...editData, shoot_start_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Shoot End Date *</label>
              <input
                type="date"
                required
                value={editData.shoot_end_date ?? ''}
                onChange={(e) => setEditData({ ...editData, shoot_end_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <select
              value={editData.status ?? 'draft'}
              onChange={(e) => setEditData({ ...editData, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {!isEditing && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Quick Status Change
          </p>
          <div className="flex flex-wrap gap-2">
            {PROJECT_STATUSES.map((s) => {
              const isCurrent = project.status === s;
              const isUpdating = updatingStatus === s;
              return (
                <button
                  key={s}
                  onClick={() => handleQuickStatus(s)}
                  disabled={isCurrent || updatingStatus !== null}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                    isCurrent
                      ? `${STATUS_BADGE[s]} border-transparent ring-2 ring-indigo-500 dark:ring-indigo-400`
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {isUpdating ? 'Updating…' : STATUS_LABEL[s]}
                  {isCurrent && !isUpdating && ' ✓'}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
