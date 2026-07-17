import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Shield, UserPlus, Search, UserCheck, UserX, Info } from 'lucide-react';
import api from '../../lib/api';
import type { User, Facility } from '../../types';

const registerSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  fullName: z.string().min(1, 'Full name is required').max(100, 'Name must not exceed 100 characters'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one digit')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
  role: z.string().min(1, 'Role is required'),
  facilityId: z.string().optional(),
});

type RegisterFields = z.infer<typeof registerSchema>;

const rolesList = [
  'SuperAdmin', 'FacilityAdmin', 'MedicalDirector', 'LabTechnologist',
  'InventoryManager', 'DonorCoordinator', 'RequestingPhysician', 'Nurse', 'Auditor'
];

export default function UserManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<RegisterFields>({
    resolver: zodResolver(registerSchema)
  });

  // 1. Fetch Users
  const { data: users = [], isLoading: isUsersLoading } = useQuery<User[]>({
    queryKey: ['users', searchQuery],
    queryFn: async () => {
      const res = await api.get<User[]>(`/users?search=${encodeURIComponent(searchQuery)}`);
      return res.data;
    }
  });

  // 2. Fetch Facilities for registration select
  const { data: facilities = [] } = useQuery<Facility[]>({
    queryKey: ['facilities'],
    queryFn: async () => {
      const res = await api.get<Facility[]>('/facilities');
      return res.data;
    }
  });

  // 3. Register Mutation
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFields) => {
      await api.post('/auth/register', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSuccessMessage('Staff account created successfully.');
      reset();
      setShowAddForm(false);
      setTimeout(() => setSuccessMessage(null), 5000);
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.detail || err.response?.data?.title || 'Failed to create account.');
    }
  });

  // 4. Toggle Status Mutation (Activate/Deactivate)
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string, isActive: boolean }) => {
      const endpoint = isActive ? `/users/${userId}/deactivate` : `/users/${userId}/activate`;
      await api.post(endpoint);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const onSubmit = (data: RegisterFields) => {
    setFormError(null);
    const payload = {
      ...data,
      facilityId: data.facilityId === '' ? undefined : data.facilityId
    };
    registerMutation.mutate(payload);
  };

  const handleToggleActive = (userId: string, currentActive: boolean) => {
    if (confirm(`Are you sure you want to ${currentActive ? 'deactivate' : 'activate'} this user account?`)) {
      toggleStatusMutation.mutate({ userId, isActive: currentActive });
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Staff Account Management</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage personnel, facility scoping, and clinical security access.</p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setFormError(null);
          }}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md shadow-red-600/10 hover:shadow-red-700/20 transition-all cursor-pointer self-start"
        >
          <UserPlus className="h-4 w-4" />
          <span>Provision Account</span>
        </button>
      </div>

      {/* Success Alert */}
      {successMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border-l-4 border-emerald-500 p-4 rounded-r-xl">
          <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">{successMessage}</p>
        </div>
      )}

      {/* Add Staff Form Section */}
      {showAddForm && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-5">
            <Shield className="h-5 w-5 text-red-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Account Provisioning Form</h3>
          </div>

          {formError && (
            <div className="bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 p-4 rounded-r-xl mb-5">
              <p className="text-xs font-semibold text-red-800 dark:text-red-300">{formError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Full Name
              </label>
              <input
                type="text"
                placeholder="Dr. John Doe"
                {...register('fullName')}
                className={`w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all ${
                  errors.fullName ? 'border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-red-600'
                }`}
              />
              {errors.fullName && <span className="block text-[11px] text-red-500 mt-1">{errors.fullName.message}</span>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Email Address
              </label>
              <input
                type="email"
                placeholder="john.doe@hospital.com"
                {...register('email')}
                className={`w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all ${
                  errors.email ? 'border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-red-600'
                }`}
              />
              {errors.email && <span className="block text-[11px] text-red-500 mt-1">{errors.email.message}</span>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                {...register('password')}
                className={`w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all ${
                  errors.password ? 'border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-red-600'
                }`}
              />
              {errors.password && <span className="block text-[11px] text-red-500 mt-1">{errors.password.message}</span>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Authorization Role
              </label>
              <select
                {...register('role')}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20"
              >
                <option value="">Select Role</option>
                {rolesList.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              {errors.role && <span className="block text-[11px] text-red-500 mt-1">{errors.role.message}</span>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Residing Facility Scope
              </label>
              <select
                {...register('facilityId')}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20"
              >
                <option value="">Global / Cross-Facility (SuperAdmin / IT)</option>
                {facilities.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 flex justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={registerMutation.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer"
              >
                {registerMutation.isPending ? 'Provisioning...' : 'Confirm Provision'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search & Listing */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search staff by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* User Table */}
        <div className="overflow-x-auto">
          {isUsersLoading ? (
            <div className="text-center py-12">
              <span className="text-slate-500 dark:text-slate-400 font-semibold text-xs">Querying personnel registry...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Info className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto" />
              <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">No personnel matches found</p>
              <p className="text-slate-400 text-xs">Adjust search filters or add a new account.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4">Name & Email</th>
                  <th className="px-6 py-4">Security Roles</th>
                  <th className="px-6 py-4">Facility Scope</th>
                  <th className="px-6 py-4">Account Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {users.map(staff => {
                  const isActive = staff.isActive;
                  return (
                    <tr key={staff.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 dark:text-white">{staff.fullName}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{staff.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {staff.roles.map(r => (
                            <span 
                              key={r}
                              className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-200/40 dark:border-slate-700"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">
                        {staff.facilityId ? (
                          <span>{facilities.find(f => f.id === staff.facilityId)?.name || 'Scoped Facility'}</span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 italic">Cross-Facility / Global</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          isActive 
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900' 
                            : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-100 dark:border-red-900'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          <span>{isActive ? 'Active' : 'Locked'}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleToggleActive(staff.id, isActive)}
                          disabled={toggleStatusMutation.isPending}
                          className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-extrabold uppercase tracking-wider transition-colors cursor-pointer ${
                            isActive 
                              ? 'bg-white dark:bg-slate-900 border-red-200 dark:border-red-950 hover:bg-red-50 dark:hover:bg-red-950/25 text-red-600' 
                              : 'bg-white dark:bg-slate-900 border-emerald-250 dark:border-emerald-950 hover:bg-emerald-50 dark:hover:bg-emerald-950/25 text-emerald-650'
                          }`}
                        >
                          {isActive ? (
                            <>
                              <UserX className="h-3.5 w-3.5" />
                              <span>Deactivate</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-3.5 w-3.5" />
                              <span>Activate</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
