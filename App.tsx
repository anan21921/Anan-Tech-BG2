
import React, { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { UserPanel } from './components/UserPanel';
import { AdminPanel } from './components/AdminPanel';
import { getCurrentUser, logout } from './services/authService';
import { User } from './types';

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [checkingAuth, setCheckingAuth] = useState(true);

    const refreshUser = () => {
        const updatedUser = getCurrentUser();
        if (updatedUser) {
            // Only update state if data actually changed to prevent re-renders
            setUser(prev => {
                if (JSON.stringify(prev) !== JSON.stringify(updatedUser)) {
                    return updatedUser;
                }
                return prev;
            });
        } else {
            // If session became invalid (e.g. user deleted), logout
             if (user) setUser(null);
        }
    };

    useEffect(() => {
        refreshUser();
        setCheckingAuth(false);

        // Poll for updates (e.g. balance changes approved by admin in another tab)
        const interval = setInterval(refreshUser, 2000);

        // Listen for storage events (cross-tab updates)
        const handleStorageChange = () => refreshUser();
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('anan-app-update', handleStorageChange);

        return () => {
            clearInterval(interval);
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('anan-app-update', handleStorageChange);
        };
    }, []);

    const handleLogin = (loggedInUser: User) => {
        setUser(loggedInUser);
    };

    const handleLogout = () => {
        logout();
        setUser(null);
    };

    if (checkingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user) {
        return <Login onLogin={handleLogin} />;
    }

    if (user.role === 'admin') {
        return <AdminPanel user={user} onLogout={handleLogout} />;
    }

    return <UserPanel user={user} onLogout={handleLogout} onRefreshUser={refreshUser} />;
};

export default App;
