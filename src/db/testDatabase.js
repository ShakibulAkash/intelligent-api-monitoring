
import { db } from "./database.js";

// Get the names of our database tables
const tables = db.prepare(`
  SELECT name
  FROM sqlite_master
  WHERE type = 'table'
    AND name IN ('alerts', 'api_checks')
  ORDER BY name
`).all();

// Display table names
console.log(
  "Database tables:",
  tables.map(row => row.name)
);
