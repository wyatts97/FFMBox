
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileInfo } from '@/services/api';
import { 
  Play, Download, Trash2, Clock, FileVideo, FileAudio, 
  FileImage, Edit, CheckCircle, AlertCircle, RefreshCw, Music
} from 'lucide-react';
import { SelectPreset } from './SelectPreset';
import { PRESETS } from '@/lib/ffmpeg';

// Define PresetOptions interface
interface PresetOptions {
  [key: string]: string | number | boolean | undefined;
  customOutputName?: string;
  quality?: number;
  width?: number;
  height?: number;
  fps?: number;
  audioBitrate?: string;
  videoBitrate?: string;
  preset?: string;
  crf?: number;
  scale?: string;
  grid?: string;
  interval?: number;
  ext?: string;
  text?: string;
  fontfile?: string;
  type?: string;
}
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface ConversionJob {
  id: string;
  file: FileInfo;
  preset: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  downloadUrl?: string;
  timemark?: string;
}

interface ConversionCardProps {
  file: FileInfo;
  onConvert: (file: FileInfo, preset: string, options?: PresetOptions) => void;
  onRemove: (fileId: string) => void;
  conversion?: ConversionJob;
}

export const ConversionCard: React.FC<ConversionCardProps> = ({
  file,
  onConvert,
  onRemove,
  conversion
}) => {
  const [selectedPreset, setSelectedPreset] = useState(PRESETS[0]?.id || 'mp4');
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [outputFilename, setOutputFilename] = useState('');
  const [options, setOptions] = useState<PresetOptions>({});
  const startTimeRef = useRef<number | null>(null);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<string | null>(null);

  // Initialize output filename when conversion is created
  useEffect(() => {
    if (conversion && !outputFilename) {
      // Extract filename without extension
      const baseName = file.originalName.replace(/\.[^/.]+$/, "");
      setOutputFilename(`${baseName}_converted`);
    }
  }, [conversion, file, outputFilename]);

  // Track conversion start time for estimating remaining time
  useEffect(() => {
    if (conversion?.status === 'processing' && !startTimeRef.current) {
      startTimeRef.current = Date.now();
    }
    
    if (conversion?.status !== 'processing') {
      startTimeRef.current = null;
      setEstimatedTimeRemaining(null);
    }
  }, [conversion?.status]);

  // Update estimated time remaining
  useEffect(() => {
    if (conversion?.status === 'processing' && startTimeRef.current && conversion.progress > 0) {
      const updateEstimatedTime = () => {
        if (!startTimeRef.current || !conversion.progress) return;
        
        const elapsedMs = Date.now() - startTimeRef.current;
        const progressPercent = conversion.progress / 100;
        
        if (progressPercent === 0) return;
        
        // Calculate total estimated time based on progress so far
        const totalEstimatedMs = elapsedMs / progressPercent;
        const remainingMs = totalEstimatedMs - elapsedMs;
        
        if (remainingMs <= 0) {
          setEstimatedTimeRemaining('Almost done...');
          return;
        }
        
        // Format remaining time
        const remainingSec = Math.round(remainingMs / 1000);
        
        if (remainingSec < 60) {
          setEstimatedTimeRemaining(`${remainingSec}s remaining`);
        } else if (remainingSec < 3600) {
          const mins = Math.floor(remainingSec / 60);
          const secs = remainingSec % 60;
          setEstimatedTimeRemaining(`${mins}m ${secs}s remaining`);
        } else {
          const hours = Math.floor(remainingSec / 3600);
          const mins = Math.floor((remainingSec % 3600) / 60);
          setEstimatedTimeRemaining(`${hours}h ${mins}m remaining`);
        }
      };
      
      updateEstimatedTime();
      const interval = setInterval(updateEstimatedTime, 1000);
      
      return () => clearInterval(interval);
    }
  }, [conversion?.progress, conversion?.status]);

  const handleConvert = () => {
    // Include output filename in options if set
    const convertOptions: PresetOptions = {
      ...options
    };
    
    if (outputFilename) {
      convertOptions.customOutputName = outputFilename;
    }
    
    onConvert(file, selectedPreset, convertOptions);
  };

  const handleRename = () => {
    setIsRenameDialogOpen(false);
    // The outputFilename is already set and will be used in handleConvert
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'processing': return 'bg-blue-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };
  
  // Get file type icon and thumbnail
  const getFileTypeInfo = () => {
    const ext = file.originalName.split('.').pop()?.toLowerCase() || '';
    
    // Video files
    if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(ext)) {
      return {
        icon: <FileVideo className="h-5 w-5" />,
        type: 'video',
        color: 'text-blue-500'
      };
    }
    
    // Audio files
    if (['mp3', 'wav', 'aac', 'flac', 'm4a', 'ogg'].includes(ext)) {
      return {
        icon: <FileAudio className="h-5 w-5" />,
        type: 'audio',
        color: 'text-purple-500'
      };
    }
    
    // Image files
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'tiff', 'bmp'].includes(ext)) {
      return {
        icon: <FileImage className="h-5 w-5" />,
        type: 'image',
        color: 'text-green-500'
      };
    }
    
    // Default
    return {
      icon: <FileVideo className="h-5 w-5" />,
      type: 'unknown',
      color: 'text-gray-500'
    };
  };
  
  const fileInfo = getFileTypeInfo();
  
  // Get status icon
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed': 
        return <CheckCircle className="h-5 w-5 text-green-500 animate-pulse" />;
      case 'processing': 
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'error': 
        return <AlertCircle className="h-5 w-5 text-red-500 animate-pulse" />;
      default: 
        return null;
    }
  };

  return (
    <Card className={`transition-all duration-300 ${
      conversion?.status === 'completed' ? 'border-green-500 shadow-md' : 
      conversion?.status === 'error' ? 'border-red-500 shadow-md' : 
      conversion?.status === 'processing' ? 'border-blue-500 shadow-md' : ''
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 mr-4">
            <div className={`p-2 rounded-md ${fileInfo.color} bg-opacity-10`}>
              {fileInfo.icon}
            </div>
            <CardTitle className="text-sm font-medium truncate">
              {file.originalName}
            </CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            {conversion && (
              <Badge 
                className={`${getStatusColor(conversion.status)} flex items-center gap-1`}
              >
                {getStatusIcon(conversion.status)}
                <span>{conversion.status}</span>
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(file.id)}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-xs text-muted-foreground">
            {formatFileSize(file.size)}
          </p>
          {conversion && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2 text-xs"
              onClick={() => setIsRenameDialogOpen(true)}
            >
              <Edit className="h-3 w-3 mr-1" />
              Rename
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File thumbnail/preview */}
        {fileInfo.type === 'image' && (
          <div className="w-full h-24 bg-muted rounded-md flex items-center justify-center overflow-hidden mb-2">
            <FileImage className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
        {fileInfo.type === 'video' && (
          <div className="w-full h-24 bg-muted rounded-md flex items-center justify-center overflow-hidden mb-2">
            <FileVideo className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
        {fileInfo.type === 'audio' && (
          <div className="w-full h-24 bg-muted rounded-md flex items-center justify-center overflow-hidden mb-2">
            <Music className="h-10 w-10 text-muted-foreground" />
          </div>
        )}

        {conversion?.status === 'processing' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Converting...</span>
              <span>{conversion.progress}%</span>
            </div>
            <Progress 
              value={conversion.progress} 
              className="h-2 transition-all duration-300"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {conversion.timemark && (
                <div className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>{conversion.timemark}</span>
                </div>
              )}
              {estimatedTimeRemaining && (
                <div className="flex items-center">
                  <span>{estimatedTimeRemaining}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {conversion?.status === 'completed' && conversion.downloadUrl && (
          <div className="space-y-2">
            <p className="text-sm text-green-600 font-medium">Conversion completed!</p>
            <Button
              asChild
              className="w-full"
              size="sm"
            >
              <a href={conversion.downloadUrl} download>
                <Download className="h-4 w-4 mr-2" />
                Download
              </a>
            </Button>
          </div>
        )}

        {conversion?.status === 'error' && (
          <div className="space-y-2">
            <p className="text-sm text-red-600 font-medium">Conversion failed</p>
            {conversion.error && (
              <p className="text-xs text-red-500">{conversion.error}</p>
            )}
          </div>
        )}

        {!conversion && (
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Output Format</label>
              <Select value={selectedPreset} onValueChange={setSelectedPreset}>
                <SelectTrigger>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  {PRESETS.map(preset => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.icon && <span className="mr-2">{preset.icon}</span>}
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleConvert} className="w-full" size="sm">
              <Play className="h-4 w-4 mr-2" />
              Start Conversion
            </Button>
          </div>
        )}
        
        {/* Rename Dialog */}
        <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Output File</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                value={outputFilename}
                onChange={(e) => setOutputFilename(e.target.value)}
                placeholder="Enter new filename"
                className="w-full"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRename}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
