import { NextFunction, Request, Response } from "express";
import { parseJWT, verifyJWT } from "./jwt";
import { AuthorizationPayload } from "../types";

export function publicApiAuth(req: Request, res: Response, next: NextFunction) {
    const auth = req.header("Authorization");

    if (!auth || !auth.startsWith("Bearer ")) {
        res.status(401).send("Missing or malformed session token");
        return;
    }

    const token = auth.substring(7);
    if (!verifyJWT(token)) {
        res.status(401).send("Invalid session token");
        return;
    }

    req.twitchAuthorization = parseJWT(token) as AuthorizationPayload;

    next();
}

export function privateApiAuth(req: Request, res: Response, next: NextFunction) {
    const auth = req.header("Authorization");
    if (auth != "Bearer " + process.env.PRIVATE_API_KEY) {
        res.status(401).send("Invalid private API key... Why are you here? Please leave.");
    }

    next();
}

declare global {
    namespace Express {
        export interface Request {
            twitchAuthorization?: AuthorizationPayload;
        }
    }
}