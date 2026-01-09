import React, { useState, useEffect, useRef } from 'react';
import { User, RechargeRequest, GeneratedImage } from '../types';
import { LogOut, Users, Activity, ShieldCheck, Plus, Coins, X, Check, Download, Upload, Database, Loader2, RefreshCw, Search, Wallet, AlertTriangle, Minus, LayoutGrid, Calendar } from 'lucide-react';
import { getAllUsers, createUser, updateBalance, getRechargeRequests, handleRechargeRequest, getFullDatabaseJSON, restoreDatabaseFromJSON, getAllGeneratedImages } from '../services/authService';

interface AdminPanelProps {
    user: User;
    onLogout: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ user, onLogout }) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'requests' | 'gallery' | 'settings'>('dashboard');
    const [usersList, setUsersList] = useState<User[]>([]);
    const [requestList, setRequestList] = useState<RechargeRequest[]>([]);
    const [galleryImages, setGalleryImages] = useState<GeneratedImage[]>([]);
    
    // Filters
    const [galleryDateFilter, setGalleryDateFilter] = useState('');
    const [galleryUserSearch, setGalleryUserSearch] = useState('');

    // Modals State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showBalanceModal, setShowBalanceModal] = useState(false);
    
    // Payment Action Confirmation Modal State
    const [actionConfirm, setActionConfirm] = useState<{id: string, type: 'approved' | 'rejected'} | null>(null);
    
    // Selection for Balance Add
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [balanceAmount, setBalanceAmount] = useState('');
    const [balanceActionType, setBalanceActionType] = useState<'add' | 'deduct'>('add');

    // Create User Form
    const [newUser, setNewUser] = useState({ username: '', password: '', name: '', balance: 0 });
    
    // Processing States
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const refreshData = () => {
        setUsersList(getAllUsers());
        setRequestList(getRechargeRequests());
        setGalleryImages(getAllGeneratedImages());
    };

    // Auto refresh every 5 seconds to catch new requests
    useEffect(() => {
        refreshData();
        const interval = setInterval(refreshData, 5000);
        return () => clearInterval(interval);
    }, []);

    // --- HANDLERS ---

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            await createUser({ ...newUser, role: 'user' });
            setShowCreateModal(false);
            setNewUser({ username: '', password: '', name: '', balance: 0 });
            refreshData();
            alert('ইউজার সফলভাবে তৈরি হয়েছে!');
        } catch (error: any) {
            alert(error.message || 'ইউজার তৈরি করা সম্ভব হয়নি');
        } finally {
            setIsProcessing(false);
        }
    };

    const openBalanceModal = (u: User) => {
        setSelectedUser(u);
        setBalanceAmount('');
        setBalanceActionType('add');
        setShowBalanceModal(true);
    };

    const handleUpdateBalance = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;
        
        let amount = parseInt(balanceAmount);
        if (isNaN(amount) || amount <= 0) {
            alert("সঠিক টাকার পরিমাণ দিন");
            return;
        }

        // Handle deduction
        if (balanceActionType === 'deduct') {
            amount = -amount;
        }

        setIsProcessing(true);
        try {
            // Updated call with description
            const result = await updateBalance(
                selectedUser.id, 
                amount, 
                balanceActionType === 'add' ? 'Admin Added Balance' : 'Admin Deducted Balance'
            );
            
            if (result) {
                alert(`সফলভাবে ব্যালেন্স আপডেট হয়েছে।`);
                setShowBalanceModal(false);
                refreshData();
            } else {
                alert("ব্যালেন্স আপডেট ব্যর্থ হয়েছে।");
            }
        } catch (error) {
            console.error(error);
            alert("কোথাও সমস্যা হয়েছে।");
        } finally {
            setIsProcessing(false);
        }
    };

    const confirmActionHandler = async () => {
        if (!actionConfirm) return;
        const { id, type } = actionConfirm;
        
        setProcessingId(id);
        setActionConfirm(null); // Close modal

        try {
            const success = await handleRechargeRequest(id, type);
            if (success) {
                refreshData();
            } else {
                alert('রিকোয়েস্ট প্রসেস করা সম্ভব হয়নি। ইউজার খুঁজে পাওয়া যায়নি বা রিকোয়েস্টটি আর পেন্ডিং নেই।');
                refreshData(); 
            }
        } catch (e) {
            console.error(e);
            alert('সার্ভার এরর হয়েছে।');
        } finally {
            setProcessingId(null);
        }
    };

    // --- DATABASE BACKUP/RESTORE ---

    const handleBackup = () => {
        const json = getFullDatabaseJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `anan-tech-db-${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = event.target?.result as string;
                if (restoreDatabaseFromJSON(json)) {
                    alert('ডাটাবেস সফলভাবে রিস্টোর হয়েছে! পেজ রিফ্রেশ হচ্ছে...');
                    window.location.reload();
                } else {
                    alert('ভুল ফাইল ফরম্যাট।');
                }
            } catch (error) {
                alert('ফাইল রিড করতে সমস্যা হয়েছে।');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    // Filter Logic for Gallery
    const filteredGallery = galleryImages.filter(img => {
        const matchesDate = !galleryDateFilter || new Date(img.date).toISOString().slice(0, 10) === galleryDateFilter;
        const matchesUser = !galleryUserSearch || img.userName.toLowerCase().includes(galleryUserSearch.toLowerCase());
        return matchesDate && matchesUser;
    });

    const pendingRequests = requestList.filter(r => r.status === 'pending').length;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
             {/* Navbar */}
            <nav className="bg-slate-900 sticky top-0 z-50 shadow-md">
                <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white">
                             <ShieldCheck size={20} />
                        </div>
                        <h1 className="text-lg font-bold text-white tracking-wide hidden sm:block">Admin Dashboard</h1>
                        <h1 className="text-lg font-bold text-white tracking-wide sm:hidden">Admin</h1>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto">
                        <nav className="flex gap-1">
                            <button 
                                onClick={() => setActiveTab('dashboard')}
                                className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors ${activeTab === 'dashboard' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                ড্যাশবোর্ড
                            </button>
                            <button 
                                onClick={() => setActiveTab('users')}
                                className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors ${activeTab === 'users' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                ইউজার
                            </button>
                            <button 
                                onClick={() => setActiveTab('requests')}
                                className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors relative ${activeTab === 'requests' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                পেমেন্ট
                                {pendingRequests > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full animate-bounce">
                                        {pendingRequests}
                                    </span>
                                )}
                            </button>
                            <button 
                                onClick={() => setActiveTab('gallery')}
                                className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors ${activeTab === 'gallery' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                গ্যালারি
                            </button>
                             <button 
                                onClick={() => setActiveTab('settings')}
                                className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors ${activeTab === 'settings' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                সেটিংস
                            </button>
                        </nav>
                        <div className="h-6 w-px bg-white/20 mx-2 hidden sm:block"></div>
                        <button 
                            onClick={onLogout}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all"
                            title="লগ আউট"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </nav>

            <main className="flex-grow max-w-[1600px] mx-auto w-full p-4 sm:p-6 space-y-8">
                
                {activeTab === 'dashboard' && (
                    <div className="animate-fade-in-up">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                                    <Users size={28} />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 font-medium">মোট ইউজার</p>
                                    <h3 className="text-2xl font-bold text-slate-800">{usersList.length}</h3>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                                <div className="w-14 h-14 bg-pink-50 text-pink-600 rounded-full flex items-center justify-center">
                                    <Coins size={28} />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 font-medium">পেন্ডিং রিকোয়েস্ট</p>
                                    <h3 className="text-2xl font-bold text-slate-800">{pendingRequests}</h3>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                                <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center">
                                    <LayoutGrid size={28} />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 font-medium">মোট ছবি</p>
                                    <h3 className="text-2xl font-bold text-slate-800">{galleryImages.length}</h3>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                                    <Activity size={28} />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 font-medium">সিস্টেম স্ট্যাটাস</p>
                                    <h3 className="text-lg font-bold text-green-600">Active</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                {activeTab === 'users' && (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-slate-800">সকল ইউজার</h2>
                            <button 
                                onClick={() => setShowCreateModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
                            >
                                <Plus size={18} /> নতুন ইউজার
                            </button>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                             <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-slate-500 text-xs uppercase tracking-wider bg-slate-50">
                                            <th className="px-6 py-4 font-semibold">নাম</th>
                                            <th className="px-6 py-4 font-semibold">ইউজারনেম</th>
                                            <th className="px-6 py-4 font-semibold">রোল</th>
                                            <th className="px-6 py-4 font-semibold">বর্তমান ব্যালেন্স</th>
                                            <th className="px-6 py-4 font-semibold text-right">অ্যাকশন</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
                                        {usersList.map((u) => (
                                            <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 flex items-center gap-3 font-medium">
                                                    <img src={u.avatar} className="w-8 h-8 rounded-full bg-slate-200" alt=""/>
                                                    {u.name}
                                                </td>
                                                <td className="px-6 py-4 font-mono text-slate-500">{u.username}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-slate-800">৳ {u.balance}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <button 
                                                        onClick={() => openBalanceModal(u)}
                                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors border border-slate-200"
                                                    >
                                                        <Coins size={14} /> ব্যালেন্স
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'requests' && (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-slate-800">রিচার্জ রিকোয়েস্ট</h2>
                            <button onClick={refreshData} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full" title="Refresh">
                                <RefreshCw size={20} />
                            </button>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                             <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-slate-500 text-xs uppercase tracking-wider bg-slate-50">
                                            <th className="px-6 py-4 font-semibold">তারিখ</th>
                                            <th className="px-6 py-4 font-semibold">ইউজার</th>
                                            <th className="px-6 py-4 font-semibold">টাকার পরিমাণ</th>
                                            <th className="px-6 py-4 font-semibold">মেথড</th>
                                            <th className="px-6 py-4 font-semibold">TrxID / Sender</th>
                                            <th className="px-6 py-4 font-semibold">স্ট্যাটাস</th>
                                            <th className="px-6 py-4 font-semibold text-right">অ্যাকশন</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
                                        {requestList.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                                    কোনো রিকোয়েস্ট পাওয়া যায়নি
                                                </td>
                                            </tr>
                                        ) : requestList.map((req) => (
                                            <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 text-xs text-slate-500">
                                                    {new Date(req.date).toLocaleDateString()} <br/>
                                                    {new Date(req.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </td>
                                                <td className="px-6 py-4 font-medium">{req.userName}</td>
                                                <td className="px-6 py-4 font-bold text-slate-800">৳ {req.amount}</td>
                                                <td className="px-6 py-4 uppercase text-xs font-bold text-pink-600">{req.method}</td>
                                                <td className="px-6 py-4 text-xs">
                                                    <div className="font-mono font-bold text-slate-700 bg-slate-100 px-1 rounded inline-block mb-1">{req.trxId}</div>
                                                    <div className="text-slate-500">{req.senderNumber}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                                        req.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                        req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                        {req.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {req.status === 'pending' && (
                                                        <div className="flex justify-end gap-2">
                                                            {processingId === req.id ? (
                                                                <Loader2 className="animate-spin text-blue-600" size={20} />
                                                            ) : (
                                                                <>
                                                                    <button 
                                                                        onClick={() => setActionConfirm({id: req.id, type: 'approved'})}
                                                                        className="p-1.5 bg-green-50 text-green-600 rounded hover:bg-green-100 border border-green-200 transition-colors"
                                                                        title="Approve"
                                                                    >
                                                                        <Check size={16} />
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => setActionConfirm({id: req.id, type: 'rejected'})}
                                                                        className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 border border-red-200 transition-colors"
                                                                        title="Reject"
                                                                    >
                                                                        <X size={16} />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'gallery' && (
                     <div className="space-y-6 animate-fade-in-up">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <h2 className="text-2xl font-bold text-slate-800">গ্যালারি হিস্টোরি</h2>
                            <div className="flex flex-wrap items-center gap-3">
                                 <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
                                    <Calendar size={16} className="text-slate-400"/>
                                    <input 
                                        type="date" 
                                        className="text-xs outline-none bg-transparent"
                                        value={galleryDateFilter}
                                        onChange={(e) => setGalleryDateFilter(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 w-48">
                                    <Search size={16} className="text-slate-400"/>
                                    <input 
                                        type="text" 
                                        className="text-xs outline-none bg-transparent w-full"
                                        placeholder="ইউজার সার্চ করুন..."
                                        value={galleryUserSearch}
                                        onChange={(e) => setGalleryUserSearch(e.target.value)}
                                    />
                                </div>
                                {(galleryDateFilter || galleryUserSearch) && (
                                     <button 
                                        onClick={() => {setGalleryDateFilter(''); setGalleryUserSearch('');}}
                                        className="text-xs text-red-500 font-bold hover:underline"
                                     >
                                         রিসেট
                                     </button>
                                )}
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 min-h-[400px]">
                            {filteredGallery.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                    <LayoutGrid size={48} className="mb-4 opacity-20" />
                                    <p>কোনো ছবি পাওয়া যায়নি</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    {filteredGallery.map((img) => (
                                        <div key={img.id} className="group bg-slate-50 rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
                                            <div className="aspect-[3/4] bg-slate-200 relative">
                                                <img src={img.imageBase64} className="w-full h-full object-cover" alt="Generated" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <a 
                                                        href={img.imageBase64} 
                                                        download={`anan-tech-${img.id}.jpg`}
                                                        className="p-2 bg-white rounded-full text-slate-800 hover:text-blue-600 transition-colors"
                                                        title="ডাউনলোড"
                                                    >
                                                        <Download size={16} />
                                                    </a>
                                                </div>
                                            </div>
                                            <div className="p-2 bg-white">
                                                <p className="text-[10px] font-bold text-slate-800 truncate">{img.userName}</p>
                                                <p className="text-[9px] text-slate-400">{new Date(img.date).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="space-y-6 animate-fade-in-up">
                         <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-slate-800">ডাটাবেস সেটিংস</h2>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                             <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Database size={20} className="text-blue-600"/>
                                ডাটা ব্যাকআপ ও রিস্টোর
                             </h3>
                             <p className="text-sm text-slate-500 mb-6 max-w-2xl">
                                ব্রাউজার পরিবর্তন করলে লোকাল ডাটা হারিয়ে যেতে পারে। নিরাপদ থাকতে নিয়মিত ডাটা ডাউনলোড (Backup) করে রাখুন। 
                                অন্য ব্রাউজারে বা ডিভাইসে কাজ করতে চাইলে ব্যাকআপ ফাইলটি এখানে আপলোড (Restore) করুন।
                             </p>
                             
                             <div className="flex flex-col sm:flex-row gap-4">
                                 <button 
                                    onClick={handleBackup}
                                    className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-50 text-blue-700 font-bold rounded-xl border border-blue-100 hover:bg-blue-100 transition-colors"
                                 >
                                     <Download size={18} />
                                     ডাটা ডাউনলোড (Backup)
                                 </button>
                                 
                                 <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors"
                                 >
                                     <Upload size={18} />
                                     ডাটা আপলোড (Restore)
                                 </button>
                                 <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept=".json" 
                                    onChange={handleRestore}
                                 />
                             </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Create User Modal (ADMIN) */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800">নতুন ইউজার তৈরি করুন</h3>
                            <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">পুরো নাম</label>
                                <input 
                                    type="text" required 
                                    value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                    placeholder="যেমন: রহিম আহমেদ"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">ইউজারনেম (লগিন এর জন্য)</label>
                                <input 
                                    type="text" required 
                                    value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                    placeholder="যেমন: rahim123"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">পাসওয়ার্ড</label>
                                <input 
                                    type="text" required 
                                    value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                    placeholder="গোপন পিন বা পাসওয়ার্ড"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">শুরুর ব্যালেন্স (টাকা)</label>
                                <input 
                                    type="number" required min="0"
                                    value={newUser.balance} onChange={e => setNewUser({...newUser, balance: parseInt(e.target.value)})}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                />
                            </div>
                            
                            <div className="pt-2">
                                <button 
                                    type="submit" 
                                    disabled={isProcessing}
                                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                                >
                                    {isProcessing ? <Loader2 className="animate-spin" size={18}/> : 'সেভ করুন'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Manage Balance Modal */}
            {showBalanceModal && selectedUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800">ব্যালেন্স ম্যানেজমেন্ট</h3>
                            <button onClick={() => setShowBalanceModal(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleUpdateBalance} className="p-6">
                            <div className="text-center mb-6">
                                <img src={selectedUser.avatar} className="w-16 h-16 rounded-full mx-auto mb-2 border-2 border-slate-100" alt=""/>
                                <h4 className="font-bold text-slate-800">{selectedUser.name}</h4>
                                <p className="text-xs text-slate-500">বর্তমান: <span className="font-bold text-slate-800">৳{selectedUser.balance}</span></p>
                            </div>

                            {/* Action Toggle */}
                            <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
                                <button
                                    type="button"
                                    onClick={() => setBalanceActionType('add')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-md transition-all ${balanceActionType === 'add' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <Plus size={14} /> যোগ করুন
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBalanceActionType('deduct')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-md transition-all ${balanceActionType === 'deduct' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <Minus size={14} /> বিয়োগ করুন
                                </button>
                            </div>

                            <div className="mb-6">
                                <label className="block text-xs font-bold text-slate-500 mb-2">টাকার পরিমাণ</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-slate-400 font-bold">৳</span>
                                    </div>
                                    <input 
                                        type="number" required min="1" autoFocus
                                        value={balanceAmount} onChange={e => setBalanceAmount(e.target.value)}
                                        className={`w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 outline-none font-bold text-lg text-slate-800 ${balanceActionType === 'add' ? 'focus:ring-green-500' : 'focus:ring-red-500'}`}
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            
                            <button 
                                type="submit" 
                                disabled={isProcessing}
                                className={`w-full py-3 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${balanceActionType === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                            >
                                {isProcessing ? <Loader2 className="animate-spin" size={18}/> : (
                                    <>
                                        {balanceActionType === 'add' ? <Plus size={18} /> : <Minus size={18} />} 
                                        {balanceActionType === 'add' ? 'টাকা যোগ করুন' : 'টাকা কেটে নিন'}
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Payment Action Confirmation Modal */}
            {actionConfirm && (
                 <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up p-6 text-center">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border ${actionConfirm.type === 'approved' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                            {actionConfirm.type === 'approved' ? <Check size={32} /> : <X size={32} />}
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">
                            {actionConfirm.type === 'approved' ? 'পেমেন্ট এপ্রুভ' : 'পেমেন্ট বাতিল'}
                        </h3>
                        <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                            আপনি কি নিশ্চিতভাবে এই রিকোয়েস্টটি {actionConfirm.type === 'approved' ? 'এপ্রুভ (Approved)' : 'বাতিল (Rejected)'} করতে চান?
                            {actionConfirm.type === 'approved' && <span className="block mt-1 text-green-600 font-bold">ইউজারের ব্যালেন্স যোগ হবে।</span>}
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setActionConfirm(null)}
                                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                            >
                                ফিরে যান
                            </button>
                            <button 
                                onClick={confirmActionHandler}
                                className={`flex-1 py-3 text-white rounded-xl font-bold transition-colors shadow-lg ${actionConfirm.type === 'approved' ? 'bg-green-600 hover:bg-green-700 shadow-green-500/30' : 'bg-red-600 hover:bg-red-700 shadow-red-500/30'}`}
                            >
                                হ্যাঁ, নিশ্চিত
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};