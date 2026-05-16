import { Router } from "express";
import { subscribe, unsubscribe, getVapidPublicKey } from "../controllers/pushController";

const router = Router();

// Public: get VAPID key for subscription
router.get("/vapid-public-key", getVapidPublicKey);

// Subscribe/unsubscribe (no auth required — anonymous subscriptions)
router.post("/subscribe", subscribe);
router.post("/unsubscribe", unsubscribe);

export default router;
