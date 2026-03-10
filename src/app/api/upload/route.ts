import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { extractText } from 'unpdf'; 
import mammoth from 'mammoth';
import * as xlsx from 'xlsx';
import { pipeline } from '@xenova/transformers';
import officeparser from 'officeparser';

export const runtime = 'nodejs';

// --- OPTIMIZACIÓN: Singleton para el modelo de embeddings ---
let extractor: any = null;

const getExtractor = async () => {
  if (!extractor) {
    // Solo se carga la primera vez que se usa la herramienta
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return extractor;
};

// Aumentamos el tamaño a 2000 para que archivos largos (BOE) generen menos filas
function createChunks(text: string, size: number = 2000) {
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
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: "No hay archivo" }, { status: 400 });

    // Obtenemos el extractor ya cargado en memoria
    const generateEmbedding = await getExtractor();

    const buffer = await file.arrayBuffer();
    const nodeBuffer = Buffer.from(buffer);
    let extractedText = "";

    // --- Extracción por formato ---
    if (file.type === "application/pdf") {
      const { text } = await extractText(buffer);
      extractedText = Array.isArray(text) ? text.join('\n') : text;
    } 
    else if (file.name.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer: nodeBuffer });
      extractedText = result.value;
    } 
    else if (file.name.endsWith('.xlsx')) {
      const workbook = xlsx.read(nodeBuffer, { type: 'buffer' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      extractedText = xlsx.utils.sheet_to_txt(firstSheet);
    } 
    // Corregido: Tipo 'any' para evitar error de OfficeParserAST
    else if (file.name.endsWith('.pptx')) {
      extractedText = await new Promise<string>((resolve, reject) => {
        officeparser.parseOffice(nodeBuffer, (data: any, err: any) => {
          if (err) return reject("Error leyendo PowerPoint: " + err);
          resolve(data as string);
        });
      });
    } 
    else {
      extractedText = nodeBuffer.toString('utf-8');
    }

    if (!extractedText || !extractedText.trim()) throw new Error("No se pudo extraer texto");

    const textChunks = createChunks(extractedText);
    
    // Procesamiento paralelo de vectores
    const rowsToInsert = await Promise.all(textChunks.map(async (chunk) => {
      const output = await generateEmbedding(chunk, { pooling: 'mean', normalize: true });
      return {
        file_name: file.name,
        content: chunk,
        embedding: Array.from(output.data) 
      };
    }));

    const { error } = await supabase.from('document_sections').insert(rowsToInsert);
    if (error) throw error;

    return NextResponse.json({ success: true, chunks: rowsToInsert.length });

  } catch (error: any) {
    console.error("🔥 Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
