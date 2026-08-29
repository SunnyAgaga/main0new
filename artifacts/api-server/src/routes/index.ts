import { Router, type IRouter } from "express";
import healthRouter from "./health";
import eventRouter from "./event";
import asoebiRouter from "./asoebi";
import rsvpsRouter from "./rsvps";
import checkoutRouter from "./checkout";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(eventRouter);
router.use(asoebiRouter);
router.use(rsvpsRouter);
router.use(checkoutRouter);
router.use(adminRouter);

export default router;
