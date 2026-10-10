import type { AuthContext } from "./auth.js";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
      validated?: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
      };
    }
  }
}

export {};
