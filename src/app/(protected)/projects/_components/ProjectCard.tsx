'use client';

import Link from 'next/link';
import type { Project } from '@/lib/api';
import ProjectStatusBadge from './ProjectStatusBadge';

interface ProjectCardProps {
  project: Project;
  onDelete: (project: Project) => void;
}

export default function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const customerCount = project.customer_ids?.length ?? 0;

  return (
    <div className="relative group bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700">
      <Link href={`/projects/${project.project_id}`} className="block p-6">
        <div className="flex justify-between items-start mb-2 gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white pr-2 min-w-0 break-words">
            {project.name}
          </h3>
          <ProjectStatusBadge status={project.status} />
        </div>
        {project.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
            {project.description}
          </p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">
          Shoot: {new Date(project.shoot_start_date).toLocaleDateString()} – {new Date(project.shoot_end_date).toLocaleDateString()}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500">
          {customerCount} customer{customerCount !== 1 ? 's' : ''} assigned
        </p>
      </Link>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete(project);
        }}
        aria-label={`Delete ${project.name}`}
        className="absolute top-2 right-2 p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 100 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
}
