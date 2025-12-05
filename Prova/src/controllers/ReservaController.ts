import { Request, Response } from "express";
import Reserva from "../models/Reserva";
import Mesa from "../models/Mesa";
import { atualizarStatusReservas } from "../utils/atualizarStatus";
 
const DURACAO_PADRAO_MIN = 90;
const ANTECEDENCIA_MIN = 60;
 
const calculaFim = (inicio: Date, durMin = DURACAO_PADRAO_MIN) => {
  return new Date(inicio.getTime() + durMin * 60 * 1000);
};
 
const temSobreposicao = async (mesaNumero: number, inicio: Date, fim: Date, excluirReservaId?: string) => {
  const query: any = {
    mesaNumero,
    status: { $ne: "cancelado" }
  };
 
  if (excluirReservaId) {
    query._id = { $ne: excluirReservaId };
  }
 
  const conflitos = await Reserva.find(query).or([
    { $and: [{ inicio: { $lt: fim } }, { fim: { $gt: inicio } }] }
  ]);
 
  return conflitos.length > 0;
};
 
export const criarReserva = async (req: Request, res: Response) => {
  try {
    const { nomeCliente, contatoCliente, mesaNumero, quantidadePessoas, inicio: inicioRaw, observacoes } = req.body;
 
    if (!nomeCliente || !contatoCliente || !mesaNumero || !quantidadePessoas || !inicioRaw) {
      return res.status(400).json({ erro: "Campos obrigatórios: nomeCliente, contatoCliente, mesaNumero, quantidadePessoas, inicio" });
    }
 
    const inicio = new Date(inicioRaw);
    if (isNaN(inicio.getTime())) {
      return res.status(400).json({ erro: "Formato de data inválido para inicio" });
    }
 
    const now = new Date();
 
    const diffMin = (inicio.getTime() - now.getTime()) / (60 * 1000);
    if (diffMin < ANTECEDENCIA_MIN) {
      return res.status(400).json({ erro: `Reservas devem ser feitas com antecedência mínima de ${ANTECEDENCIA_MIN} minutos` });
    }
 
    const mesa = await Mesa.findOne({ numero: mesaNumero });
    if (!mesa) {
      return res.status(404).json({ erro: "Mesa não encontrada" });
    }
 
    if (quantidadePessoas > mesa.capacidade) {
      return res.status(400).json({ erro: "Quantidade de pessoas maior que a capacidade da mesa" });
    }
 
    const fim = calculaFim(inicio);
 
    const conflito = await temSobreposicao(mesaNumero, inicio, fim);
    if (conflito) {
      return res.status(409).json({ erro: "Já existe uma reserva para essa mesa no horário solicitado" });
    }
 
    const reserva = await Reserva.create({
      nomeCliente,
      contatoCliente,
      mesaNumero,
      quantidadePessoas,
      inicio,
      fim,
      observacoes,
      status: "reservado"
    });
 
    console.log(`Reserva criada: ${reserva._id} - Mesa ${mesaNumero}`);
    return res.status(201).json({ mensagem: "Reserva criada", reserva });
  } catch (err) {
    console.error("Erro criarReserva:", err);
    return res.status(500).json({ erro: "Erro interno" });
  }
};
 
export const listarReservas = async (req: Request, res: Response) => {
  try {
    await atualizarStatusReservas();
 
    const { cliente, mesa, data, status } = req.query as any;
    const filter: any = {};
 
    if (cliente) {
      filter.nomeCliente = { $regex: cliente, $options: "i" };
    }
    if (mesa) {
      filter.mesaNumero = Number(mesa);
    }
    if (status) {
      filter.status = status;
    }
    if (data) {
      const dia = new Date(data);
      if (!isNaN(dia.getTime())) {
        const inicioDia = new Date(dia);
        inicioDia.setHours(0, 0, 0, 0);
        const fimDia = new Date(dia);
        fimDia.setHours(23, 59, 59, 999);
        filter.inicio = { $gte: inicioDia, $lte: fimDia };
      }
    }
 
    const reservas = await Reserva.find(filter).sort({ inicio: 1 });
    return res.status(200).json({ reservas });
  } catch (err) {
    console.error("Erro listarReservas:", err);
    return res.status(500).json({ erro: "Erro interno" });
  }
};
 
