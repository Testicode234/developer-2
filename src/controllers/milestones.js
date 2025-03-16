import { supabase } from '../config/supabase.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createMilestone = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description, amount, deadline } = req.body;
    const clientId = req.user.id;

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('client_id, status')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.client_id !== clientId) {
      return res.status(403).json({ error: 'Unauthorized to create milestones for this project' });
    }

    if (project.status !== 'in_progress') {
      return res.status(400).json({ error: 'Can only create milestones for in-progress projects' });
    }

    // Create milestone
    const { data: milestone, error: milestoneError } = await supabase
      .from('project_milestones')
      .insert([{
        project_id: projectId,
        title,
        description,
        amount,
        deadline,
        status: 'pending'
      }])
      .select()
      .single();

    if (milestoneError) throw milestoneError;

    res.status(201).json({
      message: 'Milestone created successfully',
      milestone
    });
  } catch (error) {
    console.error('Create milestone error:', error);
    res.status(400).json({ error: error.message });
  }
};

export const releaseMilestonePayment = async (req, res) => {
  try {
    const { milestoneId } = req.params;
    const clientId = req.user.id;

    // Get milestone and project details
    const { data: milestone, error: milestoneError } = await supabase
      .from('project_milestones')
      .select(`
        *,
        project:projects(
          client_id,
          developer_id
        )
      `)
      .eq('id', milestoneId)
      .single();

    if (milestoneError || !milestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    if (milestone.project.client_id !== clientId) {
      return res.status(403).json({ error: 'Unauthorized to release this milestone payment' });
    }

    if (milestone.status !== 'completed') {
      return res.status(400).json({ error: 'Milestone must be completed before releasing payment' });
    }

    // Create Stripe transfer
    const transfer = await stripe.transfers.create({
      amount: milestone.amount * 100, // Convert to cents
      currency: 'usd',
      destination: milestone.project.developer_id, // Developer's Stripe account ID
      description: `Payment for milestone: ${milestone.title}`
    });

    // Update milestone status
    const { error: updateError } = await supabase
      .from('project_milestones')
      .update({ 
        status: 'paid',
        paid_at: new Date().toISOString()
      })
      .eq('id', milestoneId);

    if (updateError) throw updateError;

    res.json({
      message: 'Payment released successfully',
      transfer
    });
  } catch (error) {
    console.error('Release payment error:', error);
    res.status(400).json({ error: error.message });
  }
};

export const listMilestones = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    // Verify project access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('client_id, developer_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.client_id !== userId && project.developer_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized to view project milestones' });
    }

    const { data: milestones, error: milestonesError } = await supabase
      .from('project_milestones')
      .select('*')
      .eq('project_id', projectId)
      .order('deadline', { ascending: true });

    if (milestonesError) throw milestonesError;

    res.json(milestones);
  } catch (error) {
    console.error('List milestones error:', error);
    res.status(400).json({ error: error.message });
  }
};