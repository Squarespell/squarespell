// Global Express Request augmentation so req.dbUserId / req.userId are
// typed correctly in every route file without needing to cast to
// AuthenticatedRequest everywhere.
declare namespace Express {
  interface Request {
    userId?: string;
    dbUserId?: string;
  }
}
