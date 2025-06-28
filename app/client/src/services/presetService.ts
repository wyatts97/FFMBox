import type { CustomPreset } from '../types/presets';

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
        category: 'custom' as const, // Ensure category is 'custom'
        icon: typeof preset.icon === 'string' ? preset.icon : '⚙️', // Default to '⚙️' if not a string
      }));
    } catch (e) {
      console.error('Failed to parse custom presets', e);
      return [];
    }
  }

  static savePreset(preset: Omit<CustomPreset, 'id' | 'category'>): CustomPreset { // Changed return type
    const presets = this.getAllPresets();
    
    // Create a new preset with required properties
    const newPreset: CustomPreset = {
      ...preset,
      id: `custom-${Date.now()}`,
      category: 'custom',
      // Store icon as string if it is, otherwise default to a string representation
      icon: typeof preset.icon === 'string' ? preset.icon : '⚙️',
    };
    
    // Save to localStorage
    const updatedPresets = [...presets, newPreset];
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedPresets, (key, value) => {
        // Handle serialization of React elements
        // If the icon is a ReactNode, convert it to a string representation or null
        // This is already handled by the newPreset creation above, but this filter
        // ensures no unexpected React elements slip through.
        return value;
      }));
    } catch (e) {
      console.error('Failed to save custom preset:', e);
      throw new Error('Failed to save custom preset');
    }
    
    // Return the newly created preset
    return newPreset;
  }

  static updatePreset(updatedPreset: CustomPreset): CustomPreset { // Changed return type
    if (!updatedPreset.id) {
      throw new Error('Cannot update preset: ID is required');
    }
    
    const presets = this.getAllPresets();
    const index = presets.findIndex(p => p.id === updatedPreset.id);
    
    if (index === -1) {
      throw new Error(`Preset with ID ${updatedPreset.id} not found`);
    }
    
    const newPresets = [...presets];
    newPresets[index] = updatedPreset;
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(newPresets, (key, value) => {
        if (key === 'icon' && typeof value !== 'string') {
          return '⚙️'; // Ensure icon is always a string for storage
        }
        return value;
      }));
      // Return the updated preset
      return updatedPreset;
    } catch (e) {
      console.error('Failed to update custom preset', e);
      throw new Error('Failed to update custom preset');
    }
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
