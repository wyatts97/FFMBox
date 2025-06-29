import type { FileInfo, PresetOptions } from '@ffmbox/shared';

export interface ConversionResponse {
  conversionId: string;
  status: string;
  outputFilename: string;
}

class ApiService {
  // Use absolute URL to ensure it works with the proxy
  private baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

  async checkFFmpegStatus() {
    const response = await fetch(`${this.baseUrl}/ffmpeg-status`);
    return response.json();
  }

  async uploadFiles(files: FileList): Promise<{ files: FileInfo[] }> {
    const formData = new FormData();
    
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    const response = await fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    return response.json();
  }

  async convertFile(
    fileId: string,
    filename: string,
    preset: string,
    options: PresetOptions = {}
  ): Promise<ConversionResponse> {
    const response = await fetch(`${this.baseUrl}/convert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId,
        filename,
        preset,
        options,
      }),
    });

    if (!response.ok) {
      throw new Error('Conversion failed');
    }

    return response.json();
  }

  async getConversionStatus(conversionId: string) {
    const response = await fetch(`${this.baseUrl}/conversion/${conversionId}`);
    return response.json();
  }
}

export const apiService = new ApiService();
