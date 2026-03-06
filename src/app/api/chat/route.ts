import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { message, fileNames } = await req.json(); // Ahora recibe un array: fileNames

    // 1. Buscamos en Supabase el contenido de TODOS los archivos seleccionados
    const { data, error } = await supabase
      .from('document_sections')
      .select('content, file_name')
      .in('file_name', fileNames); // Busca todos los nombres que coincidan

    if (error || !data || data.length === 0) {
      return NextResponse.json({ error: "No hay contexto disponible." }, { status: 404 });
    }

    // 2. Construimos un contexto donde cada trozo indica su origen (Punto A)
    const fullContext = data.map(item => `[ARCHIVO: ${item.file_name}]\n${item.content}`).join("\n\n---\n\n");

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: `Eres un analista experto. Tu tarea es responder usando el contexto proporcionado.
          REGLAS CRÍTICAS:
          1. Si mencionas un dato, indica el archivo de origen (ej: "Según tesis.pdf...").
          2. Si el contexto es código (.java, .py, etc.), analiza la lógica y busca errores.
          3. Si la respuesta no está en el contexto, dilo honestamente.
          
          Contexto disponible:
          ${fullContext.substring(0, 15000)}` 
        },
        { role: "user", content: message },
      ],
      model: "llama-3.3-70b-versatile",
    });

    return NextResponse.json({ text: chatCompletion.choices[0]?.message?.content });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
