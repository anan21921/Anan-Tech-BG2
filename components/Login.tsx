import React, { useState } from 'react';
import { Zap, Lock, User as UserIcon, Loader2, AlertCircle, UserPlus, ArrowRight } from 'lucide-react';
import { login, createUser } from '../services/authService';
import { User } from '../types';

interface LoginProps {
    onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [isRegistering, setIsRegistering] = useState(false);
    
    // Form State
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setLoading(true);

        try {
            if (isRegistering) {
                // Handle Registration
                if (!name || !username || !password) {
                    setError('সবগুলো ঘর পূরণ করুন।');
                    setLoading(false);
                    return;
                }
                
                await createUser({
                    name,
                    username,
                    password,
                    role: 'user',
                    balance: 0 
                });

                setSuccessMsg('অ্যাকাউন্ট তৈরি সফল হয়েছে! এখন লগইন করুন।');
                setIsRegistering(false); 
                setPassword(''); 
            } else {
                // Handle Login
                const user = await login(username, password);
                if (user) {
                    onLogin(user);
                } else {
                    setError('ইউজারনেম অথবা পাসওয়ার্ড ভুল হয়েছে।');
                }
            }
        } catch (err: any) {
            setError(err.message || 'কোথাও সমস্যা হয়েছে। আবার চেষ্টা করুন।');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
            <div className="mb-8 text-center animate-fade-in-up">
                 <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/30 mx-auto mb-4">
                      <Zap size={32} fill="currentColor" className="text-white" />
                 </div>
                 <h1 className="text-3xl font-bold text-slate-800">Anan Tech<span className="text-blue-600">.ai</span></h1>
                 <p className="text-slate-500 text-sm mt-1">পাসপোর্ট ফটো স্টুডিও</p>
            </div>

            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl shadow-slate-200 border border-slate-100 p-8 animate-fade-in-up relative overflow-hidden">
                <h2 className="text-2xl font-bold text-slate-800 mb-2 text-center">
                    {isRegistering ? 'নতুন অ্যাকাউন্ট খুলুন' : 'লগইন করুন'}
                </h2>
                <p className="text-slate-500 text-xs text-center mb-6">
                    {isRegistering ? 'তথ্য দিয়ে ফর্মটি পূরণ করুন' : 'আপনার অ্যাকাউন্টে প্রবেশ করুন'}
                </p>
                
                {error && (
                    <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600">
                        <AlertCircle size={18} className="shrink-0 mt-0.5" />
                        <p className="text-xs font-bold">{error}</p>
                    </div>
                )}

                {successMsg && (
                    <div className="mb-6 p-3 bg-green-50 border border-green-100 rounded-xl flex items-start gap-3 text-green-600">
                        <AlertCircle size={18} className="shrink-0 mt-0.5" />
                        <p className="text-xs font-bold">{successMsg}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {isRegistering && (
                         <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">আপনার নাম</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <UserPlus size={18} className="text-slate-400" />
                                </div>
                                <input 
                                    type="text" 
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-800 text-sm"
                                    placeholder="আপনার পুরো নাম লিখুন"
                                    required={isRegistering}
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">ইউজারনেম</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <UserIcon size={18} className="text-slate-400" />
                            </div>
                            <input 
                                type="text" 
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-800 text-sm"
                                placeholder={isRegistering ? "ইংরেজিতে ছোট হাতের নাম" : "আপনার ইউজারনেম"}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">পাসওয়ার্ড</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock size={18} className="text-slate-400" />
                            </div>
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-800 text-sm"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transform transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : (isRegistering ? 'রেজিস্টার করুন' : 'লগইন')}
                    </button>
                </form>
                
                <div className="mt-6 text-center border-t border-slate-100 pt-4">
                    {isRegistering ? (
                        <p className="text-xs text-slate-500">
                            ইতোমধ্যে অ্যাকাউন্ট আছে?{' '}
                            <button onClick={() => setIsRegistering(false)} className="text-blue-600 font-bold hover:underline">
                                লগইন করুন
                            </button>
                        </p>
                    ) : (
                        <p className="text-xs text-slate-500">
                            কোনো অ্যাকাউন্ট নেই?{' '}
                            <button onClick={() => setIsRegistering(true)} className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1">
                                নতুন অ্যাকাউন্ট খুলুন <ArrowRight size={10}/>
                            </button>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};