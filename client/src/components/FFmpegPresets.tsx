import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { 
  Video, 
  Image,
  Settings,
  Film,
  Music2,
  FileImage,
  FileVideo,
  Play
} from 'lucide-react';

type PresetOptions = {
  quality?: number;
  width?: number;
  height?: number;
  audioBitrate?: number;
  videoBitrate?: number;
  fps?: number;
  preset?: string;
  audioCodec?: string;
  lossless?: boolean;
  progressive?: boolean;
  compressionLevel?: number;
  interlaced?: boolean;
  speed?: number;
  [key: string]: string | number | boolean | undefined;
};

interface FFmpegPresetsProps {
  onPresetSelect: (preset: string, options: PresetOptions) => void;
  onCustomCommand: (command: string) => void;
  disabled?: boolean;
  fileType?: string;
}

interface Preset {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'video' | 'audio' | 'image' | 'conversion';
  options?: PresetOptions;
  getOptions?: (fileType: string) => React.ReactNode;
}

// Moved PresetOptions type to the top

const presets: Preset[] = [
  {
    id: 'mp4',
    name: 'MP4 Standard',
    description: 'Standard MP4 with H.264 video and AAC audio',
    icon: <FileVideo className="h-4 w-4" />,
    category: 'video',
    options: { quality: 23, width: 1280, height: 720, fps: 30 },
    getOptions: (fileType) => (
      <div className="space-y-4">
        <div>
          <Label>Quality (0-51, lower is better)</Label>
          <Slider
            min={0}
            max={51}
            step={1}
            value={[23]}
            onValueChange={([value]) => {
              // Update quality
            }}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Best</span>
            <span>Worst</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Width (px)</Label>
            <Input type="number" placeholder="Width" defaultValue={1280} />
          </div>
          <div>
            <Label>Height (px)</Label>
            <Input type="number" placeholder="Height" defaultValue={720} />
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'mp4-hq',
    name: 'MP4 High Quality',
    description: 'High quality MP4 with better compression',
    icon: <Film className="h-4 w-4" />,
    category: 'video',
    options: { quality: 18, width: 1920, height: 1080, fps: 60, preset: 'slow' }
  },
  {
    id: 'webm',
    name: 'WebM',
    description: 'WebM with VP9 video and Opus audio',
    icon: <Video className="h-4 w-4" />,
    category: 'video',
    options: { quality: 30, width: 1280, height: 720, fps: 30 }
  },
  {
    id: 'gif',
    name: 'Animated GIF',
    description: 'Optimized animated GIF',
    icon: <Image className="h-4 w-4" />,
    category: 'conversion',
    options: { fps: 15, width: 640, height: 360 }
  },
  {
    id: 'audio-extract',
    name: 'Extract Audio',
    description: 'Extract audio as MP3',
    icon: <Music2 className="h-4 w-4" />,
    category: 'audio',
    options: { audioBitrate: 192, audioCodec: 'libmp3lame' }
  },
  {
    id: 'webp',
    name: 'WebP Image',
    description: 'WebP image format',
    icon: <FileImage className="h-4 w-4" />,
    category: 'image',
    options: { quality: 85, lossless: false }
  },
  {
    id: 'jpeg',
    name: 'JPEG Image',
    description: 'JPEG image format',
    icon: <FileImage className="h-4 w-4" />,
    category: 'image',
    options: { quality: 90, progressive: true }
  },
  {
    id: 'png',
    name: 'PNG Image',
    description: 'PNG image format',
    icon: <FileImage className="h-4 w-4" />,
    category: 'image',
    options: { compressionLevel: 9, interlaced: false }
  },
  {
    id: 'avif',
    name: 'AVIF Image',
    description: 'Modern AV1 image format',
    icon: <FileImage className="h-4 w-4" />,
    category: 'image',
    options: { quality: 75, speed: 6 }
  }
];

export const FFmpegPresets: React.FC<FFmpegPresetsProps> = ({ 
  onPresetSelect, 
  onCustomCommand,
  disabled,
  fileType = '' 
}) => {
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [options, setOptions] = useState<Partial<PresetOptions>>({});
  const [customCommand, setCustomCommand] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'video' | 'audio' | 'image' | 'conversion'>('all');
  const [activeTab, setActiveTab] = useState('presets');

  type CategoryType = 'all' | 'video' | 'audio' | 'image' | 'conversion';
  
  interface CategoryItem {
    id: CategoryType;
    name: string;
    icon?: React.ReactNode;
  }

  const categories: CategoryItem[] = [
    { id: 'all', name: 'All' },
    { id: 'video', name: 'Video', icon: <Film className="h-4 w-4" /> },
    { id: 'audio', name: 'Audio', icon: <Music2 className="h-4 w-4" /> },
    { id: 'image', name: 'Image', icon: <Image className="h-4 w-4" /> },
    { id: 'conversion', name: 'Conversion', icon: <Settings className="h-4 w-4" /> }
  ];

  const filteredPresets = useMemo(() => 
    selectedCategory === 'all' 
      ? presets 
      : presets.filter(preset => preset.category === selectedCategory),
    [selectedCategory]
  );
  
  const isImage = useMemo(() => {
    if (!selectedPreset) return false;
    return ['jpeg', 'jpg', 'png', 'webp', 'avif', 'gif', 'tiff', 'bmp'].includes(selectedPreset.id);
  }, [selectedPreset]);

  const handleOptionChange = <K extends keyof PresetOptions>(
    key: K, 
    value: number | string | boolean | undefined
  ) => {
    setOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handlePresetSelect = (preset: Preset) => {
    setSelectedPreset(preset);
    setOptions(preset.options || {});
  };

  const handleApply = () => {
    if (activeTab === 'custom' && customCommand) {
      onCustomCommand(customCommand);
    } else if (selectedPreset) {
      const mergedOptions: PresetOptions = {
        ...(selectedPreset.options || {}),
        ...options
      } as PresetOptions;
      onPresetSelect(selectedPreset.id, mergedOptions);
    }
  };

  return (
    <div className="space-y-4">
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="presets">Presets</TabsTrigger>
          <TabsTrigger value="custom">Custom Command</TabsTrigger>
        </TabsList>
        
        <TabsContent value="presets" className="mt-4">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Preset Selection */}
            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Conversion Presets
                </CardTitle>
              </CardHeader>
              <CardContent>
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                size="sm"
                className="gap-2"
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.icon}
                {category.name}
              </Button>
            ))}
          </div>

          {/* Preset Grid */}
          <div className="grid grid-cols-1 gap-2">
            {filteredPresets.map((preset) => (
              <Button
                key={preset.id}
                variant={selectedPreset?.id === preset.id ? 'secondary' : 'ghost'}
                className={`h-auto p-3 justify-start text-left ${selectedPreset?.id === preset.id ? 'border-2 border-primary' : ''}`}
                onClick={() => handlePresetSelect(preset)}
                disabled={disabled}
              >
                <div className="flex items-start gap-3 w-full">
                  <div className="p-2 bg-muted rounded-md">
                    {preset.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{preset.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {preset.description}
                    </div>
                    <div className="mt-1">
                      <Badge variant="outline" className="text-xs">
                        {preset.category}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Button>
            ))}
              </div>
            </CardContent>
          </Card>

          {/* Options Panel */}
          {selectedPreset && (
            <Card className="w-full md:w-96">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  {selectedPreset.name} Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedPreset.getOptions ? (
                  selectedPreset.getOptions(fileType)
                ) : (
                  <div className="space-y-4">
                    {selectedPreset.options?.quality !== undefined && (
                      <div>
                        <Label>Quality</Label>
                        <Slider
                          min={0}
                          max={selectedPreset.id.includes('mp4') ? 51 : 100}
                          step={1}
                          value={[options.quality || selectedPreset.options.quality || 0]}
                          onValueChange={([value]) => 
                            handleOptionChange('quality', value)
                          }
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Best</span>
                          <span>Worst</span>
                        </div>
                      </div>
                    )}
                    
                    {(selectedPreset.options?.width || selectedPreset.options?.height) && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Width (px)</Label>
                          <Input 
                            type="number" 
                            value={options.width || selectedPreset.options.width || ''} 
                            onChange={(e) => handleOptionChange('width', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label>Height (px)</Label>
                          <Input 
                            type="number" 
                            value={options.height || selectedPreset.options.height || ''} 
                            onChange={(e) => handleOptionChange('height', parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                    )}
                    
                    {selectedPreset.options?.fps !== undefined && (
                      <div>
                        <Label>FPS</Label>
                        <Input 
                          type="number" 
                          value={options.fps !== undefined ? options.fps : selectedPreset.options.fps}
                          onChange={(e) => handleOptionChange('fps', parseInt(e.target.value) || 30)}
                        />
                      </div>
                    )}
                    
                    {selectedPreset.options?.audioBitrate !== undefined && (
                      <div>
                        <Label>Audio Bitrate (kbps)</Label>
                        <Input 
                          type="number" 
                          value={options.audioBitrate !== undefined ? options.audioBitrate : selectedPreset.options.audioBitrate}
                          onChange={(e) => handleOptionChange('audioBitrate', parseInt(e.target.value) || 128)}
                        />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button 
                  onClick={handleApply}
                  disabled={disabled}
                  className="gap-2"
                >
                  <Play className="h-4 w-4" />
                  Apply {selectedPreset.name}
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </TabsContent>
      
      <TabsContent value="custom" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Custom FFmpeg Command
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="ffmpeg -i input -c:v libx264 -crf 23 -preset fast output.mp4"
              value={customCommand}
              onChange={(e) => setCustomCommand(e.target.value)}
              className="min-h-[150px] font-mono text-sm"
            />
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button 
              onClick={handleApply}
              disabled={!customCommand.trim()}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              Run Custom Command
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>
    </Tabs>
    </div>
  );
};
