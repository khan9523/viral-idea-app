import jwt from "jsonwebtoken";

const MIN_RECOMMENDED_JWT_SECRET_LENGTH = 32;
let hasWarnedWeakSecret = false;

export const getJwtSecret = () => {
  const secret = String(process.env.JWT_SECRET || "");

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  if (secret.length < MIN_RECOMMENDED_JWT_SECRET_LENGTH && !hasWarnedWeakSecret) {
    hasWarnedWeakSecret = true;
    console.warn(
      `JWT_SECRET is shorter than ${MIN_RECOMMENDED_JWT_SECRET_LENGTH} characters. Rotate to a longer random secret for stronger security.`,
    );
  }

  return secret;
};

export const createAuthToken = (payload) => jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });

export const verifyAuthToken = (token) => jwt.verify(token, getJwtSecret());