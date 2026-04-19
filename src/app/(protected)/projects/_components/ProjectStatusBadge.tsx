'use client';

import type { Project } from '@/lib/api';

export type ProjectStatus = Project['status'];

export const PROJECT_STATUSES: ProjectStatus[] = [
  'draft',
  'in_progress',
  'delivered',
  'archived',
];

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  draft: 'Draft',
  in_progress: 'In Progress',
  delivered: 'Delivered',
  archived: 'Archived',
};

export const STATUS_BADGE: Record<ProjectStatus, string> = {
  draft: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  in_progress: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200',
  delivered: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200',
  archived: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200',
};

interface ProjectStatusBadgeProps {
  status: ProjectStatus;
  className?: string;
}

export default function ProjectStatusBadge({ status, className = '' }: ProjectStatusBadgeProps) {
  return (
    <span
      className={`px-2 py-1 text-xs font-medium rounded whitespace-nowrap ${STATUS_BADGE[status]} ${className}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
