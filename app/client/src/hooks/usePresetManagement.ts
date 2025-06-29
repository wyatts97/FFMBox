import { useState, useEffect, useCallback } from 'react';
import PresetService from '../services/presetService';
import {
  AnyPreset,
  CustomPreset,
  type PresetOptions,
  PresetState,
  isValidCustomPreset
} from '@ffmbox/shared';

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
        .filter(isValidCustomPreset) as CustomPreset[];

      // Ensure loaded presets have correct types and defaults
      const sanitizedPresets = loadedPresets.map(preset => {
        return {
          // Ensure icon is a ReactNode or string, and description is string
          // No need to regenerate ID or re-parse options, as PresetService handles this
          // and the types already reflect the structure.
            ...preset,
            category: 'custom' as const,
            icon: preset.icon || '⚙️', // Default icon if not provided
            description: preset.description || '' // Default description if not provided
          };
        });
      
      setState(prev => ({
        ...prev,
        customPresets: sanitizedPresets
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

  const saveCustomPreset = useCallback(async (preset: Omit<CustomPreset, 'id' | 'category'>): Promise<CustomPreset> => {
    try {
      // Create a new preset with required properties
      const newPreset: Omit<CustomPreset, 'id'> = {
        ...preset,
        category: 'custom' as const,
        icon: typeof preset.icon === 'string' ? preset.icon : '⚙️',
      };

      // Save the preset and get the updated list
      const updatedPresetsList = await PresetService.savePreset(newPreset);
      
      if (!Array.isArray(updatedPresetsList) || updatedPresetsList.length === 0) {
        throw new Error('Failed to save preset: invalid presets list returned');
      }
      
      // The new preset will be the last one in the array
      const savedPreset = updatedPresetsList[updatedPresetsList.length - 1];

      // Update the state with the new presets list
      setState(prev => ({
        ...prev,
        customPresets: [...updatedPresetsList],
        presetName: '',
        presetDescription: '',
        saveAsPreset: false
      }));

      return savedPreset;
    } catch (error) {
      console.error('Failed to save/update preset:', error);
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
