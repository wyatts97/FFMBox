
import React, { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { FileUpload } from '@/components/FileUpload';
import { ConversionCard } from '@/components/ConversionCard';
import { SetupWizard } from '@/components/SetupWizard';
import { FloatingSettings } from '@/components/FloatingSettings';
import { ThemeToggle } from '@/components/ThemeToggle';
import { FFmpegPresets } from '@/components/FFmpegPresets';
import { apiService, FileInfo } from '@/services/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, Zap } from 'lucide-react';
import type { PresetOptions } from '../lib/ffmpeg';

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

const Index = () => {
  const [setupComplete, setSetupComplete] = useState(true);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [conversions, setConversions] = useState<ConversionJob[]>([]);
  
  // Import the ProgressUpdate type from useWebSocket
  type ProgressUpdate = {
    conversionId: string;
    progress: {
      status: 'pending' | 'processing' | 'completed' | 'error';
      percent?: number;
      error?: string;
      downloadUrl?: string;
      timemark?: string;
    };
  };
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleProgressUpdate = useCallback((update: ProgressUpdate) => {
    setConversions(prev => prev.map(job => {
      if (job.id === update.conversionId) {
        return {
          ...job,
          status: update.progress.status,
          progress: update.progress.percent || job.progress,
          error: update.progress.error,
          downloadUrl: update.progress.downloadUrl,
          timemark: update.progress.timemark
        };
      }
      return job;
    }));
  }, []);

  const { connected } = useWebSocket(handleProgressUpdate);

  const handleFilesSelected = async (fileList: FileList) => {
    setIsUploading(true);
    try {
      const result = await apiService.uploadFiles(fileList);
      setFiles(prev => [...prev, ...result.files]);
      toast({
        title: "Files uploaded successfully",
        description: `${result.files.length} file(s) ready for conversion`,
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload files. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleConvert = async (file: FileInfo, preset: string, options: PresetOptions = {}) => {
    // Frontend validation for special presets
    if (preset === 'thumbnail-collage') {
      if (!options.ext || !['jpg','png','webp'].includes(options.ext as string)) {
        toast({ title: 'Invalid Option', description: 'Please select a valid image format for the collage.', variant: 'destructive' });
        return;
      }
      if (!options.grid || typeof options.grid !== 'string' || !/^\d+x\d+$/.test(options.grid)) {
        toast({ title: 'Invalid Option', description: 'Grid size must be like 3x3.', variant: 'destructive' });
        return;
      }
      if (!options.scale || !/^\d+:\d+$/.test(options.scale)) {
        toast({ title: 'Invalid Option', description: 'Scale must be like 320:180.', variant: 'destructive' });
        return;
      }
      if (!options.interval || isNaN(Number(options.interval)) || Number(options.interval) < 1) {
        toast({ title: 'Invalid Option', description: 'Frame interval must be a positive number.', variant: 'destructive' });
        return;
      }
    }
    if (preset === 'watermark' && options.type === 'text') {
      if (!options.text || typeof options.text !== 'string' || !options.text.trim()) {
        toast({ title: 'Invalid Option', description: 'Watermark text is required.', variant: 'destructive' });
        return;
      }
      if (!options.fontfile || typeof options.fontfile !== 'string') {
        toast({ title: 'Invalid Option', description: 'Font file is required for text watermark.', variant: 'destructive' });
        return;
      }
    }
    try {
      const result = await apiService.convertFile(file.id, file.filename, preset, options);
      
      const newJob: ConversionJob = {
        id: result.conversionId,
        file,
        preset,
        status: 'processing',
        progress: 0
      };

      setConversions(prev => [...prev, newJob]);

      // Map preset ID to human-readable name
      let presetName = preset;
      try {
        // Dynamically import PRESETS from ffmpeg.tsx
        // (If you move PRESETS to a shared util, import from there)
        const { PRESETS } = await import('@/lib/ffmpeg');
        const found = PRESETS.find((p: { id: string; name?: string }) => p.id === preset);
        if (found && found.name) presetName = found.name;
      } catch (e) {
        // ignore
      }
      toast({
        title: "Conversion started",
        description: `Converting ${file.originalName} to ${presetName}`,
      });
    } catch (error: unknown) {
      let message = "Failed to start conversion. Please try again.";
      const err = error as { message?: string };
      if (err?.message) {
        try {
          const errObj = JSON.parse(err.message);
          if (errObj && errObj.error) message = errObj.error;
          if (errObj && errObj.message) message = errObj.message;
        } catch (e) {
          // ignore
        }
      }
      toast({
        title: "Conversion failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    setConversions(prev => prev.filter(c => c.file.id !== fileId));
  };

  const handlePresetConvert = (preset: string, options: PresetOptions = {}) => {
    files.forEach(file => {
      handleConvert(file, preset, options);
    });
  };

  const handleCustomCommand = (command: string) => {
    files.forEach(file => {
      handleConvert(file, 'custom', { customCommand: command });
    });
  };

  if (!setupComplete) {
    return <SetupWizard onComplete={() => setSetupComplete(true)} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold mb-2">FFMBox</h1>
            <p className="text-lg sm:text-xl text-muted-foreground">
              Convert your media files with ease
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={connected ? "default" : "secondary"}>
              {connected ? "Connected" : "Disconnected"}
            </Badge>
            <ThemeToggle />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3 space-y-6">
            <FileUpload onFilesSelected={handleFilesSelected} disabled={isUploading} />
            
            <FFmpegPresets 
              onPresetSelect={handlePresetConvert}
              onCustomCommand={handleCustomCommand}
              disabled={files.length === 0}
            />
            
            {files.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="h-5 w-5" />
                    <span>Ready for Conversion</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {files.map(file => (
                    <ConversionCard
                      key={file.id}
                      file={file}
                      onConvert={handleConvert}
                      onRemove={handleRemoveFile}
                      conversion={conversions.find(c => c.file.id === file.id)}
                    />
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Quick Stats</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Files uploaded:</span>
                    <span className="font-medium">{files.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Conversions:</span>
                    <span className="font-medium">{conversions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Completed:</span>
                    <span className="font-medium text-green-600">
                      {conversions.filter(c => c.status === 'completed').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Processing:</span>
                    <span className="font-medium text-red-500">
                      {conversions.filter(c => c.status === 'processing').length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      <FloatingSettings />
    </div>
  );
};

export default Index;
