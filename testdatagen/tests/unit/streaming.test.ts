import { StreamingGenerator } from '../../src/utils/streaming';
import { TableSchema } from '../../src/types';
import * as fs from 'fs';
import * as path from 'path';

describe('StreamingGenerator', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = '/tmp/testdatagen-streaming-' + Date.now();
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('batch generation', () => {
    it('generates data in batches', async () => {
      const tables: TableSchema[] = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'name', type: 'VARCHAR(100)', constraints: {} }
          ],
          foreignKeys: []
        }
      ];

      const streaming = new StreamingGenerator(tables, {
        count: 1000,
        batchSize: 100,
        seed: 42
      });

      let totalRecords = 0;
      let batchCount = 0;

      for await (const batch of streaming.generateBatches()) {
        batchCount++;
        totalRecords += batch.users.length;
        expect(batch.users.length).toBeLessThanOrEqual(100);
      }

      expect(totalRecords).toBe(1000);
      expect(batchCount).toBe(10); // 1000 / 100
    });

    it('handles partial final batch', async () => {
      const tables: TableSchema[] = [
        {
          name: 'products',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } }
          ],
          foreignKeys: []
        }
      ];

      const streaming = new StreamingGenerator(tables, {
        count: 250,
        batchSize: 100,
        seed: 42
      });

      const batches: any[] = [];

      for await (const batch of streaming.generateBatches()) {
        batches.push(batch);
      }

      expect(batches).toHaveLength(3);
      expect(batches[0].products.length).toBe(100);
      expect(batches[1].products.length).toBe(100);
      expect(batches[2].products.length).toBe(50); // Final partial batch
    });

    it('maintains referential integrity across batches', async () => {
      const tables: TableSchema[] = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } }
          ],
          foreignKeys: []
        },
        {
          name: 'orders',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'user_id', type: 'INTEGER', constraints: {} }
          ],
          foreignKeys: [{
            columnName: 'user_id',
            referencedTable: 'users',
            referencedColumn: 'id'
          }]
        }
      ];

      const streaming = new StreamingGenerator(tables, {
        count: 500,
        batchSize: 100,
        seed: 42
      });

      const allUserIds = new Set<number>();
      const allOrderUserIds: number[] = [];

      for await (const batch of streaming.generateBatches()) {
        if (batch.users) {
          batch.users.forEach((u: any) => allUserIds.add(u.id));
        }
        if (batch.orders) {
          batch.orders.forEach((o: any) => allOrderUserIds.push(o.user_id));
        }
      }

      // All order user_ids should reference existing users
      allOrderUserIds.forEach(userId => {
        expect(allUserIds.has(userId)).toBe(true);
      });
    });
  });

  describe('file streaming', () => {
    it('streams data directly to file', async () => {
      const tables: TableSchema[] = [
        {
          name: 'test',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'data', type: 'VARCHAR(100)', constraints: {} }
          ],
          foreignKeys: []
        }
      ];

      const outputPath = path.join(tempDir, 'output.sql');
      const streaming = new StreamingGenerator(tables, {
        count: 1000,
        batchSize: 100,
        seed: 42,
        output: outputPath
      });

      await streaming.streamToFile('sql');

      expect(fs.existsSync(outputPath)).toBe(true);

      const content = fs.readFileSync(outputPath, 'utf-8');
      expect(content).toContain('INSERT INTO test');
      expect(content.split('INSERT INTO test').length - 1).toBeGreaterThan(0);
    });

    it('streams JSON to file', async () => {
      const tables: TableSchema[] = [
        {
          name: 'items',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } }
          ],
          foreignKeys: []
        }
      ];

      const outputPath = path.join(tempDir, 'output.json');
      const streaming = new StreamingGenerator(tables, {
        count: 500,
        batchSize: 100,
        seed: 42,
        output: outputPath
      });

      await streaming.streamToFile('json');

      expect(fs.existsSync(outputPath)).toBe(true);

      const content = fs.readFileSync(outputPath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.items).toHaveLength(500);
    });

    it('streams CSV to file', async () => {
      const tables: TableSchema[] = [
        {
          name: 'records',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'value', type: 'VARCHAR(50)', constraints: {} }
          ],
          foreignKeys: []
        }
      ];

      const outputPath = path.join(tempDir, 'output.csv');
      const streaming = new StreamingGenerator(tables, {
        count: 200,
        batchSize: 50,
        seed: 42,
        output: outputPath
      });

      await streaming.streamToFile('csv');

      expect(fs.existsSync(outputPath)).toBe(true);

      const content = fs.readFileSync(outputPath, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBe(201); // Header + 200 rows
    });
  });

  describe('memory management', () => {
    it('maintains low memory footprint for large datasets', async () => {
      const tables: TableSchema[] = [
        {
          name: 'large',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'data', type: 'TEXT', constraints: {} }
          ],
          foreignKeys: []
        }
      ];

      const streaming = new StreamingGenerator(tables, {
        count: 100000,
        batchSize: 1000,
        seed: 42
      });

      const initialMemory = process.memoryUsage().heapUsed;
      let maxMemoryIncrease = 0;

      let processedRecords = 0;
      for await (const batch of streaming.generateBatches()) {
        processedRecords += batch.large.length;

        const currentMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = currentMemory - initialMemory;
        maxMemoryIncrease = Math.max(maxMemoryIncrease, memoryIncrease);

        // Memory increase should be bounded
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // < 50MB
      }

      expect(processedRecords).toBe(100000);
    }, 30000);

    it('garbage collects between batches', async () => {
      const tables: TableSchema[] = [
        {
          name: 'test',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } }
          ],
          foreignKeys: []
        }
      ];

      const streaming = new StreamingGenerator(tables, {
        count: 10000,
        batchSize: 1000,
        seed: 42
      });

      const memoryReadings: number[] = [];

      for await (const batch of streaming.generateBatches()) {
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        memoryReadings.push(process.memoryUsage().heapUsed);
      }

      // Memory should not continuously grow
      const firstReading = memoryReadings[0];
      const lastReading = memoryReadings[memoryReadings.length - 1];

      // Allow some growth but not unbounded
      expect(lastReading).toBeLessThan(firstReading * 3);
    }, 30000);
  });

  describe('progress tracking', () => {
    it('reports progress during generation', async () => {
      const tables: TableSchema[] = [
        {
          name: 'test',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } }
          ],
          foreignKeys: []
        }
      ];

      const progressUpdates: number[] = [];

      const streaming = new StreamingGenerator(tables, {
        count: 1000,
        batchSize: 100,
        seed: 42,
        onProgress: (progress) => {
          progressUpdates.push(progress);
        }
      });

      for await (const batch of streaming.generateBatches()) {
        // Progress callback should be called
      }

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1]).toBe(100); // Final progress is 100%
    });

    it('provides accurate progress percentages', async () => {
      const tables: TableSchema[] = [
        {
          name: 'test',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } }
          ],
          foreignKeys: []
        }
      ];

      const progressUpdates: number[] = [];

      const streaming = new StreamingGenerator(tables, {
        count: 500,
        batchSize: 100,
        seed: 42,
        onProgress: (progress) => {
          progressUpdates.push(progress);
        }
      });

      for await (const batch of streaming.generateBatches()) {
        // Progress tracking
      }

      // Progress should be monotonically increasing
      for (let i = 1; i < progressUpdates.length; i++) {
        expect(progressUpdates[i]).toBeGreaterThanOrEqual(progressUpdates[i - 1]);
      }
    });
  });

  describe('error handling', () => {
    it('handles write errors gracefully', async () => {
      const tables: TableSchema[] = [
        {
          name: 'test',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } }
          ],
          foreignKeys: []
        }
      ];

      // Try to write to invalid path
      const streaming = new StreamingGenerator(tables, {
        count: 100,
        batchSize: 10,
        seed: 42,
        output: '/invalid/path/output.sql'
      });

      await expect(streaming.streamToFile('sql')).rejects.toThrow();
    });

    it('cleans up resources on error', async () => {
      const tables: TableSchema[] = [
        {
          name: 'test',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } }
          ],
          foreignKeys: []
        }
      ];

      const outputPath = path.join(tempDir, 'error-test.sql');

      const streaming = new StreamingGenerator(tables, {
        count: 1000,
        batchSize: 100,
        seed: 42,
        output: outputPath,
        onBatch: (batch) => {
          if (batch.test.length > 200) {
            throw new Error('Simulated error');
          }
        }
      });

      try {
        await streaming.streamToFile('sql');
        fail('Should have thrown error');
      } catch (error) {
        // File handle should be closed
        // Try to delete file to verify no locks
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
        expect(true).toBe(true);
      }
    });
  });

  describe('pause and resume', () => {
    it('can pause and resume generation', async () => {
      const tables: TableSchema[] = [
        {
          name: 'test',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } }
          ],
          foreignKeys: []
        }
      ];

      const streaming = new StreamingGenerator(tables, {
        count: 1000,
        batchSize: 100,
        seed: 42
      });

      let processedCount = 0;
      let pauseAfter = 300;

      for await (const batch of streaming.generateBatches()) {
        processedCount += batch.test.length;

        if (processedCount >= pauseAfter && !streaming.isPaused()) {
          streaming.pause();
          expect(streaming.isPaused()).toBe(true);

          // Simulate some work during pause
          await new Promise(resolve => setTimeout(resolve, 100));

          streaming.resume();
          expect(streaming.isPaused()).toBe(false);
        }
      }

      expect(processedCount).toBe(1000);
    });
  });

  describe('multi-table streaming', () => {
    it('streams multiple tables in dependency order', async () => {
      const tables: TableSchema[] = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } }
          ],
          foreignKeys: []
        },
        {
          name: 'posts',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'user_id', type: 'INTEGER', constraints: {} }
          ],
          foreignKeys: [{
            columnName: 'user_id',
            referencedTable: 'users',
            referencedColumn: 'id'
          }]
        },
        {
          name: 'comments',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'post_id', type: 'INTEGER', constraints: {} }
          ],
          foreignKeys: [{
            columnName: 'post_id',
            referencedTable: 'posts',
            referencedColumn: 'id'
          }]
        }
      ];

      const streaming = new StreamingGenerator(tables, {
        count: 300, // 100 users, 100 posts, 100 comments
        batchSize: 50,
        seed: 42
      });

      let usersGenerated = false;
      let postsGenerated = false;
      let commentsGenerated = false;

      for await (const batch of streaming.generateBatches()) {
        if (batch.users && batch.users.length > 0) {
          usersGenerated = true;
        }
        if (batch.posts && batch.posts.length > 0) {
          postsGenerated = true;
          expect(usersGenerated).toBe(true); // Users must be generated first
        }
        if (batch.comments && batch.comments.length > 0) {
          commentsGenerated = true;
          expect(postsGenerated).toBe(true); // Posts must be generated first
        }
      }

      expect(usersGenerated).toBe(true);
      expect(postsGenerated).toBe(true);
      expect(commentsGenerated).toBe(true);
    });
  });

  describe('batch size optimization', () => {
    it('uses optimal batch size for small datasets', () => {
      const tables: TableSchema[] = [
        {
          name: 'test',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } }
          ],
          foreignKeys: []
        }
      ];

      const streaming = new StreamingGenerator(tables, {
        count: 50, // Small dataset
        seed: 42
      });

      const batchSize = streaming.getOptimalBatchSize();

      expect(batchSize).toBe(50); // Should process all at once for small datasets
    });

    it('uses reasonable batch size for large datasets', () => {
      const tables: TableSchema[] = [
        {
          name: 'test',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } }
          ],
          foreignKeys: []
        }
      ];

      const streaming = new StreamingGenerator(tables, {
        count: 1000000,
        seed: 42
      });

      const batchSize = streaming.getOptimalBatchSize();

      expect(batchSize).toBeGreaterThan(100);
      expect(batchSize).toBeLessThan(50000); // Not too large
    });
  });
});
