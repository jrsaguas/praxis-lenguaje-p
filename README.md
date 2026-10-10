# Praxis-P

Lenguaje especializado para describir agentes, herramientas, contratos, memoria, evidencia y flujos. La gramática y el parser compartidos son la autoridad única para la interfaz y el runtime.

## Stack
- React + Vite + TypeScript
- Tailwind CSS + React Router + Lucide React
- Node.js + Express + CORS
- Núcleo compartido de lenguaje en `shared/praxis-core.mjs` (parser, tokens, AST y conversión al formato del runtime)

## Arranque de desarrollo
Usa dos terminales en la carpeta del proyecto. No es necesario iniciar servidores adicionales.

Terminal 1 — interfaz:
```powershell
npm run dev
```
La interfaz usa `http://localhost:5173`. Vite escucha en la red local para permitir pruebas desde otro dispositivo. Si el puerto ya está ocupado, identifica el proceso antes de detenerlo; no mates servidores de otros proyectos.

Terminal 2 — API y runtime:
```powershell
npm run dev:server
```
La API usa `http://localhost:8788`. El puerto `8787` puede pertenecer a otros proyectos y no forma parte del arranque de Praxis-P.

## Vista previa de producción
```powershell
npm run build
npm run preview -- --host 0.0.0.0 --port 5180 --strictPort
```
La vista previa usa `http://localhost:5180`. No ejecutes `dev` y `preview` como si fueran el mismo servidor: `dev` sirve el código fuente con recarga en caliente y `preview` sirve el resultado compilado.

## Endpoints
- `GET /api/health` — estado del runtime y versión de especificación.
- `POST /api/analyze` — tokens, AST y diagnósticos del parser compartido.
- `POST /api/execute` — validación, grafo y traza de ejecución simulada.
- `GET /api/tools` — contratos registrados.
- `PUT /api/tools` — reemplazo validado del registro local de contratos.

## Especificación
- Documento formal: `docs/PRAXIS-P-SPEC-0.4.md`.
- Versión actual: `0.4.0`.
- Parser compartido: `shared/praxis-core.mjs`.
- La interfaz importa ese parser; el servidor usa el mismo módulo para analizar y ejecutar. Así tokens, AST y diagnósticos se generan desde una sola implementación.
- El runtime actual valida el programa y simula los ciclos de agentes. No invoca proveedores de IA ni herramientas externas.
- Los adaptadores de modelos deben ser independientes de la sintaxis del lenguaje y añadirse después de consolidar el runtime y los contratos.

## Verificación
```powershell
npm run test:core
npm run lint
npm run build
```

Con el runtime activo en el puerto `8788`, ejecuta también la prueba de integración:

```powershell
npm run test:runtime
```
