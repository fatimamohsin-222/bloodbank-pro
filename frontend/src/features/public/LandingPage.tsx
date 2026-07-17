import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Heart, MapPin, Activity, ShieldCheck, 
  ArrowRight, Flame, LogIn, Users 
} from 'lucide-react';
import api from '../../lib/api';
import type { Facility } from '../../types';

export default function LandingPage() {
  const { data: facilities = [] } = useQuery<Facility[]>({
    queryKey: ['facilities'],
    queryFn: async () => {
      const res = await api.get<Facility[]>('/facilities');
      return res.data;
    }
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2 text-red-600 dark:text-red-500 hover:opacity-90">
            <Heart className="h-6 w-6 fill-current animate-pulse" />
            <span className="font-black text-lg tracking-tight uppercase">BloodBank Pro</span>
          </Link>
          
          <nav className="hidden md:flex items-center space-x-6 text-xs font-bold text-slate-600 dark:text-slate-300">
            <Link to="/register?role=Donor" className="hover:text-red-600 dark:hover:text-red-500">Become a Donor</Link>
            <Link to="/register?role=Recipient" className="hover:text-red-600 dark:hover:text-red-500">Request Blood</Link>
            <Link to="/login" className="hover:text-red-600 dark:hover:text-red-500">Clinical Portal</Link>
          </nav>

          <div className="flex items-center space-x-3 font-bold text-xs">
            <Link 
              to="/login"
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all flex items-center space-x-1"
            >
              <LogIn className="h-4 w-4" />
              <span>Login</span>
            </Link>
            <Link 
              to="/register"
              className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition-all"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32 bg-slate-900 text-white select-none">
        {/* Decorative Grid Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-25" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-red-500/10 text-red-400 text-[10px] font-bold uppercase tracking-widest rounded-full border border-red-500/20">
              <Flame className="h-3.5 w-3.5" />
              <span>Emergency Preparedness Network</span>
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08]">
              Your Blood Donation <br />
              <span className="text-red-500 bg-clip-text">Saves Clinical Lives</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-lg leading-relaxed font-medium">
              BloodBank Pro connects generous donors with patients in emergency need across clinical facility networks. Join the digital lifesaver registry today.
            </p>
            <div className="flex flex-wrap gap-4 pt-2 font-bold text-xs">
              <Link 
                to="/register?role=Donor"
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg transition-all flex items-center space-x-2"
              >
                <span>Register as a Donor</span>
                <ArrowRight className="h-4.5 w-4.5" />
              </Link>
              <Link 
                to="/register?role=Recipient"
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all border border-slate-700"
              >
                Request Blood Transfusion
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/40 border border-slate-700/60 p-6 rounded-2xl space-y-2">
              <Users className="h-8 w-8 text-red-500" />
              <h3 className="text-2xl font-black text-white">10k+</h3>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Registered Donors</p>
            </div>
            <div className="bg-slate-800/40 border border-slate-700/60 p-6 rounded-2xl space-y-2">
              <Heart className="h-8 w-8 text-red-500 fill-current animate-pulse" />
              <h3 className="text-2xl font-black text-white">45</h3>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Minutes to Save a Life</p>
            </div>
            <div className="bg-slate-800/40 border border-slate-700/60 p-6 rounded-2xl space-y-2 col-span-2">
              <Activity className="h-8 w-8 text-red-500" />
              <h3 className="text-xl font-bold text-white">Live Tracking & Expiry Exclusions</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Advanced logistics tracking enforces temperature seals, shelf life safety checks, and ABO compatibility screening automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Facilities Lookup Directory */}
      <section className="py-20 max-w-7xl mx-auto px-6 w-full space-y-12">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Active Donation & Transfusion Centers</h2>
          <p className="text-sm text-slate-550 dark:text-slate-400 font-medium">
            Find an authorized clinical facility in our network to book your donation slot or request blood components.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {facilities.map(facility => (
            <div key={facility.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-2xs space-y-4 hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-3 text-red-600 dark:text-red-500">
                <MapPin className="h-5 w-5" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">{facility.name}</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                Address: {facility.address} <br />
                Scope: Clinical Blood Center & Transfusion Unit
              </p>
              <div className="pt-2 flex space-x-3 font-bold text-xs">
                <Link
                  to={`/register?role=Donor&facilityId=${facility.id}`}
                  className="flex-1 text-center py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors"
                >
                  Book Slot
                </Link>
                <Link
                  to={`/register?role=Recipient&facilityId=${facility.id}`}
                  className="flex-1 text-center py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors"
                >
                  Request Blood
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Info Guidelines */}
      <section className="bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800 py-16">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Who Can Give Blood?</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              To ensure safety for both donors and recipients, our clinical platform enforces strict screening guidelines during session check-ins:
            </p>
            <div className="space-y-3.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <div className="flex items-center space-x-3">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                <span>Age between 18 and 65 years.</span>
              </div>
              <div className="flex items-center space-x-3">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                <span>Weight above 50 kg (110 lbs).</span>
              </div>
              <div className="flex items-center space-x-3">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                <span>Normal blood pressure, pulse, and hemoglobin levels (&gt;= 12.5 g/dL).</span>
              </div>
              <div className="flex items-center space-x-3">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                <span>No history of high-risk infectious diseases (negative screening required).</span>
              </div>
              <div className="flex items-center space-x-3">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                <span>Standard 90-day cooldown interval since your last donation.</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">ABO Compatibility Matrix</h3>
            <table className="w-full text-left text-xs border-collapse font-medium">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                  <th className="py-2">Blood Group</th>
                  <th className="py-2">Can Receive From</th>
                  <th className="py-2">Can Give To</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                <tr>
                  <td className="py-2 font-bold text-red-600">O-</td>
                  <td className="py-2">O-</td>
                  <td className="py-2">All (Universal Donor)</td>
                </tr>
                <tr>
                  <td className="py-2 font-bold text-red-600">O+</td>
                  <td className="py-2">O+, O-</td>
                  <td className="py-2">O+, A+, B+, AB+</td>
                </tr>
                <tr>
                  <td className="py-2 font-bold text-red-600">A-</td>
                  <td className="py-2">A-, O-</td>
                  <td className="py-2">A-, A+, AB-, AB+</td>
                </tr>
                <tr>
                  <td className="py-2 font-bold text-red-600">A+</td>
                  <td className="py-2">A+, A-, O+, O-</td>
                  <td className="py-2">A+, AB+</td>
                </tr>
                <tr>
                  <td className="py-2 font-bold text-red-600">AB+</td>
                  <td className="py-2">All (Universal Recipient)</td>
                  <td className="py-2">AB+</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-400 py-8 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-2 text-white">
            <Heart className="h-5 w-5 fill-current text-red-600" />
            <span className="font-extrabold uppercase tracking-tight">BloodBank Pro System</span>
          </div>
          <p>© 2026 BloodBank Pro. Authorized clinical facility integration only.</p>
        </div>
      </footer>

    </div>
  );
}
