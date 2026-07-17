import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  ChevronLeft, CheckCircle, XCircle, ShieldAlert, Clock, 
  Activity, AlertTriangle 
} from 'lucide-react';
import api from '../../lib/api';
import type { Donor, Deferral } from '../../types';

interface DonorDetailResponse extends Donor {
  deferrals: Deferral[];
  donationSessions: {
    id: string;
    donationDateUtc: string;
    sessionStatus: string;
    rejectionReason?: string;
    unitId?: string;
  }[];
}

const deferralSchema = z.object({
  type: z.enum(['Temporary', 'Permanent']),
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason must not exceed 500 characters'),
  durationDays: z.any().optional(),
});

type DeferralFields = z.infer<typeof deferralSchema>;

const bloodGroupLabels: Record<string, string> = {
  APositive: 'A+',
  ANegative: 'A-',
  BPositive: 'B+',
  BNegative: 'B-',
  OPositive: 'O+',
  ONegative: 'O-',
  ABPositive: 'AB+',
  ABNegative: 'AB-',
};

export default function DonorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [deferralError, setDeferralError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const cachedUser = localStorage.getItem('user');
  const user = cachedUser ? JSON.parse(cachedUser) : null;
  const userRoles: string[] = user?.roles || [];
  const isMedicalDirector = userRoles.includes('MedicalDirector') || userRoles.includes('SuperAdmin');

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<DeferralFields>({
    resolver: zodResolver(deferralSchema),
    defaultValues: {
      type: 'Temporary',
      durationDays: 30
    }
  });

  const selectedType = watch('type');

  // 1. Query Donor Details
  const { data: donor, isLoading, error } = useQuery<DonorDetailResponse>({
    queryKey: ['donor', id],
    queryFn: async () => {
      const res = await api.get<DonorDetailResponse>(`/donors/${id}`);
      return res.data;
    }
  });

  // 2. Defer Donor Mutation
  const deferMutation = useMutation({
    mutationFn: async (data: DeferralFields) => {
      const payload = {
        type: data.type === 'Temporary' ? 0 : 1, // Map string type to backend DeferralType enum (0 = Temporary, 1 = Permanent)
        reason: data.reason,
        durationDays: data.type === 'Temporary' ? data.durationDays : null
      };
      await api.post(`/donors/${id}/defer`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donor', id] });
      setSuccessMsg('Donor has been successfully deferred.');
      reset({ type: 'Temporary', reason: '', durationDays: 30 });
      setTimeout(() => setSuccessMsg(null), 5000);
    },
    onError: (err: any) => {
      setDeferralError(err.response?.data?.detail || err.response?.data?.title || 'Failed to submit deferral.');
    }
  });

  // 3. Recompute Eligibility Mutation
  const recomputeMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/donors/${id}/eligibility/recompute`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donor', id] });
      setSuccessMsg('Eligibility status has been recomputed.');
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <span className="text-slate-500 font-semibold text-xs animate-pulse">Querying medical history log...</span>
      </div>
    );
  }

  if (error || !donor) {
    return (
      <div className="bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 p-4 rounded-r-xl">
        <h3 className="text-sm font-bold text-red-800 dark:text-red-300">File retrieval failed</h3>
        <p className="text-xs text-red-700 mt-1">Check database references or donor identifier.</p>
      </div>
    );
  }

  const handleDeferSubmit = (data: DeferralFields) => {
    setDeferralError(null);
    if (data.type === 'Permanent' && !isMedicalDirector) {
      setDeferralError('Only Medical Directors or SuperAdmins can issue a permanent deferral.');
      return;
    }
    deferMutation.mutate(data);
  };

  const calculateAge = (dobString: string) => {
    const birth = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  return (
    <div className="space-y-6">
      {/* Header and Back Link */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link
            to="/donors"
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{donor.fullName}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">National ID: <span className="font-mono font-bold">{donor.nationalId}</span></p>
          </div>
        </div>

        <span className="bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-150 dark:border-red-900 font-extrabold text-sm px-3.5 py-1.5 rounded-xl shadow-xs">
          Blood Type: {bloodGroupLabels[donor.bloodGroup] || donor.bloodGroup}
        </span>
      </div>

      {/* Profile Overview and Action Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Demographics & Eligibility */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Success Status Alert */}
          {successMsg && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border-l-4 border-emerald-500 p-4 rounded-r-xl">
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-350">{successMsg}</p>
            </div>
          )}

          {/* Demographics Profile Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              Demographics Registry
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="font-bold text-slate-400 uppercase tracking-wide">Age / DOB</span>
                <p className="text-slate-800 dark:text-slate-200 font-semibold">
                  {calculateAge(donor.dateOfBirth)} yrs ({new Date(donor.dateOfBirth).toLocaleDateString()})
                </p>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-slate-400 uppercase tracking-wide">Gender</span>
                <p className="text-slate-800 dark:text-slate-200 font-semibold">{donor.gender || 'Not specified'}</p>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-slate-400 uppercase tracking-wide">Contact Number</span>
                <p className="text-slate-800 dark:text-slate-200 font-semibold">{donor.contactNumber}</p>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-slate-400 uppercase tracking-wide">Email Address</span>
                <p className="text-slate-800 dark:text-slate-200 font-semibold">{donor.email || 'No email registered'}</p>
              </div>
              <div className="sm:col-span-2 space-y-1">
                <span className="font-bold text-slate-400 uppercase tracking-wide">Resident Address</span>
                <p className="text-slate-800 dark:text-slate-200 font-semibold">{donor.address || 'No address registered'}</p>
              </div>
            </div>
          </div>

          {/* Eligibility Banner & Controls */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Vetting & Eligibility Engine
              </h3>
              
              <button
                onClick={() => recomputeMutation.mutate()}
                disabled={recomputeMutation.isPending}
                className="inline-flex items-center space-x-1 text-[10px] font-extrabold uppercase text-slate-500 hover:text-slate-950 dark:hover:text-slate-100 px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                <Activity className="h-3.5 w-3.5" />
                <span>{recomputeMutation.isPending ? 'Processing...' : 'Run Diagnostics'}</span>
              </button>
            </div>

            {donor.isEligible ? (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-950 rounded-2xl p-5 flex items-start space-x-4">
                <CheckCircle className="h-10 w-10 text-emerald-500 flex-shrink-0" />
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-emerald-800 dark:text-emerald-300">Intake Authorized</h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
                    This donor has cleared all safety vetting screenings. They are eligible for whole blood or apheresis collections.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-950 rounded-2xl p-5 flex items-start space-x-4">
                <XCircle className="h-10 w-10 text-red-500 flex-shrink-0" />
                <div className="space-y-1 flex-1">
                  <h4 className="text-sm font-extrabold text-red-800 dark:text-red-300">Donation Suspended</h4>
                  <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">
                    Safety protocols active: This donor profile has been flagged as deferred and cannot register for collection sessions.
                  </p>
                  {donor.nextEligibleDateUtc ? (
                    <p className="text-xs font-bold text-red-800 dark:text-red-350 pt-2 flex items-center">
                      <Clock className="h-4 w-4 mr-1.5 text-red-600" />
                      Suspension Period Ends: {new Date(donor.nextEligibleDateUtc).toLocaleDateString()}
                    </p>
                  ) : (
                    <p className="text-xs font-bold text-red-800 dark:text-red-350 pt-2 flex items-center">
                      <ShieldAlert className="h-4 w-4 mr-1.5 text-red-600" />
                      Permanent Medical Exclusion
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Active/Past Deferral Log List */}
            {donor.deferrals.length > 0 && (
              <div className="space-y-3">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Historical Deferral Log
                </span>
                <div className="space-y-2 max-h-[160px] overflow-y-auto">
                  {donor.deferrals.map(df => (
                    <div key={df.id} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs flex justify-between items-center">
                      <div>
                        <span className={`font-bold uppercase text-[9px] px-2 py-0.5 rounded-full border ${
                          df.type === 'Permanent' 
                            ? 'bg-red-50 dark:bg-red-950/20 text-red-700 border-red-100 dark:border-red-950' 
                            : 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 border-amber-100 dark:border-amber-950'
                        }`}>
                          {df.type}
                        </span>
                        <p className="text-slate-700 dark:text-slate-300 font-semibold mt-1.5 leading-relaxed">Reason: {df.reason}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold whitespace-nowrap ml-4">
                        {new Date(df.startDateUtc).toLocaleDateString()}
                        {df.endDateUtc && ` - ${new Date(df.endDateUtc).toLocaleDateString()}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Add Deferral Form & Timeline */}
        <div className="space-y-6">
          
          {/* Deferral Intake Action Panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              Apply Safety Deferral
            </h3>

            {deferralError && (
              <div className="bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 p-3 rounded-r-xl mb-4">
                <p className="text-[11px] font-semibold text-red-800 dark:text-red-300">{deferralError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit(handleDeferSubmit)} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wide text-slate-400 mb-2">Deferral Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`flex items-center justify-center p-2.5 rounded-xl border text-center font-bold cursor-pointer transition-colors ${
                    selectedType === 'Temporary'
                      ? 'bg-slate-100 dark:bg-slate-800 border-slate-400 text-slate-900 dark:text-white'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-500'
                  }`}>
                    <input type="radio" value="Temporary" {...register('type')} className="sr-only" />
                    <span>Temporary</span>
                  </label>
                  
                  <label className={`flex items-center justify-center p-2.5 rounded-xl border text-center font-bold cursor-pointer transition-colors ${
                    selectedType === 'Permanent'
                      ? 'bg-red-50 dark:bg-red-950/30 border-red-400 text-red-700 dark:text-red-400'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-500'
                  }`}>
                    <input type="radio" value="Permanent" {...register('type')} className="sr-only" />
                    <span>Permanent</span>
                  </label>
                </div>
              </div>

              {selectedType === 'Temporary' && (
                <div>
                  <label className="block font-bold uppercase tracking-wide text-slate-400 mb-1.5">
                    Suspension Duration (Days)
                  </label>
                  <input
                    type="number"
                    {...register('durationDays')}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 text-slate-900 dark:text-white"
                  />
                  {errors.durationDays?.message && <span className="block text-[10px] text-red-500 mt-1">{String(errors.durationDays.message)}</span>}
                </div>
              )}

              {selectedType === 'Permanent' && !isMedicalDirector && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-3 rounded-xl flex items-start space-x-2 text-[10px] text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-600" />
                  <p>Permanent exclusions carry clinical weight and require authorization from a **Medical Director** or **SuperAdmin**.</p>
                </div>
              )}

              <div>
                <label className="block font-bold uppercase tracking-wide text-slate-400 mb-1.5">Vetting Reason</label>
                <textarea
                  placeholder="E.g. low hemoglobin, reactive infectious screening, travel to high-risk malaria zone..."
                  rows={3}
                  {...register('reason')}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 text-slate-900 dark:text-white resize-none"
                />
                {errors.reason && <span className="block text-[10px] text-red-500 mt-1">{errors.reason.message}</span>}
              </div>

              <button
                type="submit"
                disabled={deferMutation.isPending || (selectedType === 'Permanent' && !isMedicalDirector)}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold rounded-xl transition-all shadow-sm cursor-pointer"
              >
                {deferMutation.isPending ? 'Logging Deferral...' : 'Enforce Suspension'}
              </button>
            </form>
          </div>

          {/* Notes summary if any */}
          {donor.notes && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Clinical Notes
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">"{donor.notes}"</p>
            </div>
          )}
        </div>
      </div>

      {/* Full Donation History Timeline */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-3 mb-6">
          Donation History Timeline
        </h3>

        {donor.donationSessions.length === 0 ? (
          <div className="text-center py-8 text-slate-400 dark:text-slate-600 text-xs font-semibold">
            No collection sessions registered for this donor profile.
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-150 dark:border-slate-800 pl-6 ml-4 space-y-6">
            {donor.donationSessions.map(session => {
              const isCompleted = session.sessionStatus === 'Completed';
              return (
                <div key={session.id} className="relative">
                  {/* Timeline dot */}
                  <span className={`absolute -left-[31px] top-1.5 h-4.5 w-4.5 rounded-full border-2 bg-white dark:bg-slate-950 flex items-center justify-center ${
                    isCompleted 
                      ? 'border-emerald-500' 
                      : session.sessionStatus === 'Failed' || session.sessionStatus === 'Postponed' 
                      ? 'border-red-500' : 'border-amber-500'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      isCompleted ? 'bg-emerald-500' : session.sessionStatus === 'Failed' || session.sessionStatus === 'Postponed' ? 'bg-red-500' : 'bg-amber-500'
                    }`} />
                  </span>

                  {/* Timeline content */}
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 dark:text-white">
                        Collection Session {isCompleted ? 'Succeeded' : `(${session.sessionStatus})`}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {new Date(session.donationDateUtc).toLocaleDateString()}
                      </span>
                    </div>
                    {session.unitId && (
                      <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Blood Unit ID: <span className="font-mono font-bold text-slate-900 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">{session.unitId}</span>
                      </p>
                    )}
                    {session.rejectionReason && (
                      <p className="text-red-700 dark:text-red-400 mt-1 font-semibold">
                        Rejection reason: {session.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
