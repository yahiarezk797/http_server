import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import { config } from './config.js';
import { error } from 'node:console';
import { create } from 'node:domain';
import { createUser, getUserByEmail, getUserByID, reset, updateUser } from './db/queries/users.js';
import { createChirp, deleteChirp, getChirp, getChirps } from './db/queries/chirps.js';
import { checkPasswordHash, getBearerToken, hashPassword, makeJWT, makeRefreshToken, validateJWT } from './auth.js';
import { NewUser } from './db/schema.js';
import { createRefreshToken, getRefreshTokenByToken, revokeRefreshToken } from './db/queries/refresh_Token.js';
import { ne } from 'drizzle-orm';
import { json } from 'node:stream/consumers';


type loginJson = {
    password: string,
    email: string,
}

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
    const nuser: NewUser = {email: req.body.email, hashedPassword: await hashPassword(req.body.password)}
    const user = await createUser(nuser);
    res.status(201);
    res.json({
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
    });
}

export async function handlerCreateChirp(req: Request, res: Response) {
    const token = getBearerToken(req);
    const userID = validateJWT(token, config.secret);
    const user = await getUserByID(userID);
    if(user === undefined){
        throw new Unauthorized("No such a user");
    }
    const chirp_to_be = {
        body: req.body.body,
        userId: user.id
    }
    const chirp = await createChirp(chirp_to_be);
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

export async function handlerGetChirp(req: Request, res: Response) {
    if(typeof req.params.chirpId !== "string" ){
        throw new NotFoundError("no such a ChirpId");
    }
    const chirp = await getChirp(req.params.chirpId);
    if(chirp === undefined){
        throw new NotFoundError("there is no chirp with this id");
    }
    res.json(chirp);
}

export async function handlerLogin(req: Request, res: Response) {
    const jsn : loginJson = req.body;
    const user = await getUserByEmail(jsn.email);
    if(user === undefined){
        throw new Unauthorized("incorrect email or password");
    }
    const correct_password = await checkPasswordHash(req.body.password, user.hashedPassword);
    if(!correct_password){
        throw new Unauthorized("incorrect email or password");
    }
    const token = makeJWT(user.id, 3600, config.secret);
    const refreshToken = makeRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 60);
    const create = createRefreshToken({token: refreshToken, userId: user.id, expiresAt: expiresAt});
    res.json({
        id: user.id,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        email: user.email,
        token: token,
        refreshToken: refreshToken
    });
}

export async function handlerRefresh(req: Request, res: Response) {
    const refreshToken = getBearerToken(req);
    const fullToken = await getRefreshTokenByToken(refreshToken);
    if(fullToken === undefined || fullToken.revokedAt !== null || Date.now() > fullToken.expiresAt.getTime()){
        throw new Unauthorized("wrong, expired or revoked refresh Token");
    }
    const token = makeJWT(fullToken.userId, 3600, config.secret);
    res.json({
        token: token
    });
}

export async function handlerRevoke(req: Request, res: Response) {
    const refreshToken = getBearerToken(req);
    await revokeRefreshToken(refreshToken);
    res.status(204).end();
}

export async function handlerChangeInfo(req: Request, res: Response) {
    const token = getBearerToken(req);
    const userId = validateJWT(token, config.secret);
    const updates = {email: req.body.email, password: hashPassword(req.body.password)};
    const user = await updateUser(userId, updates);
    res.json(user);
}

export async function handlerDeleteChirp(req: Request, res: Response) {
    const token = getBearerToken(req);
    const userId = validateJWT(token, config.secret);
    if(typeof req.params.chirpId !== "string" ){
        throw new NotFoundError("no such a ChirpId");
    }
    const chirp = await getChirp(req.params.chirpId);
    if(chirp === undefined){
        throw new NotFoundError("no such a Chirp with this id");
    }
    if(chirp.userId !== userId){
        throw new Forbidden("you don't own this chirp");
    }
    await deleteChirp(chirp.id);
    res.status(204)
    res.end();
}