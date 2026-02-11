
async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Mock Supabase Client
const mockSupabase = {
  from: (table: string) => {
    return {
      select: (columns: string) => ({
        eq: (col: string, val: any) => ({
          eq: (col2: string, val2: any) => ({
            single: async () => {
              await sleep(20); // Simulate DB latency
              // Randomly simulate existing alert (10% chance)
              if (Math.random() < 0.1) return { data: { id: 123 }, error: null };
              return { data: null, error: { code: "PGRST116", message: "Row not found" } };
            }
          })
        }),
        in: (col: string, vals: any[]) => ({
           then: async (cb: any) => { // Mocking promise-like behavior if needed, but usually we await
             return { data: [], error: null }
           }
        })
      }),
      insert: async (data: any[]) => {
        await sleep(20); // Simulate DB latency
        return { error: null };
      }
    };
  }
};

// Enhanced Mock for Batch operations
const mockSupabaseBatch = {
    from: (table: string) => ({
        select: (cols: string) => ({
            in: async (col: string, vals: any[]) => {
                await sleep(20);
                // Simulate returning some existing ones
                return { data: [], error: null };
            }
        }),
        insert: async (data: any[]) => {
            await sleep(20);
            return { error: null };
        }
    })
}


// Original Slow Implementation
async function slowProcess(alerts: any[]) {
  const supabase = mockSupabase;
  let insertedCount = 0;

  const start = performance.now();

  for (const alert of alerts) {
    try {
        // Select
        const { data: existingAlert, error: checkError } = await supabase
          .from("brand_alerts")
          .select("id")
          .eq("orden_electronica", alert.orden_electronica)
          .eq("brand_name", alert.brand_name)
          .single()

        if (existingAlert) continue;

        // Insert
        const { error: insertError } = await supabase.from("brand_alerts").insert([alert])
        if (!insertError) insertedCount++;

    } catch (e) {}
  }

  return performance.now() - start;
}

// Optimized Implementation
async function fastProcess(alerts: any[]) {
    const supabase = mockSupabaseBatch;
    let insertedCount = 0;
    const start = performance.now();

    const BATCH_SIZE = 100;
    for (let i = 0; i < alerts.length; i += BATCH_SIZE) {
        const batch = alerts.slice(i, i + BATCH_SIZE);
        const ordenes = batch.map(a => a.orden_electronica);

        // Batch Select
        const { data: existing } = await supabase
           .from("brand_alerts")
           .select("orden_electronica, brand_name")
           .in("orden_electronica", ordenes);

        const existingSet = new Set(existing?.map((e: any) => `${e.orden_electronica}|${e.brand_name}`));

        const toInsert = batch.filter(a => !existingSet.has(`${a.orden_electronica}|${a.brand_name}`));

        if (toInsert.length > 0) {
            // Batch Insert
            await supabase.from("brand_alerts").insert(toInsert);
            insertedCount += toInsert.length;
        }
    }

    return performance.now() - start;
}

async function runBenchmark() {
    const ALERT_COUNT = 50;
    const alerts = Array.from({ length: ALERT_COUNT }, (_, i) => ({
        orden_electronica: `ORD-${i}`,
        brand_name: "BRAND",
        acuerdo_marco: "AM",
    }));

    console.log(`Running benchmark with ${ALERT_COUNT} alerts...`);

    const slowTime = await slowProcess(alerts);
    console.log(`Slow Implementation: ${slowTime.toFixed(2)}ms`);

    const fastTime = await fastProcess(alerts);
    console.log(`Fast Implementation: ${fastTime.toFixed(2)}ms`);

    console.log(`Speedup: ${(slowTime / fastTime).toFixed(2)}x`);
}

runBenchmark();
