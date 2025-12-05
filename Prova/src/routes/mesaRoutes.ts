import { Router } from "express";
import { criarMesa, listarMesas, seedMesas } from "../controllers/MesaController";
 
const router = Router();
 
router.post("/", criarMesa);
router.get("/", listarMesas);
router.post("/seed", seedMesas);
 
export default router;