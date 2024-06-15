import { NextFunction, Request, Response } from "express";
import { parseJWT, verifyJWT } from "./jwt";
import { AuthorizationPayload } from "../types";
import { sendToLogger } from "./logger";

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

    if (!req.twitchAuthorization.user_id) {
        sendToLogger({
            transactionToken: null,
            userIdInsecure: null,
            important: false,
            fields: [
                {
                    header: "Missing user ID in JWT",
                    content: req.twitchAuthorization,
                },
            ],
        }).then();
        res.status(500).send("Missing required data in JWT");
        return;
    }

    next();
}

export function privateApiAuth(req: Request, res: Response, next: NextFunction) {
    const auth = req.header("Authorization");
    if (auth != "Bearer " + process.env.PRIVATE_API_KEY) {
        res.status(401).send("Invalid private API key... Why are you here? Please leave.");
        return;
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

export function asyncCatch(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await fn(req, res, next);
        } catch (err) {
            console.log(err);

            sendToLogger({
                transactionToken: null,
                userIdInsecure: null,
                important: true,
                fields: [
                    {
                        header: "Error in asyncCatch",
                        content: err,
                    },
                ],
            }).then();

            next(err);
        }
    };
}
