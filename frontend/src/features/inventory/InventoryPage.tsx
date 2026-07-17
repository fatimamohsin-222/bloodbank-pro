import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link } from 'react-router-dom';
import { 
  RefreshCw, AlertTriangle, ShieldCheck, 
  Trash2, Filter, Truck, Heart 
} from 'lucide-react';
import api from '../../lib/api';

interface ComponentInventory {
  id: string;
  unitId: string;
  componentType: string;
  bloodGroup: string;
  volumeMl: number;
  expiryDateUtc: string;
  status: string;
  facilityId: string;
  facilityName: string;
  daysRemaining: number;
}

const discardSchema = z.object({
  discardReason: z.string().min(3, 'Discard reason must be at least 3 characters'),
});

type DiscardFields = z.infer<typeof discardSchema>;

const bloodGroups = ['APositive', 'ANegative', 'BPositive', 'BNegative', 'OPositive', 'ONegative', 'ABPositive', 'ABNegative'];

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

export default function InventoryPage() {
  const selectedFacilityId = localStorage.getItem('selectedFacilityId') || '';
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [groupFilter, setGroupFilter] = useState<string>('');
  const [expiryFilter, setExpiryFilter] = useState<string>(''); // 'all' | 'expired' | 'critical' | 'healthy'
  
  const [discardingId, setDiscardingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<DiscardFields>({
    resolver: zodResolver(discardSchema)
  });

  // 1. Fetch Inventory Components
  const { data: components = [], isLoading } = useQuery<ComponentInventory[]>({
    queryKey: ['inventory', selectedFacilityId],
    queryFn: async () => {
      const res = await api.get<ComponentInventory[]>(`/inventory/components?facilityId=${selectedFacilityId}`);
      return res.data;
    }
  });

  // 2. Discard Component Mutation
  const discardMutation = useMutation({
    mutationFn: async (data: DiscardFields) => {
      const res = await api.post(`/inventory/components/${discardingId}/discard`, data);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setSuccessMsg(data.message || 'Component discarded successfully.');
      setDiscardingId(null);
      reset();
      setTimeout(() => setSuccessMsg(null), 5000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || err.response?.data?.title || 'Failed to discard component.');
      setTimeout(() => setErrorMsg(null), 5000);
    }
  });

  const onDiscardSubmit = (data: DiscardFields) => {
    discardMutation.mutate(data);
  };

  // Filter components
  const filteredComponents = components.filter(c => {
    if (typeFilter && c.componentType !== typeFilter) return false;
    if (groupFilter && c.bloodGroup !== groupFilter) return false;
    if (expiryFilter) {
      if (expiryFilter === 'expired' && c.daysRemaining > 0) return false;
      if (expiryFilter === 'critical') {
        const limit = c.componentType === 'Platelets' ? 1.0 : c.componentType === 'FreshFrozenPlasma' ? 30.0 : 7.0;
        if (c.daysRemaining <= 0 || c.daysRemaining > limit) return false;
      }
      if (expiryFilter === 'healthy') {
        const limit = c.componentType === 'Platelets' ? 1.0 : c.componentType === 'FreshFrozenPlasma' ? 30.0 : 7.0;
        if (c.daysRemaining <= limit) return false;
      }
    }
    return true;
  });

  // Compute stats: Count available stock grouped by component type
  const rbcCount = components.filter(c => c.componentType === 'RedBloodCells' && c.status === 'Available').length;
  const pltCount = components.filter(c => c.componentType === 'Platelets' && c.status === 'Available').length;
  const ffpCount = components.filter(c => c.componentType === 'FreshFrozenPlasma' && c.status === 'Available').length;
  const totalAvailable = components.filter(c => c.status === 'Available').length;

  // Expiry alert checks
  const getExpirySeverity = (c: ComponentInventory) => {
    if (c.daysRemaining <= 0) return 'expired';
    const limit = c.componentType === 'Platelets' ? 1.0 : c.componentType === 'FreshFrozenPlasma' ? 30.0 : 7.0;
    if (c.daysRemaining <= limit) return 'critical';
    return 'healthy';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Component Inventory</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track available clinical stock, monitor shelf-life warnings, and manage component discards.
          </p>
        </div>
        <div className="flex space-x-3">
          <Link
            to="/inventory/transfers"
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <Truck className="h-4 w-4 text-slate-500" />
            <span>Facility Transfers</span>
          </Link>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['inventory'] })}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold cursor-pointer"
            title="Refresh Stock"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
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

      {/* Stock Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total Stock */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center space-x-4 shadow-2xs">
          <div className="h-11 w-11 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center">
            <Heart className="h-5 w-5 fill-current" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Available Stock</span>
            <span className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 block">{totalAvailable} Units</span>
          </div>
        </div>

        {/* RBC Stock */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center space-x-4 shadow-2xs">
          <div className="h-11 w-11 rounded-xl bg-red-105/10 dark:bg-red-900/30 text-red-500 flex items-center justify-center font-bold text-sm">
            RBC
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Red Cells</span>
            <span className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 block">{rbcCount} Units</span>
          </div>
        </div>

        {/* Platelets */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center space-x-4 shadow-2xs">
          <div className="h-11 w-11 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-500 flex items-center justify-center font-bold text-sm">
            PLT
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Platelets</span>
            <span className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 block">{pltCount} Units</span>
          </div>
        </div>

        {/* FFP */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center space-x-4 shadow-2xs">
          <div className="h-11 w-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 flex items-center justify-center font-bold text-sm">
            FFP
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Frozen Plasma</span>
            <span className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 block">{ffpCount} Units</span>
          </div>
        </div>

      </div>

      {/* Filters bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-wrap gap-4 items-center text-xs">
        <div className="flex items-center space-x-2 text-slate-500 font-bold uppercase tracking-wider">
          <Filter className="h-4 w-4" />
          <span>Filter Stock:</span>
        </div>

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none"
        >
          <option value="">All Component Types</option>
          <option value="RedBloodCells">Red Blood Cells (RBC)</option>
          <option value="Platelets">Platelets (PLT)</option>
          <option value="FreshFrozenPlasma">Fresh Frozen Plasma (FFP)</option>
          <option value="WholeBlood">Whole Blood</option>
          <option value="Cryoprecipitate">Cryoprecipitate</option>
        </select>

        {/* Group Filter */}
        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none"
        >
          <option value="">All Blood Groups</option>
          {bloodGroups.map(bg => (
            <option key={bg} value={bg}>{bloodGroupLabels[bg]}</option>
          ))}
        </select>

        {/* Expiry Filter */}
        <select
          value={expiryFilter}
          onChange={(e) => setExpiryFilter(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none"
        >
          <option value="">All Shelf-Life States</option>
          <option value="expired">Expired Units Only</option>
          <option value="critical">Critical Warning (&lt;= Threshold)</option>
          <option value="healthy">Healthy Stock</option>
        </select>
      </div>

      {/* Main Stock Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="text-center py-12">
              <span className="text-slate-500 dark:text-slate-400 font-semibold text-xs animate-pulse">Checking warehouse logs...</span>
            </div>
          ) : filteredComponents.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-600 font-medium text-xs">
              No matching components in active inventory.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4">Component DIN</th>
                  <th className="px-6 py-4">Component Type</th>
                  <th className="px-6 py-4">Blood Group</th>
                  <th className="px-6 py-4">Volume (mL)</th>
                  <th className="px-6 py-4">Expiry Date</th>
                  <th className="px-6 py-4">Days Remaining</th>
                  <th className="px-6 py-4">Operational Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredComponents.map(c => {
                  const severity = getExpirySeverity(c);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">
                        {c.unitId}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">
                        {componentTypeLabels[c.componentType] || c.componentType}
                      </td>
                      <td className="px-6 py-4 font-extrabold text-red-600 dark:text-red-500">
                        {bloodGroupLabels[c.bloodGroup] || c.bloodGroup}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-400">
                        {c.volumeMl} mL
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-medium">
                        {new Date(c.expiryDateUtc).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        {severity === 'expired' ? (
                          <span className="inline-flex items-center space-x-1 text-red-600 dark:text-red-400 font-bold">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>Expired ({c.daysRemaining}d)</span>
                          </span>
                        ) : severity === 'critical' ? (
                          <span className="inline-flex items-center space-x-1 text-amber-500 font-bold">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>Critical ({c.daysRemaining}d)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-bold">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>Safe ({c.daysRemaining}d)</span>
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          c.status === 'Available' 
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 border-emerald-100' 
                            : c.status === 'Expired' || c.status === 'Quarantined'
                            ? 'bg-red-50 dark:bg-red-950/20 text-red-700 border-red-100'
                            : 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 border-amber-100'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {c.status !== 'Discarded' && (
                          <button
                            onClick={() => setDiscardingId(c.id)}
                            className="p-1.5 text-slate-400 hover:text-red-550 hover:bg-red-50 dark:hover:bg-red-950/25 rounded-lg transition-colors cursor-pointer"
                            title="Discard Component"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
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

      {/* Discard Modal */}
      {discardingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl animate-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              <span>Confirm Clinical Discard</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              You are about to discard this blood component from active clinical inventory. Please specify the disposal reason (e.g. Expired, Cold Chain Broken, Container Damaged).
            </p>

            <form onSubmit={handleSubmit(onDiscardSubmit)} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Discard Reason Description
                </label>
                <textarea
                  {...register('discardReason')}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none"
                  placeholder="Input reason for discard..."
                />
                {errors.discardReason && (
                  <span className="block text-[11px] text-red-500 mt-1">{errors.discardReason.message}</span>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800 font-bold">
                <button
                  type="button"
                  onClick={() => setDiscardingId(null)}
                  className="px-4 py-2 bg-slate-150 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={discardMutation.isPending}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  {discardMutation.isPending ? 'Discarding...' : 'Confirm Discard'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
