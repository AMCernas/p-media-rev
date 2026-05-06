# AGENTS.md — Screen Review App

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

## Arquitectura

El proyecto sigue una **Layered Architecture orientada a Server Components**, adaptación del patrón de arquitectura por capas al modelo de Next.js App Router. Los datos fluyen siempre en una sola dirección:

```
APIs Externas / DB
       ↓
  Capa Servidor       ← Server Components, API Routes, lib/
       ↓
  Capa de Lógica      ← hooks/ (solo cliente), lib/
       ↓
  Capa de UI          ← Componentes (solo consumen, no producen datos)
```

### Capas y responsabilidades

**Capa de presentación (`components/`)** — Los componentes únicamente consumen y renderizan datos. No contienen lógica de negocio ni acceso a datos. `MediaRow`, `ReviewCard` y `MediaCard` son ejemplos de esta capa.

**Capa de lógica (`hooks/` y `lib/`)** — `hooks/` agrupa la lógica del lado cliente (`useWatchlist`, `useReviews`, `useSearch`). `lib/` agrupa los clientes de acceso a datos y APIs externas (`tmdb.ts`, `books.ts`, `prisma.ts`). Ninguno de los dos toca UI directamente.

**Capa de API/servidor (`app/api/` y Server Components)** — Las rutas en `app/api/` actúan como capa de servicio interna. Los Server Components fetchean datos directamente en servidor antes de pasarlos a la UI. Ninguna llamada a API externa ocurre en el cliente.

### Reglas derivadas de la arquitectura

- Las capas no se saltan: un componente de UI no llama a Prisma directamente, ni a APIs externas.
- El flujo de datos es unidireccional: API externa → servidor → componente.
- La distinción `"use client"` / Server Component es el mecanismo que hace cumplir el límite entre capas.
- Toda lógica reutilizable que no sea UI va a `lib/` (sin estado) o `hooks/` (con estado de React).

---

## Estructura de Carpetas

