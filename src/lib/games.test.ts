import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getAllCategories,
    getFilteredGames,
    getGameById,
} from './games';

async function seedGames(db: Database, count = 3): Promise<{
    categoryIds: number[];
    publisherIds: number[];
}> {
    const insertedCategories = await db
        .insert(categories)
        .values([
            { name: 'Strategy', description: 'strategy' },
            { name: 'Puzzle', description: 'puzzle' },
        ])
        .returning({ id: categories.id });
    const insertedPublishers = await db
        .insert(publishers)
        .values([
            { name: 'Pub One', description: 'publisher one' },
            { name: 'Pub Two', description: 'publisher two' },
        ])
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: insertedCategories[i % insertedCategories.length].id,
            publisherId: insertedPublishers[i % insertedPublishers.length].id,
        });
    }

    return {
        categoryIds: insertedCategories.map((category) => category.id),
        publisherIds: insertedPublishers.map((publisher) => publisher.id),
    };
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category?.name).toBe('Puzzle');
        expect(all[0].publisher?.name).toBe('Pub Two');
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });

    it('returns categories ordered by name', async () => {
        await seedGames(db);
        const all = await getAllCategories(db);
        expect(all.map((category) => category.name)).toEqual(['Puzzle', 'Strategy']);
    });

    it('filters games by one category', async () => {
        const { categoryIds } = await seedGames(db);
        const filtered = await getFilteredGames(db, { categoryIds: [categoryIds[0]] });
        expect(filtered.map((game) => game.title)).toEqual(['Game 02']);
    });

    it('filters games by publisher', async () => {
        const { publisherIds } = await seedGames(db);
        const filtered = await getFilteredGames(db, { publisherId: publisherIds[0] });
        expect(filtered.map((game) => game.title)).toEqual(['Game 02']);
    });

    it('combines category and publisher filters', async () => {
        const { categoryIds, publisherIds } = await seedGames(db);
        const filtered = await getFilteredGames(db, {
            categoryIds: [categoryIds[0]],
            publisherId: publisherIds[0],
        });
        expect(filtered.map((game) => game.title)).toEqual(['Game 02']);
    });

    it('returns no games when filters do not match', async () => {
        const { categoryIds, publisherIds } = await seedGames(db);
        expect(
            await getFilteredGames(db, {
                categoryIds: [categoryIds[0]],
                publisherId: publisherIds[1],
            }),
        ).toEqual([]);
    });
});
