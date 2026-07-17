import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, Plus, Megaphone, CheckCircle, XCircle, Filter, Heart } from 'lucide-react';
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

export default function DonorListPage() {
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedEligibility, setSelectedEligibility] = useState<string>('');

  // Fetch Donors with filters
  const { data: donors = [], isLoading, error } = useQuery<Donor[]>({
    queryKey: ['donors', search, selectedGroup, selectedEligibility],
    queryFn: async () => {
      let url = `/donors?search=${encodeURIComponent(search)}`;
      if (selectedGroup) {
        url += `&bloodGroup=${selectedGroup}`;
      }
      if (selectedEligibility) {
        url += `&isEligible=${selectedEligibility === 'eligible'}`;
      }
      const res = await api.get<Donor[]>(url);
      return res.data;
    }
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Donor Registry</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Search, filter, and access clinical donor history files.
          </p>
        </div>
        <div className="flex items-center space-x-3 self-start">
          <Link
            to="/donors/recall"
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors"
          >
            <Megaphone className="h-4 w-4 text-red-600" />
            <span>Recall Campaigns</span>
          </Link>
          <Link
            to="/donors/register"
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md shadow-red-600/10 hover:shadow-red-700/20 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Register Donor</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, National ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 text-slate-900 dark:text-white"
          />
        </div>

        {/* Blood Group Filter */}
        <div className="flex items-center space-x-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 rounded-xl">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="bg-transparent border-none text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer w-full"
          >
            <option value="">All Blood Groups</option>
            {bloodGroups.map(bg => (
              <option key={bg} value={bg}>
                {bloodGroupLabels[bg]}
              </option>
            ))}
          </select>
        </div>

        {/* Eligibility Filter */}
        <div className="flex items-center space-x-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 rounded-xl">
          <Heart className="h-4 w-4 text-slate-400" />
          <select
            value={selectedEligibility}
            onChange={(e) => setSelectedEligibility(e.target.value)}
            className="bg-transparent border-none text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer w-full"
          >
            <option value="">All Eligibility Status</option>
            <option value="eligible">Eligible Only</option>
            <option value="deferred">Deferred Only</option>
          </select>
        </div>
      </div>

      {/* Registry Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="text-center py-12">
              <span className="text-slate-500 dark:text-slate-400 font-semibold text-xs">Querying donor records database...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <span className="text-red-500 font-semibold text-xs">Failed to load donor registry. Check backend server connection.</span>
            </div>
          ) : donors.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-600 font-medium text-xs">
              No matching donor profiles found in this facility.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4">Donor Name</th>
                  <th className="px-6 py-4">National ID</th>
                  <th className="px-6 py-4">Blood Type</th>
                  <th className="px-6 py-4">Contact Number</th>
                  <th className="px-6 py-4">Eligibility Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {donors.map(donor => (
                  <tr key={donor.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                      {donor.fullName}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {donor.nationalId}
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-150 dark:border-red-900 font-extrabold px-2.5 py-1 rounded-lg">
                        {bloodGroupLabels[donor.bloodGroup] || donor.bloodGroup}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">
                      {donor.contactNumber}
                    </td>
                    <td className="px-6 py-4">
                      {donor.isEligible ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                          <span>Eligible</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-900">
                          <XCircle className="h-3.5 w-3.5 text-amber-500" />
                          <span>Deferred</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/donors/${donor.id}`}
                        className="px-3.5 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase border border-slate-200 dark:border-slate-700 rounded-xl transition-colors inline-block"
                      >
                        Profile File
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
