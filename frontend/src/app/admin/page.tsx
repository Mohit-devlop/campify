'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { apiFetch } from '../../lib/api';
import { 
  Users, AlertTriangle, ShieldAlert, Sparkles, Ban, Check, 
  Trash2, Info, Loader2 
} from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, isInitialized } = useAuthStore();
  
  const [stats, setStats] = useState<any | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'reports'>('users');
  const [isLoading, setIsLoading] = useState(true);

  // Security Gate
  useEffect(() => {
    if (!isInitialized) return;

    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }
    if (user && user.role !== 'ADMIN') {
      router.push('/');
    }
  }, [user, isAuthenticated, isInitialized, router]);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      // Load Overview Stats
      const statsRes = await apiFetch('/admin/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Load Users list
      const usersRes = await apiFetch('/admin/users');
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }

      // Load abuse reports
      const reportsRes = await apiFetch('/admin/reports');
      if (reportsRes.ok) {
        const reportsData = await reportsRes.json();
        setReports(reportsData);
      }
    } catch (err) {
      console.error('Failed to load admin logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.role === 'ADMIN') {
      loadAdminData();
    }
  }, [isAuthenticated, user]);

  const handleToggleBanUser = async (targetUserId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'BANNED' ? 'ACTIVE' : 'BANNED';
    if (!confirm(`Are you sure you want to update user status to ${nextStatus}?`)) return;

    try {
      const res = await apiFetch(`/admin/users/${targetUserId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, status: nextStatus } : u))
        );
        loadAdminData(); // refresh counters
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveReport = async (reportId: string, action: 'DELETE_POST' | 'BAN_USER' | 'DISMISS') => {
    if (!confirm(`Are you sure you want to take action: ${action}?`)) return;

    try {
      const res = await apiFetch(`/admin/reports/${reportId}/action`, {
        method: 'POST',
        body: JSON.stringify({
          action,
          status: action === 'DISMISS' ? 'DISMISSED' : 'RESOLVED',
        }),
      });

      if (res.ok) {
        setReports((prev) =>
          prev.map((r) =>
            r.id === reportId
              ? {
                  ...r,
                  status: action === 'DISMISS' ? 'DISMISSED' : 'RESOLVED',
                  actionTaken: action,
                }
              : r
          )
        );
        loadAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex justify-center items-center">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  if (user?.role !== 'ADMIN') {
    return null; // Gate redirect takes care
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-600">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold font-outfit tracking-tight">Admin Settings</h1>
          <p className="text-neutral-500 text-xs font-medium">Platform overview statistics and abuse content audit logs.</p>
        </div>
      </div>

      {/* Stats Summary cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800/60 p-5 rounded-2xl shadow-sm flex flex-col gap-1.5 glass">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Total Accounts</span>
            <span className="font-extrabold text-2xl font-outfit text-black dark:text-white">{stats.totalUsers}</span>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800/60 p-5 rounded-2xl shadow-sm flex flex-col gap-1.5 glass">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Banned Users</span>
            <span className="font-extrabold text-2xl font-outfit text-red-500">{stats.bannedUsers}</span>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800/60 p-5 rounded-2xl shadow-sm flex flex-col gap-1.5 glass">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Active Posts</span>
            <span className="font-extrabold text-2xl font-outfit text-black dark:text-white">{stats.totalPosts}</span>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800/60 p-5 rounded-2xl shadow-sm flex flex-col gap-1.5 glass">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Pending Reports</span>
            <span className="font-extrabold text-2xl font-outfit text-yellow-500">{stats.pendingReports}</span>
          </div>
        </div>
      )}

      {/* Tab selectors */}
      <div className="flex gap-4 border-b border-neutral-100 dark:border-neutral-900">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-2.5 font-bold text-xs flex items-center gap-1.5 transition-all bg-transparent border-0 cursor-pointer ${
            activeTab === 'users' ? 'text-black dark:text-white border-b-2 border-red-500' : 'text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Users className="w-4.5 h-4.5" />
          User Management
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`pb-2.5 font-bold text-xs flex items-center gap-1.5 transition-all bg-transparent border-0 cursor-pointer ${
            activeTab === 'reports' ? 'text-black dark:text-white border-b-2 border-red-500' : 'text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <AlertTriangle className="w-4.5 h-4.5" />
          Abuse Reports ({reports.filter((r) => r.status === 'PENDING').length})
        </button>
      </div>

      {/* Contents */}
      <div className="mt-2">
        {activeTab === 'users' ? (
          /* Users lists Table */
          <div className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden glass shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-150 dark:border-neutral-800 text-[10px] font-bold text-neutral-400 uppercase tracking-wider bg-neutral-50/50 dark:bg-neutral-900/50">
                  <th className="p-4">User</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {users.map((u) => (
                  <tr key={u.id} className="text-xs">
                    <td className="p-4 flex items-center gap-3">
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">
                          {u.username[0].toUpperCase()}
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="font-bold">{u.name || u.username}</span>
                        <span className="text-[10px] text-neutral-500">@{u.username}</span>
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-neutral-600 dark:text-neutral-300">{u.email}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        u.role === 'ADMIN' ? 'bg-red-500/10 text-red-500' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        u.status === 'BANNED' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {u.id !== user.id && (
                        <button
                          onClick={() => handleToggleBanUser(u.id, u.status)}
                          className={`p-2 rounded-lg border-0 cursor-pointer active-shrink hover-scale ${
                            u.status === 'BANNED' 
                              ? 'bg-green-500/10 hover:bg-green-500/20 text-green-600' 
                              : 'bg-red-500/10 hover:bg-red-500/20 text-red-600'
                          }`}
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Abuse reports audit log cards */
          <div className="flex flex-col gap-4">
            {reports.length === 0 ? (
              <div className="text-center py-12 text-sm text-neutral-500">
                No abuse reports submitted yet.
              </div>
            ) : (
              reports.map((report) => (
                <div
                  key={report.id}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 flex flex-col gap-4 glass shadow-sm"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800/60 pb-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold">Reporter:</span>
                      <span className="text-neutral-500">@{report.reporter.username}</span>
                      <span className="font-bold ml-3">Target Account:</span>
                      <span className="text-neutral-500">
                        @{report.targetUser?.username || 'N/A'}
                      </span>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold self-start ${
                      report.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'
                    }`}>
                      {report.status}
                    </span>
                  </div>

                  {/* Reason content */}
                  <div className="flex flex-col gap-1 text-xs">
                    <span className="font-bold flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-neutral-400" />
                      Report Reason:
                    </span>
                    <p className="text-neutral-600 dark:text-neutral-300 font-medium bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl border">
                      {report.reason}
                    </p>
                  </div>

                  {/* Target Post content if available */}
                  {report.targetPost && (
                    <div className="flex flex-col gap-1 text-xs">
                      <span className="font-bold">Reported Post:</span>
                      <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl border flex flex-col gap-2">
                        {report.targetPost.content && <p className="italic text-neutral-600 dark:text-neutral-400">&ldquo;{report.targetPost.content}&rdquo;</p>}
                        {report.targetPost.mediaUrls?.length > 0 && (
                          <div className="flex gap-1.5 overflow-x-auto">
                            {report.targetPost.mediaUrls.map((url: string, i: number) => (
                              <img key={i} src={url} alt="reported media" className="w-16 h-16 rounded-lg object-cover" />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions to take on report */}
                  {report.status === 'PENDING' ? (
                    <div className="flex flex-wrap gap-2.5 mt-2 justify-end">
                      <button
                        onClick={() => handleResolveReport(report.id, 'DISMISS')}
                        className="bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-black dark:text-white text-xs font-bold px-4 py-2 rounded-xl active-shrink hover-scale border-0 cursor-pointer flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5 text-green-600" />
                        Dismiss Report
                      </button>

                      {report.targetPostId && (
                        <button
                          onClick={() => handleResolveReport(report.id, 'DELETE_POST')}
                          className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-xl active-shrink hover-scale border-0 cursor-pointer flex items-center gap-1.5 shadow-md shadow-red-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete Post
                        </button>
                      )}

                      {report.targetUserId && (
                        <button
                          onClick={() => handleResolveReport(report.id, 'BAN_USER')}
                          className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl active-shrink hover-scale border-0 cursor-pointer flex items-center gap-1.5 shadow-md shadow-red-500/10"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          Ban Creator
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-[10px] text-neutral-400 font-bold self-end">
                      RESOLVED Action: {report.actionTaken}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
