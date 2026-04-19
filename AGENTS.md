# AGENTS.md — Review App

Guía de referencia para agentes de IA que trabajen en este repositorio. Leer completo antes de modificar cualquier archivo.

---

## Visión General del Proyecto

Aplicación web personal para reseñar series, películas y libros. Permite al usuario buscar contenido a través de APIs externas, agregar ítems a una watchlist, escribir reseñas y administrarlas desde un editor.

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Lenguaje | TypeScript (estricto) |
| Estilos | Tailwind CSS |
| Componentes UI | shadcn/ui (sobre Radix UI) |
| Base de datos | Supabase (PostgreSQL) |
| ORM | Prisma |
| Autenticación | Supabase Auth |
| APIs externas | TMDB (películas/series), Google Books API (libros) |

---

## Estructura de Carpetas

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (main)/
│   │   ├── layout.tsx           ← Layout con Navbar/Sidebar
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── details/
│   │   │   └── [type]/
│   │   │       └── [id]/
│   │   │           └── page.tsx
│   │   ├── library/
│   │   │   └── page.tsx
│   │   └── editor/
│   │       └── [[...reviewId]]/
│   │           └── page.tsx
│   └── api/
│       ├── tmdb/
│       │   └── route.ts
│       ├── books/
│       │   └── route.ts
│       └── reviews/
│           └── route.ts
├── components/
│   ├── ui/                      ← Componentes shadcn (NO editar directamente)
│   ├── layout/                  ← Navbar, Sidebar, PageShell
│   └── features/                ← Componentes de negocio
│       ├── MediaCard.tsx
│       ├── ReviewCard.tsx
│       └── WatchlistButton.tsx
├── lib/
│   ├── tmdb.ts                  ← Cliente TMDB API
│   ├── books.ts                 ← Cliente Google Books API
│   ├── db.ts                    ← Cliente Prisma
│   └── utils.ts
├── hooks/
│   ├── useWatchlist.ts
│   ├── useReviews.ts
│   └── useSearch.ts
└── types/
    ├── media.ts                 ← MediaItem, MediaType
    ├── review.ts                ← Review, ReviewDraft
    └── user.ts
```

---

## Páginas y Responsabilidades

### `/dashboard`
- Muestra secciones: **Contenido nuevo** (desde TMDB/Books) y **Vistos recientemente** (desde DB).
- Es un Server Component. Fetch de datos en servidor.
- No tiene estado de cliente salvo filtros de navegación.

### `/details/[type]/[id]`
- `type` acepta: `movie`, `series`, `book`.
- Muestra metadata del ítem obtenida de la API externa correspondiente.
- Contiene dos acciones principales:
  - **Agregar a Watchlist** → llama a `POST /api/reviews` con estado `watchlist`.
  - **Agregar Reseña** → redirige a `/editor` con el ítem precargado.
- El componente de acciones (`WatchlistButton`, botón de reseña) es `"use client"`.

### `/library`
- Muestra la **Watchlist** y las **Reseñas** del usuario autenticado.
- Datos traídos desde la DB vía Prisma.
- Permite filtrar por tipo (`movie`, `series`, `book`) y por estado.

### `/editor/[[...reviewId]]`
- Sin `reviewId`: crea una nueva reseña.
- Con `reviewId`: carga y edita una reseña existente.
- Persiste **drafts automáticamente** (debounce de 1.5s → `PATCH /api/reviews/[id]`).
- Los drafts son reseñas con `status: "draft"` en la DB.
- Es `"use client"` completo.

### `/login`
- Formulario simple de email/password.
- Usa Supabase Auth directamente desde el cliente.
- Layout propio sin Navbar.

---

## Modelo de Datos (Prisma)

```prisma
model Review {
  id          String      @id @default(cuid())
  userId      String
  mediaId     String      // ID externo (TMDB o Google Books)
  mediaType   MediaType   // MOVIE | SERIES | BOOK
  status      ReviewStatus // DRAFT | PUBLISHED | WATCHLIST
  rating      Int?        // 1–5, null si es solo watchlist
  content     String?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}

enum MediaType {
  MOVIE
  SERIES
  BOOK
}

enum ReviewStatus {
  DRAFT
  PUBLISHED
  WATCHLIST
}
```

---

## APIs Externas

### TMDB
- Base URL: `https://api.themoviedb.org/3`
- Variables de entorno: `TMDB_API_KEY`
- Endpoints utilizados: `/movie/{id}`, `/tv/{id}`, `/trending/all/week`
- El cliente vive en `src/lib/tmdb.ts`

### Google Books
- Base URL: `https://www.googleapis.com/books/v1`
- Variables de entorno: `GOOGLE_BOOKS_API_KEY`
- Endpoints utilizados: `/volumes/{id}`, `/volumes?q=...`
- El cliente vive en `src/lib/books.ts`

**Regla:** Las llamadas a APIs externas se realizan **solo desde Server Components o API Routes**, nunca desde el cliente directamente.

---

## Convenciones de Código

### Componentes
- `"use client"` solo cuando hay: estado local, event handlers, hooks de browser, o efectos.
- Todo lo demás es Server Component por defecto.
- Nombrar componentes en PascalCase, archivos en PascalCase también.

### Tipos
- Todos los tipos compartidos viven en `src/types/`.
- No usar `any`. Usar `unknown` si es necesario y hacer narrowing explícito.
- Los tipos de respuesta de APIs externas se definen en `src/types/media.ts`.

### API Routes
- Solo para operaciones con la base de datos propia.
- Siempre validar el cuerpo del request antes de operar.
- Retornar errores con el status HTTP apropiado y un objeto `{ error: string }`.

### Estilos
- Usar clases de Tailwind. No escribir CSS custom salvo tokens en `globals.css`.
- Los tokens de diseño (colores, radios, tipografía) se definen en `globals.css` como variables CSS.
- No modificar archivos dentro de `src/components/ui/` — son generados por shadcn.

---

## Variables de Entorno

El agente **nunca debe hardcodear** credenciales. Las variables requeridas son:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TMDB_API_KEY=
GOOGLE_BOOKS_API_KEY=
DATABASE_URL=
```

---

## Reglas para el Agente

1. **No modificar** archivos dentro de `src/components/ui/`. Para personalizar un componente de shadcn, crear un wrapper en `src/components/features/`.
2. **No llamar APIs externas** desde componentes de cliente. Usar Server Components o API Routes.
3. **No crear nuevas variables de entorno** sin documentarlas en este archivo y en `.env.example`.
4. **No mezclar lógica de negocio con UI**. La lógica vive en `hooks/` o `lib/`, los componentes solo consumen.
5. **El estado de autenticación** se maneja con el helper de Supabase SSR (`@supabase/ssr`), no con el cliente browser en Server Components.
6. **Los drafts** siempre tienen `status: "DRAFT"` hasta que el usuario los publique explícitamente.
7. **Al crear una reseña desde `/details`**, el `mediaId` y `mediaType` deben precargarse desde los params de la ruta.
8. Antes de agregar una dependencia nueva, verificar si la funcionalidad ya existe en el stack actual.
