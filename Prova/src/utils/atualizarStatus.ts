import Reserva from "../models/Reserva";

export const atualizarStatusReservas = async () => {
    const now = new Date();

    const reservas = await Reserva.find({ status: { $ne: "cancelado" } });

    const updates: Promise<any>[] = [];

    for (const r of reservas) {
        let novoStatus = r.status as string;

        if (r.status === "cancelado") {
            continue;
        }

        if (now < r.inicio) {
            novoStatus = "reservado";
        } else if (now >= r.inicio && now <= r.fim) {
            novoStatus = "ocupado";
        } else if (now > r.fim) {
            novoStatus = "finalizado";
        }

        if (novoStatus !== r.status) {
            r.status = novoStatus as any;
            updates.push(r.save());
        }
    }

    if (updates.length > 0) {
        await Promise.all(updates);
    }

    return;
};
