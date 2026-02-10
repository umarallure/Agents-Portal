// Google Drive API Integration Service with Database-Driven Tokens
// This service stores tokens in the database and automatically rotates them

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: string;
  scope?: string;
}

import { supabase } from "@/integrations/supabase/client";

class GoogleDriveService {
  private currentUserId: string | null = null;
  private cachedToken: TokenData | null = null;
  private isRefreshing: boolean = false;

  constructor() {
    // Try to get current user on initialization
    this.loadCurrentUser();
  }

  // Load current user from Supabase auth
  private async loadCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        this.currentUserId = user.id;
        // Load token from database
        await this.loadTokenFromDatabase();
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  }

  // Load token from database
  private async loadTokenFromDatabase(): Promise<boolean> {
    if (!this.currentUserId) return false;

    try {
      console.log('Loading token from database for user:', this.currentUserId);
      
      const { data, error } = await supabase
        .from('google_drive_tokens')
        .select('access_token, refresh_token, expires_at, token_type, scope')
        .eq('user_id', this.currentUserId)
        .eq('is_active', true)
        .single();

      if (error) {
        console.log('No active token found in database:', error.message);
        return false;
      }

      if (data) {
        this.cachedToken = {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: new Date(data.expires_at).getTime(),
          tokenType: data.token_type || 'Bearer',
          scope: data.scope,
        };
        console.log('Token loaded from database. Expires at:', new Date(data.expires_at).toLocaleString());
        return true;
      }
    } catch (error) {
      console.error('Error loading token from database:', error);
    }
    return false;
  }

  // Save token to database
  private async saveTokenToDatabase(tokenData: TokenData): Promise<boolean> {
    if (!this.currentUserId) {
      console.error('Cannot save token: No current user');
      return false;
    }

    try {
      console.log('Saving token to database...');
      
      // First, deactivate any existing tokens for this user
      await supabase
        .from('google_drive_tokens')
        .update({ is_active: false })
        .eq('user_id', this.currentUserId);

      // Insert new token
      const { error } = await supabase
        .from('google_drive_tokens')
        .insert({
          user_id: this.currentUserId,
          access_token: tokenData.accessToken,
          refresh_token: tokenData.refreshToken,
          token_type: tokenData.tokenType,
          scope: tokenData.scope,
          expires_at: new Date(tokenData.expiresAt).toISOString(),
          is_active: true,
          rotation_count: 0,
        });

      if (error) {
        console.error('Error saving token to database:', error);
        return false;
      }

      this.cachedToken = tokenData;
      console.log('Token saved to database successfully');
      return true;
    } catch (error) {
      console.error('Error saving token:', error);
      return false;
    }
  }

  // Update token in database after rotation
  private async updateTokenInDatabase(newAccessToken: string, newExpiresAt: number): Promise<boolean> {
    if (!this.currentUserId) return false;

    try {
      console.log('Updating rotated token in database...');
      
      const { error } = await supabase
        .from('google_drive_tokens')
        .update({
          access_token: newAccessToken,
          expires_at: new Date(newExpiresAt).toISOString(),
          updated_at: new Date().toISOString(),
          last_rotated_at: new Date().toISOString(),
          rotation_count: supabase.rpc('increment_rotation_count'),
        })
        .eq('user_id', this.currentUserId)
        .eq('is_active', true);

      if (error) {
        console.error('Error updating token:', error);
        return false;
      }

      if (this.cachedToken) {
        this.cachedToken.accessToken = newAccessToken;
        this.cachedToken.expiresAt = newExpiresAt;
      }

      console.log('Token rotated and updated in database');
      return true;
    } catch (error) {
      console.error('Error updating token:', error);
      return false;
    }
  }

  // Initialize with tokens and save to database
  async initialize(accessToken: string, refreshToken?: string, expiresIn: number = 3600): Promise<boolean> {
    // Ensure we have current user
    await this.loadCurrentUser();
    
    if (!this.currentUserId) {
      console.error('Cannot initialize: No authenticated user');
      return false;
    }

    const expiresAt = Date.now() + (expiresIn * 1000);
    
    const tokenData: TokenData = {
      accessToken,
      refreshToken: refreshToken || '',
      expiresAt,
      tokenType: 'Bearer',
    };

    return await this.saveTokenToDatabase(tokenData);
  }

  // Check if service is ready
  isReady(): boolean {
    return this.cachedToken !== null && this.cachedToken.accessToken !== '';
  }

  // Check if token needs refresh (expires in less than 5 minutes)
  private needsRefresh(): boolean {
    if (!this.cachedToken) return true;
    // Refresh if expires in less than 5 minutes
    return Date.now() >= (this.cachedToken.expiresAt - (5 * 60 * 1000));
  }

  // Refresh the access token using refresh token
  private async refreshAccessToken(): Promise<boolean> {
    if (!this.cachedToken?.refreshToken) {
      console.error('No refresh token available');
      return false;
    }

    if (this.isRefreshing) {
      console.log('Token refresh already in progress, waiting...');
      // Wait for existing refresh to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      return this.isReady() && !this.needsRefresh();
    }

    this.isRefreshing = true;
    console.log('Refreshing access token...');

    try {
      // Note: In production, you should proxy this through your backend
      // to keep client_secret secure
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: this.cachedToken.refreshToken,
          client_id: '407408718192.apps.googleusercontent.com',
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Token refresh failed:', error);
        
        // If refresh token is invalid, clear everything
        if (error.error === 'invalid_grant') {
          console.error('Refresh token is invalid or expired');
          await this.clearTokens();
        }
        return false;
      }

      const data = await response.json();
      
      // Calculate new expiration
      const newExpiresAt = Date.now() + (data.expires_in * 1000);
      
      // Update in database
      const updated = await this.updateTokenInDatabase(data.access_token, newExpiresAt);
      
      if (updated) {
        console.log('Token refreshed successfully. New expiry:', new Date(newExpiresAt).toLocaleString());
      }
      
      return updated;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  // Ensure valid access token (refresh if needed)
  async ensureValidToken(): Promise<string | null> {
    // Reload from database to get latest token
    await this.loadTokenFromDatabase();
    
    if (!this.isReady()) {
      console.error('No token available');
      return null;
    }

    if (this.needsRefresh()) {
      console.log('Token needs refresh, rotating...');
      const refreshed = await this.refreshAccessToken();
      if (!refreshed) {
        return null;
      }
      // Reload after refresh
      await this.loadTokenFromDatabase();
    }

    return this.cachedToken?.accessToken || null;
  }

  // Clear stored tokens (logout)
  async clearTokens(): Promise<void> {
    if (this.currentUserId) {
      try {
        // Deactivate tokens in database
        await supabase
          .from('google_drive_tokens')
          .update({ is_active: false })
          .eq('user_id', this.currentUserId);
        
        console.log('Tokens deactivated in database');
      } catch (error) {
        console.error('Error clearing tokens:', error);
      }
    }
    
    this.cachedToken = null;
    this.currentUserId = null;
  }

  // Helper to extract clean folder ID from various formats
  private cleanFolderId(folderId: string): string {
    if (folderId.includes('drive.google.com')) {
      const match = folderId.match(/folders\/([a-zA-Z0-9_-]+)/);
      if (match) return match[1];
    }
    
    if (folderId.includes('?')) {
      return folderId.split('?')[0];
    }
    
    return folderId.trim();
  }

  // Upload file to specific folder
  async uploadFile(
    file: Blob | ArrayBuffer,
    fileName: string,
    folderId: string,
    mimeType: string = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ): Promise<{ success: boolean; fileId?: string; error?: string }> {
    const accessToken = await this.ensureValidToken();
    if (!accessToken) {
      return { success: false, error: 'Not authenticated with Google Drive. Please authenticate first.' };
    }

    const cleanId = this.cleanFolderId(folderId);
    console.log('Uploading to folder ID:', cleanId);

    try {
      const metadata = {
        name: fileName,
        parents: [cleanId],
        mimeType: mimeType,
      };

      const boundary = '-------314159265358979323846';
      const delimiter = "\r\n--" + boundary + "\r\n";
      const close_delim = "\r\n--" + boundary + "--";

      const metadataContent = JSON.stringify(metadata);

      let fileContent: string;
      if (file instanceof Blob) {
        fileContent = await this.blobToBase64(file);
      } else {
        fileContent = this.arrayBufferToBase64(file);
      }

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        metadataContent +
        delimiter +
        'Content-Type: ' + mimeType + '\r\n' +
        'Content-Transfer-Encoding: base64\r\n\r\n' +
        fileContent +
        close_delim;

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'multipart/related; boundary="' + boundary + '"',
        },
        body: multipartRequestBody,
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error?.message || `Upload failed: ${response.statusText}`;
        
        console.error('=== GOOGLE DRIVE UPLOAD ERROR ===');
        console.error('Status:', response.status, response.statusText);
        console.error('Error Data:', JSON.stringify(errorData, null, 2));
        console.error('==================================');
        
        if (errorMessage.includes('File not found')) {
          throw new Error(`Folder not found. Please verify the folder ID is correct.`);
        } else if (errorMessage.includes('insufficient permissions') || errorMessage.includes('Forbidden')) {
          throw new Error('Insufficient permissions. Please ensure you have edit access to the target folder.');
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      return {
        success: true,
        fileId: result.id,
      };
    } catch (error) {
      console.error('Google Drive upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  // Helper: Convert Blob to Base64
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Helper: Convert ArrayBuffer to Base64
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // Validate that a folder exists and is accessible
  async validateFolder(folderId: string): Promise<{ valid: boolean; error?: string; folderName?: string }> {
    const accessToken = await this.ensureValidToken();
    if (!accessToken) {
      return { valid: false, error: 'Not authenticated' };
    }

    const cleanId = this.cleanFolderId(folderId);

    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${cleanId}?supportsAllDrives=true&fields=id,name,mimeType,permissions,driveId`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        
        if (response.status === 404) {
          return { valid: false, error: 'Folder not found' };
        } else if (response.status === 403) {
          return { valid: false, error: 'Access denied' };
        }
        
        return { valid: false, error: errorData.error?.message || 'Failed to access folder' };
      }

      const data = await response.json();
      
      if (data.mimeType !== 'application/vnd.google-apps.folder') {
        return { valid: false, error: 'The provided ID is not a folder' };
      }

      return { valid: true, folderName: data.name };
    } catch (error) {
      console.error('Error validating folder:', error);
      return { valid: false, error: 'Failed to validate folder' };
    }
  }

  // Get token expiration info
  async getTokenInfo(): Promise<{ isValid: boolean; expiresAt?: number; needsRefresh: boolean }> {
    await this.loadTokenFromDatabase();
    
    if (!this.cachedToken) {
      return { isValid: false, needsRefresh: false };
    }
    
    return {
      isValid: true,
      expiresAt: this.cachedToken.expiresAt,
      needsRefresh: this.needsRefresh(),
    };
  }

  // Debug: List recent files
  async debugListRecentFiles(): Promise<any[]> {
    const accessToken = await this.ensureValidToken();
    if (!accessToken) return [];

    try {
      console.log('=== DEBUG: Listing recent files ===');
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?pageSize=10&orderBy=modifiedTime desc&fields=files(id,name,mimeType,modifiedTime)`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Debug list files error:', errorData);
        return [];
      }

      const data = await response.json();
      console.log('Recent files:', data.files);
      console.log('=====================================');
      return data.files || [];
    } catch (error) {
      console.error('Error listing recent files:', error);
      return [];
    }
  }

  // Debug: Get Drive info (storage, user, etc.)
  async debugGetDriveInfo(): Promise<any> {
    const accessToken = await this.ensureValidToken();
    if (!accessToken) {
      console.error('Cannot get drive info: Token not valid');
      return null;
    }

    try {
      console.log('=== DEBUG: Getting Drive Info ===');
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/about?fields=user,storageQuota`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Debug drive info error:', errorData);
        return null;
      }

      const data = await response.json();
      console.log('Drive Info:', data);
      console.log('=====================================');
      return data;
    } catch (error) {
      console.error('Error getting drive info:', error);
      return null;
    }
  }

  // Create a new folder
  async createFolder(folderName: string): Promise<{ success: boolean; folderId?: string; error?: string }> {
    const accessToken = await this.ensureValidToken();
    if (!accessToken) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.error?.message || 'Failed to create folder' };
      }

      const result = await response.json();
      return { success: true, folderId: result.id };
    } catch (error) {
      return { success: false, error: 'Failed to create folder' };
    }
  }
}

// Create singleton instance
export const googleDriveService = new GoogleDriveService();

// Hook for using Google Drive in components
export const useGoogleDrive = () => {
  const initialize = async (accessToken: string, refreshToken?: string, expiresIn?: number) => {
    return await googleDriveService.initialize(accessToken, refreshToken, expiresIn);
  };

  const uploadFile = async (file: Blob | ArrayBuffer, fileName: string, folderId: string) => {
    return googleDriveService.uploadFile(file, fileName, folderId);
  };

  const validateFolder = async (folderId: string) => {
    return googleDriveService.validateFolder(folderId);
  };

  const isReady = async () => {
    const info = await googleDriveService.getTokenInfo();
    return info.isValid;
  };
  
  const logout = async () => {
    await googleDriveService.clearTokens();
  };
  
  const getTokenInfo = async () => {
    return googleDriveService.getTokenInfo();
  };

  const createFolder = async (folderName: string) => {
    return googleDriveService.createFolder(folderName);
  };

  return {
    initialize,
    uploadFile,
    validateFolder,
    isReady,
    logout,
    getTokenInfo,
    createFolder,
  };
};
