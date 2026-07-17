import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link } from 'react-router-dom';
import { 
  Truck, XCircle, Plus, ChevronRight 
} from 'lucide-react';
import api from '../../lib/api';
import type { Facility } from '../../types';

interface TransferOrder {
  id: string;
  shipmentNumber: string;
  bloodComponentId: string;
  unitId: string;
  componentType: string;
  bloodGroup: string;
  volumeMl: number;
  expiryDateUtc: string;
  sourceFacilityId: string;
  sourceFacilityName: string;
  destinationFacilityId: string;
  destinationFacilityName: string;
  status: string;
  sentDateUtc: string;
  receivedDateUtc?: string;
  rejectionReason?: string;
  notes?: string;
}

interface ComponentInventory {
  id: string;
  unitId: string;
  componentType: string;
  bloodGroup: string;
  volumeMl: number;
  status: string;
}

const createOrderSchema = z.object({
  bloodComponentId: z.string().min(1, 'Blood component is required'),
  destinationFacilityId: z.string().min(1, 'Destination facility is required'),
  notes: z.string().optional(),
});

type CreateOrderFields = z.infer<typeof createOrderSchema>;

const rejectOrderSchema = z.object({
  discardReason: z.string().min(3, 'Rejection reason must be at least 3 characters'),
});

type RejectOrderFields = z.infer<typeof rejectOrderSchema>;

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

const statusLabels: Record<string, string> = {
  Requested: 'Awaiting Dispatch',
  Dispatched: 'In Transit',
  Received: 'Delivered (Accepted)',
  Rejected: 'Rejected (Returned)'
};

