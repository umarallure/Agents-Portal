// Google Drive API Integration Service
// This service handles uploading files to Google Drive

interface GoogleDriveConfig {
  apiKey?: string;
  clientId?: string;
  accessToken?: string;
}

class GoogleDriveService {
  private config: GoogleDriveConfig;
  private isInitialized: boolean = false;

  constructor(config: GoogleDriveConfig = {}) {
    this.config = config;
  }

  // Initialize with access token (obtained from OAuth flow)
  initialize(accessToken: string) {
    this.config.accessToken = accessToken;
    this.isInitialized = true;
  }

  // Check if service is ready
  isReady(): boolean {
    return this.isInitialized && !!this.config.accessToken;
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

    try {
      // Step 1: Create file metadata with parent folder
      const metadata = {
        name: fileName,
        parents: [folderId],
        mimeType: mimeType,
      };

      // Step 2: Create multipart request body
      const boundary = '-------314159265358979323846';
      const delimiter = "\r\n--" + boundary + "\r\n";
      const close_delim = "\r\n--" + boundary + "--";

      const metadataContent = JSON.stringify(metadata);

      // Convert blob to base64 if needed
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

      // Step 3: Upload to Google Drive
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
        throw new Error(errorData.error?.message || `Upload failed: ${response.statusText}`);
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

  // List files in a folder (for debugging/verification)
  async listFilesInFolder(folderId: string): Promise<any[]> {
    if (!this.isReady()) {
      throw new Error('Google Drive not initialized');
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
}

// Create singleton instance
export const googleDriveService = new GoogleDriveService();

// Hook for using Google Drive in components
export const useGoogleDrive = () => {
  const initialize = (accessToken: string) => {
    googleDriveService.initialize(accessToken);
  };

  const uploadFile = async (
    file: Blob | ArrayBuffer,
    fileName: string,
    folderId: string
  ) => {
    return googleDriveService.uploadFile(file, fileName, folderId);
  };

  const isReady = () => googleDriveService.isReady();

  return {
    initialize,
    uploadFile,
    isReady,
  };
};
