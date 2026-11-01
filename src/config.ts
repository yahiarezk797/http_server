import type { MigrationConfig } from "drizzle-orm/migrator";
import { int } from "drizzle-orm/mysql-core";
import { Forbidden } from "./handlers.js";
process.loadEnvFile(".env");

type DBConfig = {
  url: string;
  migrationConfig: MigrationConfig;
}

const migrationConfig: MigrationConfig = {
  migrationsFolder: "./drizzle",
};

type APIConfig = {
  fileserverHits: number;
  dbURL: string;
  port: number;
  platform: string;
};
if(process.env.DB_URL === undefined){
  throw new Error("no connection string is provided");
}
if(process.env.PORT === undefined){
  throw new Error("no port is provided");
}

if(process.env.PLATFORM !== "dev"){
  throw new Forbidden("it is not dev");
}

const apiConfig: APIConfig = {fileserverHits: 0, dbURL: process.env.DB_URL, port: parseInt(process.env.PORT), platform: process.env.PLATFORM}
const dbConfig: DBConfig = {url: process.env.DB_URL, migrationConfig: migrationConfig}

export const config = {api: apiConfig, db: dbConfig};