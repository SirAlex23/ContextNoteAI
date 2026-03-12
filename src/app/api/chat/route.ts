import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { message, fileNames } = await req.json();

    // 1. Convertir la pregunta en un vector usando Groq (768 dimensiones)
    // Usamos el mismo modelo que en el upload para que sean compatibles
    const embeddingResponse = await groq.embeddings.create({
      model: "nomic-embed-text-v1_5",
      input: message,
    });
    
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // 2. Llamar a la función RPC en Supabase
    const { data: matchedDocuments, error } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: 0.2, // Ajustado para mayor precisión con 768 dimensiones
      match_count: 8,
      filter_file_names: fileNames || [] 
    });

    if (error) {
      console.error("🔥 Error en RPC de Supabase:", error);
      throw error;
    }

    if (!matchedDocuments || matchedDocuments.length === 0) {
      return NextResponse.json({ 
        answer: "No he encontrado información relevante en los documentos seleccionados." 
      });
    }

    // 3. Construir el contexto
    const relevantContext = matchedDocuments
      .map((doc: any) => `[ARCHIVO: ${doc.file_name}]\n${doc.content}`)
      .join("\n\n---\n\n");

    // 4. Generar respuesta con Llama 3.3
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Eres ContextNote.AI v3.5. 
          Usa el contexto para responder de forma profesional.
          Si no está en el contexto, no inventes nada.
          
          CONTEXTO:
          ${relevantContext}`
        },
        { role: "user", content: message },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
    });

    return NextResponse.json({ answer: chatCompletion.choices[0]?.message?.content });

  } catch (error: any) {
    console.error("🔥 Error en Chat:", error);
    return NextResponse.json(
      { error: "Error en el chat: " + (error.message || "Desconocido") }, 
      { status: 500 }
    );
  }
}
