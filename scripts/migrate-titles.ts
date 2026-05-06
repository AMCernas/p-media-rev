/**
 * Script de migración: Enriquecer titles de reviews existentes
 * 
 * Usage: npx tsx scripts/migrate-titles.ts
 * 
 * Este script busca todas las reviews que no tienen título populate
 * y les agrega el título desde TMDB o Google Books APIs.
 */

import { prisma } from '../lib/prisma';
import { getMovieDetails, getSeriesDetails } from '../lib/tmdb';
import { getBookDetails } from '../lib/books';

async function migrateTitles() {
  console.log('🔄 Iniciando migración de titles...\n');

  // Obtener todas las reviews sin título
  const reviewsWithoutTitle = await prisma.review.findMany({
    where: {
      title: null,
    },
    select: {
      id: true,
      mediaId: true,
      mediaType: true,
    },
  });

  console.log(`📊 Reviews sin título: ${reviewsWithoutTitle.length}`);

  if (reviewsWithoutTitle.length === 0) {
    console.log('✅ No hay reviews que necesitan migración');
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (const review of reviewsWithoutTitle) {
    try {
      let title: string | null = null;

      if (review.mediaType === 'MOVIE') {
        const details = await getMovieDetails(review.mediaId);
        title = details.title;
      } else if (review.mediaType === 'SERIES') {
        const details = await getSeriesDetails(review.mediaId);
        title = details.name;
      } else if (review.mediaType === 'BOOK') {
        const details = await getBookDetails(review.mediaId);
        title = details.volumeInfo.title;
      }

      if (title) {
        await prisma.review.update({
          where: { id: review.id },
          data: { title },
        });
        successCount++;
        console.log(`  ✅ ${review.mediaType} ${review.mediaId} → "${title}"`);
      } else {
        failCount++;
        console.log(`  ⚠️  ${review.mediaType} ${review.mediaId} → sin título`);
      }
    } catch (error) {
      failCount++;
      console.log(`  ❌ ${review.mediaType} ${review.mediaId} → error: ${error}`);
    }

    // Rate limiting simple
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n📈 Resumen:`);
  console.log(`   ✅ Exitosos: ${successCount}`);
  console.log(`   ❌ Fallidos: ${failCount}`);
  console.log(`   📊 Total: ${reviewsWithoutTitle.length}`);
}

migrateTitles()
  .catch(console.error)
  .finally(() => prisma.$disconnect());