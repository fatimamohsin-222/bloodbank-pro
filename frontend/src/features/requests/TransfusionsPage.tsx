import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  HeartPulse, UserCheck, ShieldAlert, CheckCircle 
} from 'lucide-react';
import api from '../../lib/api';

interface TransfusionDetail {
  id: string;
  bloodComponentId: string;
  unitId: string;
  componentType: string;
  bloodGroup: string;
  patientName: string;
  patientNationalId: string;
  nurse1: string;
  nurse2: string;
  transfusionStartedAtUtc: string;
  transfusionCompletedAtUtc?: string;
  preTransfusionVitals: string;
  postTransfusionVitals?: string;
  hasAdverseReaction: boolean;
  adverseReactionSeverity?: string;
  adverseReactionSymptoms?: string;
}

interface ComponentInventory {
  id: string;
  unitId: string;
  componentType: string;
  bloodGroup: string;
  status: string;
}

const startTransfusionSchema = z.object({
  bloodComponentId: z.string().min(1, 'Blood component is required'),
  patientName: z.string().min(1, 'Patient name is required'),
  patientNationalId: z.string().min(1, 'Patient National ID is required'),
  nurseName2: z.string().min(1, 'Co-signing Nurse is required'),
  temp: z.coerce.number().min(30).max(45),
  bp: z.string().min(1, 'Blood pressure is required'),
  pulse: z.coerce.number().min(30).max(200),
});

type StartFields = z.infer<typeof startTransfusionSchema>;

const completeTransfusionSchema = z.object({
  temp: z.coerce.number().min(30).max(45),
  bp: z.string().min(1, 'Blood pressure is required'),
  pulse: z.coerce.number().min(30).max(200),
});

type CompleteFields = z.infer<typeof completeTransfusionSchema>;

const reactionSchema = z.object({
  severity: z.string().min(1, 'Severity is required'),
  symptomsDescription: z.string().min(5, 'Symptoms description must be at least 5 characters'),
});

type ReactionFields = z.infer<typeof reactionSchema>;

const bloodGroupLabels: Record<string, string> = {
  APositive: 'A+', ANegative: 'A-', BPositive: 'B+', BNegative: 'B-',
  OPositive: 'O+', ONegative: 'O-', ABPositive: 'AB+', ABNegative: 'AB-'
};

const componentTypeLabels: Record<string, string> = {
  WholeBlood: 'Whole Blood',
  RedBloodCells: 'Red Blood Cells',
  FreshFrozenPlasma: 'Fresh Frozen Plasma',
  Platelets: 'Platelets',
  Cryoprecipitate: 'Cryoprecipitate'
};

