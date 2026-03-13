import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch(
    'https://router.huggingface.co/hf-inference/models/nomic-ai/nomic-embed-text-v1.5/pipeline/feature-extraction',
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

export async function POST(req: NextRequest) {
  try {
    const { message, fileNames } = await req.json();

    const queryEmbedding = await getEmbedding(message);

    const { data: matchedDocuments, error } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: 0.2,
      match_count: 8,
      filter_file_names: fileNames || [],
    });

    if (error) {
      console.error('Error en RPC de Supabase:', error);
      throw error;
    }

    if (!matchedDocuments || matchedDocuments.length === 0) {
      return NextResponse.json({
        answer: 'No he encontrado información relevante en los documentos seleccionados.',
      });
    }

    const relevantContext = matchedDocuments
      .map((doc: any) => `[ARCHIVO: ${doc.file_name}]\n${doc.content}`)
      .join('\n\n---\n\n');

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `Eres ContextNote.AI v3.5. 
          Usa el contexto para responder de forma profesional.
          Si no está en el contexto, no inventes nada.
          
          CONTEXTO:
          ${relevantContext}`,
        },
        { role: 'user', content: message },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
    });

    return NextResponse.json({
      answer: chatCompletion.choices[0]?.message?.content,
    });

  } catch (error: any) {
    console.error('Error en Chat:', error);
    return NextResponse.json(
      { error: 'Error en el chat: ' + (error.message || 'Desconocido') },
      { status: 500 }
    );
  }
}