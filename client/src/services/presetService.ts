import type { CustomPreset } from '@/types/presets';

export type { CustomPreset };

class PresetService {
  private static STORAGE_KEY = 'ffmpeg_custom_presets';

  static getAllPresets(): CustomPreset[] {
    if (typeof window === 'undefined') return [];
    
    const presetsJson = localStorage.getItem(this.STORAGE_KEY);
    if (!presetsJson) return [];
    
    try {
      const parsed = JSON.parse(presetsJson);
      
      // Ensure all presets have the correct shape
      return parsed.map((preset: Partial<CustomPreset> & { command?: string }) => ({
        id: preset.id || `custom-${Date.now()}`,
        name: preset.name || 'Unnamed Preset',
        command: preset.command || '',
        description: preset.description || 'No description',
        category: 'custom' as const,
        // Set icon to undefined as we can't serialize/deserialize React elements
        icon: undefined,
      }));
    } catch (e) {
      console.error('Failed to parse custom presets', e);
      return [];
    }
  }

  static savePreset(preset: Omit<CustomPreset, 'id' | 'category'>): CustomPreset[] {
    const presets = this.getAllPresets();
    
    // Create a new preset with required properties
    const newPreset: CustomPreset = {
      ...preset,
      id: `custom-${Date.now()}`,
      category: 'custom',
      // Ensure icon is a valid React node or undefined
      icon: preset.icon || undefined,
    };
    
    // Save to localStorage
    const updatedPresets = [...presets, newPreset];
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedPresets, (key, value) => {
        // Handle serialization of React elements
        if (key === 'icon' && value && typeof value === 'object' && '$$typeof' in value) {
          return null; // Skip React elements during serialization
        }
        return value;
      }));
    } catch (e) {
      console.error('Failed to save custom preset', e);
      throw new Error('Failed to save custom preset');
    }
    
    return updatedPresets;
  }

  static deletePreset(id: string): CustomPreset[] {
    if (!id) {
      console.error('Cannot delete preset: No ID provided');
      return this.getAllPresets();
    }
    
    try {
      const presets = this.getAllPresets();
      const updatedPresets = presets.filter(p => p.id !== id);
      
      if (updatedPresets.length === presets.length) {
        console.warn(`No preset found with ID: ${id}`);
        return presets;
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedPresets));
      return updatedPresets;
    } catch (e) {
      console.error('Failed to delete preset', e);
      return this.getAllPresets();
    }
  }
}

export default PresetService;
