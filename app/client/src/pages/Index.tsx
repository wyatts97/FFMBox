
import React, { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import { FileUpload } from '@/components/FileUpload';
import { ConversionCard } from '@/components/ConversionCard';
import { SetupWizard } from '@/components/SetupWizard';
import { FloatingSettings } from '@/components/FloatingSettings';
import { ThemeToggle } from '@/components/ThemeToggle';
import { FFmpegPresets } from '@/components/FFmpegPresets';
import { apiService } from '@/services/api';
import { useWebSocket, ProgressUpdate } from '@/hooks/useWebSocket';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings, Zap, Wifi, WifiOff, Loader2, Download } from 'lucide-react';
import { ToastAction } from '@/components/ui/toast';
import type { FileInfo, PresetOptions, ConversionJob } from '@/types/presets';

const Index = () => {
  const [setupComplete, setSetupComplete] = useState(true);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [conversions, setConversions] = useState<ConversionJob[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();
  const [lastWsMessage, setLastWsMessage] = useState<ProgressUpdate | null>(null);

  const handleProgressUpdate = useCallback((update: ProgressUpdate) => {
    console.log('Progress update:', update);
    setLastWsMessage(update);
    
    setConversions(prev => {
      const existingJob = prev.find(job => job.id === update.conversionId);
      const now = new Date();
      
      if (!existingJob) {
        console.warn('Received update for unknown conversion ID:', update.conversionId);
        return prev;
      }
      
      return prev.map(job => {
        if (job.id === update.conversionId) {
          const updatedJob = {
            ...job,
            status: update.progress.status,
            progress: update.progress.percent ?? job.progress,
            error: update.progress.error,
            downloadUrl: update.progress.downloadUrl ?? job.downloadUrl,
            timemark: update.progress.timemark ?? job.timemark
          };
          
          // Show toast for completion/error
          if (update.progress.status === 'completed' && job.status !== 'completed') {
            toast({
              title: 'Conversion Complete',
              description: `${job.file.filename} has been converted successfully`,
              action: updatedJob.downloadUrl ? (
                <ToastAction 
                  altText="Download" 
                  onClick={() => window.open(updatedJob.downloadUrl, '_blank')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </ToastAction>
              ) : undefined
            });
          } else if (update.progress.status === 'error' && job.status !== 'error') {
            toast({
              title: 'Conversion Failed',
              description: `Failed to convert ${job.file.filename}: ${update.progress.error || 'Unknown error'}`,
              variant: 'destructive'
            });
          }
          
          return updatedJob;
        }
        return job;
      });
    });
  }, [toast]);

  const { connected, reconnect } = useWebSocket(handleProgressUpdate);
  
  // Add reconnect function if not provided by useWebSocket
  const handleReconnect = useCallback(() => {
    if (reconnect) {
      reconnect();
    } else if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }, [reconnect]);

  // Handle file selection
  const handleFilesSelected = async (fileList: FileList) => {
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Simulate upload progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + Math.random() * 15;
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 300);
      
      const result = await apiService.uploadFiles(fileList);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Small delay to show 100% before resetting
      setTimeout(() => {
        if (result && result.files && Array.isArray(result.files)) {
          setFiles(prev => [...prev, ...result.files]);
          
          toast({
            title: "Files uploaded successfully",
            description: `${result.files.length} file(s) ready for conversion`,
          });
        } else {
          toast({
            title: "Upload issue",
            description: "Files were uploaded but the server response was invalid",
            variant: "destructive",
          });
        }
        
        setIsUploading(false);
      }, 500);
      
    } catch (error) {
      console.error("Upload error:", error);
      setUploadProgress(0);
      setIsUploading(false);
      
      toast({
        title: "Upload failed",
        description: "Failed to upload files. Please try again.",
        variant: "destructive",
      });
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
      if (!options.scale || typeof options.scale !== 'string' || !/^\d+:\d+$/.test(options.scale)) {
        toast({ title: 'Invalid Option', description: 'Scale must be in the format WIDTH:HEIGHT (e.g., 320:180).', variant: 'destructive' });
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
    }
    const conversionId = uuidv4();
    try {
      const startTime = new Date();
      
      const newConversion: ConversionJob = {
        id: conversionId,
        file,
        preset,
        status: 'pending',
        progress: 0,
        startTime,
        options
      };
      
      setConversions(prev => [...prev, newConversion]);
      
      // Start conversion
      const result = await apiService.convertFile(file.id, file.filename, preset, options);
      
      // If the server returned a different conversion ID, update our local ID
      if (result?.conversionId && result.conversionId !== conversionId) {
        setConversions(prev => 
          prev.map(c => c.id === conversionId ? { ...c, id: result.conversionId } : c)
        );
      }
      
      toast({
        title: 'Conversion started',
        description: `Started converting ${file.filename} to ${preset} format`
      });
      
    } catch (error) {
      console.error('Error starting conversion:', error);
      
      // Update the conversion status to error
      setConversions(prev => prev.map(c =>
        c.id === conversionId
          ? { ...c, status: 'error', error: error instanceof Error ? error.message : 'An unknown error occurred' }
          : c
      ));
      
      toast({
        title: 'Conversion failed',
        description: error instanceof Error ? error.message : 'Failed to start conversion',
        variant: 'destructive'
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold">FFMBox</h1>
            <div className="flex items-center text-sm text-muted-foreground">
              {connected ? (
                <span className="flex items-center text-green-500">
                  <Wifi className="w-4 h-4 mr-1" />
                  <span>Connected</span>
                </span>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReconnect}
                  className="flex items-center text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                >
                  <WifiOff className="w-4 h-4 mr-1" />
                  <span>Reconnect</span>
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Badge 
              variant={connected ? "default" : "secondary"}
              className={`flex items-center ${!connected ? "animate-pulse" : ""}`}
            >
              <div className={`w-2 h-2 rounded-full mr-2 ${connected ? "bg-green-500" : "bg-red-500"}`}></div>
              {connected ? "Connected" : "Disconnected"}
            </Badge>
            <ThemeToggle />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3 space-y-6">
            <FileUpload 
              onFilesSelected={handleFilesSelected} 
              disabled={isUploading} 
              isUploading={isUploading}
              uploadProgress={Math.round(uploadProgress)}
            />
            
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
