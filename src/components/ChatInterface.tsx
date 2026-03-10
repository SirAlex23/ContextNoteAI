"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';

interface ChatInterfaceProps {
  fileNames: string[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatInterface({ fileNames }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // IMPORTANTE: Enviamos el array completo de archivos
        body: JSON.stringify({ message: input, fileNames: fileNames }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: "Error: No se pudo conectar con el motor RAG." }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Error de red." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black/10">
      {/* Área de Mensajes - Ocupa todo el espacio disponible */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-30 text-center">
            <Sparkles className="w-10 h-10 mb-4 text-blue-500" />
            <p className="text-sm">Analizando {fileNames.length} documentos...</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`p-2 rounded-lg ${msg.role === 'user' ? 'bg-blue-600' : 'bg-slate-800'}`}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-blue-400" />}
            </div>
            <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-blue-600/20 text-blue-100' : 'bg-slate-900/80 text-slate-300'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && <Loader2 className="w-5 h-5 animate-spin text-blue-500 mx-auto" />}
      </div>

      {/* Input de Chat - Pegado al fondo sin huecos */}
      <div className="p-6 bg-slate-900/80 border-t border-slate-800">
        <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu pregunta aquí..."
            className="w-full bg-black/60 border border-slate-700 rounded-xl py-4 pl-6 pr-14 text-sm focus:border-blue-500/50 outline-none transition-all"
          />
          <button type="submit" className="absolute right-2 top-2 p-3 bg-blue-600 rounded-lg">
            <Send className="w-4 h-4 text-white" />
          </button>
        </form>
        <p className="text-[9px] text-center text-slate-600 mt-4 uppercase tracking-widest">
          ContextNote.AI // Powered by Llama 3.3 70B & Groq
        </p>
      </div>
    </div>
  );
}

