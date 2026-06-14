import { Router } from "express";
import { reverseGeocode } from "../controllers/geocodeController";

const router = Router();

// GET /api/geocode/reverse?lat=...&lon=...
router.get("/reverse", reverseGeocode);

export default router;
