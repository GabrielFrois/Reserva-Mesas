import { Router } from "express";
import {
  criarReserva,
  listarReservas,
  atualizarReserva,
  cancelarReserva
} from "../controllers/ReservaController";
 
const router = Router();
 
router.post("/", criarReserva);
router.get("/", listarReservas);
router.put("/:id", atualizarReserva);
router.delete("/:id", cancelarReserva);
 
export default router;