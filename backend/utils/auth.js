import jwt from "jsonwebtoken";

export const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return process.env.JWT_SECRET;
};

export const createAuthToken = (payload) => jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });

export const verifyAuthToken = (token) => jwt.verify(token, getJwtSecret());