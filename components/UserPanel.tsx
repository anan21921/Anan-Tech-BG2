import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, Download, RefreshCw, Image as ImageIcon, ScanFace, FileImage, ZoomIn, RotateCcw, Wand2, Zap, CheckCircle2, Maximize2, LogOut, Wallet, PlusCircle, X, History, Clock, AlertTriangle, ArrowUpRight, ArrowDownLeft, LayoutGrid, Calendar } from 'lucide-react';
import { Controls } from './Controls';
import { ChatSupport } from './ChatSupport';
import { generatePassportPhoto, blobToBase64, getFaceAnalysis } from '../services/geminiService';
import { updateBalance, createRechargeRequest, getUserRechargeRequests, getUserTransactions, saveGeneratedImage, getUserGeneratedImages } from '../services/authService';
import { BackgroundColor, DressType, PhotoSettings, ProcessingStatus, User, RechargeRequest, Transaction, GeneratedImage } from '../types';

interface UserPanelProps {
    user: User;
    onLogout: () => void;
    onRefreshUser: () => void; 
}

export const UserPanel: React.FC<UserPanelProps> = ({ user, onLogout, onRefreshUser }) => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>({ isProcessing: false, message: '' });
  const [analyzing, setAnalyzing] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showCostModal, setShowCostModal] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryImages, setGalleryImages] = useState<GeneratedImage[]>([]);
  const [filterDate, setFilterDate] = useState('');
  const [isPaidSession, setIsPaidSession] = useState(false);
  const [walletTab, setWalletTab] = useState<'recharge' | 'history'>('recharge');
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
  const [trxId, setTrxId] = useState('');
  const [rechargeRequests, setRechargeRequests] = useState<RechargeRequest[]>([]);
  const [transactionHistory, setTransactionHistory] = useState<Transaction[]>([]);
  const [isSubmittingRecharge, setIsSubmittingRecharge] = useState(false);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [origTransform, setOrigTransform] = useState({ x: 0, y: 0, scale: 1, rotation: 0 });
  const [isDraggingOrig, setIsDraggingOrig] = useState(false);
  const [dragStartOrig, setDragStartOrig] = useState({ x: 0, y: 0 });
  const origContainerRef = useRef<HTMLDivElement>(null);
  const origImageRef = useRef<HTMLImageElement>(null);

  const [settings, setSettings] = useState<PhotoSettings>({
    bgColor: BackgroundColor.Blue, 
    dress: DressType.None,
    customDressDescription: '',
    smoothFace: true,
    smoothFaceIntensity: 50,
    enhanceLighting: true,
    brightenFace: false,
    brightenFaceIntensity: 50, 
    sizePreset: 'passport',
    customWidth: 500,
    customHeight: 500
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (generatedImage) setTransform({ x: 0, y: 0, scale: 1 });
  }, [generatedImage]);

  useEffect(() => {
    setOrigTransform({ x: 0, y: 0, scale: 1, rotation: 0 });
  }, [originalImage]);

  useEffect(() => {
    if (showWalletModal) {
        setRechargeRequests(getUserRechargeRequests(user.id));
        setTransactionHistory(getUserTransactions(user.id));
    }
  }, [showWalletModal, user.id, walletTab]); 

  useEffect(() => {
      if (showGallery) setGalleryImages(getUserGeneratedImages(user.id));
  }, [showGallery, user.id]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const base64 = await blobToBase64(file);
        setOriginalImage(base64);
        setGeneratedImage(null);
        setIsPaidSession(false);
      } catch (error) { console.error(error); }
    }
  };

  const executeGeneration = async () => {
    setShowCostModal(false);
    setStatus({ isProcessing: true, message: 'AI processing...' });
    try {
      const rawBase64 = await generatePassportPhoto(originalImage!, settings);
      setGeneratedImage(`data:image/jpeg;base64,${rawBase64}`);
      if (!isPaidSession) {
          await updateBalance(user.id, -3, 'Passport Photo');
          setIsPaidSession(true);
          onRefreshUser();
      }
      setStatus({ isProcessing: false, message: '' });
    } catch (e) {
      setStatus({ isProcessing: false, message: '', error: 'Generation failed.' });
    }
  };

  const handleGenerateClick = () => {
    if (!originalImage) return;
    if (isPaidSession) { executeGeneration(); return; }
    if (user.balance < 3) { setShowWalletModal(true); return; }
    setShowCostModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <nav className="bg-white sticky top-0 z-50 border-b px-6 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold">Anan Tech Studio</h1>
          <div className="flex gap-4">
              <button onClick={() => setShowWalletModal(true)} className="bg-emerald-500 text-white px-4 py-1.5 rounded-full font-bold">৳ {user.balance}</button>
              <button onClick={onLogout} className="text-red-500"><LogOut size={20}/></button>
          </div>
      </nav>

      <main className="p-6 max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border text-center">
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                  <button onClick={() => fileInputRef.current?.click()} className="w-full py-8 border-2 border-dashed rounded-lg text-slate-400">Upload Photo</button>
              </div>
              <Controls settings={settings} setSettings={setSettings} disabled={status.isProcessing || !originalImage} onGenerate={handleGenerateClick} />
          </div>
          
          <div className="md:col-span-2 bg-white rounded-xl shadow-sm border p-6 min-h-[500px] flex items-center justify-center relative overflow-hidden">
              {status.isProcessing && <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center font-bold">Processing...</div>}
              {generatedImage ? <img src={generatedImage} className="max-w-full max-h-full shadow-lg" /> : originalImage ? <img src={originalImage} className="max-w-full max-h-full opacity-50" /> : <ImageIcon size={48} className="text-slate-200" />}
          </div>
      </main>

      {showWalletModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
                  <div className="p-4 bg-pink-600 text-white font-bold flex justify-between">
                      <span>My Wallet</span>
                      <button onClick={() => setShowWalletModal(false)}><X/></button>
                  </div>
                  <div className="p-6 overflow-y-auto">
                      <p className="mb-4">Send Money to: 01540-013418 (bKash)</p>
                      <div className="space-y-3">
                          {transactionHistory.map(tx => (
                              <div key={tx.id} className="flex justify-between text-sm border-b pb-2">
                                  <span>{tx.description}</span>
                                  <span className={tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}>{tx.type === 'credit' ? '+' : '-'}৳{tx.amount}</span>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {showCostModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white p-6 rounded-xl text-center">
                  <h3 className="font-bold text-lg mb-2">Confirm Payment</h3>
                  <p className="mb-4">Generate photo for 3 BDT?</p>
                  <div className="flex gap-2">
                      <button onClick={() => setShowCostModal(false)} className="flex-1 py-2 bg-slate-100 rounded">No</button>
                      <button onClick={executeGeneration} className="flex-1 py-2 bg-blue-600 text-white rounded">Yes</button>
                  </div>
              </div>
          </div>
      )}
      
      <ChatSupport />
    </div>
  );
};