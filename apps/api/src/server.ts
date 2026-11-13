import "dotenv/config";
import app from "./app.js";

const port = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT precisa ser um número entre 1 e 65535.");
}

app.listen(port, () => {
  console.log(`API disponível na porta ${port}.`);
});
