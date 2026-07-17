import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Activity, ShieldAlert, CheckCircle, XCircle, 
  Award, RefreshCw, Info, ShieldCheck 
} from 'lucide-react';
import api from '../../lib/api';
import type { BloodUnit } from '../../types';

interface TestingUnit extends BloodUnit {
  donorName: string;
  firstAboValue?: string;
  secondAboValue?: string;
  aboMismatch: boolean;
}

const aboSchema = z.object({
  bloodGroup: z.string().min(1, 'ABO group is required'),
});

type AboFields = z.infer<typeof aboSchema>;

const ttiSchema = z.object({
  hivReactive: z.boolean(),
  hepBReactive: z.boolean(),
  hepCReactive: z.boolean(),
  syphilisReactive: z.boolean(),
});

type TtiFields = z.infer<typeof ttiSchema>;

const bloodGroups = [
  { value: 'APositive', label: 'A+' },
  { value: 'ANegative', label: 'A-' },
  { value: 'BPositive', label: 'B+' },
  { value: 'BNegative', label: 'B-' },
  { value: 'OPositive', label: 'O+' },
  { value: 'ONegative', label: 'O-' },
  { value: 'ABPositive', label: 'AB+' },
  { value: 'ABNegative', label: 'AB-' }
];

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

const statusLabels: Record<string, string> = {
  Testing: 'In Testing',
  Collected: 'Collected',
  Quarantined: 'Quarantined',
  Available: 'Released',
  Discarded: 'Discarded'
};

