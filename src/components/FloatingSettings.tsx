
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Settings, Info, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const FloatingSettings: React.FC = () => {
  const [open, setOpen] = useState(false);

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
                <CardTitle className="flex items-center space-x-2">
                  <Info className="h-4 w-4" />
                  <span>About</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Media Flow Converter is a powerful web-based tool for converting and compressing media files using FFmpeg.
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
