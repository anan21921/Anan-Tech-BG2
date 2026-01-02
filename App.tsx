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
            setUser(updatedUser);
        }
    };

    useEffect(() => {
        refreshUser();
        setCheckingAuth(false);
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
