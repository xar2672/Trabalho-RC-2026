import Database from 'better-sqlite3';
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "pdv.db");
const SCHEMA_PATH = path.join(__dirname, "schema.sql");

const isNewDatabase = !fs.existsSync(DB_PATH);

const db = new Database(DB_PATH);
db.pragma("foreign_keys = ON"); // sem isso, as FKs do schema.sql não são realmente aplicadas

if (isNewDatabase) {
    const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
    db.exec(schema);
    console.log("Banco de dados criado a partir de schema.sql");
}

export default db;