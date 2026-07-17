import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation } from '@tanstack/react-query';
import { ChevronLeft, UserPlus, Info } from 'lucide-react';
import api from '../../lib/api';

const donorSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(100, 'Name must not exceed 100 characters'),
  nationalId: z.string().min(1, 'National ID is required').regex(/^\d{5}-\d{7}-\d{1}$/, 'Must match format XXXXX-XXXXXXX-X'),
  dateOfBirth: z.string().min(1, 'Date of Birth is required').refine((dob) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 18 && age <= 65;
  }, 'Donor must be between 18 and 65 years old'),
  bloodGroup: z.string().min(1, 'Blood group is required'),
  gender: z.string().optional(),
  contactNumber: z.string().min(1, 'Contact number is required'),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type DonorFields = z.infer<typeof donorSchema>;

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

export default function DonorRegisterForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);

  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<DonorFields>({
    resolver: zodResolver(donorSchema)
  });

  const registerMutation = useMutation({
    mutationFn: async (data: DonorFields) => {
      // Format email to undefined if empty string
      const payload = {
        ...data,
        email: data.email === '' ? undefined : data.email,
        bloodGroup: data.bloodGroup,
      };
      const res = await api.post('/donors', payload);
      return res.data;
    },
    onSuccess: (data) => {
      navigate(`/donors/${data.id}`);
    },
    onError: (err: any) => {
      if (err.response?.status === 409) {
        setFormError(err.response?.data?.detail || 'A donor with this National ID already exists.');
        setDuplicateId(err.response?.data?.existingDonorId || null);
      } else {
        setFormError(err.response?.data?.detail || err.response?.data?.title || 'An error occurred while saving the donor.');
      }
    }
  });

  const onSubmit = (data: DonorFields) => {
    setFormError(null);
    setDuplicateId(null);
    registerMutation.mutate(data);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Navigation and Title */}
      <div className="flex items-center space-x-3">
        <Link
          to="/donors"
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Clinical Intake Registry</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Register a new donor profile.</p>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        {formError && (
          <div className="bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 p-4 rounded-r-xl mb-6">
            <div className="flex items-start space-x-2">
              <span className="text-red-800 dark:text-red-300 text-xs font-semibold">{formError}</span>
            </div>
            {duplicateId && (
              <Link
                to={`/donors/${duplicateId}`}
                className="inline-block mt-2.5 text-xs font-bold text-red-700 dark:text-red-400 underline hover:no-underline"
              >
                Go to Existing Profile →
              </Link>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Full Name
              </label>
              <input
                type="text"
                placeholder="Jane Smith"
                {...register('fullName')}
                className={`w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all ${
                  errors.fullName ? 'border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-red-600'
                }`}
              />
              {errors.fullName && <span className="block text-[11px] text-red-500 mt-1">{errors.fullName.message}</span>}
            </div>

            {/* National ID */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                National ID Number (Format: XXXXX-XXXXXXX-X)
              </label>
              <input
                type="text"
                placeholder="42101-1234567-1"
                {...register('nationalId')}
                className={`w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all ${
                  errors.nationalId ? 'border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-red-600'
                }`}
              />
              {errors.nationalId && <span className="block text-[11px] text-red-500 mt-1">{errors.nationalId.message}</span>}
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Date of Birth (Eligible: 18 - 65 yrs)
              </label>
              <input
                type="date"
                {...register('dateOfBirth')}
                className={`w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all ${
                  errors.dateOfBirth ? 'border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-red-600'
                }`}
              />
              {errors.dateOfBirth && <span className="block text-[11px] text-red-500 mt-1">{errors.dateOfBirth.message}</span>}
            </div>

            {/* Blood Group */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                ABO / Rh Blood Group
              </label>
              <select
                {...register('bloodGroup')}
                className={`w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 ${
                  errors.bloodGroup ? 'border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-red-600'
                }`}
              >
                <option value="">Select Group</option>
                {bloodGroups.map(bg => (
                  <option key={bg.value} value={bg.value}>{bg.label}</option>
                ))}
              </select>
              {errors.bloodGroup && <span className="block text-[11px] text-red-500 mt-1">{errors.bloodGroup.message}</span>}
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Gender Identification
              </label>
              <select
                {...register('gender')}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20"
              >
                <option value="">Choose Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Contact Number */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Mobile Number
              </label>
              <input
                type="text"
                placeholder="+92 300 1234567"
                {...register('contactNumber')}
                className={`w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all ${
                  errors.contactNumber ? 'border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-red-600'
                }`}
              />
              {errors.contactNumber && <span className="block text-[11px] text-red-500 mt-1">{errors.contactNumber.message}</span>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Email Address (Optional)
              </label>
              <input
                type="email"
                placeholder="name@hospital.com"
                {...register('email')}
                className={`w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all ${
                  errors.email ? 'border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-red-600'
                }`}
              />
              {errors.email && <span className="block text-[11px] text-red-500 mt-1">{errors.email.message}</span>}
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Resident Address (Optional)
              </label>
              <input
                type="text"
                placeholder="Main Street, Appt 4B"
                {...register('address')}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Clinical Intake Comments
            </label>
            <textarea
              placeholder="Record any clinical constraints or intake comments..."
              rows={3}
              {...register('notes')}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 text-slate-900 dark:text-white resize-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Link
              to="/donors"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-330 text-xs font-bold rounded-xl transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              <span>{registerMutation.isPending ? 'Saving Record...' : 'Confirm Intake'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Compliance Note */}
      <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed flex items-start space-x-2.5">
        <Info className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
        <p>
          By clicking "Confirm Intake", the donor profile is registered to the central blood banking system. The donor must undergo a medical vetting session, ABO typing verification, and TTI tests before any collected unit is released for cross-matching or bedside transfusions.
        </p>
      </div>
    </div>
  );
}
