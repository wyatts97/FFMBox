import React, { useState, useMemo, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { FileVideo, FileAudio, FileImage, FileCode, Play, Trash2, Plus, Film, Music2, Image as ImageIcon, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PresetSettingsCard } from "./PresetCards";
import { CustomPresetCard } from "./CustomPresetCard";
import PresetService from '@/services/presetService';
import type { Preset, CustomPreset, PresetOptions, PresetCategory } from '@/lib/ffmpeg';
// Type for the combined preset that can be either built-in or custom
type AnyPreset = Preset | CustomPreset;

// Helper function to check if a preset is a custom preset
const isCustomPreset = (preset: AnyPreset | null): preset is CustomPreset => {
  return preset !== null && preset.category === 'custom';
};

// Helper function to check if a preset is a built-in preset
const isPreset = (preset: AnyPreset | null): preset is Preset => {
  return preset !== null && preset.category !== 'custom';
};

interface FFmpegPresetsProps {
  onPresetSelect: (preset: string, options: PresetOptions) => void;
  onCustomCommand: (command: string) => void;
  disabled?: boolean;
  fileType?: string;
}

// Type guard to check if a value is a Preset
// Using the one defined above

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
    icon: <FileVideo className="h-4 w-4" />, // Changed from Film
    category: 'video',
    options: { quality: 18, width: 1920, height: 1080, fps: 60, preset: 'slow' }
  },
  {
    id: 'webm',
    name: 'WebM',
    description: 'WebM with VP9 video and Opus audio',
    icon: <FileVideo className="h-4 w-4" />, // Changed from Video
    category: 'video',
    options: { quality: 30, width: 1280, height: 720, fps: 30 }
  },
  {
    id: 'gif',
    name: 'Animated GIF',
    description: 'Optimized animated GIF',
    icon: <FileImage className="h-4 w-4" />, // Changed from Image
    category: 'conversion',
    options: { fps: 15, width: 640, height: 360 }
  },
  {
    id: 'audio-extract',
    name: 'Extract Audio',
    description: 'Extract audio as MP3',
    icon: <FileAudio className="h-4 w-4" />, // Changed from Music2
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

// Categories will be defined in the component to use the custom hook

const FFmpegPresets: React.FC<FFmpegPresetsProps> = ({
  onPresetSelect,
  onCustomCommand,
  disabled = false,
  fileType = ''
}) => {
  // State for presets and UI
  const [selectedPreset, setSelectedPreset] = useState<AnyPreset | null>(null);
  const [options, setOptions] = useState<Partial<PresetOptions>>({});
  const [customCommand, setCustomCommand] = useState('');
  const [saveAsPreset, setSaveAsPreset] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [showManagePresets, setShowManagePresets] = useState(false);
  const [activeTab, setActiveTab] = useState('presets');
  const [selectedCategory, setSelectedCategory] = useState<PresetCategory>('all');
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<CustomPreset | null>(null);

  type CategoryType = PresetCategory;
  
  interface CategoryItem {
    id: CategoryType;
    name: string;
    icon?: React.ReactNode;
  }

  // Define categories with proper typing
  const categories = useMemo(() => {
    const baseCategories: CategoryItem[] = [
      { id: 'all' as const, name: 'All', icon: <FileCode className="h-4 w-4" /> },
      { id: 'video' as const, name: 'Video', icon: <Film className="h-4 w-4" /> },
      { id: 'audio' as const, name: 'Audio', icon: <Music2 className="h-4 w-4" /> },
      { id: 'image' as const, name: 'Image', icon: <ImageIcon className="h-4 w-4" /> },
      { id: 'conversion' as const, name: 'Conversion', icon: <Settings className="h-4 w-4" /> },
    ];

    // Only show Custom category if there are custom presets
    if (customPresets.length > 0) {
      return [
        ...baseCategories,
        { id: 'custom' as const, name: 'Custom', icon: <Settings className="h-4 w-4" /> }
      ];
    }
    return baseCategories;
  }, [customPresets]);

  // Load custom presets on mount
  useEffect(() => {
    const loadedPresets = PresetService.getAllPresets();
    setCustomPresets(loadedPresets);
  }, []);

  const filteredPresets = useMemo(() => {
    const allPresets = [...presets, ...customPresets];
    if (selectedCategory === 'all') return allPresets;
    return allPresets.filter(preset => preset.category === selectedCategory);
  }, [customPresets, selectedCategory]);
  
  const isImage = useMemo(() => {
    if (!selectedPreset) return false;
    // For custom presets, we can't determine if they're for images
    if ('category' in selectedPreset && selectedPreset.category === 'custom') {
      return false;
    }
    return ['jpeg', 'jpg', 'png', 'webp', 'avif', 'gif', 'tiff', 'bmp'].includes(selectedPreset.id);
  }, [selectedPreset]);

  const handleOptionChange = <K extends keyof PresetOptions>(
    key: K, 
    value: PresetOptions[K]
  ) => {
    setOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handlePresetSelect = (preset: Preset | CustomPreset) => {
    if (!preset) return;
    
    setSelectedPreset(preset);
    
    // Only set options for built-in presets
    if (isPreset(preset)) {
      setOptions({
        ...preset.options,
        // Ensure required options have default values
        quality: preset.options?.quality ?? 23,
        width: preset.options?.width,
        height: preset.options?.height,
        fps: preset.options?.fps,
      });
    } else {
      // Reset options for custom presets
      setOptions({});
    }
  };
  
  // Helper to safely access preset options
  const getPresetOptions = (preset: Preset | CustomPreset): PresetOptions => {
    return isPreset(preset) ? (preset.options || {}) : {};
  };
  
  // Helper to safely access getOptions function
  const getPresetGetOptions = (preset: Preset | CustomPreset): ((fileType: string) => React.ReactNode) | undefined => {
    return isPreset(preset) ? preset.getOptions : undefined;
  };

  const handleApply = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (activeTab === 'custom' && customCommand) {
      onCustomCommand(customCommand);
      
      // Save as preset if requested
      if (saveAsPreset && presetName.trim()) {
        const newPreset: Omit<CustomPreset, 'id' | 'category'> = {
          name: presetName.trim(),
          command: customCommand.trim(),
          description: presetDescription.trim() || `Custom preset: ${presetName.trim()}`,
          // Don't include the icon here as it will be set to undefined in the service
        };
        
        try {
          // Save the preset using the service
          PresetService.savePreset(newPreset);
          // Refresh the presets list
          setCustomPresets(PresetService.getAllPresets());
          setPresetName('');
          setPresetDescription('');
          setSaveAsPreset(false);
        } catch (error) {
          console.error('Failed to save preset:', error);
          // You might want to show an error message to the user here
        }
      }
      return;
    }
    
    if (!selectedPreset) return;

    if (isPreset(selectedPreset)) {
      onPresetSelect(selectedPreset.id, { ...selectedPreset.options, ...options });
    } else {
      onCustomCommand(selectedPreset.command);
    }
  };

  const handleDeletePreset = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    if (!id) {
      console.warn('Cannot delete preset: No ID provided');
      return;
    }

    try {
      // Don't delete if this is the currently selected preset
      if (selectedPreset && 'id' in selectedPreset && selectedPreset.id === id) {
        setSelectedPreset(null);
      }
      
      // Remove from custom presets using the service
      const updatedPresets = PresetService.deletePreset(id);
      
      // Update local state
      setCustomPresets(updatedPresets);
    } catch (error) {
      console.error('Failed to delete preset:', error);
      // You might want to show an error message to the user here
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
            {categories.map((categoryItem) => (
              <Button
                key={categoryItem.id}
                type="button"
                variant={selectedCategory === categoryItem.id ? 'default' : 'outline'}
                size="sm"
                className={`gap-2 transition-colors ${selectedCategory === categoryItem.id ? 'shadow-md' : 'hover:bg-accent/50'}`}
                onClick={() => setSelectedCategory(categoryItem.id)}
                aria-pressed={selectedCategory === categoryItem.id}
                aria-label={`Filter by ${categoryItem.name} category`}
                title={`Show ${categoryItem.name} presets`}
              >
                {categoryItem.icon}
                <span>{categoryItem.name}</span>
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
            isPreset(selectedPreset) ? (
              <PresetSettingsCard 
                key={`preset-${selectedPreset.id}`}
                preset={selectedPreset}
                fileType={fileType}
                options={{
                  // Merge default options with any user overrides
                  ...selectedPreset.options,
                  ...options
                }}
                disabled={disabled}
                onApply={handleApply}
                onOptionChange={handleOptionChange}
              />
            ) : (
              <CustomPresetCard 
                key={`custom-${selectedPreset.id}`}
                preset={{
                  id: selectedPreset.id || `custom-${Date.now()}`,
                  name: selectedPreset.name || 'Custom Preset',
                  command: selectedPreset.command,
                  description: selectedPreset.description || 'Custom preset',
                  // Don't pass icon as it will be handled by CustomPresetCard
                  category: 'custom' as const
                }}
                disabled={disabled}
                onApply={(e) => {
                  e.preventDefault();
                  if (selectedPreset.command) {
                    onCustomCommand(selectedPreset.command);
                  }
                }}
              />
            )
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
            <div className="space-y-4">
              <Textarea
                placeholder="ffmpeg -i input -c:v libx264 -crf 23 -preset fast output.mp4"
                value={customCommand}
                onChange={(e) => setCustomCommand(e.target.value)}
                className="min-h-[150px] font-mono text-sm"
              />
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="save-preset" 
                  checked={saveAsPreset}
                  onCheckedChange={(checked) => setSaveAsPreset(checked === true)}
                />
                <label
                  htmlFor="save-preset"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Save as preset
                </label>
              </div>
              
              {saveAsPreset && (
                <div className="space-y-2">
                  <Label htmlFor="preset-name">Preset Name</Label>
                  <Input
                    id="preset-name"
                    placeholder="My Custom Preset"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                  />
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <div className="flex justify-between w-full items-center">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setIsDialogOpen(true)}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                Manage Presets
              </Button>
              <Button 
                onClick={handleApply}
                disabled={!customCommand.trim() || (saveAsPreset && !presetName.trim())}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                {saveAsPreset ? 'Save & Run' : 'Run Command'}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </TabsContent>
      
      {/* Manage Presets Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Manage Custom Presets</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {customPresets.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No custom presets saved yet.</p>
            ) : (
              <div className="space-y-2">
                {customPresets.map((preset) => (
                  <div 
                    key={preset.id}
                    className="flex items-center justify-between p-3 border rounded-md hover:bg-accent/50 cursor-pointer"
                    onClick={() => {
                      setCustomCommand(preset.command);
                      setActiveTab('custom');
                      setIsDialogOpen(false);
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{preset.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {preset.command}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0 ml-2"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        handleDeletePreset(preset.id, e);
                      }}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button onClick={() => setIsDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
    </div>
  );
};

export default FFmpegPresets;
