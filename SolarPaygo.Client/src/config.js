export const BASE_URL = (import.meta.env.VITE_BASE_URL?.replace(/\/+$/, "")) ?? "/api";

export const defaultHeaders = {
  "Content-Type": "application/json",
};
