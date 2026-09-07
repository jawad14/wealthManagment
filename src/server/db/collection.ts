/**
 * In-memory collection primitive — the single data-access seam.
 *
 * Every module repository is built on `createCollection`, so swapping the
 * persistence engine (Postgres, SQLite, an API) means reimplementing this one
 * file's `Collection` interface rather than touching any module.
 *
 * Records are frozen on the way in and copied on the way out, so callers cannot
 * mutate stored state by accident — the same guarantee a real database gives.
 */

export interface HasId {
  readonly id: string;
}

export interface Collection<T extends HasId> {
  /** All records, in insertion order. */
  list(): readonly T[];
  /** Records matching a predicate. */
  where(predicate: (record: T) => boolean): readonly T[];
  /** A single record, or undefined when absent. */
  find(id: string): T | undefined;
  /** First record matching a predicate. */
  findBy(predicate: (record: T) => boolean): T | undefined;
  insert(record: T): T;
  /** Shallow-merges `changes`; returns undefined when the id is unknown. */
  update(id: string, changes: Partial<Omit<T, 'id'>>): T | undefined;
  remove(id: string): boolean;
  /** Restore the collection to its seeded state — used by tests. */
  reset(): void;
  readonly size: number;
}

/**
 * Next.js dev-mode hot reloading re-evaluates modules, which would otherwise
 * reset every collection on each edit. Collections are cached on globalThis so
 * in-session writes survive a reload.
 */
const registry = new Map<string, Collection<never>>();

interface GlobalWithRegistry {
  __holdfastCollections__?: Map<string, Collection<never>>;
}

function getRegistry(): Map<string, Collection<never>> {
  const globalRef = globalThis as unknown as GlobalWithRegistry;
  globalRef.__holdfastCollections__ ??= registry;
  return globalRef.__holdfastCollections__;
}

export function createCollection<T extends HasId>(name: string, seed: () => readonly T[]): Collection<T> {
  const cached = getRegistry().get(name) as Collection<T> | undefined;
  if (cached) return cached;

  let records = new Map<string, T>();

  const load = (): void => {
    records = new Map(seed().map((record) => [record.id, Object.freeze({ ...record })]));
  };
  load();

  const collection: Collection<T> = {
    list: () => [...records.values()],
    where: (predicate) => [...records.values()].filter(predicate),
    find: (id) => records.get(id),
    findBy: (predicate) => [...records.values()].find(predicate),
    insert: (record) => {
      if (records.has(record.id)) {
        throw new Error(`${name}: a record with id "${record.id}" already exists.`);
      }
      const stored = Object.freeze({ ...record });
      records.set(record.id, stored);
      return stored;
    },
    update: (id, changes) => {
      const existing = records.get(id);
      if (!existing) return undefined;
      const stored = Object.freeze({ ...existing, ...changes });
      records.set(id, stored);
      return stored;
    },
    remove: (id) => records.delete(id),
    reset: load,
    get size() {
      return records.size;
    },
  };

  getRegistry().set(name, collection as unknown as Collection<never>);
  return collection;
}
