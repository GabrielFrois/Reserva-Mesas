import { Request, Response } from "express";
import Mesa from "../models/Mesa"


export const criarMesa = async (req: Request, res: Response) => {
    try {
        const { numero, capacidade, localizacao } = req.body;

        if (!numero || !capacidade || !localizacao) {
            return res.status(400).json({ erro: "Campos obrigatórios: numero, capacidade, localizacao" });
        }

        const existente = await Mesa.findOne({ numero });
        if (existente) {
            return res.status(409).json({ erro: "Já existe mesa com esse número" });
        }

        const mesa = await Mesa.create({ numero, capacidade, localizacao });
        console.log(`Mesa criada: ${numero}`);
        return res.status(201).json({ mensagem: "Mesa criada", mesa });
    } catch (err) {
        console.error("Erro criarMesa:", err);
        return res.status(500).json({ erro: "Erro interno" });
    }
};

export const listarMesas = async (req: Request, res: Response) => {
    try {
        const mesas = await Mesa.find().sort({ numero: 1 });
        return res.status(200).json({ mesas });
    } catch (err) {
        console.error("Erro listarMesas:", err);
        return res.status(500).json({ erro: "Erro interno" });
    }
};

export const seedMesas = async (req: Request, res: Response) => {
    try {
        const defaultMesas = [
            { numero: 1, capacidade: 2, localizacao: "salão 1" },
            { numero: 2, capacidade: 4, localizacao: "salão 2" },
            { numero: 3, capacidade: 4, localizacao: "salão 3" },
            { numero: 4, capacidade: 6, localizacao: "salão 4" },
            { numero: 5, capacidade: 2, localizacao: "varanda" }
        ];

        const promises = defaultMesas.map(async (m) => {
            const exists = await Mesa.findOne({ numero: m.numero });
            if (!exists) {
                return Mesa.create(m);
            }
            return null;
        });

        await Promise.all(promises);
        return res.status(201).json({ mensagem: "Seed de mesas executada" });
    } catch (err) {
        console.error("Erro seedMesas:", err);
        return res.status(500).json({ erro: "Erro interno" });
    }
};