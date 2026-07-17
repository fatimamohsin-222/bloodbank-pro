import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import type { UserProfile } from '../../types';

export default function UserProfilePage() {
  const { data: user, isLoading, error } = useQuery<UserProfile>({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await api.get<UserProfile>('/auth/me');
      return res.data;
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <span className="text-slate-500 font-semibold text-xs">Retrieving security profile...</span>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 p-4 rounded-r-xl">
        <h3 className="text-sm font-bold text-red-800 dark:text-red-300">Failed to load profile</h3>
        <p className="text-xs text-red-700 dark:text-red-400 mt-1">Please try logging in again.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Staff Security Profile</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Verify active credentials, roles, and facility scope.</p>
      </div>

      {/* Main card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center space-x-4 border-b border-slate-150 dark:border-slate-800 pb-5 mb-5">
          <div className="h-14 w-14 rounded-2xl bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 flex items-center justify-center font-bold text-xl">
            {user.fullName.charAt(0)}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{user.fullName}</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{user.email}</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs border-b border-slate-50 dark:border-slate-800 pb-3">
            <span className="font-bold text-slate-400 uppercase tracking-wider">User Account ID</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-300">{user.id}</span>
          </div>

          <div className="flex justify-between items-center text-xs border-b border-slate-50 dark:border-slate-800 pb-3">
            <span className="font-bold text-slate-400 uppercase tracking-wider">Access Roles</span>
            <div className="flex flex-wrap gap-1.5 justify-end">
              {user.roles.map(role => (
                <span 
                  key={role}
                  className="bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-900 font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-400 uppercase tracking-wider">Facility Isolation</span>
            <span className="font-semibold text-slate-800 dark:text-slate-300">
              {user.facilityId ? `Scoped (ID: ${user.facilityId})` : 'Global Cross-Facility (System Administrator)'}
            </span>
          </div>
        </div>
      </div>

      {/* Compliance Note */}
      <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-xs text-slate-500 dark:text-slate-400 space-y-2">
        <h4 className="font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider">Regulatory Compliance & Traceability</h4>
        <p className="leading-relaxed">
          This system logs all clinical operations end-to-end to ensure patient and donor safety. Actions performed under this account are digitally signed, attributed to your user credentials, and logged to an append-only audit trail compliant with international healthcare regulations.
        </p>
      </div>
    </div>
  );
}
