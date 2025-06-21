import React from 'react';
import { PresetOptions, createChangeHandler } from './ffmpeg';

export const WatermarkOptions: React.FC<{
  options: Partial<PresetOptions>;
  onChange: (key: string, value: unknown) => void;
}> = ({ options, onChange }) => {
  const [fontOptions, setFontOptions] = React.useState<{ label: string; value: string }[]>([]);
  React.useEffect(() => {
    fetch('/api/fonts')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data.fonts)) {
          setFontOptions(
            data.fonts.map((f: string) => ({
              label: f.replace(/\.(ttf|otf)$/i, '').replace(/[-_]/g, ' '),
              value: f
            }))
          );
        }
      })
      .catch(() => {
        setFontOptions([
          { label: 'Arial', value: 'Arial.ttf' },
          { label: 'DejaVu Sans', value: 'DejaVuSans.ttf' },
          { label: 'Liberation Sans', value: 'LiberationSans-Regular.ttf' },
          { label: 'Open Sans', value: 'OpenSans-Regular.ttf' },
          { label: 'Roboto', value: 'Roboto-Regular.ttf' },
        ]);
      });
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Watermark Type</label>
        <select
          value={options.type as string || 'image'}
          onChange={createChangeHandler('type', onChange)}
          className="w-full p-2 border rounded"
        >
          <option value="image">Image</option>
          <option value="text">Text</option>
          <option value="scrolling-text">Scrolling Text</option>
        </select>
      </div>
      {options.type === 'image' && (
        <>
          <label className="block text-sm font-medium mb-1">Image Path (relative to /public/fonts or /uploads)</label>
          <input
            type="text"
            value={options.watermarkPath as string || ''}
            onChange={createChangeHandler('watermarkPath', onChange)}
            className="w-full p-2 border rounded mb-2"
          />
          <label className="block text-sm font-medium mb-1">Scale (%)</label>
          <input
            type="number"
            min={1}
            max={100}
            value={Number(options.scale) || 100}
            onChange={createChangeHandler('scale', onChange, v => Number(v))}
            className="w-full p-2 border rounded mb-2"
          />
          <label className="block text-sm font-medium mb-1">Opacity (0-1)</label>
          <input
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={options.opacity as number || 1}
            onChange={createChangeHandler('opacity', onChange, v => Number(v))}
            className="w-full p-2 border rounded mb-2"
          />
        </>
      )}
      {(options.type === 'image' || options.type === 'text' || options.type === 'scrolling-text') && (
        <>
          <label className="block text-sm font-medium mb-1">Position</label>
          <select
            value={options.position as string || 'bottom-right'}
            onChange={createChangeHandler('position', onChange)}
            className="w-full p-2 border rounded mb-2"
          >
            <option value="top-left">Top Left</option>
            <option value="top-right">Top Right</option>
            <option value="bottom-left">Bottom Left</option>
            <option value="bottom-right">Bottom Right</option>
            <option value="center">Center</option>
            <option value="custom">Custom</option>
          </select>
          {options.position === 'custom' && (
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="X"
                value={options.x as number || 0}
                onChange={createChangeHandler('x', onChange, v => Number(v))}
                className="w-full p-2 border rounded"
              />
              <input
                type="number"
                placeholder="Y"
                value={options.y as number || 0}
                onChange={createChangeHandler('y', onChange, v => Number(v))}
                className="w-full p-2 border rounded"
              />
            </div>
          )}
          <label className="block text-sm font-medium mb-1">Margin (px)</label>
          <input
            type="number"
            min={0}
            value={options.margin as number || 10}
            onChange={createChangeHandler('margin', onChange, v => Number(v))}
            className="w-full p-2 border rounded mb-2"
          />
        </>
      )}
      {(options.type === 'text' || options.type === 'scrolling-text') && (
        <>
          <label className="block text-sm font-medium mb-1">Watermark Text</label>
          <textarea
            value={options.text as string || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange('text', e.target.value)}
            className="w-full p-2 border rounded mb-2 min-h-[60px]"
            placeholder="Enter watermark text here..."
          />
          <label className="block text-sm font-medium mb-1">Font</label>
          <select
            value={options.fontfile as string || 'Arial.ttf'}
            onChange={createChangeHandler('fontfile', onChange)}
            className="w-full p-2 border rounded mb-2"
          >
            {fontOptions.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <label className="block text-sm font-medium mb-1">Font Size</label>
          <input
            type="number"
            min={8}
            max={200}
            value={options.fontsize as number || 24}
            onChange={createChangeHandler('fontsize', onChange, v => Number(v))}
            className="w-full p-2 border rounded mb-2"
          />
          <label className="block text-sm font-medium mb-1">Font Color (e.g. white@0.7)</label>
          <input
            type="text"
            value={options.fontcolor as string || 'white@0.7'}
            onChange={createChangeHandler('fontcolor', onChange)}
            className="w-full p-2 border rounded mb-2"
          />
          <label className="block text-sm font-medium mb-1">Shadow X</label>
          <input
            type="number"
            value={options.shadowx as number || 2}
            onChange={createChangeHandler('shadowx', onChange, v => Number(v))}
            className="w-full p-2 border rounded mb-2"
          />
          <label className="block text-sm font-medium mb-1">Shadow Y</label>
          <input
            type="number"
            value={options.shadowy as number || 2}
            onChange={createChangeHandler('shadowy', onChange, v => Number(v))}
            className="w-full p-2 border rounded mb-2"
          />
          <label className="block text-sm font-medium mb-1">Outline Color</label>
          <input
            type="text"
            value={options.outlinecolor as string || 'black'}
            onChange={createChangeHandler('outlinecolor', onChange)}
            className="w-full p-2 border rounded mb-2"
          />
          <label className="block text-sm font-medium mb-1">Outline Width</label>
          <input
            type="number"
            value={options.outlinewidth as number || 2}
            onChange={createChangeHandler('outlinewidth', onChange, v => Number(v))}
            className="w-full p-2 border rounded mb-2"
          />
          <label className="block text-sm font-medium mb-1">Opacity (0-1)</label>
          <input
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={options.opacity as number || 1}
            onChange={createChangeHandler('opacity', onChange, v => Number(v))}
            className="w-full p-2 border rounded mb-2"
          />
          <label className="block text-sm font-medium mb-1">Rotation (degrees)</label>
          <input
            type="number"
            value={options.rotation as number || 0}
            onChange={createChangeHandler('rotation', onChange, v => Number(v))}
            className="w-full p-2 border rounded mb-2"
          />
          <label className="block text-sm font-medium mb-1">Start Time (seconds)</label>
          <input
            type="number"
            min={0}
            value={options.start as number || 0}
            onChange={createChangeHandler('start', onChange, v => Number(v))}
            className="w-full p-2 border rounded mb-2"
          />
          <label className="block text-sm font-medium mb-1">End Time (seconds, 0 = full video)</label>
          <input
            type="number"
            min={0}
            value={options.end as number || 0}
            onChange={createChangeHandler('end', onChange, v => Number(v))}
            className="w-full p-2 border rounded mb-2"
          />
          <label className="block text-sm font-medium mb-1">Fade In (seconds)</label>
          <input
            type="number"
            min={0}
            value={options.fadein as number || 0}
            onChange={createChangeHandler('fadein', onChange, v => Number(v))}
            className="w-full p-2 border rounded mb-2"
          />
          <label className="block text-sm font-medium mb-1">Fade Out (seconds)</label>
          <input
            type="number"
            min={0}
            value={options.fadeout as number || 0}
            onChange={createChangeHandler('fadeout', onChange, v => Number(v))}
            className="w-full p-2 border rounded mb-2"
          />
        </>
      )}
      {options.type === 'scrolling-text' && (
        <>
          <label className="block text-sm font-medium mb-1">Scroll Speed (pixels/sec)</label>
          <input
            type="number"
            min={10}
            max={500}
            value={options.scrollspeed as number || 50}
            onChange={createChangeHandler('scrollspeed', onChange, v => Number(v))}
            className="w-full p-2 border rounded mb-2"
          />
          <label className="block text-sm font-medium mb-1">Vertical Position</label>
          <select
            value={options.scrollpos as string || 'bottom'}
            onChange={createChangeHandler('scrollpos', onChange)}
            className="w-full p-2 border rounded mb-2"
          >
            <option value="top">Top</option>
            <option value="middle">Middle</option>
            <option value="bottom">Bottom</option>
          </select>
        </>
      )}
    </div>
  );
};
