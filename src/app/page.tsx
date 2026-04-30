"use client";
import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Palette, Gamepad2, ArrowRight, Sparkles } from 'lucide-react';

const vertexShaderSource = `
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = position;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  precision mediump float;
  varying vec2 vUv;
  uniform float u_time;
  uniform vec2 u_resolution;

  float hash(float n) { return fract(sin(n) * 1e4); }
  float hash(vec2 p) { return fract(1e4 * sin(17.0 * p.x + p.y * 0.1) * (0.1 + abs(sin(p.y * 13.0 + p.x)))); }

  float noise(vec3 x) {
    const vec3 step = vec3(110.0, 241.0, 171.0);
    vec3 i = floor(x);
    vec3 f = fract(x);
    float n = dot(i, step);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix( hash(n + dot(step, vec3(0.0, 0.0, 0.0))), hash(n + dot(step, vec3(1.0, 0.0, 0.0))), u.x),
                   mix( hash(n + dot(step, vec3(0.0, 1.0, 0.0))), hash(n + dot(step, vec3(1.0, 1.0, 0.0))), u.x), u.y),
               mix(mix( hash(n + dot(step, vec3(0.0, 0.0, 1.0))), hash(n + dot(step, vec3(1.0, 0.0, 1.0))), u.x),
                   mix( hash(n + dot(step, vec3(0.0, 1.0, 1.0))), hash(n + dot(step, vec3(1.0, 1.0, 1.0))), u.x), u.y), u.z);
  }

  float map(vec3 p) {
    float d = length(p) - 1.2;
    d += noise(p * 2.0 + u_time * 0.8) * 0.4;
    d += noise(p * 3.0 - u_time * 0.5) * 0.2;
    return d;
  }

  vec3 calcNormal(vec3 p) {
    vec2 e = vec2(0.01, 0.0);
    return normalize(vec3(
      map(p + e.xyy) - map(p - e.xyy),
      map(p + e.yxy) - map(p - e.yxy),
      map(p + e.yyx) - map(p - e.yyx)
    ));
  }

  void main() {
    vec2 uv = vUv;
    uv.x *= u_resolution.x / u_resolution.y;

    vec3 ro = vec3(0.0, 0.0, 3.5);
    vec3 rd = normalize(vec3(uv, -1.0));

    float t = 0.0;
    float max_t = 10.0;
    vec3 p;
    for(int i = 0; i < 40; i++) {
      p = ro + rd * t;
      float d = map(p);
      if(d < 0.01 || t > max_t) break;
      t += d;
    }

    vec3 col = vec3(0.0);
    if(t < max_t) {
      vec3 n = calcNormal(p);
      vec3 light = normalize(vec3(1.0, 1.0, 1.0));
      float dif = max(dot(n, light), 0.0);
      float amb = 0.2;
      
      vec3 viewDir = normalize(ro - p);
      vec3 reflectDir = reflect(-light, n);
      float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);

      float brightness = dif + amb + spec * 0.8;
      col = vec3(brightness);
    }

    float vignette = smoothstep(1.5, 0.5, length(uv));
    col *= vignette;

    gl_FragColor = vec4(col, 1.0);
  }
`;

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

const ASCIIBlob = () => {
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    const cols = 90;
    const rows = 45;
    canvas.width = cols;
    canvas.height = rows;

    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) return;

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1.0, -1.0, 1.0, -1.0, -1.0, 1.0,
      -1.0, 1.0, 1.0, -1.0, 1.0, 1.0
    ]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const timeLocation = gl.getUniformLocation(program, 'u_time');
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');

    gl.uniform2f(resolutionLocation, cols * 0.5, rows);

    let animationFrameId: number;
    const startTime = performance.now();
    const pixels = new Uint8Array(cols * rows * 4);

    const chars = ' .:-=+*#%@';

    const render = () => {
      const time = (performance.now() - startTime) * 0.001;
      gl.uniform1f(timeLocation, time);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.readPixels(0, 0, cols, rows, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      let text = '';
      for (let y = rows - 1; y >= 0; y--) {
        for (let x = 0; x < cols; x++) {
          const i = (y * cols + x) * 4;
          const brightness = pixels[i] / 255;
          const charIdx = Math.min(Math.floor(brightness * chars.length), chars.length - 1);
          text += chars[charIdx];
        }
        text += '\n';
      }

      if (preRef.current) {
        preRef.current.textContent = text;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      gl.deleteProgram(program);
    };
  }, []);

  return (
    <pre
      ref={preRef}
      className="text-[8px] md:text-[10px] lg:text-[12px] leading-[1] font-mono text-indigo-500/60 font-bold select-none overflow-hidden"
      style={{ letterSpacing: '0.1em' }}
    />
  );
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center relative overflow-hidden font-sans selection:bg-indigo-500/30">

      {/* ASCII Background Blob */}
      <div className="absolute inset-0 flex items-center justify-center opacity-40 mix-blend-screen pointer-events-none z-0">
        <ASCIIBlob />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl w-full px-6 flex flex-col items-center text-center mt-[-5vh]">

        <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-6 bg-gradient-to-br from-zinc-100 via-zinc-300 to-zinc-600 bg-clip-text text-transparent">
          SpriteLab
        </h1>

        <p className="text-xl md:text-2xl text-zinc-400 max-w-2xl mb-12 leading-relaxed">
          The ultimate pixel-art toolset. Create, edit, and convert your images into stunning retro sprites right in your browser.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl justify-center">
          {/* Card 1: Main Editor */}
          <Link href="/editor" className="group flex-1 bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 hover:border-indigo-500/50 p-6 rounded-2xl transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 text-left hover:-translate-y-1">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <Palette className="text-indigo-400" size={24} />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-zinc-100 group-hover:text-indigo-400 transition-colors">Pixel Editor</h2>
            <p className="text-zinc-500 mb-6 text-sm">A full-featured pixel art editor with layers, custom palettes, and auto-magic tools.</p>
            <div className="flex items-center text-indigo-400 font-medium text-sm gap-2">
              Launch Editor <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 2: Converter */}
          <Link href="/converter" className="group flex-1 bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 hover:border-fuchsia-500/50 p-6 rounded-2xl transition-all duration-300 hover:shadow-2xl hover:shadow-fuchsia-500/10 text-left hover:-translate-y-1">
            <div className="w-12 h-12 bg-fuchsia-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <Gamepad2 className="text-fuchsia-400" size={24} />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-zinc-100 group-hover:text-fuchsia-400 transition-colors">Sprite Converter</h2>
            <p className="text-zinc-500 mb-6 text-sm">Upload any high-res image or logo and instantly convert it into a cute 8-bit sprite.</p>
            <div className="flex items-center text-fuchsia-400 font-medium text-sm gap-2">
              Launch Converter <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </div>

      {/* Decorative footer text */}
      <div className="absolute bottom-6 left-0 w-full text-center text-zinc-700 text-xs font-mono z-10 pointer-events-none">
        &copy; {new Date().getFullYear()} SpriteLab Suite // High-performance browser tools
      </div>
    </div>
  );
}
