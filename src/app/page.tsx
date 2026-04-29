"use client";
import React, { useRef, useState, useEffect } from 'react';
import { Toolbar } from '@/components/Toolbar';
import { CanvasArea } from '@/components/CanvasArea';
import { useEditorStore } from '@/store/useEditorStore';

export default function PixelEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const uiCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [currentImage, setCurrentImage] = useState<HTMLImageElement | null>(null);
  const [cropControlsVisible, setCropControlsVisible] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  const {
    setMode, setImageState, setPan, setZoom, currentScale, brushColor,
    historyStep, updateHistory
  } = useEditorStore();

  const centerCanvas = (imgW: number, imgH: number, scale: number) => {
    if (!containerRef.current) return;
    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;
    const newPanX = (w - imgW * scale) / 2;
    const newPanY = (h - imgH * scale) / 2;
    setPan(newPanX, newPanY);
  };

  const handleZoom = (amount: number) => {
    if (!containerRef.current) return;
    const prevScale = useEditorStore.getState().currentScale;
    const newScale = Math.max(0.5, prevScale + amount);

    const { panX, panY } = useEditorStore.getState();
    const centerX = containerRef.current.clientWidth / 2;
    const centerY = containerRef.current.clientHeight / 2;

    const canvasX = (centerX - panX) / prevScale;
    const canvasY = (centerY - panY) / prevScale;

    const newPanX = centerX - canvasX * newScale;
    const newPanY = centerY - canvasY * newScale;

    setPan(newPanX, newPanY);
    setZoom(newScale);
  };

  const saveState = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(dataUrl);
    setHistory(newHistory);
    updateHistory(newHistory.length - 1, newHistory.length);
  };

  const loadState = (step: number) => {
    if (step < 0 || step >= history.length || !canvasRef.current) return;
    const img = new Image();
    img.onload = () => {
      const { imageWidth, imageHeight, currentScale } = useEditorStore.getState();

      // If the canvas size changed in the history (e.g., after crop or auto process), restore it
      if (img.width !== imageWidth || img.height !== imageHeight) {
        setImageState(img.width, img.height);
        setTimeout(() => {
          const ctx = canvasRef.current?.getContext('2d');
          if (ctx && canvasRef.current) {
            ctx.clearRect(0, 0, img.width, img.height);
            ctx.drawImage(img, 0, 0);
            centerCanvas(img.width, img.height, currentScale);
          }
        }, 50);
      } else {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx && canvasRef.current) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          ctx.drawImage(img, 0, 0);
        }
      }
    };
    img.src = history[step];
    updateHistory(step, history.length);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        loadState(useEditorStore.getState().historyStep - 1);
      } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault();
        loadState(useEditorStore.getState().historyStep + 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history]); // Depend on history so loadState gets the latest closures

  const handleUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        if (!canvasRef.current || !uiCanvasRef.current) return;
        setImageState(img.width, img.height);
        setCurrentImage(img);
        const scale = img.width < 100 ? 5 : 1;
        setZoom(scale);

        // Wait for React to mount the new canvas size before drawing
        setTimeout(() => {
          const ctx = canvasRef.current?.getContext('2d');
          ctx?.clearRect(0, 0, img.width, img.height);
          ctx?.drawImage(img, 0, 0);
          centerCanvas(img.width, img.height, scale);

          setHistory([]);
          updateHistory(-1, 0);
          saveState();
        }, 50);

        setMode('erase');
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = (scale: number) => {
    if (!currentImage || !canvasRef.current) {
      alert("Please upload an image first!");
      return;
    }
    const expCanvas = document.createElement('canvas');
    expCanvas.width = canvasRef.current.width * scale;
    expCanvas.height = canvasRef.current.height * scale;
    const expCtx = expCanvas.getContext('2d');
    if (!expCtx) return;

    expCtx.imageSmoothingEnabled = false;
    expCtx.drawImage(canvasRef.current, 0, 0, expCanvas.width, expCanvas.height);

    const link = document.createElement('a');
    link.download = 'icon_exported.png';
    link.href = expCanvas.toDataURL('image/png');
    link.click();
  };

  const handleAutoProcess = () => {
    if (!currentImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    const corners = [
      0, // top-left
      (w - 1) * 4, // top-right
      ((h - 1) * w) * 4, // bottom-left
      ((h - 1) * w + w - 1) * 4 // bottom-right
    ];

    let bgR = data[0], bgG = data[1], bgB = data[2], bgA = data[3];
    let maxMatches = 0;

    for (let i = 0; i < corners.length; i++) {
      let matches = 0;
      for (let j = 0; j < corners.length; j++) {
        const c1 = corners[i], c2 = corners[j];
        if (Math.abs(data[c1] - data[c2]) <= 15 &&
          Math.abs(data[c1 + 1] - data[c2 + 1]) <= 15 &&
          Math.abs(data[c1 + 2] - data[c2 + 2]) <= 15 &&
          Math.abs(data[c1 + 3] - data[c2 + 3]) <= 15) {
          matches++;
        }
      }
      if (matches > maxMatches) {
        maxMatches = matches;
        bgR = data[corners[i]];
        bgG = data[corners[i] + 1];
        bgB = data[corners[i] + 2];
        bgA = data[corners[i] + 3];
      }
    }

    const tolerance = 15;
    const isBg = (i: number) => {
      // Always treat fully transparent pixels as background so flood-fill can pass through them
      if (data[i + 3] < 10) return true;
      // If the detected background was transparent, we only clear transparent
      if (bgA < 10) return false;
      // Otherwise, match the dynamic background color within tolerance
      return Math.abs(data[i] - bgR) <= tolerance &&
        Math.abs(data[i + 1] - bgG) <= tolerance &&
        Math.abs(data[i + 2] - bgB) <= tolerance;
    };

    const queue: [number, number][] = [];
    for (let x = 0; x < w; x++) {
      if (isBg((x) * 4)) queue.push([x, 0]);
      if (isBg(((h - 1) * w + x) * 4)) queue.push([x, h - 1]);
    }
    for (let y = 0; y < h; y++) {
      if (isBg((y * w) * 4)) queue.push([0, y]);
      if (isBg((y * w + w - 1) * 4)) queue.push([w - 1, y]);
    }

    const visited = new Set<number>();
    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      const idx = y * w + x;
      if (visited.has(idx)) continue;
      visited.add(idx);

      const dataIdx = idx * 4;
      data[dataIdx + 3] = 0;

      const neighbors = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          const nIdx = ny * w + nx;
          if (!visited.has(nIdx) && isBg((ny * w + nx) * 4)) {
            queue.push([nx, ny]);
          }
        }
      }
    }

    let minX = w, minY = h, maxX = 0, maxY = 0;
    let hasPixels = false;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 0) {
          hasPixels = true;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (!hasPixels) {
      ctx.putImageData(imgData, 0, 0);
      saveState();
      return;
    }

    const cw = maxX - minX + 1;
    const ch = maxY - minY + 1;

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = cw;
    cropCanvas.height = ch;
    const cropCtx = cropCanvas.getContext('2d');
    cropCtx?.putImageData(imgData, -minX, -minY);

    setImageState(cw, ch);
    // Needs a timeout for React state to update the DOM canvas elements before drawing
    setTimeout(() => {
      const newCtx = canvasRef.current?.getContext('2d');
      newCtx?.drawImage(cropCanvas, 0, 0);
      centerCanvas(cw, ch, currentScale);
      saveState();
    }, 50);
  };

  const handleApplyCrop = () => {
    const rect = (canvasRef.current as any)?.cropRect;
    if (!rect || !canvasRef.current) return;

    const minX = Math.floor(rect.x);
    const minY = Math.floor(rect.y);
    const cw = Math.floor(rect.w);
    const ch = Math.floor(rect.h);

    if (cw <= 0 || ch <= 0) return;

    const ctx = canvasRef.current.getContext('2d');
    const imgData = ctx?.getImageData(minX, minY, cw, ch);

    setImageState(cw, ch);
    setTimeout(() => {
      const newCtx = canvasRef.current?.getContext('2d');
      if (newCtx && imgData) newCtx.putImageData(imgData, 0, 0);
      centerCanvas(cw, ch, currentScale);
      saveState();
      setCropControlsVisible(false);
      (canvasRef.current as any).setCropRect(null);
    }, 50);
  };

  const handleOutline = () => {
    if (!currentImage || !canvasRef.current) return;
    const w = canvasRef.current.width;
    const h = canvasRef.current.height;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const r = parseInt(brushColor.substring(1, 3), 16);
    const g = parseInt(brushColor.substring(3, 5), 16);
    const b = parseInt(brushColor.substring(5, 7), 16);

    const newW = w + 2;
    const newH = h + 2;
    const newCanvas = document.createElement('canvas');
    newCanvas.width = newW;
    newCanvas.height = newH;
    const newCtx = newCanvas.getContext('2d')!;
    newCtx.drawImage(canvasRef.current, 1, 1);

    const newImgData = newCtx.getImageData(0, 0, newW, newH);
    const newData = newImgData.data;
    const refData = new Uint8ClampedArray(newData);
    let modified = false;

    for (let y = 0; y < newH; y++) {
      for (let x = 0; x < newW; x++) {
        const i = (y * newW + x) * 4;
        if (refData[i + 3] === 0) {
          let hasSolidNeighbor = false;
          const neighbors = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1], [x + 1, y + 1], [x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1]];
          for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < newW && ny >= 0 && ny < newH) {
              if (refData[(ny * newW + nx) * 4 + 3] > 0) {
                hasSolidNeighbor = true;
                break;
              }
            }
          }
          if (hasSolidNeighbor) {
            newData[i] = r;
            newData[i + 1] = g;
            newData[i + 2] = b;
            newData[i + 3] = 255;
            modified = true;
          }
        }
      }
    }
    if (modified) {
      setImageState(newW, newH);
      setTimeout(() => {
        const nextCtx = canvasRef.current?.getContext('2d');
        if (nextCtx) nextCtx.putImageData(newImgData, 0, 0);
        centerCanvas(newW, newH, currentScale);
        saveState();
      }, 50);
    }
  };

  const handleDropShadow = () => {
    if (!currentImage || !canvasRef.current) return;
    const shift = 2;
    const newW = canvasRef.current.width + shift;
    const newH = canvasRef.current.height + shift;

    const newCanvas = document.createElement('canvas');
    newCanvas.width = newW;
    newCanvas.height = newH;
    const newCtx = newCanvas.getContext('2d')!;

    newCtx.drawImage(canvasRef.current, shift, shift);
    newCtx.globalCompositeOperation = 'source-in';
    newCtx.fillStyle = brushColor;
    newCtx.fillRect(0, 0, newW, newH);

    newCtx.globalCompositeOperation = 'source-over';
    newCtx.drawImage(canvasRef.current, 0, 0);

    setImageState(newW, newH);
    setTimeout(() => {
      const nextCtx = canvasRef.current?.getContext('2d');
      if (nextCtx) nextCtx.drawImage(newCanvas, 0, 0);
      centerCanvas(newW, newH, currentScale);
      saveState();
    }, 50);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans selection:bg-indigo-500/30">
      <Toolbar
        onUpload={handleUpload}
        onDownload={handleDownload}
        onUndo={() => loadState(historyStep - 1)}
        onRedo={() => loadState(historyStep + 1)}
        onAutoProcess={handleAutoProcess}
        onOutline={handleOutline}
        onDropShadow={handleDropShadow}
      />

      <div
        className="flex-1 relative flex"
        ref={containerRef}
        onWheel={(e) => {
          if (!currentImage) return;
          const amount = e.deltaY > 0 ? -0.5 : 0.5;
          handleZoom(amount);
        }}
      >
        {!currentImage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 z-10 pointer-events-none">
            <h2 className="text-5xl font-bold mb-2">PixelLab</h2>
            <img src="./favicon.png" alt="Welcome" className="w-64 h-64" />
          </div>
        )}

        <CanvasArea
          canvasRef={canvasRef}
          uiCanvasRef={uiCanvasRef}
          currentImage={currentImage}
          onStateSave={saveState}
          cropControlsVisible={cropControlsVisible}
          setCropControlsVisible={setCropControlsVisible}
          onApplyCrop={handleApplyCrop}
          onCancelCrop={() => {
            (canvasRef.current as any)?.setCropRect(null);
            setCropControlsVisible(false);
          }}
        />

        {currentImage && (
          <div className="absolute bottom-4 left-4 bg-zinc-800/90 backdrop-blur-sm p-2 rounded-lg border border-zinc-700 shadow-xl flex gap-2">
            <button onClick={() => handleZoom(-0.5)} className="p-1 hover:bg-zinc-700 rounded transition-colors" title="Zoom Out">-</button>
            <div className="px-2 font-mono text-sm flex items-center justify-center min-w-16">
              {Math.round(currentScale * 100)}%
            </div>
            <button onClick={() => handleZoom(0.5)} className="p-1 hover:bg-zinc-700 rounded transition-colors" title="Zoom In">+</button>
            <div className="w-px h-6 bg-zinc-600 mx-1 self-center" />
            <button onClick={() => centerCanvas((canvasRef.current?.width || 0), (canvasRef.current?.height || 0), 1)} className="px-2 hover:bg-zinc-700 rounded text-sm font-medium transition-colors">Reset</button>
          </div>
        )}
      </div>
    </div>
  );
}
