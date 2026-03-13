
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { extractText } from 'unpdf';
import mammoth from 'mammoth';
import officeparser from 'officeparser';
import Groq from 'groq-sdk';

// Esto extiende el límite a 60 segundos en Vercel plan gratuito
export const maxDuration = 60;
export const runtime = 'nodejs';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Chunks más grandes = menos llamadas a la API = más rápido
function createChunks(text: string, size: number = 512) {
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
  return chunks.filter(c => c.length > 20); // ignorar chunks vacíos
}

// Llama a Groq embeddings en lotes para no saturar el rate limit
async function getEmbeddingsInBatches(chunks: string[], batchSize = 10) {
  const allEmbeddings: number[][] = [];
  
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    
    const promises = batch.map(chunk =>
      groq.embeddings.create({
        model: 'nomic-embed-text-v1.5', // gratis en Groq
        input: chunk,
      })
    );
    
    const results = await Promise.all(promises);
    results.forEach(r => {
      if (r.data && r.data[0]) {
        allEmbeddings.push(r.data[0].embedding as number[]);
      }
    });
    
    // Pequeña pausa entre lotes para respetar rate limits
    if (i + batchSize < chunks.length) {
      await new Promise(res => setTimeout(res, 200));
    }
  }
  
  return allEmbeddings;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No hay archivo' }, { status: 400 });

    const buffer = await file.arrayBuffer();
    const nodeBuffer = Buffer.from(buffer);
    let extractedText = '';

    // Extracción de texto según formato
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

    const chunks = createChunks(extractedText);
    
    if (chunks.length === 0) {
      return NextResponse.json({ error: 'El archivo no contiene texto procesable' }, { status: 400 });
    }

    // Generar todos los embeddings via Groq (rápido, sin descarga de modelos)
    const embeddings = await getEmbeddingsInBatches(chunks);

    // Construir filas para Supabase
    const rowsToInsert = chunks.map((chunk, i) => ({
      file_name: file.name,
      content: chunk,
      embedding: embeddings[i],
    }));

    const { error } = await supabase.from('document_sections').insert(rowsToInsert);
    if (error) throw error;

    return NextResponse.json({
      success: true,
      chunks: rowsToInsert.length,
      partial: false,
    });

  } catch (error: any) {
    console.error('ERROR EN UPLOAD:', error);
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