export default function TransferOrdersPage() {
  const [activeTab, setActiveTab] = useState<'inbound' | 'outbound'>('inbound');
  const [showAddForm, setShowAddForm] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedFacilityId = localStorage.getItem('selectedFacilityId') || '';
  const queryClient = useQueryClient();

  const { register: registerCreate, handleSubmit: handleCreateSubmit, reset: resetCreate, formState: { errors: createErrors } } = useForm<CreateOrderFields>({
    resolver: zodResolver(createOrderSchema)
  });

  const { register: registerReject, handleSubmit: handleRejectSubmit, reset: resetReject, formState: { errors: rejectErrors } } = useForm<RejectOrderFields>({
    resolver: zodResolver(rejectOrderSchema)
  });

  // 1. Fetch Inbound Shipments
  const { data: inboundOrders = [], isLoading: isInboundLoading } = useQuery<TransferOrder[]>({
    queryKey: ['transfers', 'inbound', selectedFacilityId],
    queryFn: async () => {
      const res = await api.get<TransferOrder[]>(`/transfers/orders/inbound?facilityId=${selectedFacilityId}`);
      return res.data;
    }
  });

  // 2. Fetch Outbound Shipments
  const { data: outboundOrders = [], isLoading: isOutboundLoading } = useQuery<TransferOrder[]>({
    queryKey: ['transfers', 'outbound', selectedFacilityId],
    queryFn: async () => {
      const res = await api.get<TransferOrder[]>(`/transfers/orders/outbound?facilityId=${selectedFacilityId}`);
      return res.data;
    }
  });

  // 3. Fetch System Facilities for drop-down
  const { data: facilities = [] } = useQuery<Facility[]>({
    queryKey: ['facilities'],
    queryFn: async () => {
      const res = await api.get<Facility[]>('/facilities');
      return res.data;
    }
  });

  // 4. Fetch available components locally to transfer
  const { data: localComponents = [] } = useQuery<ComponentInventory[]>({
    queryKey: ['localComponents', selectedFacilityId],
    queryFn: async () => {
      const res = await api.get<ComponentInventory[]>(`/inventory/components?facilityId=${selectedFacilityId}&status=Available`);
      return res.data;
    }
  });

  const destinationFacilities = facilities.filter(f => f.id !== selectedFacilityId);

  // 5. Create Transfer Order Mutation
  const createOrderMutation = useMutation({
    mutationFn: async (data: CreateOrderFields) => {
      const res = await api.post('/transfers/orders', data);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['localComponents'] });
      setSuccessMsg(data.message || 'Transfer shipment requested.');
      setShowAddForm(false);
      resetCreate();
      setTimeout(() => setSuccessMsg(null), 5000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || err.response?.data?.title || 'Failed to create transfer order.');
      setTimeout(() => setErrorMsg(null), 5000);
    }
  });

  // 6. Dispatch Shipment Mutation
  const dispatchMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await api.post(`/transfers/orders/${orderId}/dispatch`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      setSuccessMsg(data.message || 'Shipment dispatched.');
      setTimeout(() => setSuccessMsg(null), 5000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || err.response?.data?.title || 'Dispatch failed.');
      setTimeout(() => setErrorMsg(null), 5000);
    }
  });

  // 7. Receive/Accept Shipment Mutation
  const receiveMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await api.post(`/transfers/orders/${orderId}/receive`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setSuccessMsg(data.message || 'Shipment accepted and checked into stock.');
      setTimeout(() => setSuccessMsg(null), 5000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || err.response?.data?.title || 'Receipt failed.');
      setTimeout(() => setErrorMsg(null), 5000);
    }
  });

  // 8. Reject Shipment Mutation
  const rejectMutation = useMutation({
    mutationFn: async (data: RejectOrderFields) => {
      const res = await api.post(`/transfers/orders/${rejectingId}/reject`, data);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      setSuccessMsg(data.message || 'Shipment rejected and returned to source.');
      setRejectingId(null);
      resetReject();
      setTimeout(() => setSuccessMsg(null), 5000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || err.response?.data?.title || 'Rejection failed.');
      setTimeout(() => setErrorMsg(null), 5000);
    }
  });

  const onCreateSubmit = (data: CreateOrderFields) => {
    createOrderMutation.mutate(data);
  };

  const onRejectSubmit = (data: RejectOrderFields) => {
    rejectMutation.mutate(data);
  };

  const activeOrders = activeTab === 'inbound' ? inboundOrders : outboundOrders;
  const isListLoading = activeTab === 'inbound' ? isInboundLoading : isOutboundLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 font-semibold mb-1">
            <Link to="/inventory" className="hover:underline">Inventory</Link>
            <ChevronRight className="h-3 w-3" />
            <span>Transfers</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Facility Transfers</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage inbound shipments and dispatch outbound transfers to system locations.
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md shadow-red-600/10 hover:shadow-red-700/20 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Transfer</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-220 p-4 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-bold animate-in fade-in duration-200">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 p-4 rounded-xl text-xs text-red-800 dark:text-red-305 font-bold animate-in fade-in duration-200">
          {errorMsg}
        </div>
      )}

      {/* Tabs Layout */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('inbound')}
          className={`px-5 py-3 text-xs font-bold transition-all cursor-pointer border-b-2 ${
            activeTab === 'inbound'
              ? 'border-red-600 text-red-600 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          Inbound Shipments ({inboundOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('outbound')}
          className={`px-5 py-3 text-xs font-bold transition-all cursor-pointer border-b-2 ${
            activeTab === 'outbound'
              ? 'border-red-600 text-red-600 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          Outbound Shipments ({outboundOrders.length})
        </button>
      </div>

      {/* Grid Shipments List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {isListLoading ? (
            <div className="text-center py-12">
              <span className="text-slate-500 dark:text-slate-400 font-semibold text-xs animate-pulse">Loading shipment orders...</span>
            </div>
          ) : activeOrders.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-600 font-medium text-xs">
              No {activeTab} shipments recorded for this facility scope.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
                  <th className="px-5 py-3.5">Shipment ID</th>
                  <th className="px-5 py-3.5">DIN</th>
                  <th className="px-5 py-3.5">Type</th>
                  <th className="px-5 py-3.5">Blood Group</th>
                  <th className="px-5 py-3.5">{activeTab === 'inbound' ? 'Origin Source' : 'Destination Target'}</th>
                  <th className="px-5 py-3.5">Ship Date</th>
                  <th className="px-5 py-3.5">Shipment Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {activeOrders.map(o => {
                  const isPending = o.status === 'Requested';
                  const isTransit = o.status === 'Dispatched';
                  return (
                    <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-slate-900 dark:text-white">
                        {o.shipmentNumber}
                      </td>
                      <td className="px-5 py-4 font-mono font-semibold text-slate-600 dark:text-slate-400">
                        {o.unitId}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">
                        {componentTypeLabels[o.componentType] || o.componentType}
                      </td>
                      <td className="px-5 py-4 font-extrabold text-red-600 dark:text-red-500">
                        {bloodGroupLabels[o.bloodGroup] || o.bloodGroup}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-600 dark:text-slate-400">
                        {activeTab === 'inbound' ? o.sourceFacilityName : o.destinationFacilityName}
                      </td>
                      <td className="px-5 py-4 text-slate-500">
                        {new Date(o.sentDateUtc).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          o.status === 'Received'
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 border-emerald-100'
                            : o.status === 'Rejected'
                            ? 'bg-red-50 dark:bg-red-950/20 text-red-700 border-red-100'
                            : o.status === 'Dispatched'
                            ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 border-indigo-100'
                            : 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 border-amber-100'
                        }`}>
                          {statusLabels[o.status] || o.status}
                        </span>
                        {o.rejectionReason && (
                          <span className="block text-[9px] text-red-500 mt-0.5 truncate max-w-[150px]">
                            {o.rejectionReason}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {activeTab === 'inbound' && isTransit && (
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => receiveMutation.mutate(o.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-750 text-white font-bold rounded-lg transition-colors cursor-pointer"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => setRejectingId(o.id)}
                              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {activeTab === 'outbound' && isPending && (
                          <button
                            onClick={() => dispatchMutation.mutate(o.id)}
                            className="px-2.5 py-1 bg-indigo-650 hover:bg-indigo-750 text-white font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            Dispatch
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

      {/* Create Order Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-xl animate-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
              <Truck className="h-5 w-5 text-red-600" />
              <span>Create Inter-Facility Transfer</span>
            </h3>

            <form onSubmit={handleCreateSubmit(onCreateSubmit)} className="space-y-4 mt-4 text-xs">
              
              {/* Select Component */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Select Local Available Component
                </label>
                <select
                  {...registerCreate('bloodComponentId')}
                  className={`w-full px-3 py-2.5 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 ${
                    createErrors.bloodComponentId ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <option value="">Select Component</option>
                  {localComponents.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.unitId} - {componentTypeLabels[c.componentType]} ({bloodGroupLabels[c.bloodGroup] || c.bloodGroup}) - {c.volumeMl}mL
                    </option>
                  ))}
                </select>
                {createErrors.bloodComponentId && (
                  <span className="block text-[11px] text-red-500 mt-1">{createErrors.bloodComponentId.message}</span>
                )}
              </div>

              {/* Destination Facility */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Destination Target Facility
                </label>
                <select
                  {...registerCreate('destinationFacilityId')}
                  className={`w-full px-3 py-2.5 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 ${
                    createErrors.destinationFacilityId ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <option value="">Select Facility</option>
                  {destinationFacilities.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                {createErrors.destinationFacilityId && (
                  <span className="block text-[11px] text-red-500 mt-1">{createErrors.destinationFacilityId.message}</span>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Shipment Notes / Logistics details
                </label>
                <textarea
                  {...registerCreate('notes')}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none"
                  placeholder="Enter logistics notes (e.g., Cold storage validation attached)..."
                />
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
                  disabled={createOrderMutation.isPending}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  {createOrderMutation.isPending ? 'Requesting...' : 'Request Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Order Reason Modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl animate-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span>Reject Inbound Shipment</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Please input the rejection details (e.g., temperature seal broken, package leak). The component will automatically be returned to the source facility's stock.
            </p>

            <form onSubmit={handleRejectSubmit(onRejectSubmit)} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Rejection Reason Description
                </label>
                <textarea
                  {...registerReject('discardReason')}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none"
                  placeholder="Input reason for rejection..."
                />
                {rejectErrors.discardReason && (
                  <span className="block text-[11px] text-red-500 mt-1">{rejectErrors.discardReason.message}</span>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800 font-bold">
                <button
                  type="button"
                  onClick={() => setRejectingId(null)}
                  className="px-4 py-2 bg-slate-150 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejectMutation.isPending}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  {rejectMutation.isPending ? 'Rejecting...' : 'Reject Shipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
