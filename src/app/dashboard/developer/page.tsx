'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Search, Briefcase, CheckCircle, DollarSign } from 'lucide-react'
import Link from 'next/link'

export default function DeveloperDashboard() {
  const [applications, setApplications] = useState([])
  const [stats, setStats] = useState({
    activeProjects: 0,
    completedProjects: 0,
    totalEarned: 0
  })
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchDashboardData = async () => {
      const { data: applicationsData } = await supabase
        .from('project_applications')
        .select(`
          *,
          project:projects(*)
        `)
        .order('created_at', { ascending: false })
      
      if (applicationsData) {
        setApplications(applicationsData)
        setStats({
          activeProjects: applicationsData.filter(a => a.status === 'accepted').length,
          completedProjects: applicationsData.filter(a => a.project?.status === 'completed').length,
          totalEarned: applicationsData.reduce((acc, a) => acc + (a.project?.budget_max || 0), 0)
        })
      }
    }

    fetchDashboardData()
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Developer Dashboard</h1>
        <Link
          href="/projects"
          className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Search className="w-5 h-5 mr-2" />
          Find Projects
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
            <CheckCircle className="w-10 h-10 text-primary" />
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Completed Projects</p>
              <p className="text-2xl font-semibold">{stats.completedProjects}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
          <div className="flex items-center">
            <DollarSign className="w-10 h-10 text-primary" />
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Earned</p>
              <p className="text-2xl font-semibold">${stats.totalEarned.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Applications */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold">Recent Applications</h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {applications.map((application: any) => (
            <div key={application.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    <Link href={`/projects/${application.project.id}`} className="hover:text-primary">
                      {application.project.title}
                    </Link>
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-2">{application.project.description}</p>
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <span className="mr-4">Budget: ${application.project.budget_min} - ${application.project.budget_max}</span>
                    <span>Applied: {new Date(application.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  application.status === 'accepted' ? 'bg-green-100 text-green-800' :
                  application.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {application.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}