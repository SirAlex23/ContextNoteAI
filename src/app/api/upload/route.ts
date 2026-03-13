import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { extractText } from 'unpdf';
import mammoth from 'mammoth';
import officeparser from 'officeparser';

export const maxDuration = 60;
export const runtime = 'nodejs';

const MAX_CHUNKS = 80;
const MAX_FILE_SIZE_MB = 4.5;

async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch(
    'https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: text }),
    }
  );
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`HuggingFace error: ${err}`);
  }
  const data = await response.json();
  return Array.isArray(data[0]) ? data[0] : data;
}

function createChunks(text: string, size: number = 512): string[] {
  const chunks: string[] = [];
  const words = text.split(/\s+/);
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > size) {
      if (current) chunks.push(current.trim());
      current = word;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks.filter(c => c.length > 20);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No hay archivo' }, { status: 400 });

    // Validar tamaño máximo
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      return NextResponse.json({ 
        error: `Archivo demasiado grande (${fileSizeMB.toFixed(1)}MB). Máximo permitido: ${MAX_FILE_SIZE_MB}MB` 
      }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const nodeBuffer = Buffer.from(buffer);
    let extractedText = '';

    if (file.type === 'application/pdf') {
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

    if (!extractedText.trim()) {
      return NextResponse.json({ error: 'No se pudo extraer texto del archivo' }, { status: 400 });
    }

    const allChunks = createChunks(extractedText);
    if (allChunks.length === 0) {
      return NextResponse.json({ error: 'El archivo no contiene texto procesable' }, { status: 400 });
    }

    const chunksToProcess = allChunks.slice(0, MAX_CHUNKS);
    const wasLimited = allChunks.length > MAX_CHUNKS;

    const rowsToInsert = [];
    for (const chunk of chunksToProcess) {
      const embedding = await getEmbedding(chunk);
      rowsToInsert.push({
        file_name: file.name,
        content: chunk,
        embedding,
      });
      await new Promise(res => setTimeout(res, 100));
    }

    const { error } = await supabase.from('document_sections').insert(rowsToInsert);
    if (error) throw error;

    return NextResponse.json({
      success: true,
      chunks: rowsToInsert.length,
      total_chunks: allChunks.length,
      partial: wasLimited,
      message: wasLimited
        ? `Documento largo: se procesaron ${MAX_CHUNKS} de ${allChunks.length} fragmentos.`
        : null,
    });

  } catch (error: any) {
    console.error('ERROR EN UPLOAD:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}