```
screen_review/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (main)/
│   │   ├── layout.tsx           ← Layout con Navbar/Sidebar
│   │   ├── dashboard/
│   │   │   └── page.tsx         ← Stats + Trending + Listas por tipo de media
│   │   ├── details/
│   │   │   └── [type]/
│   │   │       └── [id]/
│   │   │           └── page.tsx
│   │   ├── library/
│   │   │   ├── page.tsx         ← Server Component con filtros + botón ir al editor
│   │   │   └── library-client.tsx
│   │   └── editor/
│   │       ├── [[...reviewId]]/
│   │       │   ├── page.tsx     ← Landing + Editor (Server)
│   │       │   ├── editor-client.tsx   ← Editor con auto-save
│   │       │   └── editor-landing.tsx  ← Lista paginada (6 items) de borradores y completadas
│   │       ├── drafts/
│   │       │   └── page.tsx     ← Vista completa de todos los borradores
│   │       ├── completed/
│   │       │   └── page.tsx     ← Vista completa de todas las reseñas completadas
│   │       └── page.tsx
│   └── api/
│       ├── tmdb/
│       │   └── route.ts
│       ├── books/
│       │   └── route.ts
│       └── reviews/
│           ├── route.ts         ← POST, GET, PATCH, DELETE genérico
│           └── [id]/
│               └── route.ts     ← GET, PATCH, DELETE por ID
├── components/
│   ├── ui/                      ← Componentes shadcn (NO editar directamente)
│   ├── layout/                  ← Navbar, Sidebar, PageShell
│   └── features/                ← Componentes de negocio
│       ├── MediaCard.tsx
│       ├── ReviewCard.tsx
│       ├── WatchlistButton.tsx
│       ├── MediaRow.tsx         ← Fila horizontal reutilizable para listas por tipo
│       └── search-box.tsx
├── lib/
│   ├── tmdb.ts                  ← Cliente TMDB API
│   ├── books.ts                 ← Cliente Google Books API
│   ├── prisma.ts                ← Cliente Prisma
│   ├── supabase.ts              ← Supabase SSR helper
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
- Muestra **Stats**: Watchlist, Total Reseñas (borradores + completadas), Borradores (solo DRAFT), Publicadas (COMPLETED).
- Sección **Trending** desde TMDB (`/trending/all/week`).
- Tres listas adicionales de descubrimiento, una por tipo de media:
  - **Películas Populares** → endpoint TMDB `/movie/popular`
  - **Series Populares** → endpoint TMDB `/tv/popular`
  - **Libros Populares** → endpoint Google Books (query configurable, ej. `subject:fiction`)
- Cada lista se renderiza como una fila horizontal de `MediaCard` usando el componente reutilizable `MediaRow`.
- **Actividad Reciente** (últimos 5 ítems actualizados del usuario).
- Server Component. Fetch de datos en servidor. Los cuatro endpoints externos se pueden ejecutar en paralelo con `Promise.all`.

### `/details/[type]/[id]`
- `type` acepta: `movie`, `series`, `book`.
- Muestra metadata del ítem obtenida de la API externa correspondiente.
- Contiene dos acciones principales:
  - **Agregar a Watchlist** → llama a `POST /api/reviews` con estado `WATCHLIST`.
  - **Escribir Reseña** → redirige a `/editor?mediaId=X&mediaType=Y`. Si ya existe una reseña, redirige automáticamente a `/editor/[existingId]`.
- Componentes de acciones son `"use client"`.

### `/library`
- Muestra la **Watchlist**, **Borradores** y **Reseñas Completadas** del usuario.
- Datos traídos desde la DB vía Prisma.
- Permite filtrar por tipo (`movie`, `series`, `book`) y por estado.
- En la sección **Reseñas** (borradores y completadas) cada `ReviewCard` incluye un botón **"Editar"** que redirige al editor con la ruta `/editor/[reviewId]`.
- Server Component con `LibraryClient` para filtros.

### `/editor/[[...reviewId]]`
- **Sin params**: Muestra la landing con las dos secciones (borradores y completadas), cada una limitada a **6 elementos** como máximo.
  - Sección **Borradores**: muestra hasta 6 drafts ordenados por `updatedAt DESC`. Si hay más de 6, muestra botón **"Ver todos los borradores"** que redirige a `/editor/drafts`.
  - Sección **Completadas**: muestra hasta 6 reseñas completadas ordenadas por `updatedAt DESC`. Si hay más de 6, muestra botón **"Ver todas las completadas"** que redirige a `/editor/completed`.
- **Con `reviewId`**: Carga y edita una reseña existente.
- **Con `?mediaId=X&mediaType=Y`**: Crea nuevo borrador O redirige a existente.
- **Auto-save**: 800ms debounce → `PATCH /api/reviews/[id]`.
- **Drafts**: status `DRAFT` en DB.
- `"use client"` completo con `EditorClient`.

### `/editor/drafts`
- Vista completa de **todos los borradores** del usuario, sin límite de cantidad.
- Ordenados por `updatedAt DESC`.
- Cada ítem incluye botón **"Continuar editando"** que redirige a `/editor/[reviewId]`.
- Server Component. Fetch directo con Prisma filtrando `status: "DRAFT"`.

### `/editor/completed`
- Vista completa de **todas las reseñas completadas** del usuario, sin límite de cantidad.
- Ordenadas por `updatedAt DESC`.
- Cada ítem incluye botón **"Editar"** que redirige a `/editor/[reviewId]`.
- Server Component. Fetch directo con Prisma filtrando `status: "COMPLETED"`.

### `/login`
- Formulario email/password.
- Usa Supabase Auth.
- Layout sin Navbar.

---

## Modelo de Datos (Prisma)

```prisma
model Review {
  id        String      @id @default(cuid())
  userId    String
  mediaId   String      // ID externo (TMDB o Google Books)
  mediaType MediaType   // MOVIE | SERIES | BOOK
  status    ReviewStatus // DRAFT | COMPLETED | WATCHLIST
  rating    Int?        // 1–5, null si es solo watchlist
  content   String?
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  @@index([userId])
}

