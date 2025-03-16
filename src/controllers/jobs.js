import { supabase } from '../config/supabase.js';

export const createJob = async (req, res) => {
  try {
    const clientId = req.user.id;
    const { title, description, budgetMin, budgetMax, deadline, skills } = req.body;

    // Create job posting
    const { data: job, error: jobError } = await supabase
      .from('projects')
      .insert([{
        title,
        description,
        client_id: clientId,
        budget_min: budgetMin,
        budget_max: budgetMax,
        deadline,
        status: 'open'
      }])
      .select()
      .single();

    if (jobError) throw jobError;

    // Add skills
    if (skills && skills.length > 0) {
      const skillsData = skills.map(skill => ({
        project_id: job.id,
        skill_name: skill.toLowerCase()
      }));

      const { error: skillsError } = await supabase
        .from('project_skills')
        .insert(skillsData);

      if (skillsError) throw skillsError;
    }

    res.status(201).json({
      message: 'Job created successfully',
      job
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(400).json({
      error: error.message
    });
  }
};

export const listJobs = async (req, res) => {
  try {
    const { 
      status, 
      skill, 
      budgetMin, 
      budgetMax,
      page = 1,
      limit = 10
    } = req.query;

    let query = supabase
      .from('projects')
      .select(`
        *,
        client:users!projects_client_id_fkey(
          id,
          full_name,
          avatar_url
        ),
        project_skills(skill_name)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (budgetMin) {
      query = query.gte('budget_min', budgetMin);
    }
    if (budgetMax) {
      query = query.lte('budget_max', budgetMax);
    }
    if (skill) {
      query = query.contains('project_skills.skill_name', skill.toLowerCase());
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: jobs, error, count } = await query;

    if (error) throw error;

    res.json({
      jobs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count
      }
    });
  } catch (error) {
    console.error('List jobs error:', error);
    res.status(400).json({
      error: error.message
    });
  }
};

export const getJob = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: job, error } = await supabase
      .from('projects')
      .select(`
        *,
        client:users!projects_client_id_fkey(
          id,
          full_name,
          avatar_url
        ),
        project_skills(skill_name),
        project_applications(
          id,
          developer:users(
            id,
            full_name,
            avatar_url
          ),
          status,
          created_at
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!job) {
      return res.status(404).json({
        error: 'Job not found'
      });
    }

    res.json(job);
  } catch (error) {
    console.error('Get job error:', error);
    res.status(400).json({
      error: error.message
    });
  }
};

export const updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const clientId = req.user.id;

    // Verify ownership
    const { data: existingJob, error: checkError } = await supabase
      .from('projects')
      .select('client_id')
      .eq('id', id)
      .single();

    if (checkError || !existingJob) {
      return res.status(404).json({
        error: 'Job not found'
      });
    }

    if (existingJob.client_id !== clientId) {
      return res.status(403).json({
        error: 'Unauthorized to update this job'
      });
    }

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.client_id;
    delete updates.created_at;

    const { data: job, error: updateError } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Update skills if provided
    if (updates.skills) {
      // Delete existing skills
      await supabase
        .from('project_skills')
        .delete()
        .eq('project_id', id);

      // Add new skills
      const skillsData = updates.skills.map(skill => ({
        project_id: id,
        skill_name: skill.toLowerCase()
      }));

      const { error: skillsError } = await supabase
        .from('project_skills')
        .insert(skillsData);

      if (skillsError) throw skillsError;
    }

    res.json({
      message: 'Job updated successfully',
      job
    });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(400).json({
      error: error.message
    });
  }
};

export const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    const clientId = req.user.id;

    // Verify ownership
    const { data: existingJob, error: checkError } = await supabase
      .from('projects')
      .select('client_id, status')
      .eq('id', id)
      .single();

    if (checkError || !existingJob) {
      return res.status(404).json({
        error: 'Job not found'
      });
    }

    if (existingJob.client_id !== clientId) {
      return res.status(403).json({
        error: 'Unauthorized to delete this job'
      });
    }

    if (existingJob.status === 'in_progress') {
      return res.status(400).json({
        error: 'Cannot delete a job that is in progress'
      });
    }

    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    res.json({
      message: 'Job deleted successfully'
    });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(400).json({
      error: error.message
    });
  }
};

export const applyToJob = async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const developerId = req.user.id;
    const { coverLetter } = req.body;

    // Check if job exists and is open
    const { data: job, error: jobError } = await supabase
      .from('projects')
      .select('status, client_id')
      .eq('id', projectId)
      .single();

    if (jobError || !job) {
      return res.status(404).json({
        error: 'Job not found'
      });
    }

    if (job.status !== 'open') {
      return res.status(400).json({
        error: 'This job is not accepting applications'
      });
    }

    if (job.client_id === developerId) {
      return res.status(400).json({
        error: 'You cannot apply to your own job'
      });
    }

    // Check if already applied
    const { data: existingApplication, error: checkError } = await supabase
      .from('project_applications')
      .select('id')
      .eq('project_id', projectId)
      .eq('developer_id', developerId)
      .single();

    if (existingApplication) {
      return res.status(400).json({
        error: 'You have already applied to this job'
      });
    }

    // Create application
    const { data: application, error: applyError } = await supabase
      .from('project_applications')
      .insert([{
        project_id: projectId,
        developer_id: developerId,
        cover_letter: coverLetter,
        status: 'pending'
      }])
      .select()
      .single();

    if (applyError) throw applyError;

    res.status(201).json({
      message: 'Application submitted successfully',
      application
    });
  } catch (error) {
    console.error('Apply to job error:', error);
    res.status(400).json({
      error: error.message
    });
  }
};

export const listApplications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    let query = supabase
      .from('project_applications')
      .select(`
        *,
        project:projects(
          id,
          title,
          budget_min,
          budget_max,
          status,
          client:users!projects_client_id_fkey(
            id,
            full_name,
            avatar_url
          )
        ),
        developer:users(
          id,
          full_name,
          avatar_url
        )
      `);

    // Filter by user role
    const { data: userProfile } = await supabase
      .from('users')
      .select('user_type')
      .eq('id', userId)
      .single();

    if (userProfile.user_type === 'client') {
      query = query.eq('project.client_id', userId);
    } else {
      query = query.eq('developer_id', userId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: applications, error } = await query
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(applications);
  } catch (error) {
    console.error('List applications error:', error);
    res.status(400).json({
      error: error.message
    });
  }
};