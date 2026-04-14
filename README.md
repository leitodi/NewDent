# NEW DENT

Agenda de turnos para clínica dental con login, calendario, clientes, caja y exportación a Excel.

## Estructura

- `backend/` - API con Node.js, Express y MongoDB
- `frontend/` - UI con React + Vite

## Configuración

1. Copia `backend/.env.example` a `backend/.env`.
2. Ajusta `MONGO_URI`, `JWT_SECRET` y `CLIENT_ORIGIN`.
3. En `frontend`, si quieres agregar el logo, coloca el archivo en `frontend/public/logo.png` y usa la ruta en la UI.

## Ejecutar

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Despliegue en Render

1. Crea un nuevo repositorio con el proyecto.
2. Añade `render.yaml` en la raíz del proyecto.
3. Configura los secretos de Render:
   - `MONGO_URI`
   - `JWT_SECRET`
4. En el servicio frontend, actualiza `VITE_API_URL` con la URL final del backend.
5. En el servicio backend, ajusta `CLIENT_ORIGIN` a la URL del frontend en Render.

> En Render el backend se ejecuta como `web_service` y el frontend como `static_site`.

## Notas

- El login utiliza JWT.
- El calendario muestra turnos por día.
- La tabla de clientes permite ver detalles e imágenes.
- La caja permite filtrar pagos por rango de fechas y exportar un archivo Excel.
