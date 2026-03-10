import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import Groq from 'groq-sdk';
import { pipeline } from '@xenova/transformers';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { message, fileNames } = await req.json();

    // 1. Convertir la pregunta del usuario en un vector numérico (Embedding)
    const generateEmbedding = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    const output = await generateEmbedding(message, { pooling: 'mean', normalize: true });
    const queryEmbedding = Array.from(output.data);

    // 2. Llamar a la función RPC corregida en Supabase
    // Esta parte ahora coincide con el SQL que devuelve: id, file_name, content y similarity
    const { data: matchedDocuments, error } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: 0.01, // Umbral bajo para encontrar siempre algo de contexto
      match_count: 8, // Traemos los 8 trozos más relevantes
      filter_file_names: fileNames || [] 
    });

    if (error) {
      console.error("🔥 Error en RPC de Supabase:", error);
      throw error;
    }

    // Si no hay resultados, devolvemos un mensaje amigable en lugar de un error 404
    if (!matchedDocuments || matchedDocuments.length === 0) {
      return NextResponse.json({ 
        answer: "No he encontrado información específica en los documentos seleccionados que responda a tu pregunta." 
      });
    }

    // 3. Construir el contexto para la IA
    const relevantContext = matchedDocuments
      .map((doc: any) => `[ARCHIVO: ${doc.file_name}]\n${doc.content}`)
      .join("\n\n---\n\n");

    // 4. Generar respuesta con Llama 3.3 en Groq
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Eres ContextNote.AI v3.5, un analista experto. 
          INSTRUCCIONES:
          - Usa el contexto proporcionado abajo para responder.
          - Si la información no está en los archivos, dilo. No inventes datos.
          - Mantén un tono profesional y directo.
          
          CONTEXTO DE ARCHIVOS ENCONTRADO:
          ${relevantContext}`
        },
        { role: "user", content: message },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
    });

    // Devolvemos la respuesta formateada para tu componente
    return NextResponse.json({ answer: chatCompletion.choices[0]?.message?.content });

  } catch (error: any) {
    console.error("🔥 Error detallado en Chat:", error);
    return NextResponse.json(
      { error: "Error en el motor de búsqueda: " + (error.message || "Desconocido") }, 
      { status: 500 }
    );
  }
}