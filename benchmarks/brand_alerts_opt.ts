
async function mockDbCall(latencyMs: number) {
  return new Promise((resolve) => setTimeout(resolve, latencyMs));
}

// Mock Supabase Client
const mockSupabase = {
  from: (table: string) => {
    return {
      select: (columns: string) => {
        return {
          eq: (col: string, val: any) => {
            return {
              eq: (col2: string, val2: any) => {
                return {
                  single: async () => {
                    await mockDbCall(20); // Simulate 20ms network latency
                    // Simulate 50% chance of finding existing alert
                    return { data: Math.random() > 0.5 ? { id: 1 } : null, error: null };
                  }
                }
              }
            }
          },
          in: async (col: string, vals: any[]) => {
            await mockDbCall(20); // Simulate 20ms network latency
            // Return some existing items
            return { data: vals.slice(0, vals.length / 2).map(v => ({ orden_electronica: v, brand_name: 'TEST' })), error: null };
          }
        }
      },
      insert: async (data: any[]) => {
        await mockDbCall(20); // Simulate 20ms network latency
        return { error: null, data: data };
      }
    }
  }
};

async function runNPlusOne(items: any[]) {
  console.log('Running N+1 Approach...');
  const start = performance.now();

  let insertedCount = 0;

  for (const item of items) {
    const { data: existing } = await mockSupabase
      .from("brand_alerts")
      .select("id")
      .eq("orden_electronica", item.orden_electronica)
      .eq("brand_name", item.brand_name)
      .single();

    if (!existing) {
      await mockSupabase.from("brand_alerts").insert([item]);
      insertedCount++;
    }
  }

  const end = performance.now();
  console.log(`N+1 took ${(end - start).toFixed(2)}ms for ${items.length} items`);
  return end - start;
}

async function runBatch(items: any[]) {
  console.log('Running Batch Approach...');
  const start = performance.now();

  const batchSize = 100;
  let insertedCount = 0;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const ordenes = batch.map((a: any) => a.orden_electronica);

    const { data: existingAlerts } = await mockSupabase
      .from("brand_alerts")
      .select("orden_electronica, brand_name")
      .in("orden_electronica", ordenes);

    // Mock filtering logic
    const existingSet = new Set(existingAlerts?.map((a: any) => a.orden_electronica)); // simplified key
    const toInsert = batch.filter((a: any) => !existingSet.has(a.orden_electronica));

    if (toInsert.length > 0) {
      await mockSupabase.from("brand_alerts").insert(toInsert);
      insertedCount += toInsert.length;
    }
  }

  const end = performance.now();
  console.log(`Batch took ${(end - start).toFixed(2)}ms for ${items.length} items`);
  return end - start;
}

async function main() {
  const itemCount = 100;
  const items = Array.from({ length: itemCount }, (_, i) => ({
    orden_electronica: `ORDER-${i}`,
    brand_name: 'TEST',
    status: 'pending'
  }));

  const n1Time = await runNPlusOne(items);
  const batchTime = await runBatch(items);

  console.log(`\nImprovement: ${(n1Time / batchTime).toFixed(1)}x faster`);
}

main().catch(console.error);
