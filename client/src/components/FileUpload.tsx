
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface FileUploadProps {
  onFilesSelected: (files: FileList) => void;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFilesSelected, disabled }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const fileList = new DataTransfer();
      acceptedFiles.forEach(file => fileList.items.add(file));
      onFilesSelected(fileList.files);
    }
  }, [onFilesSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      // Video formats
      'video/mp4': ['.mp4'],
      'video/x-msvideo': ['.avi'],
      'video/quicktime': ['.mov'],
      'video/x-matroska': ['.mkv'],
      'video/webm': ['.webm'],
      // Audio formats
      'audio/mpeg': ['.mp3'],
      'audio/wav': ['.wav'],
      'audio/aac': ['.aac', '.m4a'],
      'audio/flac': ['.flac'],
      // Image formats
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/avif': ['.avif'],
      'image/gif': ['.gif'],
      'image/tiff': ['.tiff', '.tif'],
      'image/bmp': ['.bmp']
    },
    disabled,
    maxSize: 500 * 1024 * 1024, // 500MB max file size
    multiple: true
  });

  return (
    <Card className="border-2 border-dashed transition-colors hover:border-primary/50">
      <CardContent className="p-8">
        <div
          {...getRootProps()}
          className={`text-center cursor-pointer transition-colors ${
            isDragActive ? 'text-primary' : 'text-muted-foreground'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center space-y-4">
            {isDragActive ? (
              <Upload className="h-12 w-12 animate-bounce" />
            ) : (
              <File className="h-12 w-12" />
            )}
            <div>
              <p className="text-lg font-medium">
                {isDragActive ? 'Drop files here...' : 'Drag & drop files here'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                or click to select files • Support for video and audio files
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
