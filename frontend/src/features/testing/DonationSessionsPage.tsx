import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Activity, Plus, CheckCircle, XCircle } from 'lucide-react';
import api from '../../lib/api';
import type { Donor } from '../../types';

interface DonationSessionDetail {
  id: string;
  donorId: string;
  donorName: string;
  facilityId: string;
  facilityName: string;
  systolicBP: number;
  diastolicBP: number;
  pulseRate: number;
  temperatureCelsius: number;
  hemoglobinLevel: number;
  weightKg: number;
  vitalsVerified: boolean;
  sessionStatus: string;
  rejectionReason?: string;
  unitId?: string;
  donationDateUtc: string;
}

const sessionSchema = z.object({
  donorId: z.string().min(1, 'Donor is required'),
  systolicBP: z.number().min(50, 'Min 50').max(250, 'Max 250'),
  diastolicBP: z.number().min(30, 'Min 30').max(150, 'Max 150'),
  pulseRate: z.number().min(30, 'Min 30').max(200, 'Max 200'),
  temperatureCelsius: z.number().min(30, 'Min 30').max(45, 'Max 45'),
  hemoglobinLevel: z.number().min(5, 'Min 5.0').max(25, 'Max 25.0'),
  weightKg: z.number().min(30, 'Min 30').max(250, 'Max 250'),
});

type SessionFields = z.infer<typeof sessionSchema>;

