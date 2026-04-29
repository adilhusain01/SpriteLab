import { create } from 'zustand';

type ToolMode = 'erase' | 'pencil' | 'fill' | 'crop' | 'pan';

interface EditorState {
  mode: ToolMode;
  brushSize: number;
  brushColor: string;
  showGrid: boolean;
  currentScale: number;
  panX: number;
  panY: number;
  imageWidth: number;
  imageHeight: number;
  hasImage: boolean;
  historyStep: number;
  historyLength: number;

  setMode: (mode: ToolMode) => void;
  setBrushSize: (size: number) => void;
  setBrushColor: (color: string) => void;
  toggleGrid: () => void;
  setZoom: (scale: number) => void;
  setPan: (x: number, y: number) => void;
  setImageState: (w: number, h: number) => void;
  updateHistory: (step: number, length: number) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  mode: 'erase',
  brushSize: 5,
  brushColor: '#000000',
  showGrid: false,
  currentScale: 1,
  panX: 0,
  panY: 0,
  imageWidth: 0,
  imageHeight: 0,
  hasImage: false,
  historyStep: -1,
  historyLength: 0,

  setMode: (mode) => set({ mode }),
  setBrushSize: (brushSize) => set({ brushSize }),
  setBrushColor: (brushColor) => set({ brushColor }),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  setZoom: (currentScale) => set({ currentScale }),
  setPan: (panX, panY) => set({ panX, panY }),
  setImageState: (imageWidth, imageHeight) => set({ imageWidth, imageHeight, hasImage: true }),
  updateHistory: (historyStep, historyLength) => set({ historyStep, historyLength }),
}));
