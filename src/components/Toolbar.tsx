"use client";
import { useEditorStore } from "@/store/useEditorStore";
import { 
  Eraser, Pencil, PaintBucket, Crop, Hand, Undo, Redo, 
  Grid3X3, ImageDown, Sparkles, Download, ImagePlus
} from "lucide-react";
import { useRef } from "react";

export function Toolbar({
  onUndo, onRedo, onUpload, onDownload, onAutoProcess, onOutline, onDropShadow
}: {
  onUndo: () => void;
  onRedo: () => void;
  onUpload: (file: File) => void;
  onDownload: (scale: number) => void;
  onAutoProcess: () => void;
  onOutline: () => void;
  onDropShadow: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { 
    mode, setMode, brushSize, setBrushSize, brushColor, setBrushColor, 
    showGrid, toggleGrid, historyStep, historyLength
  } = useEditorStore();

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 bg-zinc-900 border-b border-zinc-800 shadow-md z-10 sticky top-0 text-zinc-100">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
        accept="image/*" 
        className="hidden" 
      />
      <button 
        onClick={() => fileInputRef.current?.click()}
        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
      >
        <ImagePlus size={16} /> Upload
      </button>

      <div className="w-px h-6 bg-zinc-700 mx-1" />

      <button onClick={onUndo} disabled={historyStep <= 0} className="p-1.5 text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 rounded transition-colors" title="Undo">
        <Undo size={18} />
      </button>
      <button onClick={onRedo} disabled={historyStep >= historyLength - 1} className="p-1.5 text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 rounded transition-colors" title="Redo">
        <Redo size={18} />
      </button>

      <div className="w-px h-6 bg-zinc-700 mx-1" />

      <div className="flex bg-zinc-800 rounded p-1">
        <ToolButton active={mode === 'pencil'} onClick={() => setMode('pencil')} icon={<Pencil size={16} />} title="Draw (P)" />
        <ToolButton active={mode === 'erase'} onClick={() => setMode('erase')} icon={<Eraser size={16} />} title="Erase (E)" />
        <ToolButton active={mode === 'fill'} onClick={() => setMode('fill')} icon={<PaintBucket size={16} />} title="Replace Color (F)" />
        <ToolButton active={mode === 'crop'} onClick={() => setMode('crop')} icon={<Crop size={16} />} title="Crop (C)" />
        <ToolButton active={mode === 'pan'} onClick={() => setMode('pan')} icon={<Hand size={16} />} title="Pan (Spacebar)" />
      </div>

      {(mode === 'pencil' || mode === 'erase') && (
        <div className="flex items-center gap-2 ml-1 bg-zinc-800 px-3 py-1 rounded">
          <label className="text-xs text-zinc-300">Size: {brushSize}px</label>
          <input 
            type="range" min="1" max="50" value={brushSize} 
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            className="w-20 accent-indigo-500"
          />
        </div>
      )}

      <div className="w-px h-6 bg-zinc-700 mx-1" />
      
      <input 
        type="color" 
        value={brushColor} 
        onChange={(e) => setBrushColor(e.target.value)}
        className="w-7 h-7 rounded cursor-pointer border-0 p-0"
        title="Brush Color"
      />

      <button onClick={onOutline} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-sm font-medium transition-colors flex items-center gap-2">
        <Grid3X3 size={16} /> Outline
      </button>
      
      <button onClick={onDropShadow} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-sm font-medium transition-colors flex items-center gap-2">
        <ImageDown size={16} /> Shadow
      </button>

      <button onClick={onAutoProcess} className="px-3 py-1.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded text-sm font-medium transition-colors flex items-center gap-2">
        <Sparkles size={16} /> Auto Magic
      </button>

      <div className="flex-grow" />

      <button 
        onClick={toggleGrid} 
        className={`px-3 py-1 text-sm rounded font-medium transition-colors ${showGrid ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
      >
        Grid
      </button>

      <div className="flex items-center gap-2 ml-2">
        <select id="exportScale" defaultValue="1" className="bg-zinc-800 text-zinc-100 text-sm rounded px-2 py-1 outline-none border border-zinc-700">
          <option value="1">1x Size</option>
          <option value="2">2x Size</option>
          <option value="4">4x Size</option>
          <option value="8">8x Size</option>
          <option value="16">16x Size</option>
        </select>
        <button 
          onClick={() => {
            const scale = parseInt((document.getElementById('exportScale') as HTMLSelectElement).value);
            onDownload(scale);
          }}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Download size={16} /> Export
        </button>
      </div>
    </div>
  );
}

function ToolButton({ active, onClick, icon, title }: { active: boolean, onClick: () => void, icon: React.ReactNode, title: string }) {
  return (
    <button 
      onClick={onClick} 
      title={title}
      className={`p-1.5 rounded transition-colors ${active ? 'bg-indigo-500 text-white shadow-sm' : 'text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100'}`}
    >
      {icon}
    </button>
  );
}