export default function DonationSessionsPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [outcomeMsg, setOutcomeMsg] = useState<{ success: boolean; message: string; unitId?: string } | null>(null);

  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<SessionFields>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      systolicBP: 120,
      diastolicBP: 80,
      pulseRate: 72,
      temperatureCelsius: 36.8,
      hemoglobinLevel: 14.2,
      weightKg: 70
    }
  });

  // Watch inputs to show live clinical indicators
  const watchedSystolic = watch('systolicBP');
  const watchedDiastolic = watch('diastolicBP');
  const watchedPulse = watch('pulseRate');
  const watchedTemp = watch('temperatureCelsius');
  const watchedHgb = watch('hemoglobinLevel');
  const watchedWeight = watch('weightKg');

  // 1. Fetch Sessions
  const { data: sessions = [], isLoading } = useQuery<DonationSessionDetail[]>({
    queryKey: ['donationSessions'],
    queryFn: async () => {
      const res = await api.get<DonationSessionDetail[]>('/collection/sessions');
      return res.data;
    }
  });

  // 2. Fetch Eligible Donors to populate selector
  const { data: eligibleDonors = [] } = useQuery<Donor[]>({
    queryKey: ['eligibleDonors'],
    queryFn: async () => {
      const res = await api.get<Donor[]>('/donors?isEligible=true');
      return res.data;
    }
  });

  // 3. Create Session Mutation
  const createSessionMutation = useMutation({
    mutationFn: async (data: SessionFields) => {
      const activeFacilityId = localStorage.getItem('selectedFacilityId') || '';
      const payload = {
        ...data,
        facilityId: activeFacilityId
      };
      const res = await api.post('/collection/sessions', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['donationSessions'] });
      queryClient.invalidateQueries({ queryKey: ['eligibleDonors'] });
      
      setOutcomeMsg({
        success: data.success,
        message: data.message,
        unitId: data.unitId
      });
      reset();
      setShowAddForm(false);
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.detail || err.response?.data?.title || 'Failed to record session.');
    }
  });

  const onSubmit = (data: SessionFields) => {
    setFormError(null);
    setOutcomeMsg(null);
    createSessionMutation.mutate(data);
  };

  // Live range checkers for form tooltips
  const isBpFail = (systolic: number, diastolic: number) => {
    return systolic < 90 || systolic > 180 || diastolic < 50 || diastolic > 100;
  };
  const isPulseFail = (pulse: number) => pulse < 50 || pulse > 100;
  const isTempFail = (temp: number) => temp > 37.5;
  const isHgbFail = (hgb: number) => hgb < 12.5;
  const isWeightFail = (weight: number) => weight < 50;

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Collection Sessions</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Pre-donation screening, vitals logs, and Unit ID (DIN) generation.
          </p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setFormError(null);
            setOutcomeMsg(null);
          }}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md shadow-red-600/10 hover:shadow-red-700/20 transition-all cursor-pointer self-start"
        >
          <Plus className="h-4 w-4" />
          <span>Record Session</span>
        </button>
      </div>

      {/* Outcome notification alert */}
      {outcomeMsg && (
        <div className={`p-4 rounded-xl border ${
          outcomeMsg.success 
            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-250 text-emerald-800 dark:text-emerald-300' 
            : 'bg-red-50 dark:bg-red-950/20 border-red-200 text-red-800 dark:text-red-300'
        }`}>
          <div className="flex items-start space-x-3 text-xs">
            <span className="text-base">{outcomeMsg.success ? '✓' : '⚠️'}</span>
            <div className="space-y-1">
              <h4 className="font-bold">{outcomeMsg.success ? 'Intake Vitals Accepted' : 'Intake Vitals Rejected'}</h4>
              <p className="leading-relaxed">{outcomeMsg.message}</p>
              {outcomeMsg.unitId && (
                <p className="font-bold pt-1">
                  Registered Blood Unit DIN: <span className="font-mono text-sm underline">{outcomeMsg.unitId}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Record Session Form Modal */}
      {showAddForm && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-5">
            <Activity className="h-5 w-5 text-red-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Vitals Vetting Interface</h3>
          </div>

          {formError && (
            <div className="bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 p-4 rounded-r-xl mb-5">
              <p className="text-xs font-semibold text-red-800 dark:text-red-305">{formError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              
              {/* Donor Select */}
              <div className="md:col-span-2">
                <label className="block font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Select Eligible Donor
                </label>
                <select
                  {...register('donorId')}
                  className={`w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 ${
                    errors.donorId ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <option value="">Select Donor</option>
                  {eligibleDonors.map(d => (
                    <option key={d.id} value={d.id}>{d.fullName} ({d.nationalId})</option>
                  ))}
                </select>
                {errors.donorId && <span className="block text-[11px] text-red-500 mt-1">{errors.donorId.message}</span>}
              </div>

              {/* Systolic BP */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Systolic Blood Pressure (mmHg)
                </label>
                <input
                  type="number"
                  {...register('systolicBP', { valueAsNumber: true })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
                {isBpFail(watchedSystolic, watchedDiastolic) && (
                  <span className="block text-[10px] text-amber-500 mt-1 font-semibold">⚠️ BP outside healthy ranges (90-180 / 50-100)</span>
                )}
              </div>

              {/* Diastolic BP */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Diastolic Blood Pressure (mmHg)
                </label>
                <input
                  type="number"
                  {...register('diastolicBP', { valueAsNumber: true })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              {/* Pulse Rate */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Pulse Rate (bpm)
                </label>
                <input
                  type="number"
                  {...register('pulseRate', { valueAsNumber: true })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
                {isPulseFail(watchedPulse) && (
                  <span className="block text-[10px] text-amber-500 mt-1 font-semibold">⚠️ Pulse outside healthy ranges (50-100 bpm)</span>
                )}
              </div>

              {/* Temperature */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Body Temperature (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  {...register('temperatureCelsius', { valueAsNumber: true })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
                {isTempFail(watchedTemp) && (
                  <span className="block text-[10px] text-amber-500 mt-1 font-semibold">⚠️ Temperature exceeds 37.5°C threshold</span>
                )}
              </div>

              {/* Hemoglobin */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Hemoglobin Level (g/dL)
                </label>
                <input
                  type="number"
                  step="0.1"
                  {...register('hemoglobinLevel', { valueAsNumber: true })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
                {isHgbFail(watchedHgb) && (
                  <span className="block text-[10px] text-amber-500 mt-1 font-semibold">⚠️ Hemoglobin below 12.5 g/dL safety threshold</span>
                )}
              </div>

              {/* Weight */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Donor Weight (kg)
                </label>
                <input
                  type="number"
                  {...register('weightKg', { valueAsNumber: true })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
                {isWeightFail(watchedWeight) && (
                  <span className="block text-[10px] text-amber-500 mt-1 font-semibold">⚠️ Weight below 50 kg safety threshold</span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createSessionMutation.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl shadow-md transition-colors cursor-pointer"
              >
                {createSessionMutation.isPending ? 'Logging Session...' : 'Submit Session'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* History log list */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="text-center py-12">
              <span className="text-slate-500 dark:text-slate-400 font-semibold text-xs">Querying collection logs...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-600 font-medium text-xs">
              No collection sessions recorded in this facility.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4">Session Date</th>
                  <th className="px-6 py-4">Donor Name</th>
                  <th className="px-6 py-4">Facility Scope</th>
                  <th className="px-6 py-4">Vitals Intake Checked</th>
                  <th className="px-6 py-4">Intake Status</th>
                  <th className="px-6 py-4">Registered DIN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sessions.map(s => {
                  const isCollected = s.sessionStatus === 'Collected';
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-950 dark:text-slate-200">
                          {new Date(s.donationDateUtc).toLocaleDateString()}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5">
                          {new Date(s.donationDateUtc).toLocaleTimeString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                        {s.donorName}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-semibold">
                        {s.facilityName}
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 leading-relaxed font-mono text-[10px]">
                        BP: {s.systolicBP}/{s.diastolicBP} | Pulse: {s.pulseRate} | Temp: {s.temperatureCelsius}°C | Hgb: {s.hemoglobinLevel} | Wt: {s.weightKg}kg
                      </td>
                      <td className="px-6 py-4">
                        {isCollected ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                            <span>Vitals Cleared</span>
                          </span>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-900">
                              <XCircle className="h-3.5 w-3.5 text-red-500" />
                              <span>Vitals Failed</span>
                            </span>
                            <span className="block text-[9px] text-red-500 max-w-[180px] truncate" title={s.rejectionReason}>
                              {s.rejectionReason}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-800 dark:text-slate-300">
                        {s.unitId || <span className="text-slate-300 dark:text-slate-600 italic">Excluded (Failed Vitals)</span>}
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
