import type { Request, Response, NextFunction } from "express";
import { verificarToken, type JwtPayload } from "../utils/jwt";

declare global {
    namespace Express {
        interface Request {
            usuario?: JwtPayload
        }
    }
}

export function autenticar(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const authorization = req.headers.authorization;

        if (!authorization || !authorization.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Acesso não autorizado. Faça login."
            })
        }

        const token = authorization.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                message: "Token não informado."
            })
        }

        const payload = verificarToken(token)
        req.usuario = payload;

        next();
    } catch {
        return res.status(401).json({
            message: "Token inválido ou expirado. Fça login novamente."
        })
    }
}