enum MediaType {
  MOVIE
  SERIES
  BOOK
}

enum ReviewStatus {
  DRAFT
  COMPLETED   ← Cambió de PUBLISHED a COMPLETED
  WATCHLIST
}
```

---

## APIs Internas

### `/api/reviews` (route.ts)
- **POST**: Crear review/watchlist. Valida duplicados (mismo user + mediaId + mediaType → 409).
- **GET**: Listar reseñas del usuario (filtros: `type`, `status`, `limit`, `offset`).
  - El parámetro `limit` se usa desde la landing del editor para pedir exactamente 6 ítems por sección.
- **PATCH**: Actualizar reseñas (requiere `id` en body).
- **DELETE**: Eliminar de watchlist.

### `/api/reviews/[id]` ([id]/route.ts)
- **GET**: Obtener una reseña específica por ID.
- **PATCH**: Actualizar rating/content/status de una reseña.
- **DELETE**: Eliminar una reseña por ID.

---

## APIs Externas

### TMDB
- Base URL: `https://api.themoviedb.org/3`
- Variables: `TMDB_API_KEY`
- Endpoints:
  - `/movie/{id}`, `/tv/{id}` — detalle
  - `/trending/all/week` — sección Trending en Dashboard
  - `/movie/popular` — lista Películas Populares en Dashboard
  - `/tv/popular` — lista Series Populares en Dashboard
  - `/movie/{id}/credits`, `/tv/{id}/credits`
  - `/tv/{id}/season/{season_number}`
- Cliente: `lib/tmdb.ts`

### Google Books
- Base URL: `https://www.googleapis.com/books/v1`
- Variables: `GOOGLE_BOOKS_API_KEY`
- Endpoints:
  - `/volumes/{id}` — detalle
  - `/volumes?q=...` — búsqueda y lista Libros Populares en Dashboard
- Cliente: `lib/books.ts`

**Regla:** Las llamadas a APIs externas solo desde Server Components o API Routes, nunca desde cliente.

---

## Componentes Reutilizables

### `MediaRow` (`components/features/MediaRow.tsx`)
- Componente de fila horizontal para mostrar una lista de `MediaCard`.
- Props: `title: string`, `items: MediaItem[]`, `mediaType: MediaType`.
- Usado en Dashboard para las cuatro secciones: Trending, Películas, Series y Libros.
- No tiene estado propio: Server Component compatible.

---

## Convenciones de Código

### Componentes
- `"use client"` solo cuando hay: estado local, event handlers, hooks de browser, o efectos.
- Todo lo demás es Server Component.
- Nombrar: componentes en PascalCase, archivos en PascalCase.

### Tipos
- Tipos compartidos en `src/types/`.
- No usar `any`. Usar `unknown` + narrowing.
- Tipos de APIs externas en `src/types/media.ts`.

### API Routes
- Solo operaciones con DB propia.
- Validar request body antes de operar.
- Retornar errores con HTTP status apropiado y `{ error: string }`.

### Estilos
- Clases de Tailwind. No CSS custom salvo tokens en `globals.css`.
- No modificar `src/components/ui/` — son generados por shadcn.

---

## Bugs Conocidos y Soluciones (para el agente)

### 1. 409 Conflict al crear reseña
- **Problema**: Usuario intenta crear reseña desde Details pero ya existe un draft.
- **Solución**: El editor (page.tsx) verifica si existe una reseña para ese mediaId/mediaType y redirige a la existente antes de pasar al cliente.

