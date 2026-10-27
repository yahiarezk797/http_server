import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import { config } from './config.js';

export async function handlerReadiness(req: Request, res: Response): Promise<void> {
    res.set({
        'Content-Type': 'text/plain; charset=utf-8',
    });
    res.send("OK");
}

export async function handlerReset(req: Request, res: Response): Promise<void> {
    config.fileserverHits = 0;
    res.send("Hits have been reseted")
}

export async function handlerNumberOfReq(req: Request, res: Response): Promise<void> {
    res.send(`Hits: ${config.fileserverHits}`);
}

export function middlewareLogResponses(req: Request, res: Response, next: NextFunction): void{
    res.on("finish", () =>{
        const statusCode  = res.statusCode;
        if(statusCode !== 200){
            console.log(`[NON-OK] ${req.method} ${req.url} - Status: ${statusCode}`);
        }
    })
    next();
}

export function middlewareMetricsInc(req: Request, res: Response, next: NextFunction) {
  config.fileserverHits += 1;
  next();
}
