'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  api,
  type CustomerProfile,
  type ImageMetadata,
  type Project,
  type UpdateProjectRequest,
} from '@/lib/api';
import type { ProjectStatus } from './ProjectStatusBadge';

export interface UseProjectDetail {
  project: Project | null;
  isLoading: boolean;
  loadError: string | null;

  allCustomers: CustomerProfile[];
  customerMap: Record<string, CustomerProfile>;

  images: ImageMetadata[];
  isLoadingImages: boolean;
  imageError: string | null;

  reloadProject: () => Promise<void>;
  reloadImages: () => Promise<void>;

  updateProject: (data: UpdateProjectRequest) => Promise<Project>;
  updateStatus: (status: ProjectStatus) => Promise<Project>;
  deleteProject: () => Promise<void>;

  assignCustomers: (customerIds: string[]) => Promise<Project>;
  removeCustomer: (customerId: string) => Promise<Project>;

  uploadImage: (file: File) => Promise<void>;
  deleteImage: (key: string) => Promise<void>;
}

export function useProjectDetail(projectId: string): UseProjectDetail {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [allCustomers, setAllCustomers] = useState<CustomerProfile[]>([]);

  const [images, setImages] = useState<ImageMetadata[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const customerMap = useMemo(() => {
    const m: Record<string, CustomerProfile> = {};
    for (const c of allCustomers) m[c.customer_id] = c;
    return m;
  }, [allCustomers]);

  const reloadProject = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await api.getProject(projectId);
      setProject(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const reloadImages = useCallback(async () => {
    if (!projectId) return;
    setIsLoadingImages(true);
    setImageError(null);
    try {
      const res = await api.listProjectImages(projectId);
      setImages(res.images);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Failed to load images');
    } finally {
      setIsLoadingImages(false);
    }
  }, [projectId]);

  const loadAllCustomers = useCallback(async () => {
    try {
      const res = await api.listCustomers();
      setAllCustomers(res.customers);
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    if (!projectId) return;
    reloadProject();
    loadAllCustomers();
    reloadImages();
  }, [projectId, reloadProject, reloadImages, loadAllCustomers]);

  const updateProject = useCallback(
    async (data: UpdateProjectRequest) => {
      const updated = await api.updateProject(projectId, data);
      setProject(updated);
      return updated;
    },
    [projectId],
  );

  const updateStatus = useCallback(
    (status: ProjectStatus) => updateProject({ status }),
    [updateProject],
  );

  const deleteProject = useCallback(async () => {
    await api.deleteProject(projectId);
  }, [projectId]);

  const assignCustomers = useCallback(
    async (customerIds: string[]) => {
      const updated = await api.assignCustomersToProject(projectId, customerIds);
      setProject(updated);
      return updated;
    },
    [projectId],
  );

  const removeCustomer = useCallback(
    async (customerId: string) => {
      const updated = await api.removeCustomerFromProject(projectId, customerId);
      setProject(updated);
      return updated;
    },
    [projectId],
  );

  const uploadImage = useCallback(
    async (file: File) => {
      await api.uploadImageToProject(file, projectId);
      await reloadImages();
    },
    [projectId, reloadImages],
  );

  const deleteImage = useCallback(async (key: string) => {
    await api.deleteImage(key);
    setImages((prev) => prev.filter((img) => img.key !== key));
  }, []);

  return {
    project,
    isLoading,
    loadError,
    allCustomers,
    customerMap,
    images,
    isLoadingImages,
    imageError,
    reloadProject,
    reloadImages,
    updateProject,
    updateStatus,
    deleteProject,
    assignCustomers,
    removeCustomer,
    uploadImage,
    deleteImage,
  };
}
