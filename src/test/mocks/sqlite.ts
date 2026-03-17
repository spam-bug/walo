// SQLite mock — prevents Capacitor's native bridge from being called in jsdom.
// Import this file in a test file before any module that uses @capacitor-community/sqlite
// to activate the mock via vi.mock().
//
// Usage in a test file:
//   import './path/to/src/test/mocks/sqlite';
//
// The vi.mock() call below is hoisted by Vitest to the top of the module graph,
// so it intercepts the import before any real native code can run.

import { vi } from 'vitest';

vi.mock('@capacitor-community/sqlite', () => {
  const connection = {
    open: vi.fn().mockResolvedValue(undefined),
    execute: vi.fn().mockResolvedValue({ changes: { changes: 0, lastId: 0 } }),
    query: vi.fn().mockResolvedValue({ values: [] }),
    run: vi.fn().mockResolvedValue({ changes: { changes: 0, lastId: 0 } }),
    close: vi.fn().mockResolvedValue(undefined),
  };

  const CapacitorSQLite = {
    createConnection: vi.fn().mockResolvedValue(connection),
    isConnection: vi.fn().mockResolvedValue({ result: false }),
  };

  return {
    CapacitorSQLite,
    SQLiteConnection: vi.fn().mockImplementation(() => CapacitorSQLite),
    SQLiteDBConnection: vi.fn().mockImplementation(() => connection),
  };
});