export default function TestingDashboardPage() {
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // 1. Fetch Testing Queue
  const { data: units = [], isLoading } = useQuery<TestingUnit[]>({
    queryKey: ['testingUnits'],
    queryFn: async () => {
      const res = await api.get<TestingUnit[]>('/testing/units');
      return res.data;
    }
  });

  const selectedUnit = units.find(u => u.id === selectedUnitId);

  // Forms config
  const { register: registerAbo, handleSubmit: handleAboSubmit, reset: resetAbo } = useForm<AboFields>({
    resolver: zodResolver(aboSchema)
  });

  const { register: registerTti, handleSubmit: handleTtiSubmit, reset: resetTti } = useForm<TtiFields>({
    resolver: zodResolver(ttiSchema),
    defaultValues: {
      hivReactive: false,
      hepBReactive: false,
      hepCReactive: false,
      syphilisReactive: false
    }
  });

  // 2. Submit ABO 1st entry or 2nd verification entry
  const aboMutation = useMutation({
    mutationFn: async (data: AboFields) => {
      const isFirst = !selectedUnit?.firstAboValue;
      const endpoint = isFirst 
        ? `/testing/units/${selectedUnitId}/abo` 
        : `/testing/units/${selectedUnitId}/abo/verify`;
      
      const res = await api.post(endpoint, { bloodGroup: data.bloodGroup });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['testingUnits'] });
      setSuccessMsg(data.message || 'ABO entry logged successfully.');
      resetAbo();
      setTimeout(() => setSuccessMsg(null), 5000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || err.response?.data?.title || 'ABO submission failed.');
      setTimeout(() => setErrorMsg(null), 5000);
    }
  });

  // 3. Submit TTI results
  const ttiMutation = useMutation({
    mutationFn: async (data: TtiFields) => {
      const res = await api.post(`/testing/units/${selectedUnitId}/tti`, data);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['testingUnits'] });
      setSuccessMsg(data.message || 'TTI screening registered.');
      resetTti();
      setTimeout(() => setSuccessMsg(null), 5000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || err.response?.data?.title || 'TTI submission failed.');
      setTimeout(() => setErrorMsg(null), 5000);
    }
  });

  const onAboSubmit = (data: AboFields) => {
    setSuccessMsg(null);
    setErrorMsg(null);
    aboMutation.mutate(data);
  };

  const onTtiSubmit = (data: TtiFields) => {
    setSuccessMsg(null);
    setErrorMsg(null);
    ttiMutation.mutate(data);
  };

  // Determine TTI results text if already screened
  const getTtiSummary = (unit: TestingUnit) => {
    if (!unit.ttiScreened) return 'Pending Screen';
    if (unit.ttiReactive) return 'Reactive (TTI Positive)';
    return 'Non-Reactive (Safe)';
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Vetting & Testing Workspace</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Perform ABO double-verification controls and record TTI screening diagnostics.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Testing Queue Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Testing Queue</span>
              <button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ['testingUnits'] })}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Reload queue"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="text-center py-12">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold text-xs animate-pulse">Retrieving test metrics...</span>
                </div>
              ) : units.length === 0 ? (
                <div className="text-center py-12 text-slate-400 dark:text-slate-600 font-medium text-xs">
                  Testing pipeline clear. No collection units in quarantine/testing.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/40 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
                      <th className="px-5 py-3.5">Unit DIN</th>
                      <th className="px-5 py-3.5">Donor Name</th>
                      <th className="px-5 py-3.5">ABO Typing Status</th>
                      <th className="px-5 py-3.5">TTI Screening</th>
                      <th className="px-5 py-3.5">Unit Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {units.map(u => {
                      const isSelected = selectedUnitId === u.id;
                      const isMismatch = u.aboMismatch;
                      return (
                        <tr 
                          key={u.id} 
                          onClick={() => setSelectedUnitId(u.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-slate-100/70 dark:bg-slate-800/60 font-semibold' 
                              : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
                          }`}
                        >
                          <td className="px-5 py-4 font-mono font-bold text-slate-900 dark:text-white">
                            {u.unitId}
                          </td>
                          <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                            {u.donorName}
                          </td>
                          <td className="px-5 py-4">
                            {u.aboConfirmed ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900">
                                {bloodGroupLabels[u.bloodGroup] || u.bloodGroup} Verified
                              </span>
                            ) : isMismatch ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-350 border border-red-100 dark:border-red-900">
                                Mismatch Alert
                              </span>
                            ) : u.firstAboValue ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-900">
                                Awaiting Co-sign
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-550 italic">Unentered</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {u.ttiScreened ? (
                              <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                u.ttiReactive 
                                  ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-305 border-red-100' 
                                  : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-100'
                              }`}>
                                {u.ttiReactive ? 'Positive (Danger)' : 'Non-Reactive'}
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-550 italic">Pending Screening</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              u.status === 'Quarantined' 
                                ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 border-amber-100' 
                                : u.status === 'Testing' 
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200' 
                                : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 border-emerald-100'
                            }`}>
                              {statusLabels[u.status.toString()] || u.status.toString()}
                            </span>
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

        {/* Right Side: Diagnostics Panel */}
        <div className="space-y-4">
          {selectedUnit ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
              
              {/* Vitals Summary Header */}
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Diagnostics Console</span>
                  <span className="font-mono text-xs font-bold text-slate-950 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                    {selectedUnit.unitId}
                  </span>
                </div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mt-2">
                  Donor: {selectedUnit.donorName}
                </h3>
              </div>

              {/* Warnings and alerts */}
              {successMsg && (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 p-3 rounded-xl">
                  <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">{successMsg}</p>
                </div>
              )}
              {errorMsg && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 p-3 rounded-xl">
                  <p className="text-[11px] font-semibold text-red-800 dark:text-red-305">{errorMsg}</p>
                </div>
              )}

              {/* SECTION A: ABO Double-Verification Control */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-300 flex items-center space-x-1.5">
                  <Award className="h-4.5 w-4.5 text-red-600" />
                  <span>ABO / Rh Double-Verification</span>
                </h4>

                {selectedUnit.aboConfirmed ? (
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 p-3 rounded-xl flex items-center space-x-2.5 text-xs text-emerald-800 dark:text-emerald-400 font-semibold">
                    <ShieldCheck className="h-5 w-5 text-emerald-500" />
                    <span>Typing Confirmed: {bloodGroupLabels[selectedUnit.bloodGroup] || selectedUnit.bloodGroup}</span>
                  </div>
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 text-xs">
                    {selectedUnit.aboMismatch && (
                      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 p-2.5 rounded-lg text-red-800 dark:text-red-300 font-semibold flex items-start space-x-2">
                        <ShieldAlert className="h-4.5 w-4.5 text-red-500 mt-0.5" />
                        <p>Verification Mismatch! Technologist co-sign failed. Unit quarantined.</p>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-[11px] font-semibold text-slate-500">
                      <span>1st Entry: {selectedUnit.firstAboValue ? bloodGroupLabels[selectedUnit.firstAboValue] || selectedUnit.firstAboValue : 'Pending'}</span>
                      <span>2nd Entry: {selectedUnit.secondAboValue ? bloodGroupLabels[selectedUnit.secondAboValue] || selectedUnit.secondAboValue : 'Pending'}</span>
                    </div>

                    <form onSubmit={handleAboSubmit(onAboSubmit)} className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                          {selectedUnit.firstAboValue ? 'Verifier Co-Sign Group' : 'Initial Typing Group'}
                        </label>
                        <select
                          {...registerAbo('bloodGroup')}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none"
                        >
                          <option value="">Select Typing...</option>
                          {bloodGroups.map(bg => (
                            <option key={bg.value} value={bg.value}>{bg.label}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="submit"
                        disabled={aboMutation.isPending}
                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-colors cursor-pointer"
                      >
                        {aboMutation.isPending ? 'Logging...' : selectedUnit.firstAboValue ? 'Verify & Confirm' : 'Submit Initial Entry'}
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {/* SECTION B: Transfusion-Transmissible Infection Screening */}
              <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-300 flex items-center space-x-1.5">
                  <Activity className="h-4.5 w-4.5 text-red-600" />
                  <span>TTI Screening panel</span>
                </h4>

                {selectedUnit.ttiScreened ? (
                  <div className={`p-3 rounded-xl border flex flex-col space-y-2 text-xs font-semibold ${
                    selectedUnit.ttiReactive
                      ? 'bg-red-50 dark:bg-red-950/20 border-red-200 text-red-700 dark:text-red-305'
                      : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 text-emerald-800 dark:text-emerald-400'
                  }`}>
                    <div className="flex items-center space-x-2.5">
                      {selectedUnit.ttiReactive ? <XCircle className="h-5 w-5 text-red-500" /> : <CheckCircle className="h-5 w-5 text-emerald-500" />}
                      <span>TTI Status: {getTtiSummary(selectedUnit)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4 text-xs">
                    <form onSubmit={handleTtiSubmit(onTtiSubmit)} className="space-y-4">
                      <div className="space-y-2.5">
                        <label className="flex items-center space-x-2.5 cursor-pointer">
                          <input type="checkbox" {...registerTti('hivReactive')} className="cursor-pointer" />
                          <span className="font-semibold text-slate-700 dark:text-slate-300">HIV Reactive</span>
                        </label>

                        <label className="flex items-center space-x-2.5 cursor-pointer">
                          <input type="checkbox" {...registerTti('hepBReactive')} className="cursor-pointer" />
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Hepatitis B (HBV) Reactive</span>
                        </label>

                        <label className="flex items-center space-x-2.5 cursor-pointer">
                          <input type="checkbox" {...registerTti('hepCReactive')} className="cursor-pointer" />
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Hepatitis C (HCV) Reactive</span>
                        </label>

                        <label className="flex items-center space-x-2.5 cursor-pointer">
                          <input type="checkbox" {...registerTti('syphilisReactive')} className="cursor-pointer" />
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Syphilis Reactive</span>
                        </label>
                      </div>

                      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 p-2.5 rounded-lg text-amber-800 dark:text-amber-300 text-[10px]">
                        <Info className="h-4 w-4 text-amber-600 inline mr-1 mb-0.5" />
                        <span>Confirming any reactive flag triggers auto permanent deferrals and quarantines the unit.</span>
                      </div>

                      <button
                        type="submit"
                        disabled={ttiMutation.isPending}
                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-colors cursor-pointer"
                      >
                        {ttiMutation.isPending ? 'Logging Results...' : 'Verify TTI Screen'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center text-slate-400 dark:text-slate-600 text-xs font-semibold py-16">
              Select a collection unit from the queue to run typing and screening controls.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
