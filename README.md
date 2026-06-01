# Shelf

Aplicación web personal para descubrir, organizar y reseñar películas, series y libros.

---

## Funcionalidades

- **Dashboard** — Trending de TMDB, populares por categoría (películas, series, libros) y actividad reciente. Saludo personalizado.
- **Detalles** — Página de detalle con metadata, sinopsis, rating, géneros, temporadas (series) y acciones.
- **Watchlist** — Agregá ítems a tu watchlist desde cualquier detalle. Sección dedicada en la biblioteca.
- **Editor de reseñas** — Editor con auto-save (800ms debounce), rating 1-5, borradores, completado. Vista landing con límite de 6 ítems por sección y "Ver todos".
- **Biblioteca** — Watchlist + borradores + reseñas completadas, con filtros por tipo y estado. Orden configurable.
- **Búsqueda** — Búsqueda con filtros por tipo (películas, series, libros).
- **Settings** — Configuración de nombre de perfil, idioma (TMDB), orden de biblioteca y tema (oscuro/claro) con persistencia en DB.
- **Autenticación** — Login con Supabase Auth (email/password), layouts protegidos.

---

## Arquitectura

El proyecto sigue una **Layered Architecture orientada a Server Components** de Next.js App Router. Los datos fluyen en una sola dirección:

```
APIs Externas / DB
       ↓
  Capa Servidor       ← Server Components, API Routes, lib/
       ↓
  Capa de Lógica      ← hooks/ (cliente), lib/
       ↓
  Capa de UI          ← Componentes (solo renderizan, no producen datos)
```

- Los Server Components fetchean datos directamente desde APIs externas o Prisma.
- Las API Routes internas manejan operaciones con la DB (CRUD de reseñas, settings).
- Los hooks encapsulan lógica de estado del lado cliente.
- Los componentes de UI son puramente presentacionales.

**Reglas clave:** las capas no se saltan. Ningún componente de UI llama a Prisma o APIs externas directamente. Toda llamada externa ocurre en servidor.

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router) |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS v4 + shadcn/ui |
| Base de datos | Supabase (PostgreSQL) |
| ORM | Prisma |
| Autenticación | Supabase Auth (SSR) |
| APIs externas | TMDB (películas/series), Google Books API (libros) |

---

## Estructura

```
app/
├── (auth)/login/        ← Login con Supabase
├── (main)/
│   ├── dashboard/       ← Landing page con descubrimiento
│   ├── details/[type]/[id]/  ← Detalle por tipo
│   ├── editor/          ← Editor de reseñas + vistas de drafts/completadas
│   ├── explore/         ← Exploración
│   ├── library/         ← Watchlist, borradores, completadas
│   ├── search/          ← Búsqueda con filtros
│   └── settings/        ← Preferencias de usuario
├── api/                 ← API routes internas (reviews, settings, tmdb, books)
components/
├── ui/                  ← shadcn/ui (no editar directamente)
├── layout/              ← Sidebar, Navbar
└── features/            ← MediaCard, ReviewCard, MediaRow, etc.
lib/                     ← Clientes (Prisma, Supabase, TMDB, Google Books), helpers
hooks/                   ← useWatchlist, useReviews, useSearch
types/                   ← Tipos compartidos
```

---

## Inicio rápido

Requerís Node.js 20+ y una base PostgreSQL (Supabase recomendado).

```bash
# clonar
git clone <repo>
cd shelf

# instalar
npm install

# configurar variables de entorno (ver .env.example)
cp .env.example .env

# migrar base de datos
npx prisma migrate dev

# iniciar dev
npm run dev
```

Variables de entorno requeridas:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TMDB_API_KEY=
GOOGLE_BOOKS_API_KEY=
DATABASE_URL=
```
