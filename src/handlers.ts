import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import { config } from './config.js';
import { error } from 'node:console';
import { create } from 'node:domain';
import { createUser, reset } from './db/queries/users.js';
import { createChirp, getChirps } from './db/queries/chirps.js';


type ChirpyJSON = {
    body: string;
}

type cleaneChirpyJSON = {
    cleanedBody: string;
}

export class BadReqError extends Error{
    constructor(message: string){
        super(message);
    }
}

export class NotFoundError extends Error{
    constructor(message: string){
        super(message);
    }
}

export class Unauthorized extends Error{
    constructor(message: string){
        super(message);
    }
}

export class Forbidden extends Error{
    constructor(message: string){
        super(message);
    }
}

export function handlerError(err: Error, req: Request, res: Response, next: NextFunction){
    if(err instanceof BadReqError){
        res.status(400).json({
            error: err.message
        });
    }
    else if(err instanceof Forbidden){
        res.status(403).json({
            error: err.message
        });
    }
    else if(err instanceof Unauthorized){
        res.status(401).json({
            error: err.message
        });
    }
    else if(err instanceof NotFoundError){
        res.status(404).json({
            error: err.message
        });
    }
    else{
        res.status(500).json({
            error: "Something went wrong on our end"
        });
    }
}

export async function handlerReadiness(req: Request, res: Response): Promise<void> {
    res.set({
        'Content-Type': 'text/plain; charset=utf-8',
    });
    res.send("OK");
}

export async function handlerReset(req: Request, res: Response): Promise<void> {
    config.api.fileserverHits = 0;
    await reset();
    res.status(200).send("users have been reseted")
}

export async function handlerNumberOfReq(req: Request, res: Response): Promise<void> {
    res.set({
        'Content-Type': 'text/html; charset=utf-8',
    });
    res.send(`<html>
  <body>
    <h1>Welcome, Chirpy Admin</h1>
    <p>Chirpy has been visited ${config.api.fileserverHits} times!</p>
  </body>
</html>`);
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
  config.api.fileserverHits += 1;
  next();
}


export async function handlerChirpyValidation(req: Request, res: Response): Promise<void> {
    res.header("Content-Type", "application/json");
    const chirpy: ChirpyJSON = req.body;
    if(chirpy.body.length > 140){
        throw new BadReqError("Chirp is too long. Max length is 140")
    }
    else{
        const profane = ["kerfuffle", "sharbert", "fornax"];
        
        const words = chirpy.body.split(" ");
        for(let i = 0; i < words.length; i++){
            if(profane.includes(words[i].toLowerCase())){
                words[i] = "****";
            }
        }
        const cleanChirpy: cleaneChirpyJSON =  { cleanedBody: words.join(" ") };
        res.status(200).send(JSON.stringify(cleanChirpy));
    }
}

export async function handlerCreateUser(req: Request, res: Response) {
    const user = await createUser(req.body);
    res.status(201);
    res.json({
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
    });
}

export async function handlerCreateChirp(req: Request, res: Response) {
    const chirp = await createChirp(req.body);
    res.status(201);
    res.json({
        id: chirp.id,
        createdAt: chirp.createdAt,
        updatedAt: chirp.updatedAt,
        body: chirp.body,
        userId: chirp.userId
    });
}

export async function handlerGetChirps(req: Request, res: Response) {
    const chirps = await getChirps();
    res.status(200).json(chirps);
}