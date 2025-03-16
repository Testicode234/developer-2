import { supabase } from '../config/supabase.js';

export const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        error: 'No authorization header'
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        error: 'No token provided'
      });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: 'Invalid or expired token'
      });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({
      error: 'Authentication failed'
    });
  }
};

export const authorizeRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('user_type')
        .eq('id', req.user.id)
        .single();

      if (error || !profile) {
        return res.status(403).json({
          error: 'User profile not found'
        });
      }

      if (!allowedRoles.includes(profile.user_type)) {
        return res.status(403).json({
          error: 'Unauthorized access'
        });
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(403).json({
        error: 'Authorization failed'
      });
    }
  };
};