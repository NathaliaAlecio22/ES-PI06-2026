"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gerarToken = gerarToken;
exports.verificarToken = verificarToken;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET não foi definido no arquivo .env");
    }
    return secret;
}
const JWT_SECRET = getJwtSecret();
function gerarToken(payload) {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, {
        expiresIn: "8h",
        issuer: "traceblock-api",
    });
}
function isJwtPayload(value) {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    return ("usuarioId" in value &&
        typeof value.usuarioId === "string" &&
        "participanteId" in value &&
        typeof value.participanteId === "string" &&
        "perfil" in value &&
        typeof value.perfil === "string");
}
function verificarToken(token) {
    const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET, {
        issuer: "traceblock-api",
    });
    if (!isJwtPayload(payload)) {
        throw new Error("Token JWT inválido.");
    }
    return payload;
}
