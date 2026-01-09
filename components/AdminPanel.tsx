
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, RechargeRequest, GeneratedImage, SupportMessage } from '../types';
import { LogOut, Users, ShieldCheck, Plus, Minus, Coins, X, Check, Download, Loader2, RefreshCw, Search, LayoutGrid, Calendar, Bell, MessageSquare, Send, CheckCheck, Mic, Image as ImageIcon, MoreVertical } from 'lucide-react';
import { getAllUsers, createUser, updateBalance, getRechargeRequests, handleRechargeRequest, getAllGeneratedImages, getAllChats, sendSupportMessage, markMessagesAsSeen } from '../services/authService';
import { blobToBase64 } from '../services/geminiService';

interface AdminPanelProps {
    user: User;
    onLogout: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ user, onLogout }) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'requests' | 'gallery' | 'chat'>('dashboard');
    const [usersList, setUsersList] = useState<User[]>([]);
    const [requestList, setRequestList] = useState<RechargeRequest[]>([]);
    const [galleryImages, setGalleryImages] = useState<GeneratedImage[]>([]);
    const [chats, setChats] = useState<Record<string, SupportMessage[]>>({});
    const [pendingChatCount, setPendingChatCount] = useState(0);
    
    // Siren State
    const prevPendingRef = useRef(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const prevChatCountsRef = useRef<Record<string, number>>({}); 

    // Chat State
    const [selectedChatUser, setSelectedChatUser] = useState<string | null>(null);
    const [adminMessage, setAdminMessage] = useState('');
    const chatScrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Initialize Audio
    useEffect(() => {
        // Simple notification sound
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); 
    }, []);

    const playNotification = () => {
        if (audioRef.current) {
            audioRef.current.volume = 1.0;
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(e => console.warn("Audio autoplay blocked:", e));
        }
    };

    // Robust Refresh Data Function
    const refreshData = useCallback(() => {
        setUsersList(getAllUsers());
        
        const requests = getRechargeRequests();
        setRequestList(requests);
        
        // Always fetch fresh chats
        const allChats = getAllChats();
        setChats(allChats); 
        
        setGalleryImages(getAllGeneratedImages());

        // Check for new pending requests (SIREN LOGIC)
        const currentPending = requests.filter(r => r.status === 'pending').length;
        if (currentPending > prevPendingRef.current) {
            playNotification();
        }
        prevPendingRef.current = currentPending;

        // Check for pending chats (Last message is NOT from admin and NOT seen)
        let pChatCount = 0;
        let hasNewMessage = false;

        Object.keys(allChats).forEach(userId => {
            const userMsgs = allChats[userId];
            if (userMsgs && userMsgs.length > 0) {
                const lastMsg = userMsgs[userMsgs.length - 1];
                if (!lastMsg.isAdmin && lastMsg.status !== 'seen') {
                    pChatCount++;
                }

                // Check for notification sound (if count increased)
                const currentCount = userMsgs.length;
                const prevCount = prevChatCountsRef.current[userId] || 0;
                
                if (currentCount > prevCount && !lastMsg.isAdmin) {
                     hasNewMessage = true;
                }
                prevChatCountsRef.current[userId] = currentCount;
            }
        });

        setPendingChatCount(pChatCount);

        if (hasNewMessage) {
            playNotification();
        }

        // If a chat is selected, mark as seen
        if (selectedChatUser) {
            markMessagesAsSeen(selectedChatUser, true);
        }

    }, [selectedChatUser]);

    // Auto refresh every 2 seconds
    useEffect(() => {
        refreshData(); // Initial load
        const interval = setInterval(refreshData, 2000);
        return () => clearInterval(interval);
    }, [refreshData]);

    // Scroll chat to bottom
    useEffect(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [chats, selectedChatUser]);

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

        if (balanceActionType === 'deduct') {
            amount = -amount;
        }

        setIsProcessing(true);
        try {
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
        setActionConfirm(null); 

        try {
            const success = await handleRechargeRequest(id, type);
            if (success) {
                refreshData();
            } else {
                alert('রিকোয়েস্ট প্রসেস করা সম্ভব হয়নি।');
                refreshData(); 
            }
        } catch (e) {
            console.error(e);
            alert('সার্ভার এরর হয়েছে।');
        } finally {
            setProcessingId(null);
        }
    };

    const handleSendAdminMessage = async (attachmentType?: 'image', attachmentData?: string) => {
        if (!selectedChatUser) return;
        if (!adminMessage.trim() && !attachmentData) return;
        
        sendSupportMessage(selectedChatUser, 'Support Admin', adminMessage, true, attachmentType, attachmentData);
        setAdminMessage('');
        refreshData(); 
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const base64 = await blobToBase64(file);
                await handleSendAdminMessage('image', base64);
            } catch (err) {
                console.error(err);
            }
        }
    };

    // Filter Logic for Gallery
    const filteredGallery = galleryImages.filter(img => {
        const matchesDate = !galleryDateFilter || new Date(img.date).toISOString().slice(0, 10) === galleryDateFilter;
        const matchesUser = !galleryUserSearch || img.userName.toLowerCase().includes(galleryUserSearch.toLowerCase());
        return matchesDate && matchesUser;
    });

    const pendingRequests = requestList.filter(r => r.status === 'pending').length;

    // Helper to sort chats
    const getSortedChatUserIds = () => {
        return Object.keys(chats).sort((a, b) => {
            const msgsA = chats[a];
            const msgsB = chats[b];
            
            if (!msgsA || msgsA.length === 0) return 1;
            if (!msgsB || msgsB.length === 0) return -1;

            const lastA = new Date(msgsA[msgsA.length - 1].timestamp).getTime();
            const lastB = new Date(msgsB[msgsB.length - 1].timestamp).getTime();
            return lastB - lastA; // Descending (Newest first)
        });
    };

    const StatusTick = ({ status }: { status: string }) => {
        if (status === 'seen') return <CheckCheck size={14} className="text-blue-500" />;
        if (status === 'delivered') return <CheckCheck size={14} className="text-slate-400" />;
        return <Check size={14} className="text-slate-400" />;
    };

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
                        {pendingRequests > 0 && (
                             <div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full animate-pulse cursor-pointer" onClick={() => setActiveTab('requests')}>
                                <Bell size={14} className="text-white"/>
                                <span className="text-white text-xs font-bold">{pendingRequests} Pending!</span>
                             </div>
                        )}
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
                            </button>
                            <button 
                                onClick={() => setActiveTab('chat')}
                                className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors relative ${activeTab === 'chat' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                লাইভ চ্যাট
                                {pendingChatCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-white text-[10px] flex items-center justify-center rounded-full animate-pulse border border-slate-900">
                                        {pendingChatCount}
                                    </span>
                                )}
                            </button>
                            <button 
                                onClick={() => setActiveTab('gallery')}
                                className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors ${activeTab === 'gallery' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                গ্যালারি
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
                                <div className="w-14 h-14 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                                    <MessageSquare size={28} />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 font-medium">পেন্ডিং মেসেজ</p>
                                    <h3 className="text-2xl font-bold text-slate-800">{pendingChatCount}</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Users Tab */}
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
                                                <td className="px-6 py-4 font-mono text-slate-500">
                                                    {u.username}
                                                </td>
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

                {/* Recharge Requests Tab */}
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

                {/* LIVE CHAT TAB (Whatsapp Web Style) */}
                {activeTab === 'chat' && (
                    <div className="animate-fade-in-up h-[calc(100vh-140px)] min-h-[600px] flex rounded-2xl overflow-hidden bg-white shadow-xl border border-slate-200">
                        {/* Sidebar */}
                        <div className="w-1/3 border-r border-slate-200 flex flex-col bg-white">
                            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                                        <img src={user.avatar} className="w-full h-full object-cover" alt="Profile" />
                                    </div>
                                    <h3 className="font-bold text-slate-800">Chats</h3>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={refreshData} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-full transition-colors" title="Force Refresh">
                                        <RefreshCw size={16} />
                                    </button>
                                    <MoreVertical size={20} className="text-slate-500"/>
                                </div>
                            </div>
                            
                            <div className="p-3 bg-white">
                                <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-lg">
                                    <Search size={16} className="text-slate-400"/>
                                    <input type="text" placeholder="Search or start new chat" className="bg-transparent text-sm outline-none flex-grow" />
                                </div>
                            </div>

                            <div className="flex-grow overflow-y-auto custom-scrollbar">
                                {Object.keys(chats).length === 0 ? (
                                    <div className="p-6 text-center text-slate-400 text-sm">No conversations</div>
                                ) : (
                                    getSortedChatUserIds().map(userId => {
                                        const userMessages = chats[userId];
                                        if (!userMessages || userMessages.length === 0) return null;
                                        const lastMsg = userMessages[userMessages.length - 1];
                                        const userName = userMessages.find(m => m.senderName)?.senderName || 'User';
                                        
                                        // Unread calculation
                                        const unreadCount = userMessages.filter(m => !m.isAdmin && m.status !== 'seen').length;

                                        return (
                                            <button 
                                                key={userId}
                                                onClick={() => setSelectedChatUser(userId)}
                                                className={`w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors border-b border-slate-50 ${selectedChatUser === userId ? 'bg-slate-100' : ''}`}
                                            >
                                                <div className="relative w-12 h-12 rounded-full bg-slate-200 flex-shrink-0 overflow-hidden">
                                                    <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random`} alt={userName} className="w-full h-full object-cover"/>
                                                </div>
                                                <div className="flex-1 text-left overflow-hidden">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <div>
                                                            <h4 className="font-bold text-slate-800 text-sm truncate">{userName}</h4>
                                                        </div>
                                                        <span className={`text-[10px] ${unreadCount > 0 ? 'text-green-500 font-bold' : 'text-slate-400'}`}>
                                                            {new Date(lastMsg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <p className="text-xs text-slate-500 truncate max-w-[80%] flex items-center gap-1">
                                                            {lastMsg.isAdmin && <StatusTick status={lastMsg.status} />}
                                                            {lastMsg.text || (lastMsg.attachmentType ? '📎 Media' : '')}
                                                        </p>
                                                        {unreadCount > 0 && (
                                                            <span className="w-5 h-5 rounded-full bg-green-500 text-white text-[10px] flex items-center justify-center font-bold">
                                                                {unreadCount}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        )
                                    })
                                )}
                            </div>
                        </div>

                        {/* Chat Window */}
                        <div className="w-2/3 flex flex-col bg-[#efeae2]">
                            {selectedChatUser ? (
                                <>
                                    {/* Header */}
                                    <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between shadow-sm z-10">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-300 overflow-hidden">
                                                 <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(chats[selectedChatUser]?.find(m => m.senderName)?.senderName || 'User')}&background=random`} alt="" className="w-full h-full"/>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800 text-sm">
                                                    {chats[selectedChatUser]?.find(m => m.senderName)?.senderName || 'Chat'}
                                                </h3>
                                                <p className="text-xs text-slate-500">
                                                    Online
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4 text-slate-500 pr-4">
                                            <Search size={20} />
                                            <MoreVertical size={20} />
                                        </div>
                                    </div>

                                    {/* Messages */}
                                    <div ref={chatScrollRef} className="flex-grow overflow-y-auto p-6 space-y-4 custom-scrollbar" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundBlendMode: 'soft-light' }}>
                                        {chats[selectedChatUser]?.map((msg) => (
                                            <div key={msg.id} className={`flex ${msg.isAdmin ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`relative max-w-[65%] p-2.5 rounded-lg text-sm shadow-sm ${
                                                    msg.isAdmin 
                                                    ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-none' 
                                                    : 'bg-white text-slate-900 rounded-tl-none'
                                                }`}>
                                                    
                                                    <div className="mb-2">
                                                        {msg.attachmentType === 'image' && msg.attachmentData && (
                                                            <div className="rounded overflow-hidden mb-1">
                                                                <img src={msg.attachmentData} alt="Shared" className="max-w-full h-auto" />
                                                            </div>
                                                        )}
                                                        {msg.attachmentType === 'audio' && msg.attachmentData && (
                                                            <div className="flex items-center gap-2 min-w-[200px] py-1">
                                                                <audio controls src={msg.attachmentData} className="h-8 w-full" />
                                                            </div>
                                                        )}
                                                        {msg.text && !['image','audio'].includes(msg.attachmentType || '') && (
                                                            <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center justify-end gap-1 select-none">
                                                        <span className="text-[10px] text-slate-500">
                                                            {new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                                        </span>
                                                        {msg.isAdmin && <StatusTick status={msg.status} />}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Input */}
                                    <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center gap-3">
                                        <button 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="text-slate-500 hover:text-slate-700 p-2"
                                        >
                                            <ImageIcon size={24} />
                                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                                        </button>
                                        
                                        <form 
                                            onSubmit={(e) => { e.preventDefault(); handleSendAdminMessage(); }}
                                            className="flex-grow flex items-center gap-2 bg-white rounded-lg px-4 py-2 border border-slate-200"
                                        >
                                            <input 
                                                type="text" 
                                                value={adminMessage}
                                                onChange={(e) => setAdminMessage(e.target.value)}
                                                className="flex-grow bg-transparent outline-none text-sm text-slate-800"
                                                placeholder="Type a message"
                                            />
                                        </form>
                                        
                                        {adminMessage.trim() ? (
                                            <button 
                                                onClick={() => handleSendAdminMessage()}
                                                className="text-slate-500 hover:text-blue-600 p-2"
                                            >
                                                <Send size={24} />
                                            </button>
                                        ) : (
                                             <button className="text-slate-500 hover:text-slate-700 p-2">
                                                <Mic size={24} />
                                            </button>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-500 bg-slate-50 border-b-4 border-green-500">
                                    <div className="mb-8">
                                        <ShieldCheck size={80} className="text-slate-300" />
                                    </div>
                                    <h2 className="text-3xl font-light text-slate-600 mb-4">Anan Tech Support</h2>
                                    <p className="text-sm text-slate-400">Send and receive messages without keeping your phone online.</p>
                                    <p className="text-sm text-slate-400 mt-1">Use Anan Tech Studio on up to 4 linked devices and 1 phone.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Gallery Tab */}
                {activeTab === 'gallery' && (
                     <div className="space-y-6 animate-fade-in-up">
                        {/* Gallery controls omitted for brevity, keeping existing code logic */}
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
                                        <div key={img.id} className="group bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
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
