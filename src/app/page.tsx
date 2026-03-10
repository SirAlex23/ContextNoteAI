"use client";
import React, { useState, useEffect, useRef } from 'react';
import FileUpload from '@/components/FileUpload';
import ChatInterface from '@/components/ChatInterface';
import { ChevronDown, Sparkles, Trash2, ShieldCheck } from 'lucide-react';
import './mobile-fixes.css';

// --- LLUVIA DE CÓDIGO NATURAL Y MULTICOLOR ---
const CodeRain = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const codes = "01<>{}[]/\\ABCDEF".split("");
    const fontSize = 15;
    const columns = canvas.width / fontSize;
    const drops = Array(Math.floor(columns)).fill(1);

    const colors = ['#1e40af', '#3b82f6', '#6366f1', '#2dd4bf', '#1e293b'];

    const draw = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
        const text = codes[Math.floor(Math.random() * codes.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.985) {
          drops[i] = 0;
        }
        drops[i] += 0.75;
      }
    };

    const interval = setInterval(draw, 50);
    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });
    return () => clearInterval(interval);
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0 opacity-30" />;
};

export default function Home() {
  const [fileNames, setFileNames] = useState<string[]>([]);

  const destroySession = async () => {
    if (fileNames.length === 0) return;
    if (!confirm("¿Borrar sesión permanentemente?")) return;
    try {
      const res = await fetch('/api/delete-session', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileNames }),
      });
      if (res.ok) { setFileNames([]); window.location.reload(); }
    } catch (e) { console.error(e); }
  };

  return (
    <main className="min-h-screen bg-black text-slate-200 selection:bg-blue-500/30 overflow-x-hidden">
      <CodeRain />

      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 z-10 py-20">
        <div className="max-w-5xl text-center space-y-8 animate-in fade-in duration-1000">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold tracking-widest uppercase">
            <Sparkles className="w-4 h-4" />
            <span>ContextNote.AI // Intelligence v3.0</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white">
            Context<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Note.AI</span>
          </h1>

          <div className="max-w-3xl mx-auto space-y-4">
            <p className="text-xl md:text-2xl text-white font-medium">
              Tu base de conocimientos, ahora interactiva.
            </p>
            <p className="text-slate-400 leading-relaxed text-sm md:text-base">
              Nuestra herramienta utiliza arquitectura RAG avanzada para permitirte chatear con múltiples archivos de forma simultánea.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10">
            {[
              { id: 1, title: "Sube tu archivo", desc: "PDF, Word, Excel o bloques de código fuente." },
              { id: 2, title: "Procesado RAG", desc: "La IA fragmenta y entiende el contexto profundo." },
              { id: 3, title: "Pregunta libre", desc: "Obtén respuestas precisas con fuentes citadas." }
            ].map((step) => (
              <div key={step.id} className="p-6 bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-3xl text-left border-white/5">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold mb-4">{step.id}</div>
                <h3 className="font-bold text-lg text-white">{step.title}</h3>
                <p className="text-xs text-slate-500 mt-2">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-10 scroll-indicator flex flex-col items-center text-slate-600">
          <span className="text-[10px] font-bold mb-2 uppercase tracking-widest">Workspace</span>
          <ChevronDown className="w-5 h-5 animate-bounce-fast text-blue-500" />
        </div>
      </section>

      <section className="relative workspace-wrapper py-20 px-4 max-w-6xl mx-auto z-10">
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col min-h-[700px]">
          
          <div className="panel-header p-8 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-slate-900/30">
            <div className="space-y-2">
              <h2 className="panel-title text-2xl font-bold text-white">Panel de Control</h2>
              <p className="text-slate-500 text-xs">Gestiona tus documentos y chatea con la IA</p>
              {fileNames.length > 0 && (
                /* Clase CSS 'btn-destruir-neon' añadida para el efecto rojo */
                <button 
                  onClick={destroySession} 
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-bold uppercase rounded-lg transition-all duration-300 btn-destruir-neon"
                >
                  <Trash2 className="w-3 h-3" /> Destruir Sesión
                </button>
              )}
            </div>
            <div className="w-full lg:w-auto">
              <FileUpload onUploadSuccess={(names) => setFileNames(names)} />
            </div>
          </div>

          <div className="flex-1 flex flex-col bg-black/20 relative">
            {fileNames.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-50">
                <ShieldCheck className="w-12 h-12 mb-4 text-slate-700" />
                <h3 className="text-white font-semibold">Esperando documentos...</h3>
              </div>
            ) : (
              <ChatInterface fileNames={fileNames} />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
