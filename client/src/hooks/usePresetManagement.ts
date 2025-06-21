import { useState, useEffect, useCallback } from 'react';
import PresetService from '@/services/presetService';
import { 
  AnyPreset, 
  CustomPreset, 
  PresetOptions,
  PresetState, 
  isValidCustomPreset 
} from '@/types/presets';

const usePresetManagement = (initialPresets: AnyPreset[] = []) => {
  const [state, setState] = useState<PresetState>({
    selected: null,
    options: {},
    customCommand: '',
    saveAsPreset: false,
    presetName: '',
    presetDescription: '',
    activeTab: 'presets',
    selectedCategory: 'all',
    customPresets: [],
    isDialogOpen: false,
    editingPreset: null
  });

  // Load custom presets on mount
  useEffect(() => {
    try {
      const loadedPresets = PresetService.getAllPresets()
        .filter(isValidCustomPreset)
        .map(preset => {
          const options: Partial<PresetOptions> = {};
          // Safely copy only valid PresetOptions properties
          if (preset.options) {
            if (preset.options.quality !== undefined) options.quality = Number(preset.options.quality);
            if (preset.options.width !== undefined) options.width = Number(preset.options.width);
            if (preset.options.height !== undefined) options.height = Number(preset.options.height);
            if (preset.options.fps !== undefined) options.fps = Number(preset.options.fps);
            if (preset.options.audioBitrate) options.audioBitrate = String(preset.options.audioBitrate);
            if (preset.options.videoBitrate) options.videoBitrate = String(preset.options.videoBitrate);
          }
          
          return {
            ...preset,
            id: `custom-${Date.now()}`,
            category: 'custom' as const,
            options,
            icon: typeof preset.icon === 'string' ? preset.icon : '⚙️',
            description: typeof preset.description === 'string' ? preset.description : ''
          };
        });
      
      setState(prev => ({
        ...prev,
        customPresets: loadedPresets as CustomPreset[]
      }));
    } catch (error) {
      console.error('Failed to load presets:', error);
    }
  }, []);

  const updateState = useCallback((updates: Partial<PresetState>) => {
    setState(prev => ({
      ...prev,
      ...updates
    }));
  }, []);

  const saveCustomPreset = useCallback((preset: Omit<CustomPreset, 'id'>) => {
    try {
      const newPreset = {
        ...preset,
        id: `custom-${Date.now()}`
      };
      
      PresetService.savePreset(newPreset);
      
      setState(prev => ({
        ...prev,
        customPresets: [...prev.customPresets, newPreset],
        presetName: '',
        presetDescription: '',
        saveAsPreset: false
      }));
      
      return newPreset;
    } catch (error) {
      console.error('Failed to save preset:', error);
      throw error;
    }
  }, []);

  const deleteCustomPreset = useCallback((id: string) => {
    try {
      PresetService.deletePreset(id);
      
      setState(prev => ({
        ...prev,
        customPresets: prev.customPresets.filter(p => p.id !== id),
        selected: prev.selected?.id === id ? null : prev.selected
      }));
    } catch (error) {
      console.error('Failed to delete preset:', error);
      throw error;
    }
  }, []);

  return {
    state,
    updateState,
    saveCustomPreset,
    deleteCustomPreset
  };
};

export default usePresetManagement;
