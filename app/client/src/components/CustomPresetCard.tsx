import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Settings } from "lucide-react";

import type { CustomPreset as BaseCustomPreset } from '@/lib/ffmpeg';

interface CustomPreset extends Omit<BaseCustomPreset, 'icon'> {
  icon?: React.ReactNode;
}

interface CustomPresetCardProps {
  preset: CustomPreset;
  disabled: boolean;
  onApply: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export function CustomPresetCard({ preset, disabled, onApply }: CustomPresetCardProps) {
  return (
    <Card className="w-full md:w-96">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {preset.icon || <Settings className="h-5 w-5" />}
          {preset.name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="p-4 bg-muted rounded-md">
          <code className="text-sm break-all">{preset.command}</code>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {preset.description}
        </p>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button 
          onClick={(e) => {
            e.preventDefault();
            onApply(e);
          }}
          disabled={disabled}
          className="gap-2"
        >
          <Play className="h-4 w-4" />
          Apply {preset.name}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default CustomPresetCard;
