import { supabase } from '../config/supabase.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const listUsers = async (req, res) => {
  try {
    const { 
      role, 
      status,
      search,
      page = 1,
      limit = 10
    } = req.query;

    let query = supabase
      .from('users')
      .select('*', { count: 'exact' });

    // Apply filters
    if (role) {
      query = query.eq('user_type', role);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: users, error, count } = await query;

    if (error) throw error;

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count
      }
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(400).json({ error: error.message });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    // Update user status
    const { data: user, error: updateError } = await supabase
      .from('users')
      .update({ 
        status,
        status_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log the action
    const { error: logError } = await supabase
      .from('admin_logs')
      .insert([{
        admin_id: req.user.id,
        action: 'update_user_status',
        target_id: id,
        details: {
          status,
          reason,
          previous_status: user.status
        }
      }]);

    if (logError) throw logError;

    res.json({
      message: 'User status updated successfully',
      user
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(400).json({ error: error.message });
  }
};

export const moderateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    // Update job status
    const { data: job, error: updateError } = await supabase
      .from('projects')
      .update({ 
        status,
        moderation_reason: reason,
        moderated_at: new Date().toISOString(),
        moderator_id: req.user.id
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log the action
    const { error: logError } = await supabase
      .from('admin_logs')
      .insert([{
        admin_id: req.user.id,
        action: 'moderate_job',
        target_id: id,
        details: {
          status,
          reason
        }
      }]);

    if (logError) throw logError;

    res.json({
      message: 'Job moderated successfully',
      job
    });
  } catch (error) {
    console.error('Moderate job error:', error);
    res.status(400).json({ error: error.message });
  }
};

export const resolveDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution, refundAmount, reason } = req.body;

    // Get dispute details
    const { data: dispute, error: disputeError } = await supabase
      .from('payment_disputes')
      .select(`
        *,
        payment:payment_id(*)
      `)
      .eq('id', id)
      .single();

    if (disputeError || !dispute) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    if (dispute.status !== 'pending') {
      return res.status(400).json({ error: 'Dispute has already been resolved' });
    }

    // Process refund if needed
    let refund = null;
    if (refundAmount > 0) {
      refund = await stripe.refunds.create({
        payment_intent: dispute.payment.stripe_payment_intent,
        amount: refundAmount * 100 // Convert to cents
      });
    }

    // Update dispute status
    const { error: updateError } = await supabase
      .from('payment_disputes')
      .update({ 
        status: 'resolved',
        resolution,
        refund_amount: refundAmount,
        resolution_reason: reason,
        resolved_at: new Date().toISOString(),
        resolver_id: req.user.id,
        refund_id: refund?.id
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // Log the action
    const { error: logError } = await supabase
      .from('admin_logs')
      .insert([{
        admin_id: req.user.id,
        action: 'resolve_dispute',
        target_id: id,
        details: {
          resolution,
          refundAmount,
          reason
        }
      }]);

    if (logError) throw logError;

    res.json({
      message: 'Dispute resolved successfully',
      refund
    });
  } catch (error) {
    console.error('Resolve dispute error:', error);
    res.status(400).json({ error: error.message });
  }
};

export const getAdminLogs = async (req, res) => {
  try {
    const { 
      action,
      adminId,
      startDate,
      endDate,
      page = 1,
      limit = 10
    } = req.query;

    let query = supabase
      .from('admin_logs')
      .select(`
        *,
        admin:admin_id(id, full_name, email)
      `);

    // Apply filters
    if (action) {
      query = query.eq('action', action);
    }
    if (adminId) {
      query = query.eq('admin_id', adminId);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to)
      .order('created_at', { ascending: false });

    const { data: logs, error, count } = await query;

    if (error) throw error;

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count
      }
    });
  } catch (error) {
    console.error('Get admin logs error:', error);
    res.status(400).json({ error: error.message });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.setDate(today.getDate() - 30));

    // Get user statistics
    const { data: userStats, error: userError } = await supabase
      .from('users')
      .select('user_type, status, created_at')
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (userError) throw userError;

    // Get project statistics
    const { data: projectStats, error: projectError } = await supabase
      .from('projects')
      .select('status, budget_min, budget_max, created_at')
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (projectError) throw projectError;

    // Get payment statistics
    const { data: paymentStats, error: paymentError } = await supabase
      .from('payments')
      .select('amount, status, created_at')
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (paymentError) throw paymentError;

    // Calculate statistics
    const stats = {
      users: {
        total: userStats.length,
        developers: userStats.filter(u => u.user_type === 'developer').length,
        clients: userStats.filter(u => u.user_type === 'client').length,
        active: userStats.filter(u => u.status === 'active').length
      },
      projects: {
        total: projectStats.length,
        open: projectStats.filter(p => p.status === 'open').length,
        inProgress: projectStats.filter(p => p.status === 'in_progress').length,
        completed: projectStats.filter(p => p.status === 'completed').length,
        totalValue: projectStats.reduce((sum, p) => sum + (p.budget_max + p.budget_min) / 2, 0)
      },
      payments: {
        total: paymentStats.reduce((sum, p) => sum + p.amount, 0),
        completed: paymentStats.filter(p => p.status === 'completed').length,
        pending: paymentStats.filter(p => p.status === 'pending').length
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(400).json({ error: error.message });
  }
};

