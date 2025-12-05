import mongoose, { Schema, Document } from "mongoose";

export interface IMesa extends Document {
    numero: number;
    capacidade: number;
    localizacao: string;
}

const MesaSchema: Schema = new Schema({
    numero: { type: Number, required: true, unique: true },
    capacidade: { type: Number, required: true, min: 1 },
    localizacao: { type: String, required: true }
});

export default mongoose.model<IMesa>("Mesa", MesaSchema);