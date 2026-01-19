# Guía de Despliegue en Render

Esta guía te ayudará a desplegar la aplicación Estimador TikTok en Render.

## Prerequisitos

1. Cuenta en [Render](https://render.com)
2. Repositorio en GitHub/GitLab/Bitbucket
3. URI de MongoDB Atlas configurada

## Pasos para Desplegar

### 1. Preparar el Repositorio

Asegúrate de que tu código esté en un repositorio Git y conectado a GitHub/GitLab/Bitbucket.

### 2. Desplegar el Backend

1. Ve a [Render Dashboard](https://dashboard.render.com)
2. Click en "New +" → "Web Service"
3. Conecta tu repositorio
4. Configura el servicio:
   - **Name**: `estimador-tiktok-api`
   - **Environment**: `Node`
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Plan**: Free

5. **Variables de Entorno**:
   - `NODE_ENV` = `production`
   - `MONGODB_URI` = Tu URI completa de MongoDB Atlas
   - `PORT` = Se asigna automáticamente por Render (no es necesario configurarlo)
     ```
     mongodb+srv://usuario:password@cluster0.xxxxx.mongodb.net/estimador-tiktok?retryWrites=true&w=majority&appName=Cluster0
     ```

6. Click en "Create Web Service"
7. Espera a que el build termine y el servicio esté en línea
8. **IMPORTANTE**: Anota la URL del servicio que Render te da
   - La encontrarás en el Dashboard, en la parte superior del servicio
   - Ejemplo: `https://estimador-tiktok-api.onrender.com`
   - Esta URL la necesitarás para configurar `VITE_API_URL` en el frontend

### 3. Desplegar el Frontend

1. En Render Dashboard, click en "New +" → "Web Service"
2. Conecta el mismo repositorio
3. Configura el servicio:
   - **Name**: `estimador-tiktok-frontend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npx serve -s dist -l $PORT`
   - **Plan**: Free

4. **Variables de Entorno**:
   - `NODE_ENV` = `production`
   - `VITE_API_URL` = `https://TU-BACKEND-URL.onrender.com/api`
     - ⚠️ **IMPORTANTE**: Reemplaza `TU-BACKEND-URL` con la URL real que Render te dio cuando desplegaste el backend
     - Ejemplo: Si tu backend es `https://estimador-tiktok-api.onrender.com`, entonces `VITE_API_URL` = `https://estimador-tiktok-api.onrender.com/api`
     - Puedes encontrar la URL del backend en el Dashboard de Render, en la sección del servicio del backend

5. Click en "Create Web Service"
6. Espera a que el build termine

### 4. Verificar el Despliegue

1. Visita la URL del frontend (ej: `https://estimador-tiktok-frontend.onrender.com`)
2. Verifica que puedas ver las categorías y preguntas
3. Prueba el backoffice en `/backoffice`

## Alternativa: Usar render.yaml

Si prefieres usar el archivo `render.yaml`:

1. En Render Dashboard, click en "New +" → "Blueprint"
2. Conecta tu repositorio
3. Render detectará automáticamente el archivo `render.yaml`
4. Configura las variables de entorno manualmente:
   - `MONGODB_URI` en el servicio del backend
   - `VITE_API_URL` en el servicio del frontend (después de que el backend esté desplegado)

## Notas Importantes

- **Plan Free**: Los servicios gratuitos se "duermen" después de 15 minutos de inactividad. La primera petición puede tardar ~30 segundos en despertar.
- **CORS**: El backend ya tiene CORS configurado para aceptar peticiones de cualquier origen.
- **Variables de Entorno**: Asegúrate de configurar `VITE_API_URL` en el frontend con la URL correcta del backend.
- **MongoDB Atlas**: Verifica que tu IP esté permitida en Network Access, o permite `0.0.0.0/0` para todas las IPs.

## Troubleshooting

### El frontend no puede conectar al backend
- Verifica que `VITE_API_URL` esté configurada correctamente
- Asegúrate de que el backend esté en línea
- Revisa los logs del frontend en Render

### Error de conexión a MongoDB
- Verifica que `MONGODB_URI` esté correcta
- Revisa que tu IP esté permitida en MongoDB Atlas (o usa `0.0.0.0/0`)
- Verifica que el usuario y contraseña sean correctos

### El build falla
- Revisa los logs de build en Render
- Verifica que todas las dependencias estén en `package.json`
- Asegúrate de que Node.js versión sea compatible (Render usa Node 18+ por defecto)
