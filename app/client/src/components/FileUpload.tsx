
import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, FileVideo, FileAudio, FileImage, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface FileUploadProps {
  onFilesSelected: (files: FileList) => void;
  disabled?: boolean;
  uploadProgress?: number;
  isUploading?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  onFilesSelected, 
  disabled,
  uploadProgress = 0,
  isUploading = false
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    if (isUploading) {
      setSelectedFiles([]);
    }
  }, [isUploading]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFiles(acceptedFiles);
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

  // Helper function to get file type icon
  const getFileTypeIcon = (file: File) => {
    const type = file.type;
    if (type.startsWith('video/')) return <FileVideo className="h-4 w-4" />;
    if (type.startsWith('audio/')) return <FileAudio className="h-4 w-4" />;
    if (type.startsWith('image/')) return <FileImage className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  return (
    <Card className={`border-2 border-dashed transition-colors ${
      isDragActive ? 'border-primary animate-pulse' : 'hover:border-primary/50'
    }`}>
      <CardContent className="p-8">
        {isUploading && (
          <div className="mb-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Uploading files...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2 transition-all duration-300" />
          </div>
        )}
        
        <div
          {...getRootProps()}
          className={`text-center cursor-pointer transition-colors ${
            isDragActive ? 'text-primary' : 'text-muted-foreground'
          } ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center space-y-4">
            {isDragActive ? (
              <Upload className="h-12 w-12 animate-bounce text-primary" />
            ) : (
              <File className="h-12 w-12" />
            )}
            <div>
              <p className="text-lg font-medium">
                {isDragActive ? 'Drop files here...' : 'Drag & drop files here'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                or click to select files • Support for video, audio, and image files
              </p>
            </div>
          </div>
        </div>
        
        {/* File type indicators */}
        <div className="flex flex-wrap gap-2 justify-center mt-6">
          <Badge variant="outline" className="flex items-center gap-1">
            <FileVideo className="h-3 w-3" /> MP4, AVI, MOV, MKV
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <FileAudio className="h-3 w-3" /> MP3, WAV, AAC, FLAC
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <FileImage className="h-3 w-3" /> JPG, PNG, GIF, WebP
          </Badge>
        </div>
        
        {/* Selected files preview */}
        {selectedFiles.length > 0 && !isUploading && (
          <div className="mt-6 border rounded-md p-2 max-h-32 overflow-y-auto">
            <p className="text-xs text-muted-foreground mb-2">Selected files:</p>
            <div className="space-y-1">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between text-sm p-1 hover:bg-accent rounded">
                  <div className="flex items-center gap-2 truncate">
                    {getFileTypeIcon(file)}
                    <span className="truncate">{file.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
