import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "No token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret123");

    req.user = decoded; // contains user id

    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};