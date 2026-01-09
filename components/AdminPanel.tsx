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
    const [actionConfirm, setActionConfirm] = useState<{id: string, type: 'approved' | 'rejected'} | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [balanceAmount, setBalanceAmount] = useState('');
    const [balanceActionType, setBalanceActionType] = useState<'add' | 'deduct'>('add');
    const [newUser, setNewUser] = useState({ username: '', password: '', name: '', balance: 0 });
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const refreshData = useCallback(() => {
        setUsersList(getAllUsers());
        const requests = getRechargeRequests();
        setRequestList(requests);
        const allChats = getAllChats();
        setChats({...allChats}); 
        setGalleryImages(getAllGeneratedImages());

        let pChatCount = 0;
        Object.keys(allChats).forEach(userId => {
            const userMsgs = allChats[userId];
            if (userMsgs && userMsgs.length > 0) {
                const lastMsg = userMsgs[userMsgs.length - 1];
                if (!lastMsg.isAdmin && lastMsg.status !== 'seen') {
                    pChatCount++;
                }
            }
        });
        setPendingChatCount(pChatCount);

        if (selectedChatUser) {
            markMessagesAsSeen(selectedChatUser, true);
        }
    }, [selectedChatUser]);

    useEffect(() => {
        refreshData();
        const interval = setInterval(refreshData, 3000);
        window.addEventListener('storage', refreshData);
        return () => {
            clearInterval(interval);
            window.removeEventListener('storage', refreshData);
        };
    }, [refreshData]);

    useEffect(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [chats, selectedChatUser]);

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

    const handleUpdateBalance = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;
        let amount = parseInt(balanceAmount);
        if (isNaN(amount) || amount <= 0) return;
        if (balanceActionType === 'deduct') amount = -amount;

        setIsProcessing(true);
        try {
            await updateBalance(selectedUser.id, amount, 'Admin Balance Update');
            setShowBalanceModal(false);
            refreshData();
        } finally {
            setIsProcessing(false);
        }
    };

    const confirmActionHandler = async () => {
        if (!actionConfirm) return;
        setProcessingId(actionConfirm.id);
        try {
            await handleRechargeRequest(actionConfirm.id, actionConfirm.type);
            setActionConfirm(null);
            refreshData();
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

    const getSelectedChatUserDetails = () => {
        if (!selectedChatUser) return null;
        const userInList = usersList.find(u => u.id === selectedChatUser);
        return userInList ? { name: userInList.name, avatar: userInList.avatar } : { name: 'User', avatar: '' };
    };

    const pendingRequestsCount = requestList.filter(r => r.status === 'pending').length;
    const activeChatDetails = getSelectedChatUserDetails();

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <nav className="bg-slate-900 sticky top-0 z-50 shadow-md">
                <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <ShieldCheck className="text-blue-500" size={24} />
                        <h1 className="text-lg font-bold text-white tracking-wide">Admin Dashboard</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <nav className="flex gap-2">
                            {['dashboard', 'users', 'requests', 'chat', 'gallery'].map((t) => (
                                <button 
                                    key={t}
                                    onClick={() => setActiveTab(t as any)}
                                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${activeTab === t ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
                                >
                                    {t.toUpperCase()}
                                </button>
                            ))}
                        </nav>
                        <button onClick={onLogout} className="p-2 text-slate-400 hover:text-white transition-all"><LogOut size={20} /></button>
                    </div>
                </div>
            </nav>

            <main className="flex-grow max-w-[1600px] mx-auto w-full p-6">
                {activeTab === 'dashboard' && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <p className="text-slate-500 text-sm">Total Users</p>
                            <h3 className="text-2xl font-bold">{usersList.length}</h3>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <p className="text-slate-500 text-sm">Pending Requests</p>
                            <h3 className="text-2xl font-bold">{pendingRequestsCount}</h3>
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold">Manage Users</h2>
                            <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold">New User</button>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-6 py-4">Name</th>
                                        <th className="px-6 py-4">Balance</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {usersList.map(u => (
                                        <tr key={u.id} className="border-t">
                                            <td className="px-6 py-4 font-medium">{u.name}</td>
                                            <td className="px-6 py-4 font-bold">৳ {u.balance}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => { setSelectedUser(u); setShowBalanceModal(true); }} className="text-blue-600 font-bold mr-4">Wallet</button>
                                                <button onClick={() => { setSelectedChatUser(u.id); setActiveTab('chat'); }} className="text-slate-500 font-bold">Chat</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'requests' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold">Recharge Requests</h2>
                        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-6 py-4">User</th>
                                        <th className="px-6 py-4">Amount</th>
                                        <th className="px-6 py-4">TrxID</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {requestList.map(req => (
                                        <tr key={req.id} className="border-t">
                                            <td className="px-6 py-4">{req.userName}</td>
                                            <td className="px-6 py-4 font-bold">৳ {req.amount}</td>
                                            <td className="px-6 py-4 font-mono">{req.trxId}</td>
                                            <td className="px-6 py-4 uppercase font-bold text-[10px]">{req.status}</td>
                                            <td className="px-6 py-4 text-right">
                                                {req.status === 'pending' && (
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => setActionConfirm({id: req.id, type: 'approved'})} className="p-1 bg-green-100 text-green-600 rounded"><Check size={16}/></button>
                                                        <button onClick={() => setActionConfirm({id: req.id, type: 'rejected'})} className="p-1 bg-red-100 text-red-600 rounded"><X size={16}/></button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'chat' && (
                    <div className="flex h-[600px] bg-white rounded-2xl shadow border overflow-hidden">
                        <div className="w-1/3 border-r bg-slate-50 overflow-y-auto">
                            {Object.keys(chats).map(uid => (
                                <button key={uid} onClick={() => setSelectedChatUser(uid)} className={`w-full p-4 text-left border-b hover:bg-slate-100 ${selectedChatUser === uid ? 'bg-white' : ''}`}>
                                    <h4 className="font-bold text-sm truncate">{chats[uid][0]?.senderName || uid}</h4>
                                    <p className="text-xs text-slate-500 truncate">{chats[uid][chats[uid].length-1]?.text}</p>
                                </button>
                            ))}
                        </div>
                        <div className="w-2/3 flex flex-col">
                            {selectedChatUser ? (
                                <>
                                    <div className="p-4 border-b font-bold">{activeChatDetails?.name}</div>
                                    <div ref={chatScrollRef} className="flex-grow p-4 overflow-y-auto space-y-4 bg-slate-50">
                                        {chats[selectedChatUser]?.map(msg => (
                                            <div key={msg.id} className={`flex ${msg.isAdmin ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`p-2 rounded-lg text-sm max-w-[70%] ${msg.isAdmin ? 'bg-blue-600 text-white' : 'bg-white border'}`}>
                                                    {msg.text}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <form className="p-4 border-t flex gap-2" onSubmit={e => { e.preventDefault(); handleSendAdminMessage(); }}>
                                        <input value={adminMessage} onChange={e => setAdminMessage(e.target.value)} className="flex-grow p-2 border rounded" placeholder="Type message..." />
                                        <button className="px-4 py-2 bg-blue-600 text-white rounded font-bold">Send</button>
                                    </form>
                                </>
                            ) : <div className="flex-grow flex items-center justify-center text-slate-400">Select a chat</div>}
                        </div>
                    </div>
                )}
            </main>

            {/* Modals and other logic remains available in smaller scope */}
            {actionConfirm && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white p-6 rounded-xl text-center max-w-sm w-full">
                        <h3 className="font-bold mb-4">Confirm Action?</h3>
                        <div className="flex gap-2">
                            <button onClick={() => setActionConfirm(null)} className="flex-1 py-2 bg-slate-100 rounded">Cancel</button>
                            <button onClick={confirmActionHandler} className="flex-1 py-2 bg-blue-600 text-white rounded">Confirm</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};