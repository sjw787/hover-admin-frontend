const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  id_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface User {
  username: string;
  email: string;
  sub?: string;
}

export interface ImageMetadata {
  key: string;
  url: string; // Mapped from presigned_url
  size: number;
  last_modified: string;
  content_type?: string;
  metadata?: {
    original_filename?: string;
    uploaded_by?: string;
    upload_date?: string;
  };
}

// Backend response format (before transformation)
interface BackendImageMetadata {
  key: string;
  presigned_url: string;
  size: number;
  last_modified: string;
  content_type?: string;
  metadata?: {
    original_filename?: string;
    uploaded_by?: string;
    upload_date?: string;
  };
}

export interface ListImagesResponse {
  images: ImageMetadata[];
  count: number;
}

export interface UploadResponse {
  key: string;
  message: string;
}

export interface DeleteResponse {
  message: string;
}

class ApiClient {
  private getAuthHeader(): HeadersInit {
    const token = localStorage.getItem('access_token');
    if (!token) {
      return {};
    }
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(error.detail || 'Login failed');
    }

    return response.json();
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Token refresh failed' }));
      throw new Error(error.detail || 'Token refresh failed');
    }

    return response.json();
  }

  async getCurrentUser(): Promise<User> {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to fetch user' }));
      throw new Error(error.detail || 'Failed to fetch user');
    }

    return response.json();
  }

  async uploadImage(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/images/upload`, {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(error.detail || 'Upload failed');
    }

    return response.json();
  }

  async listImages(prefix?: string): Promise<ListImagesResponse> {
    const url = new URL(`${API_URL}/images/list`);
    if (prefix) {
      url.searchParams.append('prefix', prefix);
    }

    const response = await fetch(url.toString(), {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to fetch images' }));
      throw new Error(error.detail || 'Failed to fetch images');
    }

    const data = await response.json();

    // Transform the response to map presigned_url to url
    if (data.images) {
      data.images = data.images.map((img: BackendImageMetadata) => ({
        ...img,
        url: img.presigned_url,
      }));
    }

    return data;
  }

  async deleteImage(key: string): Promise<DeleteResponse> {
    const response = await fetch(`${API_URL}/images/${key}`, {
      method: 'DELETE',
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Delete failed' }));
      throw new Error(error.detail || 'Delete failed');
    }

    return response.json();
  }
}

export const api = new ApiClient();

