import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft } from 'lucide-react';
import api from '../../lib/api';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFields = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const navigate = useNavigate();
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFields>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginFields) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.post('/auth/login', data);
      const { token, email, fullName, roles, facilityId } = res.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({ email, fullName, roles, facilityId }));
      if (facilityId) {
        localStorage.setItem('selectedFacilityId', facilityId);
      }
      
      const userRoles = roles || [];
      if (userRoles.includes('Donor')) {
        navigate('/donor-dashboard', { replace: true });
      } else if (userRoles.includes('Recipient')) {
        navigate('/recipient-dashboard', { replace: true });
      } else {
        navigate('/portal', { replace: true });
      }
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.detail || 
        err.response?.data?.title || 
        'An error occurred. Check your network or credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
        
        <div className="mb-6 flex justify-start border-b border-slate-100 dark:border-slate-800 pb-3">
          <Link 
            to="/" 
            className="inline-flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-bold transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Portal</span>
          </Link>
        </div>

        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-red-600 flex items-center justify-center text-white font-black text-2xl mx-auto shadow-md shadow-red-200 dark:shadow-none mb-4">
            B
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">BloodBank Pro</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">Clinical Portal Authentication</p>
        </div>

        {errorMessage && (
          <div 
            className="bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 p-4 rounded-r-xl mb-6"
            role="alert"
          >
            <p className="text-xs font-semibold text-red-800 dark:text-red-300">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label 
              htmlFor="email" 
              className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="name@hospital.com"
              {...register('email')}
              aria-invalid={errors.email ? 'true' : 'false'}
              aria-describedby={errors.email ? 'email-error' : undefined}
              className={`w-full px-4 py-3 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all ${
                errors.email ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-red-600'
              }`}
            />
            {errors.email && (
              <span id="email-error" className="block text-xs text-red-500 mt-1.5 font-semibold">
                {errors.email.message}
              </span>
            )}
          </div>

          <div>
            <label 
              htmlFor="password" 
              className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register('password')}
              aria-invalid={errors.password ? 'true' : 'false'}
              aria-describedby={errors.password ? 'password-error' : undefined}
              className={`w-full px-4 py-3 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all ${
                errors.password ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-red-600'
              }`}
            />
            {errors.password && (
              <span id="password-error" className="block text-xs text-red-500 mt-1.5 font-semibold">
                {errors.password.message}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold rounded-xl shadow-lg shadow-red-600/10 hover:shadow-red-700/25 transition-all text-xs uppercase tracking-wider flex items-center justify-center space-x-2 cursor-pointer"
          >
            {loading ? <span>Authenticating...</span> : <span>Access Console</span>}
          </button>
        </form>

        <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-3 text-center">
            Demo Credentials
          </span>
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <div className="flex justify-between">
              <span>SuperAdmin:</span>
              <span className="text-slate-900 dark:text-slate-200">admin@bloodbankpro.com / Admin123!</span>
            </div>
            <div className="flex justify-between">
              <span>Technologist:</span>
              <span className="text-slate-900 dark:text-slate-200">labtechnologist1@bloodbankpro.com / Password123!</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
