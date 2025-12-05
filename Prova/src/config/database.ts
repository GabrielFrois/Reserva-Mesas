import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/reserva";

export const connectDB = async (): Promise<void> => {
    try {
        await mongoose.connect(MONGO_URI, {
        } as mongoose.ConnectOptions);

        console.log("Conectado ao MongoDB:", MONGO_URI);
    } catch (error) {
        console.error("Erro ao conectar no MongoDB:", error);
        process.exit(1);
    }
};