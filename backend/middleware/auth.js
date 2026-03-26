import { verifyAuthToken } from "../utils/auth.js";

export const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "No token" });
    }

    const decoded = verifyAuthToken(token);

    req.user = decoded; // contains user id

    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};