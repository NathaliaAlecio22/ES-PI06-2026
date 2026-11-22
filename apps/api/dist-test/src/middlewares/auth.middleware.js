"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autenticar = autenticar;
const jwt_1 = require("../utils/jwt");
function autenticar(req, res, next) {
    try {
        const authorization = req.headers.authorization;
        if (!authorization || !authorization.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Acesso não autorizado. Faça login."
            });
        }
        const token = authorization.split(" ")[1];
        if (!token) {
            return res.status(401).json({
                message: "Token não informado."
            });
        }
        const payload = (0, jwt_1.verificarToken)(token);
        req.usuario = payload;
        next();
    }
    catch {
        return res.status(401).json({
            message: "Token inválido ou expirado. Fça login novamente."
        });
    }
}
