import { Router, type IRouter } from "express";
import healthRouter from "./health";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import movementsRouter from "./movements";
import dashboardRouter from "./dashboard";
import templatesRouter from "./templates";

const router: IRouter = Router();

router.use(healthRouter);
router.use(categoriesRouter);
router.use(productsRouter);
router.use(movementsRouter);
router.use(dashboardRouter);
router.use(templatesRouter);

export default router;
