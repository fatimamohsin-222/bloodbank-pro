import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, Calendar, Clock, RefreshCw, AlertTriangle, ShieldCheck, 
  LogOut 
} from 'lucide-react';
import api from '../../lib/api';
import type { Facility } from '../../types';

interface DonorProfile {
  id: string;
  fullName: string;
  nationalId: string;
  dateOfBirth: string;
  bloodGroup: string;
  gender: string;
  contactNumber: string;
  email: string;
  address: string;
  isEligible: boolean;
  nextEligibleDateUtc?: string;
}

interface DonorSession {
  id: string;
  donationDateUtc: string;
  facilityName: string;
  sessionStatus: string;
  vitalsVerified: boolean;
  hemoglobinLevel?: number;
  temperatureCelsius?: number;
  unitId?: string;
}

const bloodGroupLabels: Record<string, string> = {
  APositive: 'A+', ANegative: 'A-', BPositive: 'B+', BNegative: 'B-',
  OPositive: 'O+', ONegative: 'O-', ABPositive: 'AB+', ABNegative: 'AB-'
};

const sessionStatusLabels: Record<string, string> = {
  Pending: 'Awaiting Vitals Check',
  Collected: 'Collected (Successful)',
  Rejected: 'Deferred (Rejected)',
  Scheduled: 'Scheduled Appointment'
};

