import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, RefreshCw, LogOut, FileText, Plus 
} from 'lucide-react';
import api from '../../lib/api';
import type { Facility } from '../../types';

interface RecipientRequest {
  id: string;
  requestNumber: string;
  facilityName: string;
  patientName: string;
  patientBloodGroup: string;
  componentType: string;
  unitsRequested: number;
  urgency: string;
  status: string;
  requiredDateUtc: string;
  clinicalIndication: string;
}

const recipientRequestSchema = z.object({
  facilityId: z.string().min(1, 'Clinical center location is required'),
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

type RecipientRequestFields = z.infer<typeof recipientRequestSchema>;

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
  Pending: 'Awaiting Crossmatch',
  Reserved: 'Cleared for Issue',
  Fulfilled: 'Transfused (Complete)',
  Cancelled: 'Cancelled'
};

const urgencyColors: Record<string, string> = {
  Routine: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  Urgent: 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300 border-amber-100',
  Emergency: 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-305 border-red-105'
};

export default function RecipientDashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cachedUserStr = localStorage.getItem('user');
  const user = cachedUserStr ? JSON.parse(cachedUserStr) : null;
  const patientFullName = user?.fullName || 'Recipient User';

  const { register, handleSubmit, reset, formState: { errors } } = useForm<any>({
    resolver: zodResolver(recipientRequestSchema),
    defaultValues: {
      patientName: patientFullName,
      patientBloodGroup: 'OPositive',
      componentType: 'RedBloodCells',
      urgency: 'Routine',
      unitsRequested: 1,
      requiredDateUtc: new Date(Date.now() + 86400000).toISOString().split('T')[0] // tomorrow
    }
  });

  // 1. Fetch Recipient Blood Requests
  const { data: requests = [], isLoading: isRequestsLoading } = useQuery<RecipientRequest[]>({
    queryKey: ['recipientRequests'],
    queryFn: async () => {
      const res = await api.get<RecipientRequest[]>('/public/recipient/requests');
      return res.data;
    }
  });

  // 2. Fetch Facilities for drop-down
  const { data: facilities = [] } = useQuery<Facility[]>({
    queryKey: ['facilities'],
    queryFn: async () => {
      const res = await api.get<Facility[]>('/facilities');
      return res.data;
    }
  });

  // 3. Submit Request Mutation
  const requestMutation = useMutation({
    mutationFn: async (data: RecipientRequestFields) => {
      const res = await api.post('/public/recipient/requests', data);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['recipientRequests'] });
      setSuccessMsg(data.message || 'Blood request submitted successfully.');
      setShowAddForm(false);
      reset();
      setTimeout(() => setSuccessMsg(null), 5000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || err.response?.data?.title || 'Request submission failed.');
      setTimeout(() => setErrorMsg(null), 5000);
    }
  });

  const onSubmitRequest = (data: RecipientRequestFields) => {
    requestMutation.mutate(data);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-200">
      
      {/* Header Banner */}
      <header className="bg-slate-900 text-white py-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-red-500">
            <Heart className="h-6 w-6 fill-current animate-pulse" />
            <span className="font-black text-lg tracking-tight uppercase text-white">Recipient Portal</span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right text-xs">
              <span className="block font-bold text-white">{patientFullName}</span>
              <span className="block text-[10px] text-red-400 font-extrabold uppercase">Patient Account</span>
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
      <main className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full space-y-6">
        
        {/* Upper Action Bar */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">My Transfusion Requests</h2>
            <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">Submit direct blood requests to our clinical networks and monitor logistics tracking.</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Request Blood Support</span>
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

        {/* Requests Logs Grid */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Historical Request Pipeline</span>
            <button 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['recipientRequests'] })}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className="h-4.5 w-4.5" />
            </button>
          </div>

          {isRequestsLoading ? (
            <div className="text-center py-12">
              <span className="text-slate-500 font-semibold text-xs animate-pulse">Checking database registers...</span>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-600 font-medium text-xs">
              No active blood requests logged for this account.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/40 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
                    <th className="px-5 py-3.5">Req ID</th>
                    <th className="px-5 py-3.5">Patient Target</th>
                    <th className="px-5 py-3.5">ABO/Rh Group</th>
                    <th className="px-5 py-3.5">Component Type</th>
                    <th className="px-5 py-3.5">Facility Location</th>
                    <th className="px-5 py-3.5">Required Date</th>
                    <th className="px-5 py-3.5">Urgency</th>
                    <th className="px-5 py-3.5">Pipeline Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {requests.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
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
                        {componentTypeLabels[r.componentType]} ({r.unitsRequested}u)
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-500">
                        {r.facilityName}
                      </td>
                      <td className="px-5 py-4 text-slate-550">
                        {new Date(r.requiredDateUtc).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${urgencyColors[r.urgency]}`}>
                          {r.urgency}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>

      {/* Request Blood Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-xl animate-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <FileText className="h-5 w-5 text-red-600" />
              <span>Blood Transfusion Request Order</span>
            </h3>

            <form onSubmit={handleSubmit(onSubmitRequest)} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Facility center */}
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Select Target Center Location
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
                  {errors.facilityId && <span className="text-[11px] text-red-500">{String(errors.facilityId.message)}</span>}
                </div>

                {/* Patient Name */}
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Patient Name
                  </label>
                  <input
                    type="text"
                    {...register('patientName')}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none"
                  />
                  {errors.patientName && <span className="text-[11px] text-red-500">{String(errors.patientName.message)}</span>}
                </div>

                {/* National ID */}
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Patient National ID
                  </label>
                  <input
                    type="text"
                    {...register('patientNationalId')}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none"
                    placeholder="Enter ID Number"
                  />
                  {errors.patientNationalId && <span className="text-[11px] text-red-500">{String(errors.patientNationalId.message)}</span>}
                </div>

                {/* Patient DOB */}
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Patient Date of Birth
                  </label>
                  <input
                    type="date"
                    {...register('patientDateOfBirth')}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none"
                  />
                  {errors.patientDateOfBirth && <span className="text-[11px] text-red-500">{String(errors.patientDateOfBirth.message)}</span>}
                </div>

                {/* Blood Group */}
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Patient Blood Group
                  </label>
                  <select
                    {...register('patientBloodGroup')}
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
                    {...register('componentType')}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none"
                  >
                    <option value="RedBloodCells">Red Blood Cells (RBC)</option>
                    <option value="Platelets">Platelets (PLT)</option>
                    <option value="FreshFrozenPlasma">Fresh Frozen Plasma (FFP)</option>
                    <option value="WholeBlood">Whole Blood</option>
                    <option value="Cryoprecipitate">Cryoprecipitate</option>
                  </select>
                </div>

                {/* Units */}
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Quantity (Units)
                  </label>
                  <input
                    type="number"
                    {...register('unitsRequested')}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none"
                  />
                  {errors.unitsRequested && <span className="text-[11px] text-red-500">{String(errors.unitsRequested.message)}</span>}
                </div>

                {/* Urgency */}
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Urgency Priority
                  </label>
                  <select
                    {...register('urgency')}
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
                    {...register('requiredDateUtc')}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none"
                  />
                  {errors.requiredDateUtc && <span className="text-[11px] text-red-500">{String(errors.requiredDateUtc.message)}</span>}
                </div>

              </div>

              {/* Indication */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Clinical Indication (Reason)
                </label>
                <textarea
                  {...register('clinicalIndication')}
                  rows={2}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none"
                  placeholder="Justification for transfusion support..."
                />
                {errors.clinicalIndication && <span className="text-[11px] text-red-500">{String(errors.clinicalIndication.message)}</span>}
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
                  disabled={requestMutation.isPending}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  {requestMutation.isPending ? 'Submitting request...' : 'Confirm Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
