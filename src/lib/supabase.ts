
import { createClient } from '@supabase/supabase-js'

// Usamos el "!" para decirle a TypeScript que estas variables EXISTIRÁN.
// No pongas valores por defecto con "||", deja que use las variables reales.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
