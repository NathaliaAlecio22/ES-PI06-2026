"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enviarCodigoRecuperacao = enviarCodigoRecuperacao;
exports.enviarConviteUsuario = enviarConviteUsuario;
const nodemailer_1 = __importDefault(require("nodemailer"));
function createTransporter() {
    const host = process.env.SMTP_HOST?.trim();
    const port = Number(process.env.SMTP_PORT);
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.replace(/\s/g, "");
    const from = process.env.SMTP_FROM?.trim() || user;
    if (!host || !user || !pass || !from) {
        throw new Error("SMTP_CONFIG_MISSING: configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS e SMTP_FROM.");
    }
    if (!Number.isInteger(port) || port < 1 || port > 65_535) {
        throw new Error("SMTP_CONFIG_INVALID: SMTP_PORT deve ser uma porta válida.");
    }
    return {
        from,
        transporter: nodemailer_1.default.createTransport({
            host,
            port,
            secure: port === 465,
            requireTLS: port === 587,
            auth: { user, pass },
        }),
    };
}
async function sendEmail(to, subject, html) {
    const { from, transporter } = createTransporter();
    const result = await transporter.sendMail({ from, to, subject, html });
    if (result.accepted.length === 0 || result.rejected.length > 0) {
        throw new Error("SMTP_RECIPIENT_NOT_ACCEPTED: o servidor SMTP não aceitou o destinatário.");
    }
}
async function enviarCodigoRecuperacao(email, codigo) {
    await sendEmail(email, "Recuperação de senha | TraceBlock", `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; padding: 30px; color: #111827;">
        <h2 style="color: #315cf5;">TraceBlock</h2>

        <h3>Recuperação de senha</h3>

        <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>

        <p>Utilize o código abaixo para confirmar sua identidade:</p>

        <div style="margin: 30px 0; padding: 20px; background: #f3f6ff; border-radius: 10px; text-align: center;">
          <strong style="font-size: 32px; letter-spacing: 8px; color: #315cf5;">
            ${codigo}
          </strong>
        </div>

        <p>Este código é válido por <strong>10 minutos</strong>.</p>

        <p>Se você não solicitou a recuperação de senha, ignore este e-mail.</p>

        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />

        <small style="color: #6b7280;">
          Mensagem automática enviada pela plataforma TraceBlock.
        </small>
      </div>
    `);
}
async function enviarConviteUsuario(email, nome, organizacao, link) {
    const escapeHtml = (value) => value.replace(/[&<>"']/g, (character) => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
        };
        return entities[character];
    });
    await sendEmail(email, `Convite para ${organizacao} | TraceBlock`, `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; padding: 30px; color: #111827;">
        <h2 style="color: #315cf5;">TraceBlock</h2>
        <h3>Você recebeu um convite</h3>
        <p>Olá, ${escapeHtml(nome)}.</p>
        <p>${escapeHtml(organizacao)} convidou você para acessar a organização no TraceBlock.</p>
        <p><a href="${escapeHtml(link)}" style="display:inline-block;background:#315cf5;color:white;padding:12px 20px;border-radius:8px;text-decoration:none;">Aceitar convite e criar senha</a></p>
        <p>Este convite expira em 7 dias. Se você não esperava esta mensagem, ignore-a.</p>
      </div>
    `);
}
