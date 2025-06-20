
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { FileInfo } from '@/services/api';
import { Play, Download, Trash2, Clock } from 'lucide-react';

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
  onConvert: (file: FileInfo, preset: string) => void;
  onRemove: (fileId: string) => void;
  conversion?: ConversionJob;
}

export const ConversionCard: React.FC<ConversionCardProps> = ({
  file,
  onConvert,
  onRemove,
  conversion
}) => {
  const [selectedPreset, setSelectedPreset] = useState('mp4-720p');

  const handleConvert = () => {
    onConvert(file, selectedPreset);
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium truncate flex-1 mr-4">
            {file.originalName}
          </CardTitle>
          <div className="flex items-center space-x-2">
            {conversion && (
              <Badge className={getStatusColor(conversion.status)}>
                {conversion.status}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(file.id)}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(file.size)}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {conversion?.status === 'processing' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Converting...</span>
              <span>{conversion.progress}%</span>
            </div>
            <Progress value={conversion.progress} className="h-2" />
            {conversion.timemark && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Clock className="h-3 w-3 mr-1" />
                <span>{conversion.timemark}</span>
              </div>
            )}
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
                  <SelectItem value="mp4-720p">MP4 720p</SelectItem>
                  <SelectItem value="mp4-1080p">MP4 1080p</SelectItem>
                  <SelectItem value="webm">WebM</SelectItem>
                  <SelectItem value="mp3">MP3 Audio</SelectItem>
                  <SelectItem value="wav">WAV Audio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleConvert} className="w-full" size="sm">
              <Play className="h-4 w-4 mr-2" />
              Start Conversion
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