export const getRevenueChart = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const today = new Date();
    let startDate;

    switch (period) {
      case '7d':
        startDate = new Date(today.setDate(today.getDate() - 7));
        break;
      case '30d':
        startDate = new Date(today.setDate(today.getDate() - 30));
        break;
      case '90d':
        startDate = new Date(today.setDate(today.getDate() - 90));
        break;
      default:
        startDate = new Date(today.setDate(today.getDate() - 30));
    }

    const { data: payments, error } = await supabase
      .from('payments')
      .select('amount, created_at')
      .gte('created_at', startDate.toISOString())
      .eq('status', 'completed');

    if (error) throw error;

    // Group payments by date
    const dailyRevenue = payments.reduce((acc, payment) => {
      const date = new Date(payment.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + payment.amount;
      return acc;
    }, {});

    // Fill in missing dates with zero revenue
    const chartData = [];
    let currentDate = new Date(startDate);
    while (currentDate <= new Date()) {
      const dateStr = currentDate.toISOString().split('T')[0];
      chartData.push({
        date: dateStr,
        revenue: dailyRevenue[dateStr] || 0
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.json(chartData);
  } catch (error) {
    console.error('Get revenue chart error:', error);
    res.status(400).json({ error: error.message });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const { 
      platformFee,
      minProjectBudget,
      maxProjectBudget,
      allowedPaymentMethods,
      emailNotifications
    } = req.body;

    // Update platform settings
    const { data: settings, error } = await supabase
      .from('platform_settings')
      .upsert([{
        id: 1, // Single row for platform settings
        platform_fee: platformFee,
        min_project_budget: minProjectBudget,
        max_project_budget: maxProjectBudget,
        allowed_payment_methods: allowedPaymentMethods,
        email_notifications: emailNotifications,
        updated_at: new Date().toISOString(),
        updated_by: req.user.id
      }])
      .select()
      .single();

    if (error) throw error;

    // Log the settings update
    await supabase
      .from('admin_logs')
      .insert([{
        admin_id: req.user.id,
        action: 'update_settings',
        details: {
          previous: req.body,
          new: settings
        }
      }]);

    res.json({
      message: 'Settings updated successfully',
      settings
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(400).json({ error: error.message });
  }
};

export const getPaymentOverview = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Get payment statistics from Stripe
    const [balance, payouts] = await Promise.all([
      stripe.balance.retrieve(),
      stripe.payouts.list({
        limit: 10,
        created: {
          gte: startDate ? Math.floor(new Date(startDate).getTime() / 1000) : undefined,
          lte: endDate ? Math.floor(new Date(endDate).getTime() / 1000) : undefined
        }
      })
    ]);

    // Get platform payments from database
    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        amount,
        status,
        created_at,
        sender:sender_id(full_name),
        receiver:receiver_id(full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    res.json({
      balance: {
        available: balance.available.reduce((sum, b) => sum + b.amount, 0) / 100,
        pending: balance.pending.reduce((sum, b) => sum + b.amount, 0) / 100
      },
      recentPayouts: payouts.data.map(p => ({
        id: p.id,
        amount: p.amount / 100,
        status: p.status,
        arrivalDate: new Date(p.arrival_date * 1000).toISOString(),
        method: p.method
      })),
      recentTransactions: payments.map(p => ({
        amount: p.amount,
        status: p.status,
        sender: p.sender.full_name,
        receiver: p.receiver.full_name,
        date: p.created_at
      }))
    });
  } catch (error) {
    console.error('Get payment overview error:', error);
    res.status(400).json({ error: error.message });
  }
};