import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  Music, 
  Smartphone, 
  Monitor, 
  Archive, 
  FileAudio,
  Command,
  Play
} from 'lucide-react';

interface FFmpegPresetsProps {
  onPresetSelect: (preset: string, customCommand?: string) => void;
  disabled?: boolean;
}

interface Preset {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'video' | 'audio' | 'compression';
  command?: string;
}

const presets: Preset[] = [
  {
    id: 'mp4-720p',
    name: 'HD 720p MP4',
    description: 'Standard quality for web',
    icon: <Monitor className="h-4 w-4" />,
    category: 'video'
  },
  {
    id: 'mp4-1080p',
    name: 'Full HD 1080p',
    description: 'High quality video',
    icon: <Video className="h-4 w-4" />,
    category: 'video'
  },
  {
    id: 'mobile-480p',
    name: 'Mobile 480p',
    description: 'Optimized for mobile',
    icon: <Smartphone className="h-4 w-4" />,
    category: 'video'
  },
  {
    id: 'webm',
    name: 'WebM',
    description: 'Web optimized format',
    icon: <Video className="h-4 w-4" />,
    category: 'video'
  },
  {
    id: 'mp3-320k',
    name: 'MP3 320k',
    description: 'High quality audio',
    icon: <Music className="h-4 w-4" />,
    category: 'audio'
  },
  {
    id: 'mp3-128k',
    name: 'MP3 128k',
    description: 'Standard quality audio',
    icon: <FileAudio className="h-4 w-4" />,
    category: 'audio'
  },
  {
    id: 'wav',
    name: 'WAV',
    description: 'Lossless audio',
    icon: <Music className="h-4 w-4" />,
    category: 'audio'
  },
  {
    id: 'compress-50',
    name: 'Compress 50%',
    description: 'Reduce file size by half',
    icon: <Archive className="h-4 w-4" />,
    category: 'compression'
  }
];

export const FFmpegPresets: React.FC<FFmpegPresetsProps> = ({ onPresetSelect, disabled }) => {
  const [customCommand, setCustomCommand] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'video' | 'audio' | 'compression'>('all');

  const categories = [
    { id: 'all', name: 'All' },
    { id: 'video', name: 'Video' },
    { id: 'audio', name: 'Audio' },
    { id: 'compression', name: 'Compression' }
  ];

  const filteredPresets = selectedCategory === 'all' 
    ? presets 
    : presets.filter(preset => preset.category === selectedCategory);

  const handleCustomCommand = () => {
    if (customCommand.trim()) {
      onPresetSelect('custom', customCommand.trim());
      setCustomCommand('');
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'video': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'audio': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'compression': return 'bg-green-500/10 text-green-500 border-green-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Play className="h-5 w-5 text-red-500" />
          <span>Quick Convert Presets</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.id as any)}
              className={selectedCategory === category.id ? "bg-red-600 hover:bg-red-700" : ""}
            >
              {category.name}
            </Button>
          ))}
        </div>

        {/* Preset Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredPresets.map(preset => (
            <Button
              key={preset.id}
              variant="outline"
              className="h-auto p-4 flex flex-col items-center space-y-2 hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-950/20"
              onClick={() => onPresetSelect(preset.id)}
              disabled={disabled}
            >
              <div className="flex items-center space-x-2">
                {preset.icon}
                <Badge className={getCategoryColor(preset.category)}>
                  {preset.category}
                </Badge>
              </div>
              <div className="text-center">
                <div className="font-medium text-sm">{preset.name}</div>
                <div className="text-xs text-muted-foreground">{preset.description}</div>
              </div>
            </Button>
          ))}
        </div>

        {/* Custom Command Section */}
        <div className="border-t pt-6">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Command className="h-4 w-4 text-red-500" />
              <span className="font-medium">Custom FFmpeg Command</span>
            </div>
            <Textarea
              placeholder="Enter custom FFmpeg command (e.g., -vf scale=640:480 -c:v libx264 -preset fast)"
              value={customCommand}
              onChange={(e) => setCustomCommand(e.target.value)}
              className="min-h-[80px] font-mono text-sm"
            />
            <Button
              onClick={handleCustomCommand}
              disabled={disabled || !customCommand.trim()}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              <Command className="h-4 w-4 mr-2" />
              Execute Custom Command
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
