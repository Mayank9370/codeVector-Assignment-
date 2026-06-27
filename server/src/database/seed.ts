// ─────────────────────────────────────────────────────────────
// High-Performance Database Seeder
// ─────────────────────────────────────────────────────────────
//
// Generates and inserts 200,000 product rows into PostgreSQL.
//
// WHY this is designed for performance:
//   1. Single Transaction: All 200,000 inserts happen between BEGIN and COMMIT.
//      This reduces disk syncs from 200,000 down to 1.
//   2. Multi-row Batched Inserts: Inserts 1,000 products at a time.
//      Reduces Node-to-DB round-trips from 200,000 to 200.
//   3. Parameterized Queries: Safe from SQL injection, lets PostgreSQL
//      prepare and cache query plans.
//
// WHY dates are staggered and duplicated:
//   - Staggered over 30 days to populate a realistic timeline.
//   - Groups of 5 products share the exact same `created_at` timestamp.
//     This ensures our pagination tie-breaker (id DESC) is thoroughly
//     exercised under testing.
// ─────────────────────────────────────────────────────────────

import { db } from '../config';

const CATEGORIES = [
  'electronics',
  'clothing',
  'home',
  'beauty',
  'sports',
  'books',
  'automotive',
  'toys',
];

const ADJECTIVES = [
  'Premium',
  'Ultra',
  'Sleek',
  'Classic',
  'Modern',
  'Eco-Friendly',
  'Portable',
  'Wireless',
  'Smart',
  'Heavy-Duty',
  'Compact',
  'Luxury',
  'Ergonomic',
  'Pro',
  'Silent',
  'Sturdy',
  'Mini',
  'Foldable',
  'Adjustable',
  'Waterproof',
];

const NOUNS = [
  'Mouse',
  'Keyboard',
  'T-Shirt',
  'Water Bottle',
  'Backpack',
  'Lamp',
  'Blender',
  'Vacuum',
  'Desk Chair',
  'Notebook',
  'Headphones',
  'Speaker',
  'Running Shoes',
  'Yoga Mat',
  'Coffee Maker',
  'Toaster',
  'Hammer',
  'Screwdriver',
  'Skateboard',
  'Monitor',
  'Charger',
  'Jacket',
  'Dumbbell',
  'Knife',
  'Spoon',
  'Fork',
];

// Helper to generate a random price string (NUMERIC format)
function generatePrice(): string {
  const price = (Math.random() * 995 + 5).toFixed(2); // $5.00 to $1000.00
  return price;
}

// Helper to generate a random product name
function generateName(): string {
  const adj1 = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const suffix = Math.floor(Math.random() * 10000);
  return `${adj1} ${noun} ${suffix}`;
}

async function seed() {
  // eslint-disable-next-line no-console
  console.log('⏳ Connecting to database for seeding...');
  const client = await db.connect();

  try {
    // 1. Clean out existing products
    // eslint-disable-next-line no-console
    console.log('🧹 Truncating existing products table...');
    await client.query('TRUNCATE TABLE products RESTART IDENTITY;');

    const TOTAL_RECORDS = 200_000;
    const BATCH_SIZE = 1000;
    const TOTAL_BATCHES = TOTAL_RECORDS / BATCH_SIZE;

    const now = Date.now();
    const baseDate = now - 30 * 24 * 60 * 60 * 1000; // Start dates 30 days ago

    // eslint-disable-next-line no-console
    console.log(`🚀 Starting generation of ${TOTAL_RECORDS.toLocaleString()} products...`);
    // eslint-disable-next-line no-console
    console.log(`   Batch size: ${BATCH_SIZE}, Total batches: ${TOTAL_BATCHES}`);

    // Start transaction
    await client.query('BEGIN;');

    for (let batch = 0; batch < TOTAL_BATCHES; batch++) {
      const values: unknown[] = [];
      const placeholders: string[] = [];

      for (let i = 0; i < BATCH_SIZE; i++) {
        const globalIndex = batch * BATCH_SIZE + i;

        const name = generateName();
        const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
        const price = generatePrice();

        // Stagger dates over time.
        // Divide by 5 so groups of 5 products share the EXACT same millisecond timestamp.
        // This exercises our `(created_at, id)` tie-breaker.
        const timeOffset = Math.floor(globalIndex / 5) * 15 * 1000; // Increment by 15s every 5 items
        const createdAt = new Date(baseDate + timeOffset).toISOString();

        const offset = i * 5;
        placeholders.push(
          `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`,
        );

        values.push(name, category, price, createdAt, createdAt);
      }

      const query = `
        INSERT INTO products (name, category, price, created_at, updated_at)
        VALUES ${placeholders.join(', ')}
      `;

      await client.query(query, values);

      if ((batch + 1) % 20 === 0 || batch === TOTAL_BATCHES - 1) {
        // eslint-disable-next-line no-console
        console.log(
          `   📦 Inserted ${((batch + 1) * BATCH_SIZE).toLocaleString()} / ${TOTAL_RECORDS.toLocaleString()} products`,
        );
      }
    }

    // Commit transaction
    await client.query('COMMIT;');
    // eslint-disable-next-line no-console
    console.log('✅ Seeding completed successfully!');
  } catch (error) {
    // Rollback transaction in case of error to leave db clean
    await client.query('ROLLBACK;');
    // eslint-disable-next-line no-console
    console.error('🔴 Seeding failed, transaction rolled back:', error);
    process.exit(1);
  } finally {
    // Release the client connection back to pool
    client.release();
    // Close the database pool cleanly to exit the Node process
    await db.end();
  }
}

seed();