export default function DonorDashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { register, handleSubmit, reset } = useForm<any>({
    defaultValues: {
      sessionDate: new Date(Date.now() + 86400000).toISOString().split('T')[0] // tomorrow
    }
  });

  // 1. Fetch Donor Profile
  const { data: profile, isLoading: isProfileLoading, error: profileError } = useQuery<DonorProfile>({
    queryKey: ['donorProfile'],
    queryFn: async () => {
      const res = await api.get<DonorProfile>('/public/donor/profile');
      return res.data;
    }
  });

  // 2. Fetch Donation Sessions History
  const { data: sessions = [], isLoading: isSessionsLoading } = useQuery<DonorSession[]>({
    queryKey: ['donorSessions'],
    queryFn: async () => {
      const res = await api.get<DonorSession[]>('/public/donor/sessions');
      return res.data;
    },
    enabled: !!profile
  });

  // 3. Fetch Facilities for drop-down
  const { data: facilities = [] } = useQuery<Facility[]>({
    queryKey: ['facilities'],
    queryFn: async () => {
      const res = await api.get<Facility[]>('/facilities');
      return res.data;
    }
  });

  // 4. Book Donation Appointment Mutation
  const bookMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/public/donor/sessions', data);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['donorSessions'] });
      setSuccessMsg(data.message || 'Donation slot scheduled successfully.');
      reset();
      setTimeout(() => setSuccessMsg(null), 5000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || err.response?.data?.title || 'Scheduling failed.');
      setTimeout(() => setErrorMsg(null), 5000);
    }
  });

  const onBookSubmit = (data: any) => {
    bookMutation.mutate(data);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (isProfileLoading) {
    return (
      <div className="text-center py-24">
        <span className="text-slate-500 font-semibold text-xs animate-pulse">Loading donor dashboard...</span>
      </div>
    );
  }

  // Handle case where user is logged in as Donor but no Donor profile exists in the system
  if (profileError || !profile) {
    return (
      <div className="max-w-md mx-auto mt-20 bg-white dark:bg-slate-900 border border-slate-200 p-8 rounded-2xl text-center space-y-4 shadow-xl">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
        <h3 className="text-base font-bold">Profile Sync Error</h3>
        <p className="text-xs text-slate-500">
          Your account role is 'Donor', but we could not find a corresponding entry in our clinical Donor registry.
        </p>
        <button onClick={handleLogout} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-xs">
          Log Out
        </button>
      </div>
    );
  }

  // Calculate cooldown details
  const nextDate = profile.nextEligibleDateUtc ? new Date(profile.nextEligibleDateUtc) : null;
  const isCooldown = nextDate && nextDate > new Date();
  const cooldownDays = nextDate ? Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 3600 * 24)) : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-200">
      
      {/* Header Banner */}
      <header className="bg-slate-900 text-white py-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-red-500">
            <Heart className="h-6 w-6 fill-current animate-pulse" />
            <span className="font-black text-lg tracking-tight uppercase text-white">Donor Portal</span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right text-xs">
              <span className="block font-bold text-white">{profile.fullName}</span>
              <span className="block text-[10px] text-red-400 font-extrabold uppercase">Blood Group: {bloodGroupLabels[profile.bloodGroup] || profile.bloodGroup}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Eligibility Status & Booking form */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Eligibility Panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clinical Eligibility</h3>
            
            {isCooldown ? (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 rounded-xl space-y-2 text-xs">
                <div className="flex items-center space-x-2 font-bold text-amber-700 dark:text-amber-300">
                  <Clock className="h-5 w-5" />
                  <span>On Donation Cooldown</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 leading-normal">
                  Our system requires a 90-day cooldown between donation collections. You will be eligible to donate again in **{cooldownDays} days** ({nextDate?.toLocaleDateString()}).
                </p>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 rounded-xl space-y-2 text-xs">
                <div className="flex items-center space-x-2 font-bold text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck className="h-5 w-5" />
                  <span>Eligible to Donate</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 leading-normal font-semibold">
                  You have passed the required 90-day donation cooldown period. You are free to book your appointment!
                </p>
              </div>
            )}
          </div>

          {/* Schedule Donation form */}
          {!isCooldown && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-2xs space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
                <Calendar className="h-4.5 w-4.5 text-red-600" />
                <span>Schedule Donation Appointment</span>
              </h3>

              {successMsg && (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-220 p-3 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-bold">
                  {successMsg}
                </div>
              )}
              {errorMsg && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 p-3 rounded-xl text-xs text-red-800 dark:text-red-305 font-bold">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit(onBookSubmit)} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Select Facility Center
                  </label>
                  <select
                    {...register('facilityId')}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none"
                  >
                    <option value="">Select Center...</option>
                    {facilities.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Appointment Date
                  </label>
                  <input
                    type="date"
                    {...register('sessionDate')}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={bookMutation.isPending}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer text-xs uppercase tracking-wider"
                >
                  {bookMutation.isPending ? 'Scheduling slot...' : 'Book Appointment'}
                </button>
              </form>
            </div>
          )}

        </div>

        {/* Right Side: Donation History table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">My Donation Appointments History</span>
              <button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ['donorSessions'] })}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <RefreshCw className="h-4.5 w-4.5" />
              </button>
            </div>

            {isSessionsLoading ? (
              <div className="text-center py-12">
                <span className="text-slate-500 font-semibold text-xs animate-pulse">Loading donation history...</span>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-slate-600 font-medium text-xs">
                You have not scheduled any donation slots yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/40 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
                      <th className="px-5 py-3.5">Scheduled Date</th>
                      <th className="px-5 py-3.5">Center Location</th>
                      <th className="px-5 py-3.5">DIN (Blood Unit)</th>
                      <th className="px-5 py-3.5">Hemoglobin</th>
                      <th className="px-5 py-3.5">Appointment Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sessions.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                          {new Date(s.donationDateUtc).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">
                          {s.facilityName}
                        </td>
                        <td className="px-5 py-4 font-mono text-slate-500 font-semibold">
                          {s.unitId || 'Awaiting Check-in'}
                        </td>
                        <td className="px-5 py-4 text-slate-550">
                          {s.vitalsVerified ? `${s.hemoglobinLevel} g/dL` : 'Not Checked'}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            s.sessionStatus === 'Collected'
                              ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 border-emerald-100'
                              : s.sessionStatus === 'Rejected'
                              ? 'bg-red-50 dark:bg-red-950/20 text-red-700 border-red-100'
                              : 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 border-amber-100'
                          }`}>
                            {sessionStatusLabels[s.sessionStatus] || s.sessionStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </main>

    </div>
  );
}
