# Usa una imagen de Node estable
FROM node:18-slim

# Crea el directorio de la app
WORKDIR /app

# Copia los archivos de configuración
COPY package*.json ./

# Instala las dependencias
RUN npm install

# Copia el resto del código
COPY . .

# Construye la aplicación de Next.js
RUN npm run build

# Expone el puerto que usa Hugging Face
EXPOSE 7860

# Comando para arrancar la app
CMD ["npm", "start", "--", "-p", "7860", "-H", "0.0.0.0"]