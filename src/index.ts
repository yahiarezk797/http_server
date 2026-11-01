import express, { type Express, type Request, type Response } from 'express';
import { handlerChirpyValidation, handlerCreateChirp, handlerCreateUser, handlerError, handlerGetChirps, handlerNumberOfReq, handlerReadiness, handlerReset, middlewareLogResponses, middlewareMetricsInc } from './handlers.js';
import { config } from './config.js';
import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";


const app = express();
const PORT = config.api.port;

const migrationClient = postgres(config.db.url, { max: 1 });
await migrate(drizzle(migrationClient), config.db.migrationConfig);

app.use("/app", middlewareMetricsInc, express.static("./src/app"));
app.get("/api/healthz", handlerReadiness);
app.get("/admin/metrics", handlerNumberOfReq);
app.get("/api/chirps", handlerGetChirps);
app.post("/admin/reset", handlerReset);
app.post("/api/users", express.json(), handlerCreateUser);
app.post("/api/chirps", express.json(), handlerCreateChirp);
app.use(middlewareLogResponses);
app.use(handlerError);


app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}/app`);
});