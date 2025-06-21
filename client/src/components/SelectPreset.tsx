import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PRESETS, Preset, PresetOptions } from '@/lib/ffmpeg';

interface SelectPresetProps {
  value: string;
  onChange: (value: string) => void;
  onOptionChange: <K extends keyof PresetOptions>(
    key: K,
    value: PresetOptions[K]
  ) => void;
  options: PresetOptions;
  fileType?: string;
}

export const SelectPreset: React.FC<SelectPresetProps> = ({
  value,
  onChange,
  onOptionChange,
  options,
  fileType
}) => {
  // Filter presets based on file type
  const filteredPresets = PRESETS.filter(preset => {
    if (!fileType) return true;
    
    const fileTypeLower = fileType.toLowerCase();
    
    if (preset.category === 'video') {
      return ['.mp4', '.avi', '.mov', '.mkv', '.webm'].some(ext => 
        fileTypeLower.endsWith(ext)
      );
    }
    
    if (preset.category === 'audio') {
      return ['.mp3', '.wav', '.aac', '.flac'].some(ext =>
        fileTypeLower.endsWith(ext)
      );
    }
    
    if (preset.category === 'image') {
      return ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.tiff', '.bmp'].some(ext =>
        fileTypeLower.endsWith(ext)
      );
    }
    
    return true;
  });

  const selectedPreset = PRESETS.find(p => p.id === value);

  return (
    <div className="space-y-4">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a preset" />
        </SelectTrigger>
        <SelectContent>
          {filteredPresets.map(preset => (
            <SelectItem key={preset.id} value={preset.id}>
              <div className="flex items-center gap-2">
                {preset.icon && <span className="text-muted-foreground">{preset.icon}</span>}
                <span>{preset.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedPreset?.getOptions && (
        <div className="p-4 border rounded-md space-y-4">
          {selectedPreset.getOptions(fileType || '', options, onOptionChange)}
        </div>
      )}
    </div>
  );
};
