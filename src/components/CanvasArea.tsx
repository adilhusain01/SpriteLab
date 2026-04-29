"use client";
import React, { useEffect, useRef, useState } from "react";
import { useEditorStore } from "@/store/useEditorStore";

interface CanvasAreaProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  uiCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  currentImage: HTMLImageElement | null;
  onStateSave: () => void;
  cropControlsVisible: boolean;
  setCropControlsVisible: (val: boolean) => void;
  onApplyCrop: () => void;
  onCancelCrop: () => void;
}

export function CanvasArea({ 
  canvasRef, uiCanvasRef, currentImage, onStateSave,
  cropControlsVisible, setCropControlsVisible, onApplyCrop, onCancelCrop
}: CanvasAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const brushCursorRef = useRef<HTMLDivElement>(null);
  
  const { 
    mode, brushSize, brushColor, showGrid, 
    currentScale, panX, panY, setZoom, setPan, imageWidth, imageHeight 
  } = useEditorStore();

  const [isPanning, setIsPanning] = useState(false);
  const [spacebarPressed, setSpacebarPressed] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hasModifiedInCurrentStroke, setHasModifiedInCurrentStroke] = useState(false);
  const [darkBg, setDarkBg] = useState(false);

  // Crop states
  const [cropRect, setCropRect] = useState<{x: number, y: number, w: number, h: number} | null>(null);
  const [cropStart, setCropStart] = useState<{x: number, y: number} | null>(null);
  const [cropDragMode, setCropDragMode] = useState<string | null>(null);
  const [panStart, setPanStart] = useState({x:0, y:0});

  // Keyboard events for spacebar panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && currentImage && !spacebarPressed) {
        e.preventDefault();
        setSpacebarPressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setSpacebarPressed(false);
        setIsPanning(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [currentImage, spacebarPressed]);

  // Expose crop data to parent implicitly via refs if needed, but handled locally
  useEffect(() => {
    if (cropRect) {
      // Actually, crop application modifies the canvas directly, which is handled in parent
      // but we need to pass the cropRect out.
      // Let's store crop rect globally? Or keep it here and parent uses a ref.
      // Easiest: attach to canvas element dataset or a custom ref.
      if (canvasRef.current) {
        (canvasRef.current as any).cropRect = cropRect;
        (canvasRef.current as any).setCropRect = setCropRect;
      }
    }
  }, [cropRect, canvasRef, onApplyCrop]);

  const getMousePos = (e: React.MouseEvent | MouseEvent) => {
    if (!uiCanvasRef.current) return { x: 0, y: 0 };
    const rect = uiCanvasRef.current.getBoundingClientRect();
    return {
      x: Math.floor((e.clientX - rect.left) * (uiCanvasRef.current.width / rect.width)),
      y: Math.floor((e.clientY - rect.top) * (uiCanvasRef.current.height / rect.height))
    };
  };

  const performErase = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = "rgba(0,0,0,1)";
    ctx.fillRect(mousePos.x - Math.floor(brushSize / 2), mousePos.y - Math.floor(brushSize / 2), brushSize, brushSize);
    ctx.globalCompositeOperation = 'source-over';
    setHasModifiedInCurrentStroke(true);
  };

  const performPencil = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = brushColor;
    ctx.fillRect(mousePos.x - Math.floor(brushSize / 2), mousePos.y - Math.floor(brushSize / 2), brushSize, brushSize);
    setHasModifiedInCurrentStroke(true);
  };

  const performColorReplace = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !canvasRef.current) return;
    if (mousePos.x < 0 || mousePos.y < 0 || mousePos.x >= canvasRef.current.width || mousePos.y >= canvasRef.current.height) return;
    
    const targetData = ctx.getImageData(mousePos.x, mousePos.y, 1, 1).data;
    const tr = targetData[0], tg = targetData[1], tb = targetData[2], ta = targetData[3];
    if (ta === 0) return; // Do not replace transparent background

    const rr = parseInt(brushColor.substring(1,3), 16);
    const rg = parseInt(brushColor.substring(3,5), 16);
    const rb = parseInt(brushColor.substring(5,7), 16);
    
    const imgData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    const data = imgData.data;
    let modified = false;
    
    for (let i = 0; i < data.length; i += 4) {
      if (data[i+3] > 0 && Math.abs(data[i]-tr)<5 && Math.abs(data[i+1]-tg)<5 && Math.abs(data[i+2]-tb)<5) {
        data[i] = rr;
        data[i+1] = rg;
        data[i+2] = rb;
        modified = true;
      }
    }
    if (modified) {
      ctx.putImageData(imgData, 0, 0);
      onStateSave();
    }
  };

  const getCropHandles = (rect: {x:number, y:number, w:number, h:number}) => ({
    nw: { x: rect.x, y: rect.y },
    n:  { x: rect.x + rect.w/2, y: rect.y },
    ne: { x: rect.x + rect.w, y: rect.y },
    e:  { x: rect.x + rect.w, y: rect.y + rect.h/2 },
    se: { x: rect.x + rect.w, y: rect.y + rect.h },
    s:  { x: rect.x + rect.w/2, y: rect.y + rect.h },
    sw: { x: rect.x, y: rect.y + rect.h },
    w:  { x: rect.x, y: rect.y + rect.h/2 }
  });

  const renderUI = () => {
    const uiCtx = uiCanvasRef.current?.getContext('2d');
    if (!uiCtx || !uiCanvasRef.current) return;
    
    uiCtx.clearRect(0, 0, uiCanvasRef.current.width, uiCanvasRef.current.height);

    if (isPanning || spacebarPressed || mode === 'pan') return;

    if (mode === 'crop') {
      let rectToDraw = null;
      if (cropDragMode === 'draw' && cropStart) {
        const minX = Math.min(cropStart.x, mousePos.x);
        const minY = Math.min(cropStart.y, mousePos.y);
        const width = Math.abs(mousePos.x - cropStart.x);
        const height = Math.abs(mousePos.y - cropStart.y);
        rectToDraw = { x: minX, y: minY, w: width, h: height };
      } else if (cropRect) {
        rectToDraw = cropRect;
      }

      if (rectToDraw) {
        uiCtx.fillStyle = 'rgba(0,0,0,0.5)';
        uiCtx.fillRect(0, 0, uiCanvasRef.current.width, uiCanvasRef.current.height);
        uiCtx.clearRect(rectToDraw.x, rectToDraw.y, rectToDraw.w, rectToDraw.h);
        uiCtx.strokeStyle = '#fff';
        uiCtx.lineWidth = 1 / currentScale;
        uiCtx.setLineDash([4 / currentScale, 4 / currentScale]);
        uiCtx.strokeRect(rectToDraw.x, rectToDraw.y, rectToDraw.w, rectToDraw.h);
        uiCtx.setLineDash([]);
        
        if (cropRect && cropDragMode !== 'draw') {
          const hs = 8 / currentScale;
          const handles = getCropHandles(cropRect);
          uiCtx.fillStyle = 'white';
          Object.values(handles).forEach(p => {
            uiCtx.fillRect(p.x - hs/2, p.y - hs/2, hs, hs);
          });
        }
      }
    }
  };

  useEffect(() => {
    renderUI();
  }, [mode, mousePos, cropDragMode, cropStart, cropRect, currentScale, spacebarPressed, isPanning]);

  const updateBrushCursor = () => {
    if (!brushCursorRef.current || !uiCanvasRef.current || !containerRef.current) return;
    if (!currentImage || (mode !== 'erase' && mode !== 'pencil') || isPanning || spacebarPressed) {
      brushCursorRef.current.style.display = 'none';
      return;
    }
    
    brushCursorRef.current.style.display = 'block';
    brushCursorRef.current.style.borderColor = mode === 'pencil' ? brushColor : 'white';

    const containerRect = containerRef.current.getBoundingClientRect();
    const rect = uiCanvasRef.current.getBoundingClientRect();
    const logicalX = mousePos.x - Math.floor(brushSize / 2);
    const logicalY = mousePos.y - Math.floor(brushSize / 2);
    
    // Position relative to the container
    const screenX = (rect.left - containerRect.left) + logicalX * currentScale;
    const screenY = (rect.top - containerRect.top) + logicalY * currentScale;
    const screenW = brushSize * currentScale;
    
    brushCursorRef.current.style.left = `${screenX}px`;
    brushCursorRef.current.style.top = `${screenY}px`;
    brushCursorRef.current.style.width = `${screenW}px`;
    brushCursorRef.current.style.height = `${screenW}px`;
  };

  useEffect(() => {
    updateBrushCursor();
  }, [mousePos, currentScale, brushSize, mode, isPanning, spacebarPressed, brushColor, currentImage, isInteracting]);


  const handleMouseDown = (e: React.MouseEvent) => {
    if (!currentImage) return;

    if (mode === 'pan' || spacebarPressed || e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (e.button === 0) {
      const pos = getMousePos(e);
      setMousePos(pos);
      
      if (mode === 'crop') {
        if (cropRect) {
          const hs = 12 / currentScale;
          const handles = getCropHandles(cropRect);
          for (let key in handles) {
            const p = handles[key as keyof typeof handles];
            if (Math.abs(pos.x - p.x) <= hs && Math.abs(pos.y - p.y) <= hs) {
              setCropDragMode(key);
              setIsInteracting(true);
              setCropStart(pos);
              return;
            }
          }
          
          if (pos.x >= cropRect.x && pos.x <= cropRect.x + cropRect.w &&
              pos.y >= cropRect.y && pos.y <= cropRect.y + cropRect.h) {
            setCropDragMode('move');
            setIsInteracting(true);
            setCropStart(pos);
            return;
          }
        }
        
        setCropRect(null);
        setCropDragMode('draw');
        setIsInteracting(true);
        setCropStart(pos);
        setCropControlsVisible(false);
      } else {
        setIsInteracting(true);
        setHasModifiedInCurrentStroke(false);
        if (mode === 'erase') performErase();
        else if (mode === 'pencil') performPencil();
        else if (mode === 'fill') performColorReplace();
      }
    }
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!currentImage) return;

      if (isPanning) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        setPan(panX + dx, panY + dy);
        setPanStart({ x: e.clientX, y: e.clientY });
        return;
      }

      if (containerRef.current?.contains(e.target as Node) || isInteracting) {
        const pos = getMousePos(e);
        setMousePos(pos);
        
        if (mode === 'crop' && isInteracting && cropStart) {
          if (cropDragMode === 'draw') {
             // handled in renderUI via mousePos state
          } else if (cropDragMode === 'move' && cropRect) {
            const dx = pos.x - cropStart.x;
            const dy = pos.y - cropStart.y;
            setCropRect({ ...cropRect, x: cropRect.x + dx, y: cropRect.y + dy });
            setCropStart(pos);
          } else if (cropDragMode && cropRect) {
            const dx = pos.x - cropStart.x;
            const dy = pos.y - cropStart.y;
            let newRect = { ...cropRect };
            let newMode = cropDragMode;
            
            if (newMode.includes('w')) { newRect.x += dx; newRect.w -= dx; }
            if (newMode.includes('e')) { newRect.w += dx; }
            if (newMode.includes('n')) { newRect.y += dy; newRect.h -= dy; }
            if (newMode.includes('s')) { newRect.h += dy; }
            
            if (newRect.w < 0) {
              newRect.x += newRect.w;
              newRect.w = Math.abs(newRect.w);
              newMode = newMode.replace('w', 'temp').replace('e', 'w').replace('temp', 'e');
            }
            if (newRect.h < 0) {
              newRect.y += newRect.h;
              newRect.h = Math.abs(newRect.h);
              newMode = newMode.replace('n', 'temp').replace('s', 'n').replace('temp', 's');
            }
            setCropRect(newRect);
            setCropDragMode(newMode);
            setCropStart(pos);
          }
        } else if (isInteracting) {
          if (mode === 'erase') performErase();
          else if (mode === 'pencil') performPencil();
        }
      } else {
        if (brushCursorRef.current && currentImage) brushCursorRef.current.style.display = 'none';
      }
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (isPanning) {
        setIsPanning(false);
        return;
      }

      if (isInteracting) {
        if (mode === 'crop') {
          if (cropDragMode === 'draw' && cropStart) {
            const minX = Math.min(cropStart.x, mousePos.x);
            const minY = Math.min(cropStart.y, mousePos.y);
            const width = Math.abs(mousePos.x - cropStart.x);
            const height = Math.abs(mousePos.y - cropStart.y);
            if (width > 0 && height > 0) {
              setCropRect({ x: minX, y: minY, w: width, h: height });
              setCropControlsVisible(true);
            }
          }
          setCropDragMode(null);
        } else if ((mode === 'erase' || mode === 'pencil') && hasModifiedInCurrentStroke) {
          onStateSave();
        }

        setIsInteracting(false);
        setHasModifiedInCurrentStroke(false);
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [currentImage, isPanning, isInteracting, mode, cropDragMode, cropRect, cropStart, mousePos, panStart, panX, panY, setPan]);

  let cursorStyle = 'default';
  if (spacebarPressed || mode === 'pan') cursorStyle = isPanning ? 'grabbing' : 'grab';
  else if (!currentImage && (mode === 'erase' || mode === 'pencil')) cursorStyle = 'crosshair';
  else if (mode === 'erase' || mode === 'pencil') cursorStyle = 'none';
  else if (mode === 'crop') cursorStyle = 'crosshair';
  else if (mode === 'fill') cursorStyle = 'cell';

  return (
    <div 
      className={`flex-grow relative overflow-hidden select-none ${darkBg ? 'bg-checker-dark' : 'bg-checker-light'}`}
      ref={containerRef}
      onMouseDown={handleMouseDown}
      style={{ cursor: cursorStyle }}
    >
      <div 
        className="absolute left-0 top-0 origin-top-left drop-shadow-2xl"
        style={{ transform: `translate(${panX}px, ${panY}px) scale(${currentScale})` }}
      >
        <canvas 
          ref={canvasRef} 
          width={imageWidth} 
          height={imageHeight} 
          style={{ imageRendering: 'pixelated', display: 'block' }} 
        />
        <canvas 
          ref={uiCanvasRef} 
          width={imageWidth} 
          height={imageHeight} 
          style={{ position: 'absolute', top: 0, left: 0, zIndex: 5, pointerEvents: 'none' }} 
        />
        {/* CSS pixel grid layer */}
        {showGrid && currentScale >= 3 && (
           <div 
             className="absolute top-0 left-0 w-full h-full pointer-events-none pixel-grid opacity-75" 
             style={{ backgroundSize: `1px 1px` }}
           />
        )}
      </div>

      <div 
        ref={brushCursorRef}
        className="absolute pointer-events-none box-border border z-50"
        style={{ boxShadow: '0 0 0 1px black, inset 0 0 0 1px black' }}
      />

      <button 
        onClick={() => setDarkBg(!darkBg)}
        className="absolute bottom-4 right-4 bg-zinc-800 text-zinc-300 hover:text-white p-2 rounded-full shadow-lg border border-zinc-700"
        title="Toggle Dark/Light Background"
      >
        🌗
      </button>

      {/* Crop Controls Float */}
      {cropControlsVisible && mode === 'crop' && cropRect && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-zinc-800 p-2 rounded-lg shadow-xl border border-zinc-700 flex gap-2 z-20">
          <button onClick={onApplyCrop} className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium">Apply Crop</button>
          <button onClick={() => { setCropRect(null); setCropControlsVisible(false); }} className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded font-medium">Cancel</button>
        </div>
      )}
    </div>
  );
}
