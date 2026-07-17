import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  FileText, Plus, RefreshCw, AlertTriangle, ShieldCheck, 
  ShieldAlert, Award 
} from 'lucide-react';
import api from '../../lib/api';

interface ReservationDetail {
  id: string;
  bloodComponentId: string;
  unitId: string;
  componentType: string;
  bloodGroup: string;
  volumeMl: number;
  reservedAtUtc: string;
  holdUntilUtc: string;
  isActive: boolean;
  isReleased: boolean;
  hasCrossMatch: boolean;
  crossMatchCompatible?: boolean;
  crossMatchMethod?: string;
  crossMatchNotes?: string;
}

interface BloodRequestDetail {
  id: string;
  requestNumber: string;
  facilityId: string;
  facilityName: string;
  patientName: string;
  patientNationalId: string;
  patientDateOfBirth: string;
  patientBloodGroup: string;
  componentType: string;
  unitsRequested: number;
  urgency: string;
  status: string;
  clinicalIndication: string;
  requestingPhysicianId: string;
  requestingPhysicianNameName?: string;
  requiredDateUtc: string;
  reservations: ReservationDetail[];
}

interface CompatibleComponent {
  id: string;
  unitId: string;
  componentType: string;
  bloodGroup: string;
  volumeMl: number;
  daysRemaining: number;
}

const requestSchema = z.object({
  patientName: z.string().min(1, 'Patient name is required'),
  patientNationalId: z.string().min(1, 'Patient National ID is required'),
  patientDateOfBirth: z.string().min(1, 'Date of birth is required'),
  patientBloodGroup: z.string().min(1, 'Blood group is required'),
  componentType: z.string().min(1, 'Component type is required'),
  unitsRequested: z.coerce.number().min(1, 'Min 1 unit'),
  urgency: z.string().min(1, 'Urgency is required'),
  clinicalIndication: z.string().min(1, 'Clinical indication is required'),
  requiredDateUtc: z.string().min(1, 'Required date is required'),
});

type RequestFields = z.infer<typeof requestSchema>;

const crossmatchSchema = z.object({
  compatible: z.boolean(),
  method: z.string().min(1, 'Testing method is required'),
  notes: z.string().optional(),
});

type CrossMatchFields = z.infer<typeof crossmatchSchema>;

const bloodGroups = [
  { value: 'APositive', label: 'A+' }, { value: 'ANegative', label: 'A-' },
  { value: 'BPositive', label: 'B+' }, { value: 'BNegative', label: 'B-' },
  { value: 'OPositive', label: 'O+' }, { value: 'ONegative', label: 'O-' },
  { value: 'ABPositive', label: 'AB+' }, { value: 'ABNegative', label: 'AB-' }
];

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
  Pending: 'Pending Issue',
  Reserved: 'Component Reserved',
  Fulfilled: 'Fully Fulfilled',
  Cancelled: 'Cancelled'
};

const urgencyColors: Record<string, string> = {
  Routine: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  Urgent: 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300 border-amber-100',
  Emergency: 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-305 border-red-105'
};