export default function TransfusionsPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [reactionId, setReactionId] = useState<string | null>(null);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedFacilityId = localStorage.getItem('selectedFacilityId') || '';
  const queryClient = useQueryClient();

  const { register: registerStart, handleSubmit: handleStartSubmit, reset: resetStart, formState: { errors: startErrors } } = useForm<any>({
    resolver: zodResolver(startTransfusionSchema),
    defaultValues: {
      temp: 36.8,
      bp: '120/80',
      pulse: 72
    }
  });

  const { register: registerComplete, handleSubmit: handleCompleteSubmit, reset: resetComplete } = useForm<any>({
    resolver: zodResolver(completeTransfusionSchema),
    defaultValues: {
      temp: 37.0,
      bp: '122/82',
      pulse: 75
    }
  });

  const { register: registerReaction, handleSubmit: handleReactionSubmit, reset: resetReaction, formState: { errors: reactionErrors } } = useForm<any>({
    resolver: zodResolver(reactionSchema),
    defaultValues: {
      severity: 'Mild'
    }
  });

  // 1. Fetch Transfusions List
  const { data: transfusions = [], isLoading } = useQuery<TransfusionDetail[]>({
    queryKey: ['transfusions', selectedFacilityId],
    queryFn: async () => {
      const res = await api.get<TransfusionDetail[]>(`/transfusions?facilityId=${selectedFacilityId}`);
      return res.data;
    }
  });

  // 2. Fetch Reserved components locally to pop selector
  const { data: reservedComponents = [] } = useQuery<ComponentInventory[]>({
    queryKey: ['reservedComponents', selectedFacilityId],
    queryFn: async () => {
      const res = await api.get<ComponentInventory[]>(`/inventory/components?facilityId=${selectedFacilityId}&status=Reserved`);
      return res.data;
    }
  });

  // 3. Start Transfusion Mutation
  const startMutation = useMutation({
    mutationFn: async (data: StartFields) => {
      const payload = {
        bloodComponentId: data.bloodComponentId,
        patientName: data.patientName,
        patientNationalId: data.patientNationalId,
        nurseName1: 'LoggedIn Nurse',
        nurseName2: data.nurseName2,
        preTransfusionVitals: JSON.stringify({ temp: data.temp, bp: data.bp, pulse: data.pulse })
      };
      const res = await api.post('/transfusions', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transfusions'] });
      queryClient.invalidateQueries({ queryKey: ['reservedComponents'] });
      setSuccessMsg(data.message || 'Transfusion issued successfully.');
      setShowAddForm(false);
      resetStart();
      setTimeout(() => setSuccessMsg(null), 5000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || err.response?.data?.title || 'Verification failed.');
      setTimeout(() => setErrorMsg(null), 5000);
    }
  });

  // 4. Complete Transfusion Mutation
  const completeMutation = useMutation({
    mutationFn: async (data: CompleteFields) => {
      const payload = {
        postTransfusionVitals: JSON.stringify({ temp: data.temp, bp: data.bp, pulse: data.pulse })
      };
      const res = await api.post(`/transfusions/${completingId}/complete`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transfusions'] });
      setSuccessMsg(data.message || 'Transfusion completed successfully.');
      setCompletingId(null);
      resetComplete();
      setTimeout(() => setSuccessMsg(null), 5000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || err.response?.data?.title || 'Completion failed.');
      setTimeout(() => setErrorMsg(null), 5000);
    }
  });

  // 5. Adverse Reaction Mutation
  const reactionMutation = useMutation({
    mutationFn: async (data: ReactionFields) => {
      const res = await api.post(`/transfusions/${reactionId}/adverse-reaction`, data);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transfusions'] });
      setSuccessMsg(data.message || 'Adverse reaction reported. Medical investigation triggered.');
      setReactionId(null);
      resetReaction();
      setTimeout(() => setSuccessMsg(null), 5000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || err.response?.data?.title || 'Failed to submit report.');
      setTimeout(() => setErrorMsg(null), 5000);
    }
  });

  const onStartSubmit = (data: StartFields) => {
    startMutation.mutate(data);
  };

  const onCompleteSubmit = (data: CompleteFields) => {
    completeMutation.mutate(data);
  };

  const onReactionSubmit = (data: ReactionFields) => {
    reactionMutation.mutate(data);
  };

  const parseVitals = (vitalsJson?: string) => {
    if (!vitalsJson) return 'N/A';
    try {
      const parsed = JSON.parse(vitalsJson);
      return `Temp: ${parsed.temp}°C | BP: ${parsed.bp} | Pulse: ${parsed.pulse}`;
    } catch {
      return vitalsJson;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Transfusion logs</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Enforce dual-nurse bedside authentication verification, log completions, and register adverse reactions.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer self-start"
        >
          <HeartPulse className="h-4 w-4" />
          <span>Start Transfusion</span>
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-220 p-4 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-bold">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 p-4 rounded-xl text-xs text-red-800 dark:text-red-305 font-bold">
          {errorMsg}
        </div>
      )}

      {/* Grid listing */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="text-center py-12">
              <span className="text-slate-500 dark:text-slate-400 font-semibold text-xs animate-pulse">Retrieving logs...</span>
            </div>
          ) : transfusions.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-600 font-medium text-xs">
              No transfusion logs registered for this facility.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
                  <th className="px-5 py-3.5">DIN</th>
                  <th className="px-5 py-3.5">Patient Details</th>
                  <th className="px-5 py-3.5">Nurse Verification</th>
                  <th className="px-5 py-3.5">Pre-Vitals</th>
                  <th className="px-5 py-3.5">Post-Vitals</th>
                  <th className="px-5 py-3.5">Transfusion Timeline</th>
                  <th className="px-5 py-3.5">Status / Safety</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {transfusions.map(t => {
                  const isCompleted = !!t.transfusionCompletedAtUtc;
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-slate-900 dark:text-white">
                        {t.unitId}
                        <span className="block text-[10px] text-slate-400 font-semibold">{bloodGroupLabels[t.bloodGroup]} {componentTypeLabels[t.componentType]}</span>
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                        {t.patientName}
                        <span className="block text-[9px] text-slate-400 font-mono mt-0.5">{t.patientNationalId}</span>
                      </td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-400 font-medium">
                        <span className="block font-bold">1st: {t.nurse1}</span>
                        <span className="block text-[10px] text-slate-400">2nd: {t.nurse2}</span>
                      </td>
                      <td className="px-5 py-4 text-[10px] font-mono leading-relaxed text-slate-500">
                        {parseVitals(t.preTransfusionVitals)}
                      </td>
                      <td className="px-5 py-4 text-[10px] font-mono leading-relaxed text-slate-500">
                        {parseVitals(t.postTransfusionVitals)}
                      </td>
                      <td className="px-5 py-4 text-slate-500 leading-normal">
                        <span className="block text-[11px] font-bold">Start: {new Date(t.transfusionStartedAtUtc).toLocaleTimeString()}</span>
                        {isCompleted && (
                          <span className="block text-[10px] text-slate-400">End: {new Date(t.transfusionCompletedAtUtc!).toLocaleTimeString()}</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {t.hasAdverseReaction ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 dark:bg-red-950/20 text-red-700 border border-red-100">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            <span>{t.adverseReactionSeverity} Reaction</span>
                          </span>
                        ) : isCompleted ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 border border-emerald-100">
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span>Success Complete</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 border border-indigo-100 animate-pulse">
                            <span>Transfusing...</span>
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {!isCompleted ? (
                          <button
                            onClick={() => setCompletingId(t.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-750 text-white font-bold rounded-lg transition-colors cursor-pointer mr-2 text-[11px]"
                          >
                            Complete
                          </button>
                        ) : (
                          !t.hasAdverseReaction && (
                            <button
                              onClick={() => setReactionId(t.id)}
                              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors cursor-pointer text-[11px]"
                            >
                              Report Reaction
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Start Transfusion Bedside Verification Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-5">
              <UserCheck className="h-5 w-5 text-red-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Bedside Verification Portal</h3>
            </div>

            <form onSubmit={handleStartSubmit(onStartSubmit)} className="space-y-4 text-xs">
              
              {/* Select Reserved Component */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Select Patient Crossmatched Unit
                </label>
                <select
                  {...registerStart('bloodComponentId')}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-202 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none"
                >
                  <option value="">Select Reserved Component...</option>
                  {reservedComponents.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.unitId} - {componentTypeLabels[c.componentType]} ({bloodGroupLabels[c.bloodGroup] || c.bloodGroup})
                    </option>
                  ))}
                </select>
                {startErrors.bloodComponentId?.message && <span className="text-[11px] text-red-500">{String(startErrors.bloodComponentId.message)}</span>}
              </div>

              {/* Patient Verification Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Patient Name (Wristband Check)
                  </label>
                  <input
                    type="text"
                    {...registerStart('patientName')}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none"
                    placeholder="Enter Patient Full Name"
                  />
                  {startErrors.patientName?.message && <span className="text-[11px] text-red-500">{String(startErrors.patientName.message)}</span>}
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Patient ID (Wristband Check)
                  </label>
                  <input
                    type="text"
                    {...registerStart('patientNationalId')}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none"
                    placeholder="Enter ID Number"
                  />
                  {startErrors.patientNationalId?.message && <span className="text-[11px] text-red-500">{String(startErrors.patientNationalId.message)}</span>}
                </div>
              </div>

              {/* Dual Nurse Verification */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    1st Staff Nurse
                  </label>
                  <input
                    type="text"
                    disabled
                    value="LoggedIn Nurse (You)"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 rounded-xl focus:outline-none text-slate-500"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    2nd Co-signing Staff Nurse
                  </label>
                  <input
                    type="text"
                    {...registerStart('nurseName2')}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none"
                    placeholder="Enter Co-signing Nurse Name"
                  />
                  {startErrors.nurseName2?.message && <span className="text-[11px] text-red-500">{String(startErrors.nurseName2.message)}</span>}
                </div>
              </div>

              {/* Pre-transfusion vitals */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Pre-Transfusion Baseline Vitals</span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">Temp (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      {...registerStart('temp')}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">BP (mmHg)</label>
                    <input
                      type="text"
                      {...registerStart('bp')}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">Pulse (bpm)</label>
                    <input
                      type="number"
                      {...registerStart('pulse')}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800 font-bold">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-slate-150 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={startMutation.isPending}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  {startMutation.isPending ? 'Verifying...' : 'Verify & Start'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Transfusion Vitals Modal */}
      {completingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl animate-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <span>Complete Transfusion Log</span>
            </h3>

            <form onSubmit={handleCompleteSubmit(onCompleteSubmit)} className="space-y-4 mt-4 text-xs">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Post-Transfusion Outcome Vitals</span>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    {...registerComplete('temp')}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">BP (mmHg)</label>
                  <input
                    type="text"
                    {...registerComplete('bp')}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">Pulse (bpm)</label>
                  <input
                    type="number"
                    {...registerComplete('pulse')}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800 font-bold">
                <button
                  type="button"
                  onClick={() => setCompletingId(null)}
                  className="px-4 py-2 bg-slate-150 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={completeMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-750 text-white rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  {completeMutation.isPending ? 'Completing...' : 'Log Completion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Adverse Reaction Modal */}
      {reactionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl animate-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
              <ShieldAlert className="h-5 w-5 text-red-600" />
              <span>Report Adverse Transfusion Reaction</span>
            </h3>

            <form onSubmit={handleReactionSubmit(onReactionSubmit)} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Severity Level
                </label>
                <select
                  {...registerReaction('severity')}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-202 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none"
                >
                  <option value="Mild">Mild (Hives, Itching)</option>
                  <option value="Moderate">Moderate (Fever, Rigors, Flushing)</option>
                  <option value="Severe">Severe (Anaphylaxis, Dyspnea, Shock)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Reaction Symptoms / Clinical Observations
                </label>
                <textarea
                  {...registerReaction('symptomsDescription')}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-202 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none"
                  placeholder="Describe patient symptoms (e.g., acute bronchospasm, elevated temp to 39°C)..."
                />
                {reactionErrors.symptomsDescription?.message && (
                  <span className="text-[11px] text-red-500 mt-1 block">{String(reactionErrors.symptomsDescription.message)}</span>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800 font-bold">
                <button
                  type="button"
                  onClick={() => setReactionId(null)}
                  className="px-4 py-2 bg-slate-150 hover:bg-slate-200 dark:bg-slate-800 text-slate-707 dark:text-slate-400 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reactionMutation.isPending}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  {reactionMutation.isPending ? 'Reporting...' : 'Report Reaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
