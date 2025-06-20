
export interface FileInfo {
  id: string;
  originalName: string;
  filename: string;
  size: number;
  path: string;
}

export interface ConversionOptions {
  startTime?: string;
  duration?: string;
  quality?: string;
}

export interface ConversionResponse {
  conversionId: string;
  status: string;
  outputFilename: string;
}

class ApiService {
  private baseUrl = '/api';

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
    options: ConversionOptions = {}
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
