
# 1. Usamos Node 20 como base
FROM node:20-slim

# 2. Directorio de trabajo
WORKDIR /app

# 3. Instalamos dependencias (esto ya vimos que funciona bien)
COPY package*.json ./
RUN npm install

# 4. Copiamos el resto del código
COPY . .

# 5. CONSTRUCCIÓN (Aquí está el truco): 
# Definimos variables temporales SOLO para que Next.js no de error al compilar.
# Una vez que la app corra, Hugging Face usará las REALES de tus Settings.
RUN NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder \
    GROQ_API_KEY=placeholder_key \
    NEXT_TELEMETRY_DISABLED=1 \
    npm run build

# 6. Exponemos el puerto de Hugging Face
EXPOSE 7860

# 7. Comando de arranque
CMD ["npm", "start", "--", "-p", "7860", "-H", "0.0.0.0"]