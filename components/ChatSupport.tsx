
import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, MinusCircle, UserCog, Mic, Image as ImageIcon, StopCircle, Check, CheckCheck, X } from 'lucide-react';
import { blobToBase64 } from '../services/geminiService';
import { getCurrentUser, getSupportMessages, sendSupportMessage, markMessagesAsSeen } from '../services/authService';
import { SupportMessage } from '../types';

export const ChatSupport: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const user = getCurrentUser();
    const recordingTimerRef = useRef<any>(null);

    // Poll for new messages (Real-time simulation)
    useEffect(() => {
        if (!user || !isOpen) return;

        const loadMessages = () => {
            const history = getSupportMessages(user.id);
            setMessages(history);
            
            // Mark admin messages as seen when user is viewing
            markMessagesAsSeen(user.id, false);
        };

        loadMessages();
        const interval = setInterval(loadMessages, 1500); // Fast polling for "Real-time" feel
        return () => clearInterval(interval);
    }, [user, isOpen]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleSend = async (attachmentType?: 'image' | 'audio', attachmentData?: string, customText?: string) => {
        if ((!input.trim() && !attachmentData) || !user) return;
        
        const text = customText || input;
        if (!attachmentData) setInput('');
        
        const newMsg = sendSupportMessage(user.id, user.name, text, false, attachmentType, attachmentData);
        setMessages(prev => [...prev, newMsg]);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // --- Media Handlers ---

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                if (file.size > 2 * 1024 * 1024) {
                    alert('Image must be under 2MB');
                    return;
                }
                const base64 = await blobToBase64(file);
                await handleSend('image', base64, '📷 Image');
            } catch (err) {
                console.error(err);
            }
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const base64 = await blobToBase64(audioBlob);
                handleSend('audio', base64, '🎤 Voice Message');
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            recordingTimerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error("Mic Error:", err);
            alert("Microphone permission required.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            audioChunksRef.current = []; // Clear chunks to avoid sending
            setIsRecording(false);
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Helper for Status Ticks
    const StatusTick = ({ status }: { status: string }) => {
        if (status === 'seen') return <CheckCheck size={14} className="text-blue-500" />;
        if (status === 'delivered') return <CheckCheck size={14} className="text-slate-400" />;
        return <Check size={14} className="text-slate-400" />;
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999] font-sans">
            {!isOpen && (
                <button 
                    onClick={() => setIsOpen(true)}
                    className="w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center justify-center text-white animate-bounce-subtle relative"
                >
                    <MessageCircle size={28} />
                    {/* Unread badge logic could go here */}
                </button>
            )}

            {isOpen && (
                <div className="w-[360px] sm:w-[380px] h-[600px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-fade-in-up">
                    {/* Header */}
                    <div className="bg-slate-50 border-b border-slate-200 p-3 flex justify-between items-center shadow-sm z-10">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                                    <UserCog size={24} />
                                </div>
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 text-sm">Admin Support</h3>
                                <p className="text-[10px] text-green-600 font-semibold">Online</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                            <MinusCircle size={20} />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div ref={scrollRef} className="flex-grow p-4 overflow-y-auto bg-[#e5e7eb] space-y-3 custom-scrollbar" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundBlendMode: 'soft-light' }}>
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-70">
                                <div className="bg-white p-4 rounded-full mb-3 shadow-sm">
                                    <MessageCircle size={32} className="text-blue-400"/>
                                </div>
                                <p className="text-xs bg-white/80 px-3 py-1 rounded-full">Say hello to Admin 👋</p>
                            </div>
                        )}

                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${!msg.isAdmin ? 'justify-end' : 'justify-start'}`}>
                                <div className={`relative max-w-[80%] p-2 rounded-lg text-sm shadow-sm ${
                                    !msg.isAdmin 
                                    ? 'bg-[#dcf8c6] text-slate-900 rounded-tr-none' 
                                    : 'bg-white text-slate-900 rounded-tl-none'
                                }`}>
                                    
                                    {/* Content */}
                                    <div className="mb-3 pr-2">
                                        {/* Image */}
                                        {msg.attachmentType === 'image' && msg.attachmentData && (
                                            <div className="rounded overflow-hidden mb-1 cursor-pointer">
                                                <img src={msg.attachmentData} alt="Shared" className="max-w-full h-auto max-h-48 object-cover" />
                                            </div>
                                        )}
                                        {/* Audio */}
                                        {msg.attachmentType === 'audio' && msg.attachmentData && (
                                            <div className="flex items-center gap-2 min-w-[180px] py-1">
                                                <audio controls src={msg.attachmentData} className="h-8 w-full" />
                                            </div>
                                        )}
                                        {/* Text */}
                                        {msg.text && !['image','audio'].includes(msg.attachmentType || '') && (
                                            <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                        )}
                                        {/* Caption for media */}
                                        {(msg.attachmentType === 'image' || msg.attachmentType === 'audio') && msg.text && (
                                            <p className="text-[10px] text-slate-500 italic mt-1">{msg.text}</p>
                                        )}
                                    </div>

                                    {/* Meta (Time & Ticks) */}
                                    <div className="absolute bottom-1 right-2 flex items-center gap-1">
                                        <span className="text-[9px] text-slate-500">
                                            {new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                        </span>
                                        {!msg.isAdmin && <StatusTick status={msg.status} />}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Input Area */}
                    <div className="bg-white p-2 border-t border-slate-200">
                        {isRecording ? (
                            <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-full animate-pulse border border-red-100">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-ping"></div>
                                <span className="text-red-500 font-mono text-xs font-bold">{formatTime(recordingTime)}</span>
                                <span className="flex-grow text-xs text-slate-400">Recording audio...</span>
                                <button onClick={cancelRecording} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full">
                                    <X size={18} />
                                </button>
                                <button onClick={stopRecording} className="p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-md">
                                    <Send size={16} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-end gap-2">
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-3 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
                                    title="Photo"
                                >
                                    <ImageIcon size={22} />
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload}/>
                                </button>
                                
                                <div className="flex-grow bg-slate-100 rounded-2xl flex items-center px-4 py-2 min-h-[44px]">
                                    <textarea
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
                                        placeholder="Type a message..."
                                        className="w-full bg-transparent outline-none text-sm text-slate-800 resize-none max-h-24 overflow-y-auto custom-scrollbar"
                                        rows={1}
                                        style={{ height: 'auto' }}
                                    />
                                </div>

                                {input.trim() ? (
                                    <button 
                                        onClick={() => handleSend()}
                                        className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-md transition-all active:scale-95"
                                    >
                                        <Send size={20} />
                                    </button>
                                ) : (
                                    <button 
                                        onClick={startRecording}
                                        className="p-3 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 hover:text-red-600 transition-colors"
                                    >
                                        <Mic size={22} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
