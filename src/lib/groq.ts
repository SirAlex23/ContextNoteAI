import Groq from "groq-sdk";

// Durante el build, 'process.env.GROQ_API_KEY' es invisible para Next.js.
// Le damos un texto cualquiera ('build-time-key') para que el constructor
// de Groq no lance el error y nos deje terminar la instalación.
const apiKey = process.env.GROQ_API_KEY || "build-time-key";

export const groq = new Groq({
  apiKey: apiKey,
});
