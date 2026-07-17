import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Heart, UserPlus, CheckCircle, ArrowLeft } from 'lucide-react';
import api from '../../lib/api';

const registerSchema = z.object({
  role: z.string().min(1, 'Role selection is required'),
  fullName: z.string().min(3, 'Full name must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  nationalId: z.string().min(9, 'National ID must be between 9 and 15 characters').max(15),
  contactNumber: z.string().min(1, 'Contact number is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  bloodGroup: z.string().min(1, 'Blood group is required'),
  gender: z.string().optional(),
  address: z.string().optional(),
});

type RegisterFields = z.infer<typeof registerSchema>;

const bloodGroups = [
  { value: 'APositive', label: 'A+' }, { value: 'ANegative', label: 'A-' },
  { value: 'BPositive', label: 'B+' }, { value: 'BNegative', label: 'B-' },
  { value: 'OPositive', label: 'O+' }, { value: 'ONegative', label: 'O-' },
  { value: 'ABPositive', label: 'AB+' }, { value: 'ABNegative', label: 'AB-' }
];

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const defaultRole = searchParams.get('role') || 'Donor';

  const { register, handleSubmit, formState: { errors } } = useForm<any>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: defaultRole,
      bloodGroup: 'OPositive',
      gender: 'Male'
    }
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFields) => {
      const res = await api.post('/auth/register-public', data);
      return res.data;
    },
    onSuccess: (data) => {
      setSuccessMsg(data.message || 'Registration completed successfully!');
      setErrorMsg(null);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || err.response?.data?.title || 'Registration failed. Please verify your details.');
    }
  });

  const onSubmit = (data: RegisterFields) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center items-center p-6 relative font-sans">
      {/* Background Decorative Circles */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] opacity-25 pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-2xl bg-slate-950/80 border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 space-y-6">
        
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <Link to="/" className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white font-bold transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Portal</span>
          </Link>
          <div className="flex items-center space-x-2 text-red-500">
            <Heart className="h-5 w-5 fill-current animate-pulse" />
            <span className="font-extrabold uppercase text-sm tracking-wider">BloodBank Pro</span>
          </div>
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black tracking-tight flex items-center justify-center space-x-2">
            <UserPlus className="h-6 w-6 text-red-500" />
            <span>Create Self-Service Account</span>
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
            Become a digital life saver or request blood components for medical transfusions.
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-xs text-red-400 font-bold">
            {errorMsg}
          </div>
        )}

        {successMsg ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-2xl text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto" />
            <h3 className="text-lg font-bold text-emerald-400">Account Provisioned!</h3>
            <p className="text-xs text-slate-400">{successMsg} Redirecting to login...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Role */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Select Profile Type
                </label>
                <select
                  {...register('role')}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-white focus:outline-none"
                >
                  <option value="Donor">Donor (Save lives by giving blood)</option>
                  <option value="Recipient">Recipient / Patient (Request blood support)</option>
                </select>
                {errors.role && <span className="text-[11px] text-red-500">{String(errors.role.message)}</span>}
              </div>

              {/* Full Name */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  {...register('fullName')}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-white focus:outline-none"
                  placeholder="Enter Full Name"
                />
                {errors.fullName && <span className="text-[11px] text-red-500">{String(errors.fullName.message)}</span>}
              </div>

              {/* Email */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  {...register('email')}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-white focus:outline-none"
                  placeholder="name@example.com"
                />
                {errors.email && <span className="text-[11px] text-red-500">{String(errors.email.message)}</span>}
              </div>

              {/* Password */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Secure Password
                </label>
                <input
                  type="password"
                  {...register('password')}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-white focus:outline-none"
                  placeholder="••••••••"
                />
                {errors.password && <span className="text-[11px] text-red-500">{String(errors.password.message)}</span>}
              </div>

              {/* National ID */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  National ID (Unique Profile Key)
                </label>
                <input
                  type="text"
                  {...register('nationalId')}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-white focus:outline-none"
                  placeholder="Enter ID Number"
                />
                {errors.nationalId && <span className="text-[11px] text-red-500">{String(errors.nationalId.message)}</span>}
              </div>

              {/* Contact Number */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Phone Number
                </label>
                <input
                  type="text"
                  {...register('contactNumber')}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-white focus:outline-none"
                  placeholder="+1 (555) 000-0000"
                />
                {errors.contactNumber && <span className="text-[11px] text-red-500">{String(errors.contactNumber.message)}</span>}
              </div>

              {/* DOB */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Date of Birth
                </label>
                <input
                  type="date"
                  {...register('dateOfBirth')}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-white focus:outline-none"
                />
                {errors.dateOfBirth && <span className="text-[11px] text-red-500">{String(errors.dateOfBirth.message)}</span>}
              </div>

              {/* Blood Group */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Confirmed Blood Group
                </label>
                <select
                  {...register('bloodGroup')}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-white focus:outline-none"
                >
                  {bloodGroups.map(bg => (
                    <option key={bg.value} value={bg.value}>{bg.label}</option>
                  ))}
                  <option value="Unknown">Unknown (Test Required)</option>
                </select>
              </div>

              {/* Gender */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Gender
                </label>
                <select
                  {...register('gender')}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-white focus:outline-none"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Address */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Home Address
                </label>
                <input
                  type="text"
                  {...register('address')}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-white focus:outline-none"
                  placeholder="Enter street address"
                />
              </div>

            </div>

            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition-all cursor-pointer text-xs uppercase tracking-wider mt-4"
            >
              {registerMutation.isPending ? 'Provisioning Profile...' : 'Confirm Sign Up'}
            </button>

            <p className="text-center text-slate-400 pt-2 font-medium">
              Already have an account?{' '}
              <Link to="/login" className="text-red-500 hover:underline">
                Login here
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
