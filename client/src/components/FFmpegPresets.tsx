import { useCallback, useMemo, useState, useEffect, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileCode, Play, Trash2, Settings, Film, Music2, Image as ImageIcon } from 'lucide-react';

import { PRESETS, type BasePreset as FFMpegBasePreset, type CustomPreset as FFMpegCustomPreset } from '@/lib/ffmpeg';
import usePresetManagement from '@/hooks/usePresetManagement';
import { 
  type AnyPreset, 
  type BasePreset, 
  type CustomPreset, 
  type PresetCategory, 
  type PresetOptions, 
  type PresetState,
  isBasePreset,
  isCustomPreset
} from '@/types/presets';

// Type guard to check if a preset is from ffmpeg.tsx
function isFFMpegPreset(preset: unknown): preset is FFMpegBasePreset | FFMpegCustomPreset {
  return Boolean(
    preset && 
    typeof preset === 'object' &&
    'category' in preset && 
    (preset.category === 'custom' || 
     ['video', 'audio', 'image', 'conversion', 'compression', 'extraction'].includes(preset.category as string))
  );
}

// Convert FFMpeg preset to our internal preset type
function toAppPreset(preset: FFMpegBasePreset | FFMpegCustomPreset): AnyPreset {
  if (preset.category === 'custom') {
    return {
      ...preset,
      category: 'custom' as const
    };
  }
  return {
    ...preset,
    category: preset.category as Exclude<PresetCategory, 'custom'>
  };
}

interface FFmpegPresetsProps {
  onPresetSelect: (presetId: string, options: PresetOptions) => void;
  onCustomCommand: (command: string) => void;
  disabled?: boolean;
  fileType?: string;
  className?: string;
}

