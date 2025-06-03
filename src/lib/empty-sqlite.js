// Empty SQLite module - we use PostgreSQL, not SQLite
// This file replaces node:sqlite imports that some dependencies might try to use

export default {};
export const Database = class {};
export const Statement = class {};
