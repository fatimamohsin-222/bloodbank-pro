import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Activity, Users, Heart, AlertTriangle, ShieldCheck, 
  TrendingUp, BarChart2, ShieldAlert, RefreshCw 
} from 'lucide-react';
import api from '../../lib/api';

interface ExpiringUnit {
  id: string;
  unitId: string;
  componentType: string;
  bloodGroup: string;
  daysRemaining: number;
  expiryDateUtc: string;
}

interface AdverseReactionDetail {
  id: string;
  transfusionId: string;
  severity: string;
  symptomsDescription: string;
  reportedAtUtc: string;
}

interface DashboardKpis {
  totalDonors: number;
  totalStock: number;
  activeRequests: number;
  pendingAdverseReactions: number;
  bloodGroupStock: Record<string, number>;
  monthlyDonations: { month: string; count: number }[];
  expiringSoon: ExpiringUnit[];
  adverseReactions: AdverseReactionDetail[];
}

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

export default function DashboardConsolePage() {
  const selectedFacilityId = localStorage.getItem('selectedFacilityId') || '';
  const queryClient = useQueryClient();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 1. Fetch KPI Stats
  const { data: kpis, isLoading } = useQuery<DashboardKpis>({
    queryKey: ['dashboardKpis', selectedFacilityId],
    queryFn: async () => {
      const res = await api.get<DashboardKpis>(`/dashboard/kpis?facilityId=${selectedFacilityId}`);
      return res.data;
    }
  });

  // 2. Resolve Reaction Mutation
  const resolveReactionMutation = useMutation({
    mutationFn: async (reactionId: string) => {
      const res = await api.post(`/dashboard/reactions/${reactionId}/resolve`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dashboardKpis'] });
      setSuccessMsg(data.message || 'Adverse reaction resolved successfully.');
      setTimeout(() => setSuccessMsg(null), 5000);
    }
  });

  if (isLoading || !kpis) {
    return (
      <div className="text-center py-24">
        <span className="text-slate-500 font-semibold text-xs animate-pulse">Synchronizing clinical metrics cockpit...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Clinical Console</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time visual monitoring of facility blood stocks, shelf lives, and hemovigilance.
          </p>
        </div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['dashboardKpis'] })}
          className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Sync Cockpit</span>
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-220 p-4 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-bold">
          {successMsg}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total Donors */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center space-x-4 shadow-2xs">
          <div className="h-11 w-11 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Registered Donors</span>
            <span className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 block">{kpis.totalDonors} Users</span>
          </div>
        </div>

        {/* Total Available Inventory */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center space-x-4 shadow-2xs">
          <div className="h-11 w-11 rounded-xl bg-red-105/10 dark:bg-red-900/30 text-red-500 flex items-center justify-center">
            <Heart className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Available Stock</span>
            <span className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 block">{kpis.totalStock} Units</span>
          </div>
        </div>

        {/* Active Requests */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center space-x-4 shadow-2xs">
          <div className="h-11 w-11 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-500 flex items-center justify-center font-bold text-sm">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Active Requests</span>
            <span className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 block">{kpis.activeRequests} Orders</span>
          </div>
        </div>

        {/* Pending Adverse Reactions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center space-x-4 shadow-2xs">
          <div className="h-11 w-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 flex items-center justify-center font-bold text-sm">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Adverse Reactions</span>
            <span className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 block">{kpis.pendingAdverseReactions} Open Logs</span>
          </div>
        </div>

      </div>

      {/* Main visual panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Stock & Trends */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Blood Group Available Stock Grid */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-2">
              <BarChart2 className="h-4.5 w-4.5 text-red-600" />
              <span>Inventory Stock Levels by Blood Group</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(kpis.bloodGroupStock).map(([group, count]) => (
                <div key={group} className="border border-slate-100 dark:border-slate-800 p-4 rounded-xl text-center space-y-2 bg-slate-50/50 dark:bg-slate-900">
                  <span className="text-base font-black text-red-600 dark:text-red-500 block">
                    {bloodGroupLabels[group] || group}
                  </span>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white block">
                    {count} Units
                  </span>
                  {/* Dynamic capacity feedback bar */}
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${count === 0 ? 'bg-red-500' : count <= 3 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                      style={{ width: `${Math.min(count * 15, 100)}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Donation sessions monthly trend */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-2">
              <TrendingUp className="h-4.5 w-4.5 text-indigo-500" />
              <span>Monthly Collected Donations Trend</span>
            </h3>

            <div className="space-y-3">
              {kpis.monthlyDonations.map(trend => (
                <div key={trend.month} className="flex items-center text-xs">
                  <span className="w-24 font-bold text-slate-550">{trend.month}</span>
                  <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-6 rounded-lg overflow-hidden flex items-center px-2 relative">
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-indigo-500/10 border-r-2 border-indigo-500 transition-all duration-300"
                      style={{ width: `${Math.min(trend.count * 10, 100)}%` }}
                    />
                    <span className="font-extrabold text-slate-900 dark:text-white relative z-10 font-mono">
                      {trend.count} donations
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Side: Alerts log */}
        <div className="space-y-6">
          
          {/* Expiry alerts log */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-2">
              <AlertTriangle className="h-4.5 w-4.5 text-amber-500" />
              <span>Shelf-Life Alerts (&lt;= 7 Days)</span>
            </h3>

            {kpis.expiringSoon.length === 0 ? (
              <p className="text-slate-400 italic text-xs py-4 text-center">No units reaching critical expiry threshold.</p>
            ) : (
              <div className="space-y-3">
                {kpis.expiringSoon.map(unit => (
                  <div key={unit.id} className="border border-amber-100 dark:border-amber-950/20 bg-amber-50/20 dark:bg-amber-950/5 p-3 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <span className="font-mono font-bold text-slate-900 dark:text-white block">{unit.unitId}</span>
                      <span className="text-[10px] text-slate-500 font-semibold block">{bloodGroupLabels[unit.bloodGroup]} {componentTypeLabels[unit.componentType]}</span>
                    </div>
                    <span className="text-amber-600 font-extrabold">
                      {unit.daysRemaining} days left
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hemovigilance reaction log */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-2">
              <ShieldAlert className="h-4.5 w-4.5 text-red-600" />
              <span>Hemovigilance Alert Log</span>
            </h3>

            {kpis.adverseReactions.length === 0 ? (
              <div className="p-4 bg-emerald-50/30 dark:bg-emerald-950/5 border border-emerald-100 rounded-xl flex items-center space-x-2 text-xs text-emerald-800 font-bold">
                <ShieldCheck className="h-4 w-4" />
                <span>Zero adverse reactions reported.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {kpis.adverseReactions.map(rx => (
                  <div key={rx.id} className="border border-red-105 dark:border-red-950/20 bg-red-50/20 dark:bg-red-950/5 p-3 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between font-bold">
                      <span className="bg-red-100 dark:bg-red-950 text-red-700 px-2 py-0.5 rounded-full text-[9px]">
                        {rx.severity}
                      </span>
                      <span className="text-slate-400 text-[10px]">
                        {new Date(rx.reportedAtUtc).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 font-medium">
                      "{rx.symptomsDescription}"
                    </p>
                    <button
                      onClick={() => resolveReactionMutation.mutate(rx.id)}
                      disabled={resolveReactionMutation.isPending}
                      className="w-full py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors cursor-pointer text-[10px]"
                    >
                      Investigate & Resolve
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
