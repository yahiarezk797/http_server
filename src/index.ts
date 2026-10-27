import express, { type Express, type Request, type Response } from 'express';
import { handlerNumberOfReq, handlerReadiness, handlerReset, middlewareLogResponses, middlewareMetricsInc } from './handlers.js';

const app = express();
const PORT = 8080;

app.use("/app", middlewareMetricsInc, express.static("./src/app"));

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}/app`);
});

app.get("/api/healthz", handlerReadiness);
app.get("/api/metrics", handlerNumberOfReq);
app.get("/api/reset", handlerReset);
app.use(middlewareLogResponses);