### 2. Rating no se guarda con un click
- **Problema**: React batching hace que `triggerAutoSave()` lea el valor viejo del state.
- **Solución**: Pasar el nuevo rating directamente a `triggerAutoSave(newRating)`.

### 3. null.length error (500)
- **Problema**: Validación `content !== undefined && content.length` falla cuando content es null.
- **Solución**: Usar `content != null && content.length`.

### 4. Dashboard muestra borradores incorrectos
- **Problema**: Calculaba como `total - publicados` (incluía watchlist).
- **Solución**: Query separada con `status: 'DRAFT'` y `totalReviews = drafts + published`.

### 5. Editor landing no refleja el límite de 6 elementos
- **Problema**: Si se consulta sin `limit`, la landing puede mostrar todos los ítems e ignorar la paginación.
- **Solución**: La landing del editor siempre pasa `take: 6` a Prisma (o `limit=6` a la API). La presencia de más ítems en DB se detecta con un `count` separado o consultando `take: 7` y chequeando si el resultado tiene 7 elementos.

---

## Variables de Entorno

**Nunca hardcodear credenciales.** Variables requeridas:

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

1. **No modificar** archivos en `src/components/ui/`. Crear wrappers en `src/components/features/`.
2. **No llamar APIs externas** desde clientes. Usar Server Components o API Routes.
3. **No crear nuevas variables** sin documentar en `.env.example`.
4. **No mezclar lógica con UI**. Lógica en `hooks/` o `lib/`, componentes solo consumen.
5. **Auth** con helper de Supabase SSR (`@supabase/ssr`), no cliente browser en Server Components.
6. **Drafts** siempre con `status: "DRAFT"`. Completar = cambiar a `"COMPLETED"`.
7. **Al crear desde Details**, el editor redirige a existente si ya hay draft.
8. Revisar si funcionalidad ya existe antes de agregar dependencias.
9. **Editor landing** siempre muestra máximo 6 elementos por sección. El botón "Ver todos" solo aparece si el total de ítems supera 6.
10. **`MediaRow`** es el componente canónico para listas horizontales de media en el Dashboard. No duplicar lógica de layout en cada sección.

---

## Estado Actual de la App (May 2026)

| Feature | Status |
|---------|--------|
| Login/Auth Supabase | ✅ |
| Dashboard con stats reales | ✅ |
| Details (movie/series/book) | ✅ |
| Watchlist | ✅ |
| Editor con auto-save (800ms) | ✅ |
| Completar reseñas | ✅ |
| Editor Landing (lista drafts/completadas) | ✅ |
| Build pasa | ✅ |
| Dashboard: listas Películas, Series y Libros Populares | ✅ |
| Componente reutilizable MediaRow | ✅ |
| Editor Landing: límite de 6 elementos por sección | ✅ |
| Editor Landing: botón "Ver todos" → /editor/drafts | ✅ |
| Editor Landing: botón "Ver todas" → /editor/completed | ✅ |
| Página /editor/drafts (vista completa borradores) | ✅ |
| Página /editor/completed (vista completa completadas) | ✅ |
| Library: botón "Editar" en ReviewCard | 🔲 |

---

## Historial de Cambios Recientes

- **Fix**: Auto-save con React batching (rating directo al trigger)
- **Fix**: Dashboard stats = borradores reales + total sin watchlist
- **Fix**: Routing `[id]` restaurado para cargar reseñas
- **Fix**: Validación rating null (`!= null` en vez de `!== undefined`)
- **Fix**: Redirect a draft existente desde Details (evita 409)
- **Build**: Eliminado `[id]/route.ts` corrupto y recreado limpio
- **Planeado**: Dashboard — agregar listas de Películas, Series y Libros Populares con `MediaRow`
- **Planeado**: Library — botón "Editar" en cada `ReviewCard` hacia `/editor/[reviewId]`
- **Planeado**: Editor Landing — limitar a 6 elementos por sección + rutas `/editor/drafts` y `/editor/completed`
