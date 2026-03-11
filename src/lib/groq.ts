
import Groq from "groq-sdk";

// Si la clave no está (durante el build), usamos un texto de relleno
const apiKey = process.env.GROQ_API_KEY || "key_provisional_para_build";

export const groq = new Groq({
  apiKey: apiKey,
});