'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { apiFetch } from '../../lib/api';
import { 
  Users, AlertTriangle, ShieldAlert, Sparkles, Ban, Check, 
  Trash2, Info, Loader2, ShieldCheck, Lock, Unlock, Eye, 
  History, Search, CheckCircle2, X
} from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, isInitialized } = useAuthStore();
  
  const [stats, setStats] = useState<any | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [securityAccounts, setSecurityAccounts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'reports' | 'security'>('security');
  const [isLoading, setIsLoading] = useState(true);

  // Security Management State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SECURITY_LOCKED' | 'SECURITY_REVIEW'>('ALL');
  const [selectedAuditAccount, setSelectedAuditAccount] = useState<any | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Unlock Modal State
  const [unlockTarget, setUnlockTarget] = useState<any | null>(null);
  const [unlockReason, setUnlockReason] = useState('');
  const [idVerifiedCheck, setIdVerifiedCheck] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
      // 1. Overview Stats
      const statsRes = await apiFetch('/admin/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // 2. Users list
      const usersRes = await apiFetch('/admin/users');
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }

      // 3. Abuse reports
      const reportsRes = await apiFetch('/admin/reports');
      if (reportsRes.ok) {
        const reportsData = await reportsRes.json();
        setReports(reportsData);
      }

      // 4. Security locked & review accounts
      await loadSecurityAccounts();
    } catch (err) {
      console.error('Failed to load admin logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSecurityAccounts = async () => {
    try {
      const res = await apiFetch('/admin/security/locked-accounts');
      if (res.ok) {
        const data = await res.json();
        setSecurityAccounts(data);
      }
    } catch (err) {
      console.error('Failed to load security accounts:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.role === 'ADMIN') {
      loadAdminData();
    }
  }, [isAuthenticated, user]);

  const handleOpenAuditTrail = async (account: any) => {
    setSelectedAuditAccount(account);
    setIsLoadingAudit(true);
    try {
      const res = await apiFetch(`/admin/security/audit-trail/${account.id}`);
      if (res.ok) {
        const logs = await res.json();
        setAuditLogs(logs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockTarget || !unlockReason.trim() || !idVerifiedCheck) return;

    setIsUnlocking(true);
    setActionFeedback(null);

    try {
      const res = await apiFetch(`/admin/security/unlock/${unlockTarget.id}`, {
        method: 'POST',
        body: JSON.stringify({ reason: unlockReason.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        setActionFeedback({
          type: 'success',
          message: data.message || `Account for ${unlockTarget.username} has been unlocked successfully.`,
        });
        setUnlockTarget(null);
        setUnlockReason('');
        setIdVerifiedCheck(false);
        await loadSecurityAccounts();
      } else {
        setActionFeedback({
          type: 'error',
          message: data.error || 'Failed to unlock student account.',
        });
      }
    } catch (err) {
      console.error(err);
      setActionFeedback({
        type: 'error',
        message: 'A network error occurred while unlocking account.',
      });
    } finally {
      setIsUnlocking(false);
    }
  };

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
        loadAdminData();
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

  // Filtered security accounts
  const filteredSecurityAccounts = securityAccounts.filter((acc) => {
    const matchSearch =
      !searchQuery.trim() ||
      acc.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.enrollmentId?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchStatus =
      statusFilter === 'ALL' || acc.securityStatus === statusFilter;

    return matchSearch && matchStatus;
  });

  if (isLoading) {
    return (
      <div className="h-screen w-full flex justify-center items-center">
        <Loader2 className="w-8 h-8 text-brand-orange animate-spin" />
      </div>
    );
  }

  if (user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-8 text-brand-text">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-orange to-red-500 flex items-center justify-center text-white shadow-lg shadow-brand-orange/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold font-outfit tracking-tight">College Security & Admin Panel</h1>
            <p className="text-neutral-500 text-xs font-medium">
              Three-Strike Biometric Lockout, Authoritative Enrollment & Admin-Only Unlocks
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 bg-neutral-900 border border-neutral-800 px-3.5 py-1.5 rounded-full text-xs text-neutral-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Admin Authenticated: <strong>{user?.username}</strong></span>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-medium flex items-center justify-between ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-200'
              : 'bg-red-950/60 border border-red-800 text-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-neutral-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-neutral-900/80 border border-neutral-800 p-5 rounded-2xl shadow-sm flex flex-col gap-1.5 glass">
          <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Locked Accounts</span>
          <span className="font-extrabold text-2xl font-outfit text-red-500">
            {securityAccounts.filter((a) => a.securityStatus === 'SECURITY_LOCKED').length}
          </span>
        </div>

        <div className="bg-neutral-900/80 border border-neutral-800 p-5 rounded-2xl shadow-sm flex flex-col gap-1.5 glass">
          <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Under Security Review</span>
          <span className="font-extrabold text-2xl font-outfit text-amber-500">
            {securityAccounts.filter((a) => a.securityStatus === 'SECURITY_REVIEW').length}
          </span>
        </div>

        <div className="bg-neutral-900/80 border border-neutral-800 p-5 rounded-2xl shadow-sm flex flex-col gap-1.5 glass">
          <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Total Students</span>
          <span className="font-extrabold text-2xl font-outfit text-white">{stats?.totalUsers || users.length}</span>
        </div>

        <div className="bg-neutral-900/80 border border-neutral-800 p-5 rounded-2xl shadow-sm flex flex-col gap-1.5 glass">
          <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Pending Reports</span>
          <span className="font-extrabold text-2xl font-outfit text-yellow-500">
            {reports.filter((r) => r.status === 'PENDING').length}
          </span>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="flex gap-4 border-b border-neutral-800">
        <button
          onClick={() => setActiveTab('security')}
          className={`pb-3 font-bold text-xs flex items-center gap-2 transition-all bg-transparent border-0 cursor-pointer ${
            activeTab === 'security'
              ? 'text-brand-orange border-b-2 border-brand-orange'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <ShieldAlert className="w-4.5 h-4.5" />
          Account Security Management ({securityAccounts.length})
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 font-bold text-xs flex items-center gap-2 transition-all bg-transparent border-0 cursor-pointer ${
            activeTab === 'users'
              ? 'text-white border-b-2 border-brand-orange'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Users className="w-4.5 h-4.5" />
          All Student Accounts ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`pb-3 font-bold text-xs flex items-center gap-2 transition-all bg-transparent border-0 cursor-pointer ${
            activeTab === 'reports'
              ? 'text-white border-b-2 border-brand-orange'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <AlertTriangle className="w-4.5 h-4.5" />
          Content Abuse Reports ({reports.filter((r) => r.status === 'PENDING').length})
        </button>
      </div>

      {/* TAB CONTENT: ACCOUNT SECURITY MANAGEMENT */}
      {activeTab === 'security' && (
        <div className="flex flex-col gap-6">
          {/* Search & Filters */}
          <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search by student name, username, or enrollment ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white outline-none focus:border-brand-orange transition"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400 font-medium">Filter:</span>
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  statusFilter === 'ALL'
                    ? 'bg-neutral-800 text-white border border-neutral-700'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                All ({securityAccounts.length})
              </button>
              <button
                onClick={() => setStatusFilter('SECURITY_LOCKED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  statusFilter === 'SECURITY_LOCKED'
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                    : 'text-neutral-400 hover:text-red-400'
                }`}
              >
                Locked ({securityAccounts.filter((a) => a.securityStatus === 'SECURITY_LOCKED').length})
              </button>
              <button
                onClick={() => setStatusFilter('SECURITY_REVIEW')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  statusFilter === 'SECURITY_REVIEW'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-neutral-400 hover:text-amber-400'
                }`}
              >
                Review ({securityAccounts.filter((a) => a.securityStatus === 'SECURITY_REVIEW').length})
              </button>
            </div>
          </div>

          {/* Locked / Security Accounts Table */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl overflow-hidden glass shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-950/40 text-neutral-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Student</th>
                    <th className="py-3.5 px-4">Enrollment ID</th>
                    <th className="py-3.5 px-4">Security Status</th>
                    <th className="py-3.5 px-4">Strikes</th>
                    <th className="py-3.5 px-4">Incident Details</th>
                    <th className="py-3.5 px-4 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {filteredSecurityAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-500">
                        No security-locked student accounts found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredSecurityAccounts.map((account) => (
                      <tr key={account.id} className="hover:bg-neutral-800/30 transition">
                        {/* Student */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-white">{account.name || account.username}</span>
                            <span className="text-neutral-500 text-[11px]">@{account.username} • {account.email}</span>
                          </div>
                        </td>

                        {/* Enrollment ID */}
                        <td className="py-3.5 px-4 font-mono font-bold text-brand-cyan">
                          {account.enrollmentId || 'N/A'}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4">
                          {account.securityStatus === 'SECURITY_LOCKED' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/10 border border-red-500/30 text-red-400">
                              <Lock className="w-3 h-3" />
                              Security Locked
                            </span>
                          ) : account.securityStatus === 'SECURITY_REVIEW' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                              <AlertTriangle className="w-3 h-3" />
                              Under Review
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" />
                              Active
                            </span>
                          )}
                        </td>

                        {/* Strike Badge */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-lg font-mono font-bold text-[11px] ${
                              account.strikeCount >= 3
                                ? 'bg-red-950/80 border border-red-800 text-red-400'
                                : account.strikeCount === 2
                                ? 'bg-amber-950/80 border border-amber-800 text-amber-400'
                                : account.strikeCount === 1
                                ? 'bg-yellow-950/80 border border-yellow-800 text-yellow-400'
                                : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {account.strikeCount}/3
                          </span>
                        </td>

                        {/* Incident details */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col max-w-xs">
                            <span className="text-neutral-300 truncate font-medium">
                              {account.lockReason || 'Face biometric verification failed'}
                            </span>
                            {account.lockedAt && (
                              <span className="text-[10px] text-neutral-500">
                                Locked: {new Date(account.lockedAt).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* View Audit Trail */}
                            <button
                              type="button"
                              onClick={() => handleOpenAuditTrail(account)}
                              className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition flex items-center gap-1 font-semibold"
                            >
                              <History className="w-3.5 h-3.5" />
                              Audit Trail
                            </button>

                            {/* Unlock Button */}
                            {account.securityStatus === 'SECURITY_LOCKED' && (
                              <button
                                type="button"
                                onClick={() => setUnlockTarget(account)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                              >
                                <Unlock className="w-3.5 h-3.5" />
                                Unlock Account
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: ALL USERS */}
      {activeTab === 'users' && (
        <div className="w-full bg-neutral-900/90 border border-neutral-800 rounded-3xl overflow-hidden glass shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-950/40 text-neutral-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Enrollment ID</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Security Status</th>
                <th className="py-3.5 px-4">Platform Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-neutral-800/30 transition">
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-white">{u.name || u.username}</span>
                      <span className="text-neutral-500 text-[11px]">@{u.username}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-neutral-300">
                    {u.enrollmentId || 'N/A'}
                  </td>
                  <td className="py-3 px-4 font-bold text-[11px]">{u.role}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.securityStatus === 'SECURITY_LOCKED'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {u.securityStatus || 'ACTIVE'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.status === 'BANNED' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleToggleBanUser(u.id, u.status)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        u.status === 'BANNED'
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-red-600 hover:bg-red-500 text-white'
                      }`}
                    >
                      {u.status === 'BANNED' ? 'Unban' : 'Ban'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB CONTENT: ABUSE REPORTS */}
      {activeTab === 'reports' && (
        <div className="flex flex-col gap-4">
          {reports.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 text-xs">No active content reports.</div>
          ) : (
            reports.map((report) => (
              <div key={report.id} className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col gap-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-white">Report #{report.id.substring(0, 8)}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${report.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-neutral-800 text-neutral-400'}`}>
                    {report.status}
                  </span>
                </div>
                <p className="text-xs text-neutral-300">Reason: {report.reason}</p>
                {report.status === 'PENDING' && (
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => handleResolveReport(report.id, 'DISMISS')}
                      className="px-3 py-1.5 rounded-xl bg-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold"
                    >
                      Dismiss
                    </button>
                    {report.targetPostId && (
                      <button
                        onClick={() => handleResolveReport(report.id, 'DELETE_POST')}
                        className="px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-semibold"
                      >
                        Delete Post
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADMIN-ONLY UNLOCK ACCOUNT CONFIRMATION DIALOG     */}
      {/* ======================================================== */}
      {unlockTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl text-white">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Unlock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold font-outfit text-base">Administrative Account Unlock</h3>
                  <p className="text-xs text-neutral-400">College Security Authorization</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUnlockTarget(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Student Details */}
            <div className="bg-neutral-800/50 border border-neutral-700/60 rounded-xl p-3.5 mb-4 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-neutral-400">Student Name:</span>
                <span className="font-bold text-white">{unlockTarget.name || unlockTarget.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Enrollment ID:</span>
                <span className="font-mono font-bold text-brand-cyan">{unlockTarget.enrollmentId || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Current Strikes:</span>
                <span className="font-bold text-red-400">{unlockTarget.strikeCount}/3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Lock Reason:</span>
                <span className="text-neutral-300">{unlockTarget.lockReason || 'Face verification failure'}</span>
              </div>
            </div>

            <form onSubmit={handleUnlockSubmit} className="space-y-4">
              {/* Mandatory Reason Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-neutral-300">
                  Mandatory Identity Review Reason <span className="text-red-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  minLength={5}
                  placeholder="Explain the student identity review procedure (e.g. Student physical ID verified at college security desk)."
                  value={unlockReason}
                  onChange={(e) => setUnlockReason(e.target.value)}
                  className="w-full bg-neutral-800/80 border border-neutral-700 focus:border-emerald-500 rounded-xl p-3 text-xs text-white outline-none resize-none transition"
                />
                <span className="text-[10px] text-neutral-500">
                  This audit record is permanently stored with your administrator account ID and timestamp.
                </span>
              </div>

              {/* Verification Checklist */}
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-neutral-300 select-none">
                <input
                  type="checkbox"
                  required
                  checked={idVerifiedCheck}
                  onChange={(e) => setIdVerifiedCheck(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-neutral-700 text-emerald-500 bg-neutral-800"
                />
                <span>
                  I confirm that this student&apos;s identity has been verified through authoritative college records or in-person review.
                </span>
              </label>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setUnlockTarget(null)}
                  className="flex-1 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUnlocking || !unlockReason.trim() || !idVerifiedCheck}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 cursor-pointer"
                >
                  {isUnlocking ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Unlocking...
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      Confirm & Unlock
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: SECURITY AUDIT TRAIL TIMELINE                     */}
      {/* ======================================================== */}
      {selectedAuditAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl text-white max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-neutral-800 flex items-center justify-center text-brand-cyan">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold font-outfit text-base">
                    Security Audit Trail: {selectedAuditAccount.name || selectedAuditAccount.username}
                  </h3>
                  <p className="text-xs text-neutral-400">
                    ID: {selectedAuditAccount.enrollmentId || 'N/A'} • User ID: {selectedAuditAccount.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAuditAccount(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Audit Logs List */}
            <div className="flex-1 overflow-y-auto my-4 pr-2 space-y-3 custom-scrollbar">
              {isLoadingAudit ? (
                <div className="py-12 flex justify-center items-center">
                  <Loader2 className="w-6 h-6 text-brand-orange animate-spin" />
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 text-xs">
                  No security events recorded for this account.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 bg-neutral-800/40 border border-neutral-800 rounded-xl text-xs flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded ${
                          log.eventType === 'STRIKE_3_LOCK'
                            ? 'bg-red-500/20 text-red-400'
                            : log.eventType === 'ADMIN_UNLOCK'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : log.eventType === 'CAMERA_ERROR_BENIGN'
                            ? 'bg-neutral-700/60 text-neutral-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {log.eventType} (Strike: {log.strikeNumber})
                      </span>
                      <span className="text-[10px] text-neutral-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-neutral-200 font-medium">{log.reason}</p>

                    <div className="flex items-center gap-3 text-[10px] text-neutral-500 pt-1 border-t border-neutral-800/50">
                      {log.admin && <span>Admin: @{log.admin.username}</span>}
                      {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-neutral-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedAuditAccount(null)}
                className="py-2 px-5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition"
              >
                Close Audit Trail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
