
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Settings } from 'lucide-react';
import { apiService } from '@/services/api';

interface SetupWizardProps {
  onComplete: () => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const [checking, setChecking] = useState(false);
  const [ffmpegStatus, setFfmpegStatus] = useState<'unknown' | 'available' | 'unavailable'>('unknown');

  const checkFFmpeg = async () => {
    setChecking(true);
    try {
      const status = await apiService.checkFFmpegStatus();
      setFfmpegStatus(status.available ? 'available' : 'unavailable');
    } catch (error) {
      setFfmpegStatus('unavailable');
    } finally {
      setChecking(false);
    }
  };

  const handleComplete = () => {
    onComplete();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Settings className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Setup Media Converter</CardTitle>
          <p className="text-muted-foreground">
            Let's make sure everything is ready for media conversion
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                {ffmpegStatus === 'available' ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : ffmpegStatus === 'unavailable' ? (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                ) : (
                  <div className="h-5 w-5 bg-gray-300 rounded-full" />
                )}
                <div>
                  <p className="font-medium">FFmpeg</p>
                  <p className="text-sm text-muted-foreground">
                    Video processing engine
                  </p>
                </div>
              </div>
              <Badge
                variant={
                  ffmpegStatus === 'available'
                    ? 'default'
                    : ffmpegStatus === 'unavailable'
                    ? 'destructive'
                    : 'secondary'
                }
              >
                {ffmpegStatus === 'available'
                  ? 'Ready'
                  : ffmpegStatus === 'unavailable'
                  ? 'Missing'
                  : 'Unknown'}
              </Badge>
            </div>
          </div>

          <div className="space-y-3">
            {ffmpegStatus === 'unknown' && (
              <Button
                onClick={checkFFmpeg}
                disabled={checking}
                className="w-full"
              >
                {checking ? 'Checking...' : 'Check System Requirements'}
              </Button>
            )}

            {ffmpegStatus === 'unavailable' && (
              <div className="text-center space-y-2">
                <p className="text-sm text-red-600">
                  FFmpeg is not available on this system
                </p>
                <p className="text-xs text-muted-foreground">
                  Please ensure FFmpeg is installed in the Docker container
                </p>
              </div>
            )}

            {ffmpegStatus === 'available' && (
              <Button onClick={handleComplete} className="w-full">
                Continue to App
              </Button>
            )}

            <Button
              variant="outline"
              onClick={handleComplete}
              className="w-full"
            >
              Skip Setup
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
