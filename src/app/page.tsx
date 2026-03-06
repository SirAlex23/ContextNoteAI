"use client";
import React, { useState, useEffect, useRef } from 'react';
import FileUpload from '@/components/FileUpload';
import ChatInterface from '@/components/ChatInterface';
import { ChevronDown, Sparkles, FileText, Cpu, Layout, Trash2, ShieldCheck } from 'lucide-react';

// --- COMPONENTE LLUVIA DE CÓDIGO (MATRIX EFFECT) ---
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
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops: number[] = Array(Math.floor(columns)).fill(1);
    const draw = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#1e40af22"; // Azul muy sutil para no distraer
      ctx.font = `${fontSize}px monospace`;
      for (let i = 0; i < drops.length; i++) {
        const text = codes[Math.floor(Math.random() * codes.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    };
    const interval = setInterval(draw, 33);
    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });
    return () => clearInterval(interval);
  }, []);
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none opacity-40 z-0" />;
};

export default function Home() {
  const [fileNames, setFileNames] = useState<string[]>([]);

  // Función para borrar todo el contexto (Punto D: Privacidad)
  const destroySession = async () => {
    if (fileNames.length === 0) return;
    const confirmDelete = confirm("¿Estás seguro? Se borrarán todos los archivos de la base de datos permanentemente.");
    if (!confirmDelete) return;

    try {
      const res = await fetch('/api/delete-session', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileNames }),
      });
      if (res.ok) {
        setFileNames([]);
        alert("Sesión destruida con éxito.");
        window.location.reload();
      }
    } catch (e) {
      console.error("Error al limpiar sesión");
    }
  };

  return (
    <main className="min-h-screen bg-black text-slate-200 font-sans selection:bg-blue-500/30 overflow-x-hidden">
      <CodeRain />

      {/* --- SECCIÓN 1: BIENVENIDA (HERO) --- */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 z-10 py-20">
        <div className="max-w-5xl text-center space-y-8 animate-in fade-in duration-1000">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold tracking-widest uppercase">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span>ContextNote.AI // Inteligence v3.0</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white">
            Context<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Note.AI</span>
          </h1>

          <div className="max-w-3xl mx-auto space-y-4">
            <p className="text-xl md:text-2xl text-white font-medium">
              Tu base de conocimientos, ahora interactiva.
            </p>
            <p className="text-slate-400 leading-relaxed text-sm md:text-base">
              Nuestra herramienta utiliza arquitectura RAG avanzada para permitirte chatear con múltiples archivos 
              de forma simultánea. Desde PDFs técnicos hasta bases de código complejas, ContextNote extrae 
              la información exacta con citaciones directas.
            </p>
          </div>
          
          {/* Grid de Pasos 1-2-3 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10">
            {[
              { id: 1, title: "Sube tu archivo", desc: "PDF, Word, Excel o bloques de código fuente.", color: "blue" },
              { id: 2, title: "Procesado RAG", desc: "La IA fragmenta y entiende el contexto profundo.", color: "indigo" },
              { id: 3, title: "Pregunta libre", desc: "Obtén respuestas precisas con fuentes citadas.", color: "slate" }
            ].map((step) => (
              <div key={step.id} className="p-6 bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-3xl text-left hover:border-blue-500/30 transition-all group">
                <div className={`w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all`}>
                  {step.id}
                </div>
                <h3 className="font-bold text-lg text-white">{step.title}</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-10 animate-bounce flex flex-col items-center text-slate-600">
          <span className="text-[10px] font-bold mb-2 uppercase tracking-widest">Workspace</span>
          <ChevronDown className="w-5 h-5" />
        </div>
      </section>

      {/* --- SECCIÓN 2: WORKSPACE (UNIFICADO) --- */}
      <section className="relative min-h-screen py-20 px-4 max-w-6xl mx-auto z-10">
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col min-h-[800px]">
          
          {/* Header del Workspace */}
          <div className="p-8 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-slate-900/30">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-white">Panel de Control</h2>
                {fileNames.length > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold">
                    {fileNames.length} ARCHIVOS ACTIVOS
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-xs">Gestiona tus documentos y chatea con la IA</p>
              
              {fileNames.length > 0 && (
                <button 
                  onClick={destroySession}
                  className="mt-4 flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-red-600 hover:text-white transition-all w-fit"
                >
                  <Trash2 className="w-3 h-3" />
                  Destruir Sesión (Privacidad)
                </button>
              )}
            </div>

            <div className="w-full lg:w-auto">
              {/* FileUpload ahora recibe y gestiona un array de nombres */}
              <FileUpload onUploadSuccess={(names) => setFileNames(names)} />
            </div>
          </div>

          {/* Área de Chat e Interacción */}
          <div className="flex-1 flex flex-col bg-black/20 relative">
            {fileNames.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6 opacity-50">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full" />
                  <div className="relative w-24 h-24 bg-slate-900 rounded-[2rem] border border-slate-700 flex items-center justify-center">
                    <ShieldCheck className="w-10 h-10 text-slate-500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-white font-semibold text-xl">Esperando documentos...</h3>
                  <p className="text-slate-500 max-w-sm text-sm mx-auto">
                    Sube uno o varios archivos para activar el procesamiento RAG y empezar la conversación.
                  </p>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col animate-in fade-in zoom-in-95 duration-700">
                <ChatInterface fileNames={fileNames} />
              </div>
            )}
          </div>
        </div>

        <footer className="mt-16 text-center">
          <div className="flex justify-center gap-6 text-slate-600 text-[10px] font-mono tracking-[0.2em] uppercase">
            <span>Security: AES-256</span>
            <span>•</span>
            <span>RAG Engine: v3.1</span>
            <span>•</span>
            <span>Model: Llama 3.3 70B</span>
          </div>
        </footer>
      </section>
    </main>
  );
}
