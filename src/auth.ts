import * as argon2 from "argon2";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import { BadReqError, Unauthorized } from "./handlers.js";
import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import { randomBytes } from "node:crypto";


type payload = Pick<JwtPayload, "iss" | "sub" | "iat" | "exp">;

export async function hashPassword(password: string): Promise<string> {
    return await argon2.hash(password);
}


export async function checkPasswordHash(password: string, hash: string): Promise<boolean> {
    try{
       return await argon2.verify(hash, password); 
    }catch{
        return false;
    }
}

export function makeJWT(userID: string, expiresIn: number, secret: string): string{
    const iat = Math.floor(Date.now() / 1000);
    const pay_load: payload = {
        "iss": "chirpy",
        "sub": userID,
        "iat": iat,
        "exp": iat + expiresIn,
    }
    const token = jwt.sign(pay_load, secret);
    return token;
}

export function validateJWT(tokenString: string, secret: string): string{
    try{
        const token = jwt.verify(tokenString, secret);
        if(typeof token.sub !== "string"){
            throw new Unauthorized("the token is invalid");
        }
        return token.sub;
    }catch{
        throw new Unauthorized("the token is invalid or expired");
    }
}

export function extractBearerToken(authorization: string | undefined): string{
    if(authorization === undefined){
        throw new Unauthorized("no token provided");
    }
    let [pre, token] = authorization.split(" ")
    token = token.trim();
    if(pre !== "Bearer" || token === ""){
        throw new Unauthorized("Wrong token");
    }
    return token;
}

export function getBearerToken(req: Request): string{
    const bearerToken = req.get("Authorization");
    return extractBearerToken(bearerToken);
}

export function makeRefreshToken(): string {
    return randomBytes(32).toString("hex");
}

export function getAPIKey(req: Request){
    const authorization = req.get("Authorization");
    if(authorization === undefined){
        throw new Unauthorized("no token provided");
    }
    const [pre, key] = authorization.split(" ");
    return key.trim();
}