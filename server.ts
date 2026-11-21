import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { z } from "zod";
import xss from "xss";
import verifyDeposit from "./api/wallet/verify";
import devFund from "./api/wallet/dev-fund";
import assignmentFee from "./api/wallet/assignment-fee";
import withdraw from "./api/wallet/withdraw";
import paystackWebhook from "./api/paystack-webhook";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Webhook needs the raw body for signature checks, so it is mounted before express.json().
  app.post("/api/paystack-webhook", express.raw({ type: "*/*" }), (req, res) => paystackWebhook(req as any, res as any));

  app.use(express.json());

  // Wallet API (same handlers Vercel serves from /api/*)
  app.post("/api/wallet/verify", (req, res) => verifyDeposit(req as any, res as any));
  app.post("/api/wallet/dev-fund", (req, res) => devFund(req as any, res as any));
  app.post("/api/wallet/assignment-fee", (req, res) => assignmentFee(req as any, res as any));
  app.post("/api/wallet/withdraw", (req, res) => withdraw(req as any, res as any));

  // Input Sanitization utility
  const sanitizeInput = (input: string) => {
    return xss(input, {
      whiteList: {}, // Strip all HTML tags
      stripIgnoreTag: true,
      stripIgnoreTagBody: ["script", "style"]
    });
  };

  // Validation Schemas
  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6).max(128)
  });

  const signupSchema = z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    password: z.string().min(6).max(128)
  });

  // Login Validation Route
  app.post("/api/auth/login", (req, res) => {
    try {
      const sanitizedBody = {
        email: typeof req.body.email === "string" ? sanitizeInput(req.body.email) : "",
        password: typeof req.body.password === "string" ? sanitizeInput(req.body.password) : ""
      };
      
      loginSchema.parse(sanitizedBody);
      
      res.status(200).json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Server validation failed during login:", (error as any).errors.map((e: any) => e.path.join('.')));
      } else {
        console.error("Server validation failed during login due to an unknown error.");
      }
      // Generic error message
      res.status(400).json({ error: "Incorrect email or password" });
    }
  });

  // Signup Validation Route
  app.post("/api/auth/signup", (req, res) => {
    try {
      const sanitizedBody = {
        name: typeof req.body.name === "string" ? sanitizeInput(req.body.name) : "",
        email: typeof req.body.email === "string" ? sanitizeInput(req.body.email) : "",
        password: typeof req.body.password === "string" ? sanitizeInput(req.body.password) : ""
      };
      
      signupSchema.parse(sanitizedBody);
      
      res.status(200).json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Server validation failed during signup:", (error as any).errors.map((e: any) => e.path.join('.')));
      } else {
        console.error("Server validation failed during signup due to an unknown error.");
      }
      // Generic error message
      res.status(400).json({ error: "Incorrect email or password" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
