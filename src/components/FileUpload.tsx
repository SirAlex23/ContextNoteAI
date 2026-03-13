"use client";
import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, Loader2 } from 'lucide-react';

interface FileEntry {
  name: string;
  status: 'loading' | 'success' | 'error';
}

export default function FileUpload({ onUploadSuccess }: { onUploadSuccess: (files: string[]) => void }) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  // Usamos una ref para tener siempre el estado más reciente sin depender del closure
  const successfulFilesRef = useRef<string[]>([]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isUploading) return;

    // Reset el input para permitir subir el mismo archivo otra vez
    e.target.value = '';

    setFiles(prev => [...prev, { name: file.name, status: 'loading' }]);
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (res.ok && data.success) {
        // Actualizar estado visual a éxito
        setFiles(prev =>
          prev.map(f => f.name === file.name ? { ...f, status: 'success' } : f)
        );

        // ✅ Actualizar la ref con el nuevo archivo y notificar al padre
        successfulFilesRef.current = [...successfulFilesRef.current, file.name];
        onUploadSuccess([...successfulFilesRef.current]);

      } else {
        // Mostrar error en la UI
        setFiles(prev =>
          prev.map(f => f.name === file.name ? { ...f, status: 'error' } : f)
        );
        console.error('Error del servidor:', data.error);
      }
    } catch (error) {
      setFiles(prev =>
        prev.map(f => f.name === file.name ? { ...f, status: 'error' } : f)
      );
      console.error('Error de red:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4 w-full">
      <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer bg-slate-900/50 transition-all group px-4
        ${isUploading
          ? 'border-blue-500/50 cursor-not-allowed'
          : 'border-slate-700 hover:bg-slate-800/50 hover:border-blue-500/50'
        }`}>
        <div className="flex flex-col items-center justify-center text-center">
          <Upload className={`w-8 h-8 mb-2 ${isUploading ? 'animate-bounce text-blue-500' : 'text-slate-500'}`} />
          <p className="text-xs font-medium text-slate-300">
            {isUploading ? 'Procesando documento...' : 'Añadir archivos al proyecto'}
          </p>
          <p className="text-[10px] text-slate-500 mt-1 uppercase">PDF, Word, Excel o Código</p>
        </div>
        <input
          type="file"
          className="hidden"
          onChange={handleUpload}
          accept=".pdf,.docx,.xlsx,.txt,.js,.ts,.java,.py"
          disabled={isUploading}
        />
      </label>

      {files.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {files.map((file, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-slate-800/40 border border-slate-700 rounded-xl animate-in fade-in slide-in-from-left-2">
              <div className="flex items-center gap-3 overflow-hidden">
                <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span className="text-xs text-slate-200 truncate font-mono">{file.name}</span>
              </div>
              {file.status === 'loading' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />}
              {file.status === 'success' && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
              {file.status === 'error' && <span className="text-[10px] text-red-400 flex-shrink-0">Error</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

