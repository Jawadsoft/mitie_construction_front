import { Router } from "express";
import pool from "../config/db";

const router = Router();

router.get("/health", async (_req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS ok");
    res.json({ status: "ok", db: rows });
  } catch (err) {
    console.error("Health check failed:", err);
    res.status(500).json({ status: "error", message: "Database connection failed" });
  }
});

export default router;

