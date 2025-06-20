
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
      'video/*': ['.mp4', '.avi', '.mov', '.mkv', '.webm'],
      'audio/*': ['.mp3', '.wav', '.aac', '.flac']
    },
    disabled
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
