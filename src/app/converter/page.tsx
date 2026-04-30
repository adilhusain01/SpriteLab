"use client";
import React, { useState, useRef, useEffect } from 'react';
import Cropper, { ReactCropperElement } from "react-cropper";
import "cropperjs/dist/cropper.css";
import { UploadCloud, Crop, Download, RefreshCcw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ConverterPage() {
    const [step, setStep] = useState<'upload' | 'crop' | 'edit'>('upload');
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [croppedImgElement, setCroppedImgElement] = useState<HTMLImageElement | null>(null);
    
    // Editor States
    const [blockSize, setBlockSize] = useState(15);
    const [colorLevels, setColorLevels] = useState(4);
    const [edgeThreshold, setEdgeThreshold] = useState(100);

    const cropperRef = useRef<ReactCropperElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setOriginalImage(event.target?.result as string);
                setStep('crop');
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleCrop = () => {
        const cropper = cropperRef.current?.cropper;
        if (cropper) {
            const croppedCanvas = cropper.getCroppedCanvas();
            const img = new Image();
            img.src = croppedCanvas.toDataURL('image/png');
            img.onload = () => {
                setCroppedImgElement(img);
                setStep('edit');
            };
        }
    };

    useEffect(() => {
        if (step === 'edit' && croppedImgElement && canvasRef.current) {
            generateSprite();
        }
    }, [step, croppedImgElement, blockSize, colorLevels, edgeThreshold]);

    const generateSprite = () => {
        if (!croppedImgElement || !canvasRef.current) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const targetWidth = 1200;
        const targetHeight = Math.floor(targetWidth * (croppedImgElement.height / croppedImgElement.width));

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const cols = Math.floor(targetWidth / (blockSize * 2));
        const rows = Math.floor(targetHeight / (blockSize * 2));
        
        if (cols <= 0 || rows <= 0) return;
        
        const actualBlockWidth = targetWidth / cols;
        const actualBlockHeight = targetHeight / rows;

        const offscreen = document.createElement('canvas');
        offscreen.width = cols;
        offscreen.height = rows;
        const octx = offscreen.getContext('2d', { willReadFrequently: true });
        if (!octx) return;

        octx.drawImage(croppedImgElement, 0, 0, cols, rows);
        const imgData = octx.getImageData(0, 0, cols, rows);
        const data = imgData.data;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const posterize = (val: number) => {
            const stepVal = 255 / colorLevels;
            return Math.round(Math.round(val / stepVal) * stepVal);
        };

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const i = (y * cols + x) * 4;
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const a = data[i + 3];

                if (a < 20) continue;

                let isEdge = false;
                const neighbors = [
                    { nx: x + 1, ny: y }, { nx: x - 1, ny: y },
                    { nx: x, ny: y + 1 }, { nx: x, ny: y - 1 }
                ];

                for (const n of neighbors) {
                    if (n.nx >= 0 && n.nx < cols && n.ny >= 0 && n.ny < rows) {
                        const ni = (n.ny * cols + n.nx) * 4;
                        const na = data[ni + 3];

                        if (na < 20) {
                            isEdge = true; break;
                        }

                        const diff = Math.abs(r - data[ni]) + Math.abs(g - data[ni + 1]) + Math.abs(b - data[ni + 2]);
                        if (diff > edgeThreshold) {
                            isEdge = true; break;
                        }
                    } else {
                        isEdge = true; break;
                    }
                }

                if (isEdge) {
                    ctx.fillStyle = `rgba(30, 30, 30, ${a / 255})`;
                } else {
                    ctx.fillStyle = `rgba(${posterize(r)}, ${posterize(g)}, ${posterize(b)}, ${a / 255})`;
                }

                ctx.fillRect(
                    Math.floor(x * actualBlockWidth),
                    Math.floor(y * actualBlockHeight),
                    Math.ceil(actualBlockWidth),
                    Math.ceil(actualBlockHeight)
                );
            }
        }
    };

    const handleDownload = () => {
        if (!canvasRef.current) return;
        const dataURL = canvasRef.current.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'cute-sprite.png';
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const resetAll = () => {
        setStep('upload');
        setOriginalImage(null);
        setCroppedImgElement(null);
    };

    return (
        <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans selection:bg-indigo-500/30">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 p-3 bg-zinc-900 border-b border-zinc-800 shadow-md z-10 sticky top-0 text-zinc-100">
                <Link href="/" className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors" title="Home">
                    <ArrowLeft size={18} />
                </Link>
                
                <div className="w-px h-6 bg-zinc-700 mx-1" />

                <input type="file" id="fileInput" accept="image/*" className="hidden" onChange={handleUpload} />
                <button 
                    onClick={() => document.getElementById('fileInput')?.click()}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
                >
                    <UploadCloud size={16} /> Upload
                </button>

                {originalImage && (
                    <>
                        <div className="w-px h-6 bg-zinc-700 mx-1" />
                        <button onClick={resetAll} className="p-1.5 text-zinc-300 hover:bg-zinc-800 rounded transition-colors" title="Start Over">
                            <RefreshCcw size={18} />
                        </button>

                        {step === 'crop' && (
                            <>
                                <div className="w-px h-6 bg-zinc-700 mx-1" />
                                <button onClick={handleCrop} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-medium transition-colors flex items-center gap-2">
                                    <Crop size={16} /> Apply Crop & Generate
                                </button>
                            </>
                        )}

                        {step === 'edit' && (
                            <>
                                <div className="w-px h-6 bg-zinc-700 mx-1" />
                                
                                <div className="flex items-center gap-2 bg-zinc-800 px-3 py-1 rounded">
                                    <label className="text-xs text-zinc-300 w-[60px]">Block: {blockSize}</label>
                                    <input 
                                        type="range" min="5" max="60" value={blockSize} 
                                        onChange={(e) => setBlockSize(parseInt(e.target.value))}
                                        className="w-24 accent-indigo-500" 
                                    />
                                </div>
                                <div className="flex items-center gap-2 bg-zinc-800 px-3 py-1 rounded">
                                    <label className="text-xs text-zinc-300 w-[60px]">Colors: {colorLevels}</label>
                                    <input 
                                        type="range" min="2" max="16" value={colorLevels} 
                                        onChange={(e) => setColorLevels(parseInt(e.target.value))}
                                        className="w-24 accent-indigo-500" 
                                    />
                                </div>
                                <div className="flex items-center gap-2 bg-zinc-800 px-3 py-1 rounded">
                                    <label className="text-xs text-zinc-300 w-[60px]">Edges: {edgeThreshold}</label>
                                    <input 
                                        type="range" min="10" max="300" value={edgeThreshold} 
                                        onChange={(e) => setEdgeThreshold(parseInt(e.target.value))}
                                        className="w-24 accent-indigo-500" 
                                    />
                                </div>

                                <div className="flex-grow" />
                                <button onClick={handleDownload} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-medium transition-colors flex items-center gap-2">
                                    <Download size={16} /> Export
                                </button>
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Main Canvas Area */}
            <div 
                className="flex-1 relative flex justify-center items-center overflow-hidden"
                style={{
                    backgroundImage: step !== 'upload' ? `
                        linear-gradient(45deg, #1f1f22 25%, transparent 25%),
                        linear-gradient(135deg, #1f1f22 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, #1f1f22 75%),
                        linear-gradient(135deg, transparent 75%, #1f1f22 75%)
                    ` : 'none',
                    backgroundColor: step !== 'upload' ? '#18181b' : 'transparent',
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 10px 0, 10px -10px, 0px 10px',
                }}
            >
                {step === 'upload' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 z-10 pointer-events-none">
                        <h2 className="text-5xl font-bold mb-2">SpriteArt Maker</h2>
                        <img src="/favicon.png" alt="Welcome" className="w-64 h-64 opacity-50 grayscale" />
                        <p className="mt-4 text-zinc-400">Click Upload in the toolbar to start</p>
                    </div>
                )}

                {step === 'crop' && originalImage && (
                    <div className="w-full h-full p-8 flex items-center justify-center">
                        <Cropper
                            src={originalImage}
                            style={{ height: '100%', width: '100%' }}
                            initialAspectRatio={1}
                            guides={false}
                            ref={cropperRef}
                            viewMode={1}
                            background={false}
                            autoCropArea={0.9}
                            responsive={true}
                        />
                    </div>
                )}

                {step === 'edit' && (
                    <div className="w-full h-full flex items-center justify-center p-8 overflow-auto">
                        <canvas 
                            ref={canvasRef} 
                            className="max-w-full max-h-full drop-shadow-2xl border border-zinc-800" 
                            style={{ imageRendering: 'pixelated', display: 'block' }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
