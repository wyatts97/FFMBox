
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Settings, Info, HelpCircle, Trash2, History, Cog, FileCheck, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface ConversionHistoryItem {
  id: string;
  filename: string;
  preset: string;
  timestamp: string;
  status: 'completed' | 'error';
  downloadUrl?: string;
}

export const FloatingSettings: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [retentionPeriod, setRetentionPeriod] = useState('24');
  const [outputDir, setOutputDir] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('settings');
  const [darkMode, setDarkMode] = useState(true);
  const [autoDownload, setAutoDownload] = useState(false);
  const [conversionHistory, setConversionHistory] = useState<ConversionHistoryItem[]>([]);

  // Fetch settings on open
  useEffect(() => {
    if (open) {
      setLoading(true);
      fetch('/api/settings')
        .then(res => res.json())
        .then(data => {
          setRetentionPeriod(String(data.retentionPeriod ?? '24'));
          setOutputDir(data.outputDir ?? '');
        })
        .finally(() => setLoading(false));
      
      // Simulate fetching conversion history
      // In a real app, this would come from an API or local storage
      const mockHistory: ConversionHistoryItem[] = [
        {
          id: '1',
          filename: 'video1.mp4',
          preset: 'mp4-720p',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          status: 'completed',
          downloadUrl: '#'
        },
        {
          id: '2',
          filename: 'audio.mp3',
          preset: 'mp3',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          status: 'completed',
          downloadUrl: '#'
        },
        {
          id: '3',
          filename: 'image.jpg',
          preset: 'webp',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          status: 'error'
        }
      ];
      setConversionHistory(mockHistory);
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

  // Handle cleanup
  const handleCleanup = () => {
    // In a real app, this would call an API to clean up files
    alert('Cleanup initiated. Old files will be removed based on retention settings.');
  };

  // Format relative time
  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffDay > 0) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    if (diffHour > 0) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    if (diffMin > 0) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg bg-red-600 hover:bg-red-700 text-white transition-all hover:scale-105"
          >
            <Settings className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-xl flex items-center gap-2">
              <Settings className="h-5 w-5" />
              FFMBox Settings
            </SheetTitle>
          </SheetHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="settings" className="flex items-center gap-1">
                <Cog className="h-4 w-4" />
                <span>Settings</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-1">
                <History className="h-4 w-4" />
                <span>History</span>
              </TabsTrigger>
              <TabsTrigger value="about" className="flex items-center gap-1">
                <Info className="h-4 w-4" />
                <span>About</span>
              </TabsTrigger>
            </TabsList>
            
            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">File Management</CardTitle>
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
                  
                  <Button 
                    variant="outline" 
                    className="w-full mt-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={handleCleanup}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clean Up Old Files
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Appearance & Behavior</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="dark-mode">Dark Mode</Label>
                      <p className="text-xs text-muted-foreground">
                        Use dark theme for the application
                      </p>
                    </div>
                    <Switch
                      id="dark-mode"
                      checked={darkMode}
                      onCheckedChange={setDarkMode}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="auto-download">Auto Download</Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically download files after conversion
                      </p>
                    </div>
                    <Switch
                      id="auto-download"
                      checked={autoDownload}
                      onCheckedChange={setAutoDownload}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* History Tab */}
            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Conversion History</span>
                    <Badge variant="outline" className="ml-2">
                      {conversionHistory.length} items
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {conversionHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No conversion history yet
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                      {conversionHistory.map(item => (
                        <div 
                          key={item.id} 
                          className={`p-3 rounded-md border ${
                            item.status === 'completed' ? 'border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800' : 
                            'border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <p className="font-medium text-sm">{item.filename}</p>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {item.preset}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatRelativeTime(item.timestamp)}
                                </span>
                              </div>
                            </div>
                            {item.status === 'completed' && item.downloadUrl && (
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" asChild>
                                <a href={item.downloadUrl} download>
                                  <Download className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-xs"
                    onClick={() => setConversionHistory([])}
                  >
                    Clear History
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            {/* About Tab */}
            <TabsContent value="about" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center space-x-2">
                    <Info className="h-4 w-4" />
                    <span>About FFMBox</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center mb-4">
                    <img 
                      src="/512x512.webp" 
                      alt="FFMBox Logo" 
                      className="w-16 h-16 rounded-lg shadow-md"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    FFMBox is a powerful web-based tool for converting and compressing media files using FFmpeg.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2 bg-muted rounded-md">
                      <p className="text-xs font-medium">Version</p>
                      <p className="text-sm">1.0.0</p>
                    </div>
                    <div className="p-2 bg-muted rounded-md">
                      <p className="text-xs font-medium">FFmpeg</p>
                      <p className="text-sm">6.0</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center space-x-2">
                    <FileCheck className="h-4 w-4" />
                    <span>Supported Formats</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Video:</strong> MP4, AVI, MOV, MKV, WebM
                    </div>
                    <div>
                      <strong>Audio:</strong> MP3, WAV, FLAC, AAC, OGG
                    </div>
                    <div>
                      <strong>Image:</strong> JPEG, PNG, GIF, WebP, AVIF
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tips</CardTitle>
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
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </div>
  );
};
