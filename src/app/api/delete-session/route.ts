import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE(req: NextRequest) {
  try {
    const { fileNames } = await req.json();

    if (!fileNames || fileNames.length === 0) {
      return NextResponse.json({ error: "No hay archivos para borrar" }, { status: 400 });
    }

    // Eliminamos todas las filas donde el nombre del archivo esté en nuestra lista
    const { error } = await supabase
      .from('document_sections')
      .delete()
      .in('file_name', fileNames);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Sesión limpiada correctamente" });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