export const atualizarReserva = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { nomeCliente, contatoCliente, mesaNumero, quantidadePessoas, inicio: inicioRaw, observacoes } = req.body;
 
    const reserva = await Reserva.findById(id);
    if (!reserva) {
      return res.status(404).json({ erro: "Reserva não encontrada" });
    }
 
    if (reserva.status === "cancelado") {
      return res.status(400).json({ erro: "Reserva cancelada e não pode ser alterada" });
    }
 
    if (mesaNumero && mesaNumero !== reserva.mesaNumero) {
      const mesa = await Mesa.findOne({ numero: mesaNumero });
      if (!mesa) return res.status(404).json({ erro: "Mesa não encontrada" });
      if ((quantidadePessoas || reserva.quantidadePessoas) > mesa.capacidade) {
        return res.status(400).json({ erro: "Quantidade de pessoas maior que a capacidade da mesa" });
      }
    } else if (quantidadePessoas && reserva.mesaNumero) {
      const mesa = await Mesa.findOne({ numero: reserva.mesaNumero });
      if (!mesa) return res.status(404).json({ erro: "Mesa não encontrada" });
      if (quantidadePessoas > mesa.capacidade) {
        return res.status(400).json({ erro: "Quantidade de pessoas maior que a capacidade da mesa" });
      }
    }
 
    let novoInicio = reserva.inicio;
    if (inicioRaw) {
      const parsed = new Date(inicioRaw);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({ erro: "Formato de data inválido para inicio" });
      }
      const now = new Date();
      const diffMin = (parsed.getTime() - now.getTime()) / (60 * 1000);
      if (diffMin < 60) {
        return res.status(400).json({ erro: "Alteração inválida: reservas devem ser feitas com antecedência mínima de 60 minutos" });
      }
      novoInicio = parsed;
    }
 
    const novoFim = calculaFim(novoInicio);
 
    const mesaToCheck = mesaNumero ? mesaNumero : reserva.mesaNumero;
 
    const conflito = await temSobreposicao(mesaToCheck, novoInicio, novoFim, id);
    if (conflito) {
      return res.status(409).json({ erro: "Já existe uma reserva para essa mesa no horário solicitado" });
    }
 
    if (nomeCliente) reserva.nomeCliente = nomeCliente;
    if (contatoCliente) reserva.contatoCliente = contatoCliente;
    if (mesaNumero) reserva.mesaNumero = mesaNumero;
    if (quantidadePessoas) reserva.quantidadePessoas = quantidadePessoas;
    if (inicioRaw) {
      reserva.inicio = novoInicio;
      reserva.fim = novoFim;
    }
    if (observacoes !== undefined) reserva.observacoes = observacoes;
 
    reserva.status = "reservado";
 
    await reserva.save();
 
    console.log(`Reserva atualizada: ${reserva._id}`);
    return res.status(200).json({ mensagem: "Reserva atualizada", reserva });
  } catch (err) {
    console.error("Erro atualizarReserva:", err);
    return res.status(500).json({ erro: "Erro interno" });
  }
};
 
export const cancelarReserva = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const reserva = await Reserva.findById(id);
    if (!reserva) return res.status(404).json({ erro: "Reserva não encontrada" });
 
    reserva.status = "cancelado";
    await reserva.save();
    console.log(`Reserva cancelada: ${reserva._id}`);
    return res.status(200).json({ mensagem: "Reserva cancelada", reserva });
  } catch (err) {
    console.error("Erro cancelarReserva:", err);
    return res.status(500).json({ erro: "Erro interno" });
  }
};