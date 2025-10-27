import { config } from '../config/env.js';

export function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'] || req.get('X-Admin-Token');

  if (!config.admin.accessToken) {
    return res.status(503).json({ error: 'Admin access is not configured.' });
  }

  if (!token || token !== config.admin.accessToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return next();
}
