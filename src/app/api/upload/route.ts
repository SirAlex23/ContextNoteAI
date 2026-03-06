import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { extractText } from 'unpdf'; 
import mammoth from 'mammoth'; // Para Word
import * as xlsx from 'xlsx'; // Para Excel

export const runtime = 'nodejs';

// Función para partir el texto en trozos (Chunking)
function createChunks(text: string, size: number = 3000) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: "No hay archivo" }, { status: 400 });

    const buffer = await file.arrayBuffer();
    const nodeBuffer = Buffer.from(buffer);
    let extractedText = "";

    // --- DETECCIÓN DE FORMATOS ---
    if (file.type === "application/pdf") {
      const { text } = await extractText(buffer);
      extractedText = Array.isArray(text) ? text.join('\n') : text;

    } else if (file.name.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer: nodeBuffer });
      extractedText = result.value;

    } else if (file.name.endsWith('.xlsx')) {
      const workbook = xlsx.read(nodeBuffer, { type: 'buffer' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      extractedText = xlsx.utils.sheet_to_txt(firstSheet);

    } else {
      // Código (Java, Python, JS, HTML) o TXT
      extractedText = nodeBuffer.toString('utf-8');
    }

    if (!extractedText.trim()) throw new Error("Archivo vacío o ilegible");

    // --- CHUNKING PARA ARCHIVOS LARGOS (Tesis, BOEs, Código gordo) ---
    const textChunks = createChunks(extractedText);
    
    // Preparamos las filas para Supabase con el nombre del archivo en cada una
    const rowsToInsert = textChunks.map(chunk => ({
      file_name: file.name,
      content: chunk
    }));

    const { error } = await supabase.from('document_sections').insert(rowsToInsert);
    if (error) throw error;

    return NextResponse.json({ success: true, chunks: textChunks.length });

  } catch (error: any) {
    console.error("🔥 Error en Upload:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