export const FFmpegPresets: React.FC<FFmpegPresetsProps> = ({
  onPresetSelect,
  onCustomCommand,
  disabled = false,
  fileType,
  className
}) => {
  // Convert FFMpeg presets to our internal format
  const appPresets = useMemo(() => {
    return PRESETS.map(toAppPreset);
  }, []);

  // Use the custom hook for preset management
  const { state, updateState, saveCustomPreset, deleteCustomPreset } = usePresetManagement(appPresets);
  
  // Destructure state for easier access
  const {
    selected: selectedPreset,
    options,
    customCommand,
    saveAsPreset,
    presetName,
    presetDescription,
    activeTab,
    selectedCategory,
    customPresets,
    isDialogOpen,
    editingPreset
  } = state;

  // Update state wrapper to handle type safety
  const updateStateSafe = useCallback(
    (updates: Partial<PresetState> | ((prev: PresetState) => PresetState)) => {
      if (typeof updates === 'function') {
        // If it's a function, call it with the current state to get the partial update
        updateState(updates(state));
      } else {
        // If it's a partial update, pass it through directly
        updateState(updates);
      }
    },
    [updateState, state]
  );

  // Create a safe wrapper for saveCustomPreset
  const savePresetSafe = useCallback(async (preset: Omit<CustomPreset, 'id'>) => {
    try {
      return await saveCustomPreset({
        ...preset,
        category: 'custom' as const
      });
    } catch (error) {
      console.error('Error saving preset:', error);
      throw error;
    }
  }, [saveCustomPreset]);

  // Handle save preset
  const handleSavePreset = useCallback(async (preset: Omit<CustomPreset, 'id'>) => {
    try {
      const newPreset = await savePresetSafe(preset);
      updateState({ selected: newPreset });
      return newPreset;
    } catch (error) {
      console.error('Error saving preset:', error);
      throw error;
    }
  }, [savePresetSafe, updateState]);

  // Get all unique categories from presets
  const categories = useMemo(() => {
    const baseCategories = new Set<PresetCategory>(['all']);
    [...appPresets, ...customPresets].forEach(preset => {
      baseCategories.add(preset.category);
    });
    return Array.from(baseCategories);
  }, [customPresets, appPresets]);

  // Filter presets based on selected category
  const filteredPresets = useMemo(() => {
    const allPresets: AnyPreset[] = [...PRESETS, ...customPresets];
    return selectedCategory === 'all' 
      ? allPresets 
      : allPresets.filter(preset => preset.category === selectedCategory);
  }, [customPresets, selectedCategory]);

  // Check if the selected preset is an image
  const isImage = useMemo(() => {
    return selectedPreset?.category === 'image';
  }, [selectedPreset]);

  // Handle option changes for preset settings
  const handleOptionChange = useCallback(<K extends keyof PresetOptions>(
    key: K, 
    value: PresetOptions[K]
  ) => {
    updateState({
      options: {
        ...state.options,
        [key]: value
      }
    });
  }, [state.options, updateState]);

  // Handle preset selection
  const handlePresetSelect = useCallback((preset: AnyPreset) => {
    if (!preset) return;
    
    updateState({ selected: preset });
    
    // Only set options for built-in presets
    if (isBasePreset(preset)) {
      updateState({
        options: {
          ...(preset.options || {}),
          quality: preset.options?.quality ?? 23,
          width: preset.options?.width,
          height: preset.options?.height,
          fps: preset.options?.fps,
        }
      });
    } else {
      // Reset options for custom presets
      updateState({ options: {} });
    }
  }, [updateState]);

  // Handle category icon
  const getCategoryIcon = (category: PresetCategory) => {
    switch (category) {
      case 'video':
        return <Film className="w-4 h-4" />;
      case 'audio':
        return <Music2 className="w-4 h-4" />;
      case 'image':
        return <ImageIcon className="w-4 h-4" />;
      case 'custom':
        return <Settings className="w-4 h-4" />;
      default:
        return <FileCode className="w-4 h-4" />;
    }
  };

  // Handle apply button click
  const handleApply = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    
    if (activeTab === 'custom' && customCommand) {
      onCustomCommand(customCommand);
      
      // Save as preset if requested
      if (saveAsPreset && presetName.trim()) {
        try {
          const newPreset = await handleSavePreset({
            name: presetName.trim(),
            command: customCommand.trim(),
            description: presetDescription.trim() || `Custom preset: ${presetName.trim()}`,
            icon: '⚙️',
            options: {},
            category: 'custom' as const
          });
          
          // Reset form
          updateState({
            presetName: '',
            presetDescription: '',
            saveAsPreset: false,
            selected: newPreset,
            customCommand: ''
          });
          
        } catch (error) {
          console.error('Failed to save preset:', error);
          // Consider showing an error toast here
        }
      }
      return;
    }
    
    if (!selectedPreset) return;

    if (isCustomPreset(selectedPreset)) {
      onCustomCommand(selectedPreset.command);
    } else if (isBasePreset(selectedPreset)) {
      onPresetSelect(selectedPreset.id, {
        ...selectedPreset.options,
        ...options
      } as PresetOptions);
    }
  }, [
    activeTab, 
    customCommand, 
    onCustomCommand, 
    onPresetSelect, 
    options, 
    saveAsPreset, 
    selectedPreset, 
    presetName, 
    presetDescription, 
    handleSavePreset, 
    updateState
  ]);

  // Handle delete preset
  const handleDeletePreset = useCallback((e: React.MouseEvent<HTMLButtonElement>, id: string) => {
    e.stopPropagation();
    try {
      deleteCustomPreset(id);
      if (selectedPreset?.id === id) {
        updateState({ selected: null });
      }
    } catch (error) {
      console.error('Failed to delete preset:', error);
    }
  }, [deleteCustomPreset, selectedPreset, updateState]);

  // Handle edit preset
  const handleEditPreset = useCallback((e: React.MouseEvent<HTMLButtonElement>, preset: CustomPreset) => {
    e.stopPropagation();
    updateState({
      editingPreset: preset,
      presetName: preset.name,
      presetDescription: preset.description || '',
      customCommand: preset.command,
      isDialogOpen: true
    });
  }, [updateState]);

  // Handle tab change
  const handleTabChange = (value: string) => {
    updateState({ activeTab: value as 'presets' | 'custom' });
  };

  // Handle category change
  const handleCategoryChange = (category: PresetCategory) => {
    updateState({ selectedCategory: category });
  };

  // Handle custom command change
  const handleCustomCommandChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateState({ customCommand: e.target.value });
  };

  // Handle save as preset toggle
  const handleSaveAsPresetChange = (checked: boolean) => {
    updateState({ saveAsPreset: checked });
  };

  // Handle preset name change
  const handlePresetNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateState({ presetName: e.target.value });
  };

  // Handle preset description change
  const handlePresetDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateState({ presetDescription: e.target.value });
  };

  // Handle dialog open/close
  const handleDialogOpenChange = (open: boolean) => {
    updateState({ isDialogOpen: open });
  };

  // Handle save new preset
  const handleSaveNewPreset = useCallback(async () => {
    if (!presetName.trim()) return;

    try {
      const newPreset = await handleSavePreset({
        name: presetName.trim(),
        command: customCommand.trim(),
        description: presetDescription.trim() || `Custom preset: ${presetName.trim()}`,
        icon: '⚙️',
        options: {},
        category: 'custom' as const
      });

      // Reset form
      updateState({
        presetName: '',
        presetDescription: '',
        saveAsPreset: false,
        isDialogOpen: false,
        activeTab: 'presets',
        selected: newPreset,
        customCommand: ''
      });
    } catch (error) {
      console.error('Failed to save preset:', error);
    }
  }, [presetName, customCommand, presetDescription, handleSavePreset, updateState]);

  return (
    <div className={`space-y-4 ${className}`}>
      <Tabs 
        value={activeTab} 
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="presets">Presets</TabsTrigger>
          <TabsTrigger value="custom">Custom Command</TabsTrigger>
        </TabsList>

        <TabsContent value="presets" className="space-y-4">
          {/* Category filter */}
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleCategoryChange(category)}
                className="flex items-center gap-2"
              >
                {getCategoryIcon(category)}
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Button>
            ))}
          </div>

          {/* Presets list */}
          <ScrollArea className="h-[400px] pr-4">
            <div className="grid grid-cols-1 gap-4">
              {filteredPresets.map((preset) => (
                <Card 
                  key={preset.id}
                  className={`cursor-pointer transition-colors ${
                    selectedPreset?.id === preset.id 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:bg-accent/50'
                  }`}
                  onClick={() => handlePresetSelect(preset)}
                >
                  <CardHeader className="p-4">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {typeof preset.icon === 'string' ? (
                          <span>{preset.icon}</span>
                        ) : (
                          preset.icon
                        )}
                        {preset.name}
                        {isCustomPreset(preset) && (
                          <Badge variant="outline" className="ml-2">
                            Custom
                          </Badge>
                        )}
                      </CardTitle>
                      {isCustomPreset(preset) && (
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleEditPreset(e, preset)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDeletePreset(e, preset.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <CardDescription>{preset.description}</CardDescription>
                  </CardHeader>
                  {selectedPreset?.id === preset.id && (
                    <CardContent className="p-4 pt-0">
                      {selectedPreset && (
                        <div className="space-y-4">
                          {isBasePreset(selectedPreset) && selectedPreset.getOptions ? (
                            selectedPreset.getOptions(
                              fileType || '',
                              { ...selectedPreset.options, ...options },
                              (key, value) => {
                                // Safely handle unknown type by checking if it's a valid value for the key
                                const typedKey = key as keyof PresetOptions;
                                const optionValue = value as PresetOptions[typeof typedKey];
                                handleOptionChange(typedKey, optionValue);
                              }
                            )
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              No additional options available for this preset.
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="custom-command">FFmpeg Command</Label>
              <Textarea
                id="custom-command"
                placeholder="Enter your custom FFmpeg command..."
                className="min-h-[200px] font-mono text-sm"
                value={customCommand}
                onChange={handleCustomCommandChange}
                disabled={disabled}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="save-preset"
                checked={saveAsPreset}
                onCheckedChange={handleSaveAsPresetChange}
                disabled={disabled}
              />
              <Label htmlFor="save-preset">Save as preset</Label>
            </div>

            {saveAsPreset && (
              <div className="space-y-4 border p-4 rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="preset-name">Preset Name</Label>
                  <Input
                    id="preset-name"
                    placeholder="My Custom Preset"
                    value={presetName}
                    onChange={handlePresetNameChange}
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preset-description">Description (Optional)</Label>
                  <Textarea
                    id="preset-description"
                    placeholder="A description of what this preset does..."
                    value={presetDescription}
                    onChange={handlePresetDescriptionChange}
                    disabled={disabled}
                  />
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Apply button */}
      <Button 
        className="w-full" 
        onClick={handleApply}
        disabled={disabled || (!selectedPreset && !customCommand)}
      >
        <Play className="mr-2 h-4 w-4" />
        {activeTab === 'custom' ? 'Run Command' : 'Apply Preset'}
      </Button>

      {/* Edit Preset Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Preset</DialogTitle>
            <DialogDescription>
              Update your custom preset details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-preset-name">Name</Label>
              <Input
                id="edit-preset-name"
                value={presetName}
                onChange={handlePresetNameChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-preset-description">Description</Label>
              <Textarea
                id="edit-preset-description"
                value={presetDescription}
                onChange={handlePresetDescriptionChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-preset-command">FFmpeg Command</Label>
              <Textarea
                id="edit-preset-command"
                value={customCommand}
                onChange={handleCustomCommandChange}
                className="min-h-[100px] font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => updateState({ isDialogOpen: false })}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveNewPreset}
              disabled={!presetName.trim() || !customCommand.trim()}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
