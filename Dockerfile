FROM node:20-slim

WORKDIR /app

# Copiamos archivos de dependencias
COPY package*.json ./
RUN npm install

# Copiamos el resto del código
COPY . .

# Desactivamos el chequeo estricto de linting y errores de tipos durante el build 
# para que no se detenga por las variables de Supabase
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

EXPOSE 7860

# Comando para arrancar la app en el puerto de Hugging Face
CMD ["npm", "start", "--", "-p", "7860", "-H", "0.0.0.0"]
