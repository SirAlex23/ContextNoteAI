import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { extractText } from 'unpdf'; 
import mammoth from 'mammoth';
import * as xlsx from 'xlsx';
import { pipeline } from '@xenova/transformers';
import officeparser from 'officeparser';

export const runtime = 'nodejs';

let extractor: any = null;
const getExtractor = async () => {
  if (!extractor) extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  return extractor;
};

// Chunks más grandes (4000) = menos ciclos de CPU = más velocidad
function createChunks(text: string, size: number = 4000) {
  const chunks = [];
  const words = text.split(/\s+/);
  let currentChunk = "";
  for (const word of words) {
    if ((currentChunk + word).length > size) {
      chunks.push(currentChunk.trim());
      currentChunk = "";
    }
    currentChunk += word + " ";
  }
  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now(); // Control de tiempo para evitar el corte de Vercel
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: "No hay archivo" }, { status: 400 });

    const generateEmbedding = await getExtractor();
    const buffer = await file.arrayBuffer();
    const nodeBuffer = Buffer.from(buffer);
    let extractedText = "";

    // Extracción según formato
    if (file.type === "application/pdf") {
      const { text } = await extractText(buffer);
      extractedText = Array.isArray(text) ? text.join('\n') : text;
    } else if (file.name.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer: nodeBuffer });
      extractedText = result.value;
    } else if (file.name.endsWith('.pptx')) {
      extractedText = await new Promise((res, rej) => {
        officeparser.parseOffice(nodeBuffer, (d: any, e: any) => e ? rej(e) : res(d as string));
      });
    } else {
      extractedText = nodeBuffer.toString('utf-8');
    }

    const textChunks = createChunks(extractedText);
    const rowsToInsert = [];

    // PROCESADO SECUENCIAL CON "BORRADO DE EMERGENCIA"
    for (const chunk of textChunks) {
      // Si llevamos 8.5 segundos, paramos de procesar y guardamos lo que tengamos
      // Así evitamos que Vercel mate la función a los 10s y el móvil se cuelgue
      if (Date.now() - startTime > 8500) break;

      const output = await generateEmbedding(chunk, { pooling: 'mean', normalize: true });
      rowsToInsert.push({
        file_name: file.name,
        content: chunk,
        embedding: Array.from(output.data)
      });
    }

    if (rowsToInsert.length === 0) throw new Error("Archivo demasiado pesado para el servidor gratuito");

    const { error } = await supabase.from('document_sections').insert(rowsToInsert);
    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      chunks: rowsToInsert.length,
      partial: rowsToInsert.length < textChunks.length 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}