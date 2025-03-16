'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Plus, Users, Briefcase, DollarSign } from 'lucide-react'
import Link from 'next/link'

export default function ClientDashboard() {
  const [projects, setProjects] = useState([])
  const [stats, setStats] = useState({
    activeProjects: 0,
    totalApplications: 0,
    totalSpent: 0
  })
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchDashboardData = async () => {
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*, project_applications(*)')
        .order('created_at', { ascending: false })
      
      if (projectsData) {
        setProjects(projectsData)
        setStats({
          activeProjects: projectsData.filter(p => p.status === 'in_progress').length,
          totalApplications: projectsData.reduce((acc, p) => acc + (p.project_applications?.length || 0), 0),
          totalSpent: projectsData.reduce((acc, p) => acc + (p.budget_max || 0), 0)
        })
      }
    }

    fetchDashboardData()
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Client Dashboard</h1>
        <Link
          href="/projects/new"
          className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Post New Project
        </Link>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
          <div className="flex items-center">
            <Briefcase className="w-10 h-10 text-primary" />
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Projects</p>
              <p className="text-2xl font-semibold">{stats.activeProjects}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
          <div className="flex items-center">
            <Users className="w-10 h-10 text-primary" />
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Applications</p>
              <p className="text-2xl font-semibold">{stats.totalApplications}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
          <div className="flex items-center">
            <DollarSign className="w-10 h-10 text-primary" />
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Spent</p>
              <p className="text-2xl font-semibold">${stats.totalSpent.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Projects */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold">Recent Projects</h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {projects.map((project: any) => (
            <div key={project.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    <Link href={`/projects/${project.id}`} className="hover:text-primary">
                      {project.title}
                    </Link>
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-2">{project.description}</p>
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <span className="mr-4">Budget: ${project.budget_min} - ${project.budget_max}</span>
                    <span>Applications: {project.project_applications?.length || 0}</span>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  project.status === 'open' ? 'bg-green-100 text-green-800' :
                  project.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {project.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}