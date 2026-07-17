import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronLeft, Send, Info, Filter } from 'lucide-react';

import api from '../../lib/api';
import type { Donor } from '../../types';

const bloodGroups = ['APositive', 'ANegative', 'BPositive', 'BNegative', 'OPositive', 'ONegative', 'ABPositive', 'ABNegative'];

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

export default function RecallCampaignPage() {
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedDonorIds, setSelectedDonorIds] = useState<string[]>([]);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  // 1. Fetch Recall Candidates
  const { data: candidates = [], isLoading, error } = useQuery<Donor[]>({
    queryKey: ['recallCandidates', selectedGroup],
    queryFn: async () => {
      let url = '/donors/recall';
      if (selectedGroup) {
        url += `?bloodGroup=${selectedGroup}`;
      }
      const res = await api.get<Donor[]>(url);
      return res.data;
    }
  });

  // 2. Dispatch Recall Mutation
  const dispatchMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await api.post('/donors/recall/notify', ids);
      return res.data;
    },
    onSuccess: (data) => {
      setSuccessCount(data.messagesDispatched);
      setSelectedDonorIds([]);
      setTimeout(() => setSuccessCount(null), 5000);
    }
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDonorIds(candidates.map(c => c.id));
    } else {
      setSelectedDonorIds([]);
    }
  };

  const handleSelectDonor = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedDonorIds(prev => [...prev, id]);
    } else {
      setSelectedDonorIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleDispatch = () => {
    if (selectedDonorIds.length === 0) return;
    dispatchMutation.mutate(selectedDonorIds);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title Header */}
      <div className="flex items-center space-x-3">
        <Link
          to="/donors"
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Recall Campaigns</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Identify eligible donors who are overdue for donation and dispatch automated recalls.
          </p>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successCount !== null && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border-l-4 border-emerald-500 p-4 rounded-r-xl">
          <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-350">
            Campaign successfully dispatched: Notification alerts sent to {successCount} eligible donor files.
          </p>
        </div>
      )}

      {/* Filter and Command Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Blood Group filter */}
        <div className="flex items-center space-x-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl w-full sm:max-w-xs">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={selectedGroup}
            onChange={(e) => {
              setSelectedGroup(e.target.value);
              setSelectedDonorIds([]);
            }}
            className="bg-transparent border-none text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer w-full"
          >
            <option value="">Target All Blood Groups</option>
            {bloodGroups.map(bg => (
              <option key={bg} value={bg}>
                Target {bloodGroupLabels[bg]} Group
              </option>
            ))}
          </select>
        </div>

        {/* Action Dispatch */}
        <button
          onClick={handleDispatch}
          disabled={selectedDonorIds.length === 0 || dispatchMutation.isPending}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all self-end sm:self-auto"
        >
          <Send className="h-4 w-4" />
          <span>
            {dispatchMutation.isPending ? 'Sending Recalls...' : `Dispatch Overdue Alert (${selectedDonorIds.length})`}
          </span>
        </button>
      </div>

      {/* Target Candidates Listing */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="text-center py-12">
              <span className="text-slate-500 dark:text-slate-400 font-semibold text-xs animate-pulse">Running overdue metrics filter...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <span className="text-red-500 font-semibold text-xs">Failed to run recall engine. Check API server.</span>
            </div>
          ) : candidates.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-600 font-medium text-xs">
              No eligible donors meet the recall criteria for this filter.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={selectedDonorIds.length === candidates.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="cursor-pointer"
                      aria-label="Select all candidates"
                    />
                  </th>
                  <th className="px-6 py-4">Overdue Candidate</th>
                  <th className="px-6 py-4">National ID</th>
                  <th className="px-6 py-4">Blood Group</th>
                  <th className="px-6 py-4">Mobile Contact</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {candidates.map(donor => {
                  const isChecked = selectedDonorIds.includes(donor.id);
                  return (
                    <tr key={donor.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleSelectDonor(donor.id, e.target.checked)}
                          className="cursor-pointer"
                          aria-label={`Select ${donor.fullName}`}
                        />
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                        {donor.fullName}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-700 dark:text-slate-300">
                        {donor.nationalId}
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-350 border border-red-150 dark:border-red-950 font-extrabold px-2.5 py-1 rounded-lg text-[10px]">
                          {bloodGroupLabels[donor.bloodGroup] || donor.bloodGroup}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-400">
                        {donor.contactNumber}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/donors/${donor.id}`}
                          className="text-red-600 hover:text-red-700 text-xs font-bold hover:underline"
                        >
                          View Profile
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Vetting disclaimer */}
      <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed flex items-start space-x-2.5">
        <Info className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
        <p>
          Recalls target eligible donors in the registry who have either never donated, or whose last donation completed more than 90 days ago. The system dispatches mock SMS and email alerts containing clinic coordinates, operating hours, and current blood shortage priority warnings.
        </p>
      </div>
    </div>
  );
}
