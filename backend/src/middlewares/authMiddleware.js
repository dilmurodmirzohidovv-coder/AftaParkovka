import jwt from 'jsonwebtoken';

export const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Avtorizatsiya kerak' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Token yaroqsiz' });
  }
};

// authMiddleware'dan KEYIN ishlatiladi. Faqat role: "admin" bo'lganlarga ruxsat beradi.
export const adminMiddleware = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Ruxsat yo‘q — faqat admin uchun' });
  }
  next();
};
