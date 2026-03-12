import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { extractText } from 'unpdf'; 
import mammoth from 'mammoth';
import { pipeline } from '@xenova/transformers';
import officeparser from 'officeparser';

export const runtime = 'nodejs';

let extractor: any = null;
const getExtractor = async () => {
  if (!extractor) extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  return extractor;
};

/**
 * Optimizamos el tamaño del chunk a 1000. 
 * Esto evita que el servidor agote la memoria RAM al generar embeddings.
 */
function createChunks(text: string, size: number = 1000) {
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
  const startTime = Date.now(); 
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

    // PROCESADO SECUENCIAL
    for (const chunk of textChunks) {
      /**
       * Aumentamos el margen de tiempo a 25 segundos (25000ms).
       * Hugging Face es más lento que Vercel o tu PC local y necesita este tiempo extra.
       */
      if (Date.now() - startTime > 25000) break;

      const output = await generateEmbedding(chunk, { pooling: 'mean', normalize: true });
      rowsToInsert.push({
        file_name: file.name,
        content: chunk,
        embedding: Array.from(output.data)
      });
    }

    if (rowsToInsert.length === 0) throw new Error("El proceso tardó demasiado o el archivo no tiene texto procesable");

    const { error } = await supabase.from('document_sections').insert(rowsToInsert);
    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      chunks: rowsToInsert.length,
      partial: rowsToInsert.length < textChunks.length 
    });

  } catch (error: any) {
    /**
     * VITAL: Imprimimos el error real en la consola del servidor.
     * Esto aparecerá en la pestaña "Logs > Container" de Hugging Face.
     */
    console.error("DETALLE DEL ERROR EN EL SERVIDOR:", error);
    
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}

