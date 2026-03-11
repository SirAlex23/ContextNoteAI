import Groq from "groq-sdk";

// Durante el 'npm run build', los Secrets no están disponibles. 
// Usamos un texto temporal para que el proceso no se detenga.
const apiKey = process.env.GROQ_API_KEY || "dummy_key_build";

export const groq = new Groq({
  apiKey: apiKey,
});
