import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import cors from "cors";
import { connectDB } from "./config/database";
import mesaRoutes from "./routes/mesaRoutes";
import reservaRoutes from "./routes/reservaRoutes";
import path from "path";
import Mesa from "./models/Mesa"; // <-- import do model para seed automático

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use(express.static(path.join(__dirname, "../public")));

app.use("/mesas", mesaRoutes);
app.use("/reservas", reservaRoutes);

app.get("/", (req, res) => {
  res.json({ mensagem: "API Reserva - online" });
});

/**
 * Seed automático de mesas — executa somente se a coleção estiver vazia.
 * Logs claros ajudam a confirmar se o seed rodou e quantas mesas já existem.
 */
const seedMesasIfEmpty = async () => {
  try {
    console.log("🔍 Verificando presença de mesas no banco...");
    const count = await Mesa.countDocuments();
    console.log(`🔍 Mesas existentes: ${count}`);

    if (count === 0) {
      console.log("⚡ Nenhuma mesa encontrada — criando seed padrão...");
      const defaultMesas = [
        { numero: 1, capacidade: 2, localizacao: "salão 1" },
        { numero: 2, capacidade: 4, localizacao: "salão 2" },
        { numero: 3, capacidade: 4, localizacao: "salão 3" },
        { numero: 4, capacidade: 6, localizacao: "salão 4" },
        { numero: 5, capacidade: 2, localizacao: "varanda" }
      ];

      await Mesa.insertMany(defaultMesas);
      console.log("✔ Seed de mesas automática executada com sucesso.");
    } else {
      console.log("✔ Seed não necessário — mesas já existem no banco.");
    }
  } catch (err) {
    console.error("✖ Erro ao executar seed automático de mesas:", err);
  }
};

const start = async () => {
  await connectDB();
  
  await seedMesasIfEmpty();

  app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
  });
};

start().catch((err) => {
  console.error("Erro ao iniciar servidor:", err);
});
