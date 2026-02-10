// Google Drive API Integration Service
// This service handles uploading files to Google Drive with automatic token refresh

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Timestamp when token expires
  tokenType: string;
}

interface GoogleDriveConfig {
  apiKey?: string;
  clientId?: string;
  accessToken?: string;
  refreshToken?: string;
}

const STORAGE_KEY = 'google_drive_tokens';

class GoogleDriveService {
  private config: GoogleDriveConfig;
  private isInitialized: boolean = false;
  private tokenData: TokenData | null = null;

  constructor(config: GoogleDriveConfig = {}) {
    this.config = config;
    this.loadTokensFromStorage();
  }

  // Load tokens from localStorage on initialization
  private loadTokensFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.tokenData = JSON.parse(stored);
        if (this.tokenData && this.tokenData.accessToken) {
          this.config.accessToken = this.tokenData.accessToken;
          this.config.refreshToken = this.tokenData.refreshToken;
          this.isInitialized = true;
        }
      }
    } catch (error) {
      console.error('Error loading tokens from storage:', error);
    }
  }

  // Save tokens to localStorage
  private saveTokensToStorage() {
    try {
      if (this.tokenData) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.tokenData));
      }
    } catch (error) {
      console.error('Error saving tokens to storage:', error);
    }
  }

  // Initialize with tokens from OAuth flow
  initialize(accessToken: string, refreshToken?: string, expiresIn: number = 3600) {
    this.config.accessToken = accessToken;
    this.config.refreshToken = refreshToken;
    this.isInitialized = true;

    // Calculate expiration time (subtract 5 minutes buffer)
    const expiresAt = Date.now() + (expiresIn * 1000) - (5 * 60 * 1000);

    this.tokenData = {
      accessToken,
      refreshToken: refreshToken || this.tokenData?.refreshToken || '',
      expiresAt,
      tokenType: 'Bearer',
    };

    this.saveTokensToStorage();
  }

  // Check if service is ready
  isReady(): boolean {
    return this.isInitialized && !!this.config.accessToken;
  }

  // Check if token needs refresh (expires in less than 5 minutes)
  private needsRefresh(): boolean {
    if (!this.tokenData) return false;
    return Date.now() >= this.tokenData.expiresAt;
  }

  // Refresh the access token using refresh token
  private async refreshAccessToken(): Promise<boolean> {
    if (!this.tokenData?.refreshToken) {
      console.error('No refresh token available');
      return false;
    }

    try {
      // Note: In production, you should proxy this through your backend
      // to keep client_secret secure. This is for demonstration.
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: this.tokenData.refreshToken,
          client_id: '407408718192.apps.googleusercontent.com', // OAuth Playground client ID
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Token refresh failed:', error);
        return false;
      }

      const data = await response.json();
      
      // Update tokens
      this.config.accessToken = data.access_token;
      this.tokenData.accessToken = data.access_token;
      this.tokenData.expiresAt = Date.now() + (data.expires_in * 1000) - (5 * 60 * 1000);
      
      // Save updated tokens
      this.saveTokensToStorage();
      
      return true;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    }
  }

  // Ensure valid access token (refresh if needed)
  private async ensureValidToken(): Promise<boolean> {
    if (!this.isReady()) return false;
    
    if (this.needsRefresh()) {
      const refreshed = await this.refreshAccessToken();
      if (!refreshed) {
        // Clear tokens if refresh failed
        this.clearTokens();
        return false;
      }
    }
    
    return true;
  }

  // Clear stored tokens (logout)
  clearTokens() {
    this.tokenData = null;
    this.config.accessToken = undefined;
    this.config.refreshToken = undefined;
    this.isInitialized = false;
    localStorage.removeItem(STORAGE_KEY);
  }

  // Upload file to specific folder
  async uploadFile(
    file: Blob | ArrayBuffer,
    fileName: string,
    folderId: string,
    mimeType: string = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ): Promise<{ success: boolean; fileId?: string; error?: string }> {
    if (!this.isReady()) {
      return { success: false, error: 'Google Drive not initialized. Please authenticate first.' };
    }

    // Ensure token is valid before upload
    const tokenValid = await this.ensureValidToken();
    if (!tokenValid) {
      return { success: false, error: 'Session expired. Please authenticate again.' };
    }

    // Clean the folder ID
    const cleanId = this.cleanFolderId(folderId);
    
    console.log('Uploading to folder ID:', cleanId, '(original:', folderId + ')');

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

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'multipart/related; boundary="' + boundary + '"',
        },
        body: multipartRequestBody,
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error?.message || `Upload failed: ${response.statusText}`;
        
        // Provide more helpful error messages for common issues
        if (errorMessage.includes('File not found')) {
          throw new Error(`Folder not found (ID: ${cleanId.substring(0, 20)}...). Please verify: 1) The folder exists in Google Drive, 2) You have edit access to the folder, 3) The folder ID in database is correct (not a URL).`);
        } else if (errorMessage.includes('insufficient permissions') || errorMessage.includes('Forbidden')) {
          throw new Error('Insufficient permissions. Please ensure you have edit access to the target folder.');
        } else if (errorMessage.includes('Invalid folder')) {
          throw new Error('Invalid folder ID. Please check the folder ID in Lead Vendors settings.');
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

  // Helper to extract clean folder ID from various formats
  private cleanFolderId(folderId: string): string {
    // If it's a URL, extract the ID
    if (folderId.includes('drive.google.com')) {
      const match = folderId.match(/folders\/([a-zA-Z0-9_-]+)/);
      if (match) {
        return match[1];
      }
    }
    
    // Remove any query parameters
    if (folderId.includes('?')) {
      return folderId.split('?')[0];
    }
    
    // Return as-is if already clean
    return folderId.trim();
  }

  // Validate that a folder exists and is accessible
  async validateFolder(folderId: string): Promise<{ valid: boolean; error?: string; folderName?: string }> {
    const tokenValid = await this.ensureValidToken();
    if (!tokenValid) {
      return { valid: false, error: 'Session expired. Please authenticate again.' };
    }

    // Clean the folder ID
    const cleanId = this.cleanFolderId(folderId);
    
    console.log('Validating folder ID:', cleanId, '(original:', folderId + ')');

    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${cleanId}?fields=id,name,mimeType,permissions`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error?.message || '';
        
        if (response.status === 404 || errorMessage.includes('File not found')) {
          return { 
            valid: false, 
            error: 'Folder not found. Please verify the folder ID is correct and the folder exists in Google Drive.' 
          };
        } else if (response.status === 403) {
          return { 
            valid: false, 
            error: 'Access denied. Please ensure you have been granted edit access to this folder.' 
          };
        }
        
        return { valid: false, error: `Failed to access folder: ${errorMessage}` };
      }

      const data = await response.json();
      
      if (data.mimeType !== 'application/vnd.google-apps.folder') {
        return { valid: false, error: 'The provided ID is not a folder.' };
      }

      return { valid: true, folderName: data.name };
    } catch (error) {
      console.error('Error validating folder:', error);
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Failed to validate folder access' 
      };
    }
  }

  // List files in a folder
  async listFilesInFolder(folderId: string): Promise<any[]> {
    const tokenValid = await this.ensureValidToken();
    if (!tokenValid) {
      throw new Error('Session expired. Please authenticate again.');
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&fields=files(id,name,createdTime)`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to list files: ${response.statusText}`);
      }

      const data = await response.json();
      return data.files || [];
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    }
  }

  // Get token expiration info
  getTokenInfo(): { isValid: boolean; expiresAt?: number; needsRefresh: boolean } {
    if (!this.tokenData) {
      return { isValid: false, needsRefresh: false };
    }
    
    const needsRefresh = this.needsRefresh();
    return {
      isValid: true,
      expiresAt: this.tokenData.expiresAt,
      needsRefresh,
    };
  }
}

// Create singleton instance
export const googleDriveService = new GoogleDriveService();

// Hook for using Google Drive in components
export const useGoogleDrive = () => {
  const initialize = (accessToken: string, refreshToken?: string, expiresIn?: number) => {
    googleDriveService.initialize(accessToken, refreshToken, expiresIn);
  };

  const uploadFile = async (
    file: Blob | ArrayBuffer,
    fileName: string,
    folderId: string
  ) => {
    return googleDriveService.uploadFile(file, fileName, folderId);
  };

  const validateFolder = async (folderId: string) => {
    return googleDriveService.validateFolder(folderId);
  };

  const isReady = () => googleDriveService.isReady();
  
  const logout = () => googleDriveService.clearTokens();
  
  const getTokenInfo = () => googleDriveService.getTokenInfo();

  return {
    initialize,
    uploadFile,
    validateFolder,
    isReady,
    logout,
    getTokenInfo,
  };
};
