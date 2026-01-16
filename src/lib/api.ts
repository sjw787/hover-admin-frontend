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

  // Helper to add timeout to fetch requests
  private async fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 15000): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return response;
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout - please check your connection');
      }
      throw error;
    }
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

  async changePassword(data: { old_password: string; new_password: string }): Promise<{ message: string }> {
    console.log('🔐 Changing password...');

    try {
      const response = await this.fetchWithTimeout(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader(),
        },
        body: JSON.stringify(data),
      }, 15000);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to change password' }));
        throw new Error(error.detail || 'Failed to change password');
      }

      return response.json();
    } catch (error) {
      console.error('❌ Change password error:', error);
      throw error;
    }
  }

  async updateProfile(data: { full_name?: string; phone_number?: string }): Promise<{ message: string }> {
    console.log('📝 Updating profile...');
    console.log('📦 Profile data:', data);

    // Check if token exists
    const token = localStorage.getItem('access_token');
    console.log('🔑 Token exists:', !!token);
    console.log('🔑 Token preview:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');

    try {
      const headers = {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      };
      console.log('📋 Request headers:', Object.keys(headers));

      const response = await this.fetchWithTimeout(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify(data),
      }, 15000);

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to update profile' }));
        console.error('❌ Response error:', error);
        throw new Error(error.detail || 'Failed to update profile');
      }

      const result = await response.json();
      console.log('✅ Profile update successful:', result);
      return result;
    } catch (error) {
      console.error('❌ Update profile error:', error);
      throw error;
    }
  }

  async forgotPassword(username: string): Promise<{ message: string }> {
    console.log('🔑 Initiating forgot password...');

    try {
      const response = await this.fetchWithTimeout(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      }, 15000);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to initiate password reset' }));
        throw new Error(error.detail || 'Failed to initiate password reset');
      }

      return response.json();
    } catch (error) {
      console.error('❌ Forgot password error:', error);
      throw error;
    }
  }

  async resetPassword(data: { username: string; confirmation_code: string; new_password: string }): Promise<{ message: string }> {
    console.log('🔐 Resetting password...');

    try {
      const response = await this.fetchWithTimeout(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }, 15000);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to reset password' }));
        throw new Error(error.detail || 'Failed to reset password');
      }

      return response.json();
    } catch (error) {
      console.error('❌ Reset password error:', error);
      throw error;
    }
  }

  async completeNewPassword(data: { username: string; temporary_password: string; new_password: string }): Promise<AuthResponse> {
    console.log('🔐 Completing new password challenge...');

    try {
      const response = await this.fetchWithTimeout(`${API_URL}/auth/complete-new-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }, 15000);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to complete password setup' }));
        throw new Error(error.detail || 'Failed to complete password setup');
      }

      return response.json();
    } catch (error) {
      console.error('❌ Complete new password error:', error);
      throw error;
    }
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

  async getUserInfo(): Promise<{ username: string; attributes: any }> {
    console.log('👤 Fetching user info...');

    try {
      const response = await this.fetchWithTimeout(`${API_URL}/auth/user-info`, {
        method: 'GET',
        headers: this.getAuthHeader(),
      }, 15000);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to fetch user info' }));
        throw new Error(error.detail || 'Failed to fetch user info');
      }

      const result = await response.json();
      console.log('✅ User info fetched:', result);
      return result;
    } catch (error) {
      console.error('❌ Get user info error:', error);
      throw error;
    }
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