export default function BloodRequestsPage() {
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchCompatible, setSearchCompatible] = useState(false);
  const [selectedResIdForCm, setSelectedResIdForCm] = useState<string | null>(null);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedFacilityId = localStorage.getItem('selectedFacilityId') || '';
  const queryClient = useQueryClient();

  const { register: registerCreate, handleSubmit: handleCreateSubmit, reset: resetCreate, formState: { errors: createErrors } } = useForm<any>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      patientBloodGroup: 'OPositive',
      componentType: 'RedBloodCells',
      urgency: 'Routine',
      unitsRequested: 1,
      requiredDateUtc: new Date(Date.now() + 86400000).toISOString().split('T')[0] // tomorrow
    }
  });

  const { register: registerCm, handleSubmit: handleCmSubmit, reset: resetCm } = useForm<any>({
    resolver: zodResolver(crossmatchSchema),
    defaultValues: {
      compatible: true,
      method: 'Gel Card'
    }
  });

  // 1. Fetch Blood Requests
  const { data: requests = [], isLoading } = useQuery<BloodRequestDetail[]>({
    queryKey: ['bloodRequests', selectedFacilityId],
    queryFn: async () => {
      const res = await api.get<BloodRequestDetail[]>(`/requests?facilityId=${selectedFacilityId}`);
      return res.data;
    }
  });

  const selectedRequest = requests.find(r => r.id === selectedRequestId);

  // 2. Fetch Compatible Components (only when triggered)
  const { data: compatibleComponents = [], isLoading: isCompatibleLoading } = useQuery<CompatibleComponent[]>({
    queryKey: ['compatibleComponents', selectedRequestId],
    queryFn: async () => {
      const res = await api.get<CompatibleComponent[]>(`/requests/${selectedRequestId}/compatible-components`);
      return res.data;
    },
    enabled: !!selectedRequestId && searchCompatible
  });

  // 3. Create Request Mutation
  const createRequestMutation = useMutation({
    mutationFn: async (data: RequestFields) => {
      const res = await api.post('/requests', data, {
        headers: { 'X-Facility-Id': selectedFacilityId }
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bloodRequests'] });
      setSuccessMsg(data.message || 'Blood request registered successfully.');
      setShowAddForm(false);
      resetCreate();
      setTimeout(() => setSuccessMsg(null), 5000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || err.response?.data?.title || 'Failed to submit request.');
      setTimeout(() => setErrorMsg(null), 5000);
    }
  });

  // 4. Reserve Component Mutation
  const reserveMutation = useMutation({
    mutationFn: async (componentId: string) => {
      const res = await api.post(`/requests/${selectedRequestId}/reserve`, { bloodComponentId: componentId });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bloodRequests'] });
      queryClient.invalidateQueries({ queryKey: ['localComponents'] });
      setSuccessMsg(data.message || 'Component reserved.');
      setSearchCompatible(false);
      setTimeout(() => setSuccessMsg(null), 5000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || err.response?.data?.title || 'Reservation failed.');
      setTimeout(() => setErrorMsg(null), 5000);
    }
  });

  // 5. Log Crossmatch Mutation
  const crossmatchMutation = useMutation({
    mutationFn: async (data: CrossMatchFields) => {
      const res = await api.post(`/requests/reservations/${selectedResIdForCm}/crossmatch`, data);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bloodRequests'] });
      setSuccessMsg(data.message || 'Crossmatch result logged.');
      setSelectedResIdForCm(null);
      resetCm();
      setTimeout(() => setSuccessMsg(null), 5000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || err.response?.data?.title || 'Crossmatch submission failed.');
      setTimeout(() => setErrorMsg(null), 5000);
    }
  });

  const onCreateSubmit = (data: RequestFields) => {
    createRequestMutation.mutate(data);
  };

  const onCmSubmit = (data: CrossMatchFields) => {
    crossmatchMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Blood Requests</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Log physician blood requests, search compatible stock, and verify crossmatches.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer self-start"
        >
          <Plus className="h-4 w-4" />
          <span>New Blood Request</span>
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

      {/* Main Split Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Requests list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Clinical Requests Registry</span>
              <button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ['bloodRequests'] })}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="text-center py-12">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold text-xs animate-pulse">Retrieving requests...</span>
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-12 text-slate-400 dark:text-slate-600 font-medium text-xs">
                  No active blood requests recorded.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/40 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
                      <th className="px-5 py-3.5">Req ID</th>
                      <th className="px-5 py-3.5">Patient Name</th>
                      <th className="px-5 py-3.5">ABO/Rh Group</th>
                      <th className="px-5 py-3.5">Component</th>
                      <th className="px-5 py-3.5">Urgency</th>
                      <th className="px-5 py-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {requests.map(r => {
                      const isSelected = selectedRequestId === r.id;
                      return (
                        <tr 
                          key={r.id} 
                          onClick={() => {
                            setSelectedRequestId(r.id);
                            setSearchCompatible(false);
                            setSelectedResIdForCm(null);
                          }}
                          className={`cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-slate-100/70 dark:bg-slate-800/60 font-semibold' 
                              : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
                          }`}
                        >
                          <td className="px-5 py-4 font-mono font-bold text-slate-900 dark:text-white">
                            {r.requestNumber}
                          </td>
                          <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                            {r.patientName}
                          </td>
                          <td className="px-5 py-4 font-extrabold text-red-600 dark:text-red-500">
                            {bloodGroupLabels[r.patientBloodGroup] || r.patientBloodGroup}
                          </td>
                          <td className="px-5 py-4 font-semibold text-slate-600 dark:text-slate-400">
                            {componentTypeLabels[r.componentType] || r.componentType} ({r.unitsRequested}u)
                          </td>
                          <td className="px-5 py-4">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${urgencyColors[r.urgency] || ''}`}>
                              {r.urgency}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              r.status === 'Fulfilled' 
                                ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 border-emerald-100' 
                                : r.status === 'Reserved' 
                                ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 border-indigo-100' 
                                : 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 border-amber-100'
                            }`}>
                              {statusLabels[r.status] || r.status}
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

        {/* Right Side: Details / Crossmatch Panel */}
        <div>
          {selectedRequest ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
              
              {/* Header Details */}
              <div className="border-b border-slate-150 dark:border-slate-800 pb-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-mono font-bold text-slate-950 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                    {selectedRequest.requestNumber}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${urgencyColors[selectedRequest.urgency]}`}>
                    {selectedRequest.urgency}
                  </span>
                </div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mt-3">
                  Patient: {selectedRequest.patientName}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  National ID: {selectedRequest.patientNationalId} | DOB: {new Date(selectedRequest.patientDateOfBirth).toLocaleDateString()}
                </p>
                <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl text-[11px] text-slate-600 dark:text-slate-300 mt-3 font-semibold">
                  Indication: "{selectedRequest.clinicalIndication}"
                </div>
              </div>

              {/* Reserved Components List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Reserved units ({selectedRequest.reservations.length})</h4>
                
                {selectedRequest.reservations.map(res => (
                  <div key={res.id} className="border border-slate-150 dark:border-slate-800 p-3 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between items-center font-bold">
                      <span className="font-mono text-slate-900 dark:text-white">{res.unitId}</span>
                      <span className="text-red-600">{bloodGroupLabels[res.bloodGroup]} {componentTypeLabels[res.componentType]}</span>
                    </div>

                    {res.hasCrossMatch ? (
                      <div className={`p-2 rounded-lg flex items-center space-x-2 font-bold ${
                        res.crossMatchCompatible
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700'
                          : 'bg-red-50 dark:bg-red-950/20 text-red-700'
                      }`}>
                        {res.crossMatchCompatible ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                        <span>Crossmatch: {res.crossMatchCompatible ? 'COMPATIBLE' : 'INCOMPATIBLE'} ({res.crossMatchMethod})</span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-amber-500 font-semibold flex items-center space-x-1">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Awaiting Crossmatch</span>
                        </span>
                        <button
                          onClick={() => setSelectedResIdForCm(res.id)}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg cursor-pointer"
                        >
                          Log Test
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* SECTION A: Search and Reserve Compatible Units */}
              {selectedRequest.status !== 'Fulfilled' && (
                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setSearchCompatible(true);
                      queryClient.invalidateQueries({ queryKey: ['compatibleComponents'] });
                    }}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors cursor-pointer text-xs"
                  >
                    Search Compatible Units
                  </button>

                  {searchCompatible && (
                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-2 text-xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Compatible Local Stock:</span>
                      
                      {isCompatibleLoading ? (
                        <p className="text-slate-500 italic animate-pulse">Running compatibility checks...</p>
                      ) : compatibleComponents.length === 0 ? (
                        <p className="text-slate-400 italic">No compatible available units in stock.</p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {compatibleComponents.map(c => (
                            <div key={c.id} className="flex justify-between items-center p-2 bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700 rounded-lg">
                              <div>
                                <span className="font-mono font-bold text-slate-900 dark:text-white block">{c.unitId}</span>
                                <span className="text-[10px] text-slate-500 font-semibold block">{bloodGroupLabels[c.bloodGroup]} RBC | {c.volumeMl}mL</span>
                              </div>
                              <button
                                onClick={() => reserveMutation.mutate(c.id)}
                                disabled={reserveMutation.isPending}
                                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg cursor-pointer"
                              >
                                Reserve
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION B: Technologist Log Crossmatch Form Overlay */}
              {selectedResIdForCm && (
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4 text-xs animate-in slide-in-from-bottom duration-150">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                    <Award className="h-4.5 w-4.5 text-red-600" />
                    <span>Record Crossmatch compatibility</span>
                  </h4>

                  <form onSubmit={handleCmSubmit(onCmSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2.5 cursor-pointer">
                        <input type="checkbox" {...registerCm('compatible')} className="cursor-pointer" />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Unit Compatible (Passed Major Match)</span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                        Crossmatch Testing Method
                      </label>
                      <select
                        {...registerCm('method')}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none"
                      >
                        <option value="Gel Card">Gel Card Column</option>
                        <option value="Tube Method">Indirect Antiglobulin Tube</option>
                        <option value="Immediate Spin">Immediate Spin</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                        Notes / Serology anomalies
                      </label>
                      <textarea
                        {...registerCm('notes')}
                        rows={2}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none"
                        placeholder="Input serology observations..."
                      />
                    </div>

                    <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setSelectedResIdForCm(null)}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={crossmatchMutation.isPending}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg cursor-pointer"
                      >
                        Submit Result
                      </button>
                    </div>
                  </form>
                </div>
              )}

            </div>
          ) : (
            <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center text-slate-400 dark:text-slate-600 text-xs font-semibold py-16">
              Select a clinical request row to open details console, compatibilities search, and crossmatching control.
            </div>
          )}
        </div>

      </div>

      {/* Create Request Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-xl animate-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
              <FileText className="h-5 w-5 text-red-600" />
              <span>Create Blood Request Order</span>
            </h3>

            <form onSubmit={handleCreateSubmit(onCreateSubmit)} className="space-y-4 mt-4 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Patient Name */}
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Patient Full Name
                  </label>
                  <input
                    type="text"
                    {...registerCreate('patientName')}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none"
                    placeholder="Enter Patient Name"
                  />
                  {createErrors.patientName?.message && <span className="text-[11px] text-red-500">{String(createErrors.patientName.message)}</span>}
                </div>

                {/* Patient ID */}
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Patient National ID
                  </label>
                  <input
                    type="text"
                    {...registerCreate('patientNationalId')}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none"
                    placeholder="Enter ID Number"
                  />
                  {createErrors.patientNationalId?.message && <span className="text-[11px] text-red-500">{String(createErrors.patientNationalId.message)}</span>}
                </div>

                {/* Patient DOB */}
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Patient Date of Birth
                  </label>
                  <input
                    type="date"
                    {...registerCreate('patientDateOfBirth')}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none"
                  />
                  {createErrors.patientDateOfBirth?.message && <span className="text-[11px] text-red-505">{String(createErrors.patientDateOfBirth.message)}</span>}
                </div>

                {/* Patient Blood Group */}
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Patient Blood Group
                  </label>
                  <select
                    {...registerCreate('patientBloodGroup')}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none"
                  >
                    {bloodGroups.map(bg => (
                      <option key={bg.value} value={bg.value}>{bg.label}</option>
                    ))}
                  </select>
                </div>

                {/* Component Type */}
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Requested Component Type
                  </label>
                  <select
                    {...registerCreate('componentType')}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none"
                  >
                    <option value="RedBloodCells">Red Blood Cells (RBC)</option>
                    <option value="Platelets">Platelets (PLT)</option>
                    <option value="FreshFrozenPlasma">Fresh Frozen Plasma (FFP)</option>
                    <option value="WholeBlood">Whole Blood</option>
                    <option value="Cryoprecipitate">Cryoprecipitate</option>
                  </select>
                </div>

                {/* Units Requested */}
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Units Quantity
                  </label>
                  <input
                    type="number"
                    {...registerCreate('unitsRequested')}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none"
                  />
                </div>

                {/* Urgency */}
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Clinical Urgency Level
                  </label>
                  <select
                    {...registerCreate('urgency')}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none"
                  >
                    <option value="Routine">Routine</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>

                {/* Required Date */}
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Required Delivery Date
                  </label>
                  <input
                    type="date"
                    {...registerCreate('requiredDateUtc')}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none"
                  />
                </div>

              </div>

              {/* Indication */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Clinical Indication (Justification)
                </label>
                <textarea
                  {...registerCreate('clinicalIndication')}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none"
                  placeholder="E.g., Severe postpartum hemorrhage, hemoglobin 6.2..."
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
                  disabled={createRequestMutation.isPending}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  {createRequestMutation.isPending ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
