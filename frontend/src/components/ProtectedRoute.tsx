import { Navigate, Outlet } from 'react-router-dom';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const token = localStorage.getItem('token');
  const cachedUser = localStorage.getItem('user');

  if (!token || !cachedUser) {
    return <Navigate to="/login" replace />;
  }

  const user = JSON.parse(cachedUser);
  const userRoles: string[] = user.roles || [];

  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = allowedRoles.some(role => userRoles.includes(role));
    if (!hasRole) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="h-16 w-16 bg-red-100 dark:bg-red-950/40 text-red-600 rounded-full flex items-center justify-center text-3xl mb-4">
            ⚠️
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">403 - Access Denied</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 max-w-md">
            You do not have the required permissions to view this clinical workflow. If you believe this is an error, please contact your system administrator.
          </p>
        </div>
      );
    }
  }

  return <Outlet />;
}
