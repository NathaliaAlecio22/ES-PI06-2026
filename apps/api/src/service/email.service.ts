import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function enviarCodigoRecuperacao(
  email: string,
  codigo: string,
) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Recuperação de senha | TraceBlock",
    html: `
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
    `,
  });
}