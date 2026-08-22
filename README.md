# Mi Estudio

Web personal (un solo usuario) para subir PDFs, anotarlos a mano (resaltar +
notas) y generar con IA (Claude) resúmenes, mapas conceptuales, flashcards
con repetición espaciada, quizzes y simulacros de examen. Además puede
sincronizar automáticamente los PDFs y las fechas de tu aula virtual
(Moodle) de la facultad.

Ver el plan completo de arquitectura en
[`.claude/plans`](.) si lo tenés a mano, o pedile a Claude que te lo repita.

## Requisitos

- Node.js 20+
- Una base de datos Postgres (recomendado: [Neon](https://neon.tech), tiene
  free tier)
- Un bucket de [Cloudflare R2](https://developers.cloudflare.com/r2/) para
  guardar los PDFs
- Credenciales OAuth de Google (para el botón "Continuar con Google")
- Una API key de [Anthropic](https://console.anthropic.com/) (Claude API)

## Setup local

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Copiar `.env.example` a `.env.local` y completar los valores (ver
   "Variables de entorno" abajo). Para correr comandos de Prisma también
   necesitás un `.env` con `DATABASE_URL`/`DIRECT_URL`.

3. Generar el hash de tu contraseña de acceso:

   ```bash
   npm run hash-password -- "tu-contraseña"
   ```

   Pegá el resultado en `ADMIN_PASSWORD_HASH`.

4. Crear las tablas en la base:

   ```bash
   npm run db:migrate
   ```

5. Levantar el servidor de desarrollo:

   ```bash
   npm run dev
   ```

   Abrí [http://localhost:3000](http://localhost:3000).

## Variables de entorno

Ver [`.env.example`](.env.example) para la lista completa con comentarios.
Resumen:

| Variable | Para qué |
|---|---|
| `DATABASE_URL` / `DIRECT_URL` | Conexión a Postgres (Neon: pooled / directa) |
| `NEXTAUTH_SECRET` / `NEXTAUTH_URL` | Auth.js |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Login con Google |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD_HASH` | El único usuario permitido |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` | Storage de los PDFs |
| `ANTHROPIC_API_KEY` | Generación con IA |
| `MOODLE_BASE_URL` / `MOODLE_CRYPTO_KEY` | Sincronización con el aula virtual |

### CORS del bucket R2

El visor de PDF pide el archivo directo desde el navegador a R2 (URL
prefirmada), así que el bucket necesita una regla CORS que permita `GET`
desde el dominio de la app. En el dashboard de Cloudflare R2 → tu bucket →
Settings → CORS Policy, algo como:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://tu-app.vercel.app"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["*"]
  }
]
```

## Publicar la web (hosting)

No hace falta administrar ningún servidor. Así se explica cada pieza:

- **Vercel**: hace correr la web. Se conecta a tu repo de GitHub y cada
  push publica sola una nueva versión.
- **Neon**: la base de datos (usuarios, anotaciones, flashcards, todo lo
  generado por IA — no los PDFs en sí).
- **Cloudflare R2**: donde viven los archivos PDF (Vercel no guarda
  archivos entre despliegues).
- **Credenciales de Google**: para que funcione "Continuar con Google".
- **Claude API**: la IA. Se paga solo por lo que se usa.

Pasos:

1. Subí este repo a GitHub (puede ser privado).
2. Creá una cuenta y un proyecto en [Neon](https://neon.tech); copiá el
   connection string pooled (`DATABASE_URL`) y el directo (`DIRECT_URL`).
3. Creá un bucket en Cloudflare R2 y un API token con acceso a ese bucket
   (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
   `R2_BUCKET_NAME`). Configurá el CORS como arriba.
4. En [Google Cloud Console](https://console.cloud.google.com/) → APIs &
   Services → Credentials, creá un OAuth Client ID de tipo "Web
   application". Agregá como redirect URI autorizada:
   `https://tu-app.vercel.app/api/auth/callback/google` (y la versión
   `localhost:3000` para probar local).
5. Creá una API key en [console.anthropic.com](https://console.anthropic.com/).
6. En [vercel.com](https://vercel.com), "Add New Project" → importá el
   repo. En Settings → Environment Variables, cargá todas las variables de
   `.env.example` con sus valores reales.
7. Deploy. Después corré las migraciones contra Neon (una vez, desde tu
   máquina con `DIRECT_URL` apuntando a Neon, o agregando
   `prisma migrate deploy &&` al comando de build de Vercel):

   ```bash
   npm run db:deploy
   ```

8. Entrá a la URL de Vercel, iniciá sesión, y listo.

## Scripts

- `npm run dev` — servidor de desarrollo
- `npm run build` / `npm start` — build y server de producción
- `npm run db:migrate` — nueva migración en desarrollo
- `npm run db:deploy` — aplicar migraciones (producción)
- `npm run db:studio` — explorador visual de la base (Prisma Studio)
- `npm run hash-password -- "contraseña"` — generar `ADMIN_PASSWORD_HASH`
