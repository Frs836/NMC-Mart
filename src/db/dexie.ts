// Dexie local database disabled - pure online database system active
export const localDb: any = new Proxy({}, {
  get: () => ({
    toArray: async () => [],
    get: async () => null,
    put: async () => {},
    bulkPut: async () => {},
    delete: async () => {},
    add: async () => {},
    clear: async () => {},
    count: async () => 0,
    where: () => ({
      equals: () => ({
        first: async () => null,
        reverse: () => ({ first: async () => null, sortBy: async () => [] }),
        toArray: async () => [],
        count: async () => 0,
        or: () => ({ reverse: () => ({ sortBy: async () => [] }), toArray: async () => [] }),
        and: () => ({ first: async () => null })
      }),
      anyOf: () => ({ toArray: async () => [] })
    }),
    reverse: () => ({ limit: () => ({ toArray: async () => [] }), sortBy: async () => [] })
  })
});

export async function initializeLocalDatabase() {
  // No-op for online mode
}

export const seedDatabaseIfEmpty = async () => {};
