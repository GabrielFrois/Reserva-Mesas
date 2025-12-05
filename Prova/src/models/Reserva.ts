import mongoose, { Schema, Document } from "mongoose";
 
export type ReservaStatus = "reservado" | "ocupado" | "finalizado" | "cancelado";
 
export interface IReserva extends Document {
  nomeCliente: string;
  contatoCliente: string;
  mesaNumero: number;
  quantidadePessoas: number;
  inicio: Date;
  fim: Date;
  observacoes?: string;
  status: ReservaStatus;
  createdAt: Date;
  updatedAt: Date;
}
 
const ReservaSchema: Schema = new Schema(
  {
    nomeCliente: { type: String, required: true },
    contatoCliente: { type: String, required: true },
    mesaNumero: { type: Number, required: true },
    quantidadePessoas: { type: Number, required: true, min: 1 },
    inicio: { type: Date, required: true },
    fim: { type: Date, required: true },
    observacoes: { type: String },
    status: {
      type: String,
      enum: ["reservado", "ocupado", "finalizado", "cancelado"],
      default: "reservado"
    }
  },
  { timestamps: true }
);

ReservaSchema.index({ mesaNumero: 1, inicio: 1, fim: 1 });
 
export default mongoose.model<IReserva>("Reserva", ReservaSchema);