
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Settings, Info, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const FloatingSettings: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [retentionPeriod, setRetentionPeriod] = useState('24');
  const [outputDir, setOutputDir] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch settings on open
  React.useEffect(() => {
    if (open) {
      setLoading(true);
      fetch('/api/settings')
        .then(res => res.json())
        .then(data => {
          setRetentionPeriod(String(data.retentionPeriod ?? '24'));
          setOutputDir(data.outputDir ?? '');
        })
        .finally(() => setLoading(false));
    }
  }, [open]);

  // Update settings in backend
  const updateSettings = (updates: Partial<{retentionPeriod: string, outputDir: string}>) => {
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        retentionPeriod: updates.retentionPeriod ?? retentionPeriod,
        outputDir: updates.outputDir ?? outputDir
      })
    })
      .then(res => res.json())
      .then(data => {
        setRetentionPeriod(String(data.retentionPeriod ?? '24'));
        setOutputDir(data.outputDir ?? '');
      });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg bg-red-600 hover:bg-red-700 text-white"
          >
            <Settings className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:w-96">
          <SheetHeader>
            <SheetTitle>Settings & Info</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>App Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Retention Period */}
                <div>
                  <label className="block text-sm font-medium mb-1">Delete Uploaded/Converted Files After</label>
                  <select
                    className="w-full p-2 border rounded text-black dark:text-black"
                    value={retentionPeriod}
                    onChange={e => {
                      setRetentionPeriod(e.target.value);
                      updateSettings({ retentionPeriod: e.target.value });
                    }}
                    disabled={loading}
                  >
                    <option value="1">1 hour</option>
                    <option value="6">6 hours</option>
                    <option value="24">1 day</option>
                    <option value="168">1 week</option>
                    <option value="0">Never</option>
                  </select>
                </div>
                {/* Output Directory */}
                <div>
                  <label className="block text-sm font-medium mb-1">Default Output Directory</label>
                  <input
                    className="w-full p-2 border rounded"
                    type="text"
                    value={outputDir}
                    onChange={e => {
                      setOutputDir(e.target.value);
                      updateSettings({ outputDir: e.target.value });
                    }}
                    placeholder="/app/output or C:/Users/you/Downloads"
                    disabled={loading}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Info className="h-4 w-4" />
                  <span>About</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  FFMBox is a powerful web-based tool for converting and compressing media files using FFmpeg.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <HelpCircle className="h-4 w-4" />
                  <span>Supported Formats</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Video:</strong> MP4, AVI, MOV, WMV, FLV, WebM
                  </div>
                  <div>
                    <strong>Audio:</strong> MP3, WAV, FLAC, AAC, OGG
                  </div>
                  <div>
                    <strong>Image:</strong> JPEG, PNG, GIF, WebP
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Use presets for quick conversions</li>
                  <li>• Custom commands give full FFmpeg control</li>
                  <li>• Larger files take more time to process</li>
                  <li>• Check connection status before starting</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
