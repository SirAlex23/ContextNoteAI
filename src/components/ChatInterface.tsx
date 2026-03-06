"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

// CAMBIO: Ahora aceptamos fileNames (un array de strings)
export default function ChatInterface({ fileNames }: { fileNames: string[] }) {
  const [messages, setMessages] = useState<{role: string, text: string}[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userText = input;
    setInput("");
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userText, 
          fileNames // Enviamos el array completo al backend
        }),
      });
      const data = await res.json();
      if (data.text) setMessages(prev => [...prev, { role: 'ai', text: data.text }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', text: "Error de conexión con el servidor." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-3xl text-sm leading-relaxed shadow-sm ${
              m.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-slate-800/80 text-slate-100 border border-slate-700 rounded-tl-none'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && <div className="text-xs text-blue-400 animate-pulse font-mono px-2">Analizando documentos...</div>}
      </div>

      <div className="p-6 bg-slate-900/40 border-t border-slate-800">
        <div className="relative flex items-center gap-2">
          {/* text-slate-900 asegura que la letra sea negra en la barra blanca */}
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Haz una pregunta sobre tus archivos..."
            className="flex-1 bg-white text-slate-900 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-xl font-medium"
          />
          <button 
            onClick={sendMessage} 
            disabled={loading}
            className="absolute right-2 p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
