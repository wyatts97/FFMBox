import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Play, Settings } from "lucide-react";
import type { BasePreset, PresetOptions } from "@/types/presets";

interface PresetSettingsCardProps {
  preset: BasePreset;
  fileType: string;
  options: PresetOptions;
  disabled: boolean;
  onApply: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onOptionChange: (key: keyof PresetOptions, value: string | number | boolean) => void;
}

export function PresetSettingsCard({ 
  preset, 
  fileType, 
  options, 
  disabled, 
  onApply, 
  onOptionChange 
}: PresetSettingsCardProps) {
  return (
    <Card className="w-full md:w-96">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          {preset.name} Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {preset.getOptions ? (
          preset.getOptions(
            fileType,
            options,
            (key, value) => onOptionChange(key as keyof PresetOptions, value as string | number | boolean)
          )
        ) : (
          <div className="space-y-4">
            {preset.options?.quality !== undefined && (
              <div>
                <Label>Quality</Label>
                <Slider
                  min={0}
                  max={preset.id.includes('mp4') ? 51 : 100}
                  step={1}
                  value={[options.quality ?? preset.options.quality ?? 0]}
                  onValueChange={([value]) => onOptionChange('quality', value)}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Best</span>
                  <span>Worst</span>
                </div>
              </div>
            )}
            
            {(preset.options?.width || preset.options?.height) && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Width (px)</Label>
                  <Input 
                    type="number" 
                    value={options.width ?? preset.options.width ?? ''} 
                    onChange={(e) => onOptionChange('width', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label>Height (px)</Label>
                  <Input 
                    type="number" 
                    value={options.height ?? preset.options.height ?? ''} 
                    onChange={(e) => onOptionChange('height', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            )}
            
            {preset.options?.fps !== undefined && (
              <div>
                <Label>FPS</Label>
                <Input 
                  type="number" 
                  value={options.fps ?? preset.options.fps}
                  onChange={(e) => onOptionChange('fps', parseInt(e.target.value) || 30)}
                />
              </div>
            )}
            
            {preset.options?.audioBitrate !== undefined && (
              <div>
                <Label>Audio Bitrate (kbps)</Label>
                <Input 
                  type="number" 
                  value={options.audioBitrate ?? preset.options.audioBitrate}
                  onChange={(e) => onOptionChange('audioBitrate', parseInt(e.target.value) || 128)}
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button 
          onClick={(e) => {
            e.preventDefault();
            onApply(e);
          }}
          disabled={disabled}
          className="gap-2 w-full"
        >
          <Play className="h-4 w-4" />
          Apply {preset.name}
        </Button>
      </CardFooter>
    </Card>
  );
}

// CustomPresetCard has been moved to its own file
