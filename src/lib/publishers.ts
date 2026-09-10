/**
 * Data-access helpers for retrieving publisher records from the local database.
 *
 * These helpers accept an injectable Drizzle database client so they can be
 * used by build-time pages and tested against an in-memory database.
 */

import { asc } from 'drizzle-orm';
import { publishers } from '../../db/schema';
import type { Publisher } from '../types/game';
import type { Database } from './db';

/**
 * Retrieves all publishers ordered alphabetically by name.
 *
 * @param db - The Drizzle database client used to query publisher records.
 * @returns A promise that resolves to the ordered publisher summaries.
 */
export async function getAllPublishers(db: Database): Promise<Publisher[]> {
    return db
        .select({ id: publishers.id, name: publishers.name })
        .from(publishers)
        .orderBy(asc(publishers.name));
}
