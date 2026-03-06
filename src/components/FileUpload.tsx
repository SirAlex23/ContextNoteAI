
"use client";
import React, { useState } from 'react';
import { Upload, FileText, X, CheckCircle, Loader2 } from 'lucide-react';

export default function FileUpload({ onUploadSuccess }: { onUploadSuccess: (files: string[]) => void }) {
  const [files, setFiles] = useState<{name: string, status: 'loading' | 'success'}[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Añadir a la lista visual inmediatamente
    const newFile = { name: file.name, status: 'loading' as const };
    setFiles(prev => [...prev, newFile]);
    setIsUploading(true);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) {
        // Actualizar estado a éxito
        setFiles(prev => prev.map(f => f.name === file.name ? { ...f, status: 'success' } : f));
        // Notificar al padre la lista completa de archivos con éxito
        const uploadedFiles = files.filter(f => f.status === 'success').map(f => f.name);
        onUploadSuccess([...uploadedFiles, file.name]);
      }
    } catch (error) {
      setFiles(prev => prev.filter(f => f.name !== file.name));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4 w-full">
      {/* Zona de Drop/Click */}
      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-700 rounded-2xl cursor-pointer bg-slate-900/50 hover:bg-slate-800/50 hover:border-blue-500/50 transition-all group px-4">
        <div className="flex flex-col items-center justify-center text-center">
          <Upload className={`w-8 h-8 mb-2 ${isUploading ? 'animate-bounce text-blue-500' : 'text-slate-500'}`} />
          <p className="text-xs font-medium text-slate-300">Añadir archivos al proyecto</p>
          <p className="text-[10px] text-slate-500 mt-1 uppercase">PDF, Word, Excel o Código</p>
        </div>
        <input type="file" className="hidden" onChange={handleUpload} accept=".pdf,.docx,.xlsx,.txt,.js,.ts,.java,.py" />
      </label>

      {/* Lista de Archivos Subidos (Punto C) */}
      {files.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {files.map((file, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-slate-800/40 border border-slate-700 rounded-xl animate-in fade-in slide-in-from-left-2">
              <div className="flex items-center gap-3 overflow-hidden">
                <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span className="text-xs text-slate-200 truncate font-mono">{file.name}</span>
              </div>
              {file.status === 'loading' ? (
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



