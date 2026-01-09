
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
    onRefreshUser: () => void; // Callback to refresh user data (balance)
}

export const UserPanel: React.FC<UserPanelProps> = ({ user, onLogout, onRefreshUser }) => {
  // State
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>({ isProcessing: false, message: '' });
  const [analyzing, setAnalyzing] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showCostModal, setShowCostModal] = useState(false);
  
  // Gallery State
  const [showGallery, setShowGallery] = useState(false);
  const [galleryImages, setGalleryImages] = useState<GeneratedImage[]>([]);
  const [filterDate, setFilterDate] = useState('');
  
  // Logic state for free regenerate
  const [isPaidSession, setIsPaidSession] = useState(false);
  
  // Wallet/Recharge State
  const [walletTab, setWalletTab] = useState<'recharge' | 'history'>('recharge');
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
  const [trxId, setTrxId] = useState('');
  const [rechargeRequests, setRechargeRequests] = useState<RechargeRequest[]>([]);
  const [transactionHistory, setTransactionHistory] = useState<Transaction[]>([]);
  const [isSubmittingRecharge, setIsSubmittingRecharge] = useState(false);
  
  // Transform State (For Generated Image Preview)
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Transform State (For Original Image Input)
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

  // Reset transforms
  useEffect(() => {
    if (generatedImage) {
        setTransform({ x: 0, y: 0, scale: 1 });
    }
  }, [generatedImage]);

  useEffect(() => {
    setOrigTransform({ x: 0, y: 0, scale: 1, rotation: 0 });
  }, [originalImage]);

  // Load history when modal opens
  useEffect(() => {
    if (showWalletModal) {
        // Load recharges
        const recharges = getUserRechargeRequests(user.id);
        setRechargeRequests(recharges);
        
        // Load transactions
        const transactions = getUserTransactions(user.id);
        setTransactionHistory(transactions);
    }
  }, [showWalletModal, user.id, walletTab]);

  // Load Gallery
  useEffect(() => {
      if (showGallery) {
          const images = getUserGeneratedImages(user.id);
          setGalleryImages(images);
      }
  }, [showGallery, user.id]);

  // Handlers
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("ফাইলের আকার অনেক বড়। দয়া করে ১০ মেগাবাইটের কম সাইজের ছবি দিন।");
        return;
      }
      try {
        const base64 = await blobToBase64(file);
        setOriginalImage(base64);
        setGeneratedImage(null);
        // Reset paid status for new image
        setIsPaidSession(false);
      } catch (error) {
        console.error("Error reading file", error);
      }
    }
  };

  const handleCameraCapture = useCallback(async () => {
    try {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    } catch (e) {
        console.error(e);
    }
  }, []);

  // --- AUTO ALIGNMENT LOGIC ---
  const handleAutoAlign = async () => {
      if (!originalImage) return;
      
      setAnalyzing(true);
      try {
          const analysis = await getFaceAnalysis(originalImage);
          
          if (analysis.faceBox) {
              const rotation = analysis.rollAngle;
              const box = analysis.faceBox;
              const faceCenterX = (box.xmin + box.xmax) / 2000;
              const faceCenterY = (box.ymin + box.ymax) / 2000;
              const faceHeight = (box.ymax - box.ymin) / 1000;
              
              let newScale = 0.6 / faceHeight;
              if (newScale < 1) newScale = 1;
              if (newScale > 3) newScale = 3;

              const container = origContainerRef.current;
              if (container) {
                  const w = container.clientWidth;
                  const h = container.clientHeight;
                  const panX = (0.5 - faceCenterX) * w * newScale; 
                  const panY = (0.5 - faceCenterY) * h * newScale;

                  setOrigTransform({
                      x: panX,
                      y: panY,
                      scale: newScale,
                      rotation: rotation
                  });
              }
          }
      } catch (e) {
          console.error("Auto align failed", e);
      } finally {
          setAnalyzing(false);
      }
  };

  // --- ORIGINAL IMAGE DRAG HANDLERS ---
  const handleMouseDownOrig = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDraggingOrig(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setDragStartOrig({ x: clientX - origTransform.x, y: clientY - origTransform.y });
  };

  const handleMouseMoveOrig = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDraggingOrig) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    setOrigTransform(prev => ({
        ...prev,
        x: clientX - dragStartOrig.x,
        y: clientY - dragStartOrig.y
    }));
  };

  const handleMouseUpOrig = () => {
    setIsDraggingOrig(false);
  };

  // --- CAPTURE CROPPED ORIGINAL IMAGE ---
  const getCroppedOriginalImage = async (): Promise<string> => {
    if (!originalImage || !origImageRef.current || !origContainerRef.current) return originalImage || '';

    return new Promise((resolve) => {
        const img = new Image();
        img.src = originalImage;
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const container = origContainerRef.current!;
            const containerW = container.clientWidth;
            const containerH = container.clientHeight;
            const targetW = 800;
            const targetH = targetW * (containerH / containerW);

            const canvas = document.createElement('canvas');
            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d');

            if (ctx) {
                const domToCanvasScale = targetW / containerW;

                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                const cx = canvas.width / 2;
                const cy = canvas.height / 2;
                ctx.translate(cx, cy);
                ctx.translate(origTransform.x * domToCanvasScale, origTransform.y * domToCanvasScale);
                ctx.scale(origTransform.scale, origTransform.scale);
                ctx.rotate((origTransform.rotation * Math.PI) / 180);

                const imgRatio = img.width / img.height;
                const containerRatio = containerW / containerH;
                let coverScale = 1;
                if (containerRatio > imgRatio) {
                    coverScale = containerW / img.width;
                } else {
                    coverScale = containerH / img.height;
                }
                const drawScale = coverScale * domToCanvasScale;
                ctx.scale(drawScale, drawScale);
                ctx.drawImage(img, -img.width / 2, -img.height / 2);

                resolve(canvas.toDataURL('image/jpeg', 0.95));
            } else {
                resolve(originalImage!);
            }
        };
        img.onerror = () => resolve(originalImage!);
    });
  };

  const resizeImage = (base64Str: string, targetWidth: number, targetHeight: number): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                const sourceRatio = img.width / img.height;
                const targetRatio = targetWidth / targetHeight;
                let sourceX = 0;
                let sourceY = 0;
                let sourceWidth = img.width;
                let sourceHeight = img.height;

                if (sourceRatio > targetRatio) {
                    sourceWidth = img.height * targetRatio;
                    sourceX = (img.width - sourceWidth) / 2;
                } else {
                    sourceHeight = img.width / targetRatio;
                    sourceY = (img.height - sourceHeight) / 2; 
                }
                
                // Draw resized
                ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);
                resolve(canvas.toDataURL('image/jpeg', 0.95));
            } else {
                resolve(base64Str);
            }
        };
        img.onerror = () => resolve(base64Str); 
    });
  };

  // --- RECHARGE HANDLER ---
  const handleSubmitRecharge = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmittingRecharge(true);
      
      const amount = parseInt(rechargeAmount);
      if(isNaN(amount) || amount < 50) {
          alert('সর্বনিম্ন ৫০ টাকা রিচার্জ করতে হবে।');
          setIsSubmittingRecharge(false);
          return;
      }

      await createRechargeRequest({
          userId: user.id,
          userName: user.name,
          amount: amount,
          senderNumber: senderNumber,
          trxId: trxId
      });

      // Fetch fresh history immediately
      const updatedHistory = getUserRechargeRequests(user.id);
      setRechargeRequests(updatedHistory);
      
      setRechargeAmount('');
      setSenderNumber('');
      setTrxId('');
      setIsSubmittingRecharge(false);
      
      // Simple notification
      alert('আপনার রিচার্জ রিকোয়েস্ট সফলভাবে পাঠানো হয়েছে। এডমিন এপ্রুভ করলে ব্যালেন্স যুক্ত হবে।');
  };

  // Check balance and ask for confirmation
  const handleGenerateClick = () => {
    if (!originalImage) return;

    // If session is already paid, skip check
    if (isPaidSession) {
        executeGeneration();
        return;
    }

    if (user.balance < 3) {
        alert("আপনার পর্যাপ্ত ব্যালেন্স নেই। ছবি তৈরি করতে ৩ টাকা প্রয়োজন। অনুগ্রহ করে রিচার্জ করুন।");
        setShowWalletModal(true);
        setWalletTab('recharge');
        return;
    }
    
    // Show warning modal
    setShowCostModal(true);
  };

  const executeGeneration = async () => {
    setShowCostModal(false);
    setGeneratedImage(null);

    const steps = [
        { msg: 'ক্রপিং এবং ফেস ডিটেকশন... (Processing)', time: 0 },
        { msg: 'AI প্রসেসিং চলছে... (AI Generating)', time: 2000 },
        { msg: 'ব্যাকগ্রাউন্ড ও কালার ফিক্সিং... (Refining)', time: 4000 },
        { msg: 'ফাইনাল টাচ... (Finishing)', time: 6000 }
    ];

    let currentStep = 0;
    setStatus({ isProcessing: true, message: steps[0].msg });

    const intervalId = setInterval(() => {
        currentStep++;
        if (currentStep < steps.length) {
            setStatus(prev => ({ ...prev, message: steps[currentStep].msg }));
        } else {
            clearInterval(intervalId);
        }
    }, 2000);

    try {
      const croppedInput = await getCroppedOriginalImage();
      const rawBase64 = await generatePassportPhoto(croppedInput, settings);
      
      let targetW = 0;
      let targetH = 0;

      if (settings.sizePreset === '300x300') {
          targetW = 300;
          targetH = 300;
      } else if (settings.sizePreset === 'passport') {
          targetW = 472;
          targetH = 591;
      } else {
          targetW = settings.customWidth;
          targetH = settings.customHeight;
      }

      const finalUrl = await resizeImage(`data:image/jpeg;base64,${rawBase64}`, targetW, targetH);
      
      clearInterval(intervalId); 
      setGeneratedImage(finalUrl);
      setStatus({ isProcessing: false, message: '' });

      // Save the generated image
      saveGeneratedImage({
          userId: user.id,
          userName: user.name,
          imageBase64: finalUrl,
          settings: `${settings.sizePreset}, ${settings.bgColor}`
      });

      // --- DEDUCT BALANCE (Only if not already paid for this session) ---
      if (!isPaidSession) {
          await updateBalance(user.id, -3, 'Passport Photo Generation');
          setIsPaidSession(true); // Mark session as paid
          onRefreshUser(); // Refresh UI to show new balance
      }

    } catch (error) {
      clearInterval(intervalId);
      console.error(error);
      setStatus({ isProcessing: false, message: '', error: 'দুঃখিত, সমস্যা হয়েছে। আবার চেষ্টা করুন।' });
    }
  };

  // --- GENERATED IMAGE DRAG HANDLERS ---
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setDragStart({ x: clientX - transform.x, y: clientY - transform.y });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    setTransform(prev => ({
        ...prev,
        x: clientX - dragStart.x,
        y: clientY - dragStart.y
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // --- DOWNLOAD LOGIC ---
  const handleDownload = async (imgUrl?: string) => {
    const source = imgUrl || generatedImage;
    if (!source) return;
    
    const link = document.createElement('a');
    link.href = source;
    link.download = `anan-tech-photo-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setOriginalImage(null);
    setGeneratedImage(null);
    setTransform({ x: 0, y: 0, scale: 1 });
    setOrigTransform({ x: 0, y: 0, scale: 1, rotation: 0 });
    setStatus({ isProcessing: false, message: '' });
    // Reset paid status for new attempt
    setIsPaidSession(false);
  };

  const handleResetPosition = () => {
      setTransform({ x: 0, y: 0, scale: 1 });
  };
  
  // Dynamic aspect ratio for the container
  const getContainerAspectRatio = () => {
      if (settings.sizePreset === 'passport') return '40/50';
      if (settings.sizePreset === '300x300') return '1/1';
      // For custom, use the ratio of custom width/height
      if (settings.customWidth && settings.customHeight) {
          return `${settings.customWidth}/${settings.customHeight}`;
      }
      return '1/1';
  };

  // Filter Logic for Gallery
  const filteredImages = galleryImages.filter(img => {
      if (!filterDate) return true;
      const imgDate = new Date(img.date).toISOString().slice(0, 10);
      return imgDate === filterDate;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      
      {/* Navbar */}
      <nav className="bg-white sticky top-0 z-50 border-b border-slate-200 shadow-sm backdrop-blur-lg bg-white/90">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Zap size={22} fill="currentColor" className="text-white" />
            </div>
            <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-800">Anan Tech<span className="text-blue-600">.ai</span></h1>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Passport Studio</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
               {/* Gallery Button */}
              <button 
                onClick={() => setShowGallery(true)}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-slate-200"
              >
                  <LayoutGrid size={14} />
                  গ্যালারি
              </button>

              {/* Balance Badge */}
              <button 
                onClick={() => setShowWalletModal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-1.5 rounded-full font-bold text-sm shadow-md hover:shadow-lg transition-all"
              >
                  <Wallet size={16} />
                  ৳ {user.balance}
                  <PlusCircle size={14} className="text-emerald-100" />
              </button>

              <div className="hidden sm:flex items-center gap-2 text-slate-600 text-sm font-medium bg-slate-100 px-3 py-1.5 rounded-full">
                   <img src={user.avatar} className="w-5 h-5 rounded-full" alt="" />
                   {user.name}
              </div>
              <button 
                onClick={handleReset}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-slate-200"
              >
                <RefreshCw size={14} />
                <span className="hidden sm:inline">নতুন</span>
              </button>
              <button 
                onClick={onLogout}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-all border border-red-100"
                title="লগ আউট"
              >
                <LogOut size={14} />
              </button>
          </div>
        </div>
      </nav>

      {/* Main Grid Layout */}
      <main className="flex-grow w-full max-w-[1800px] mx-auto p-4 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ================= LEFT COLUMN: UPLOAD & CROP (Span 3) ================= */}
          <div className="lg:col-span-3 space-y-4 order-1">
            
            {/* 1. UPLOAD SECTION */}
            {!originalImage ? (
              <div 
                className="group relative border-2 border-dashed border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-white hover:bg-blue-50/30 hover:border-blue-500 transition-all cursor-pointer min-h-[300px] shadow-sm hover:shadow-md"
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileUpload}
                />
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-300 shadow-inner">
                  <Upload size={28} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">ছবি আপলোড</h3>
                <p className="text-slate-500 text-xs mb-6 max-w-[180px] leading-relaxed">পাসপোর্ট সাইজ করার জন্য আপনার ছবি এখানে দিন। <span className="text-emerald-600 font-bold block mt-1">(খরচ: ৩ টাকা)</span></p>
                
                <div className="flex flex-col gap-2 w-full max-w-[180px]">
                    <button className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg font-bold shadow-lg hover:bg-slate-800 transition-all">
                        ফাইল বেছে নিন
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleCameraCapture(); }}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm rounded-lg font-bold shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                    >
                        <Camera size={16} /> ক্যামেরা
                    </button>
                </div>
              </div>
            ) : (
              // 2. EDITOR SECTION
              <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden sticky top-24">
                <div className="bg-slate-50/80 backdrop-blur px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                   <div className="flex items-center gap-2">
                        <FileImage size={16} className="text-blue-600"/>
                        <span className="font-bold text-slate-700 text-sm">ক্রপ</span>
                   </div>
                   <button onClick={handleReset} className="text-xs font-bold text-red-500 hover:bg-red-50 px-2 py-1 rounded transition-colors">
                        রিসেট
                   </button>
                </div>
                
                <div className="p-4">
                    <div 
                        ref={origContainerRef}
                        className="aspect-[4/5] bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative cursor-move touch-none flex items-center justify-center group shadow-inner"
                        onMouseDown={handleMouseDownOrig}
                        onMouseMove={handleMouseMoveOrig}
                        onMouseUp={handleMouseUpOrig}
                        onMouseLeave={handleMouseUpOrig}
                        onTouchStart={handleMouseDownOrig}
                        onTouchMove={handleMouseMoveOrig}
                        onTouchEnd={handleMouseUpOrig}
                    >
                        <img 
                            ref={origImageRef}
                            src={originalImage} 
                            alt="Original" 
                            className="w-full h-full object-cover pointer-events-none select-none origin-center" 
                            style={{
                                transform: `translate(${origTransform.x}px, ${origTransform.y}px) scale(${origTransform.scale}) rotate(${origTransform.rotation}deg)`,
                                transition: isDraggingOrig ? 'none' : 'transform 0.1s ease-out'
                            }}
                        />
                        
                        {/* Grid */}
                        <div className="absolute inset-0 pointer-events-none opacity-30">
                            <div className="absolute top-1/3 w-full h-px bg-white/80"></div>
                            <div className="absolute top-2/3 w-full h-px bg-white/80"></div>
                            <div className="absolute left-1/3 h-full w-px bg-white/80"></div>
                            <div className="absolute left-2/3 h-full w-px bg-white/80"></div>
                        </div>

                        {/* Auto Align Button */}
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleAutoAlign(); }}
                            className="absolute bottom-3 right-3 bg-white/90 backdrop-blur text-blue-600 p-2.5 rounded-lg shadow-md hover:scale-105 active:scale-95 transition-all z-10 border border-blue-100 opacity-80 group-hover:opacity-100"
                            title="অটো ফেস ঠিক করুন"
                        >
                            <Wand2 size={18} className={analyzing ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>
              </div>
            )}
          </div>

          {/* ================= MIDDLE COLUMN: PREVIEW (Span 6) ================= */}
          <div className="lg:col-span-6 h-full order-2">
            <div className="sticky top-24 transition-all">
                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col min-h-[500px] lg:min-h-[600px]">
                    
                    {/* Header */}
                    <div className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center z-20">
                        <div className="flex items-center gap-2">
                            <ScanFace className="text-blue-600" size={20} /> 
                            <span className="font-bold text-slate-800">প্রিভিউ স্টুডিও</span>
                        </div>
                        <div className="flex gap-2">
                            {isPaidSession && originalImage && (
                                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
                                    <CheckCircle2 size={12}/> Paid Session
                                </span>
                            )}
                            {generatedImage && (
                                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                                    <CheckCircle2 size={12}/> Ready
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Canvas Area */}
                    <div className="flex-grow bg-slate-100/50 relative flex items-center justify-center p-8 overflow-hidden">
                        
                        {/* Grid Pattern */}
                        <div className="absolute inset-0 opacity-[0.03]" 
                             style={{backgroundImage: 'linear-gradient(#475569 1px, transparent 1px), linear-gradient(90deg, #475569 1px, transparent 1px)', backgroundSize: '20px 20px'}}>
                        </div>

                        {/* Empty State */}
                        {!originalImage && !status.isProcessing && !generatedImage && (
                            <div className="text-center">
                                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-slate-200">
                                    <ImageIcon size={32} className="text-slate-300" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-700 mb-1">অপেক্ষমান</h3>
                                <p className="text-slate-400 text-xs">ছবি আপলোড করুন</p>
                            </div>
                        )}

                        {/* NEW: Pre-Generation State (Uploaded but not generated) */}
                        {originalImage && !generatedImage && !status.isProcessing && !status.error && (
                            <div className="relative z-10 flex flex-col items-center justify-center w-full animate-fade-in-up">
                                <div className="bg-white p-3 shadow-xl shadow-slate-200/50 rounded-xl border border-slate-100 max-w-[280px]">
                                    <div className="aspect-[3/4] bg-slate-100 rounded-lg overflow-hidden relative">
                                         <img 
                                            src={originalImage} 
                                            alt="Original Preview" 
                                            className="w-full h-full object-cover opacity-80 grayscale-[30%]"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                            <span className="bg-white/90 backdrop-blur text-slate-600 px-3 py-1 rounded-full text-[10px] font-bold shadow-sm border border-white/50">
                                                অরিজিনাল প্রিভিউ
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 text-center max-w-xs">
                                    <h4 className="font-bold text-slate-700 mb-1">ছবি এডিটিং-এর জন্য প্রস্তুত</h4>
                                    <p className="text-xs text-slate-500 leading-relaxed bg-white px-4 py-2 rounded-lg border border-slate-100 shadow-sm inline-block">
                                        ডানদিকের মেনু থেকে আপনার পছন্দের <strong>সাইজ</strong>, <strong>ড্রেস</strong> ও <strong>ব্যাকগ্রাউন্ড</strong> সিলেক্ট করে <br/>
                                        <span className="text-blue-600 font-bold">"ছবি তৈরি করুন"</span> বাটনে ক্লিক করুন।
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Loading State */}
                        {status.isProcessing && (
                            <div className="absolute inset-0 z-30 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center">
                                <div className="relative mb-6">
                                    <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 rounded-full animate-pulse scale-150"></div>
                                    <div className="w-16 h-16 bg-white rounded-xl shadow-xl flex items-center justify-center relative z-10 animate-bounce">
                                        <Zap size={32} className="text-blue-600 fill-blue-600" />
                                    </div>
                                </div>
                                <div className="w-56 h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                                    <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500 animate-progress w-[200%]"></div>
                                </div>
                                <p className="text-sm font-bold text-slate-800 animate-pulse">{status.message}</p>
                            </div>
                        )}

                        {/* Error State */}
                        {status.error && (
                            <div className="bg-white p-6 rounded-xl shadow-xl border border-red-100 text-center max-w-xs z-20">
                                <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3 text-red-500">
                                    <Maximize2 size={20} />
                                </div>
                                <h4 className="font-bold text-red-600 text-sm mb-1">ত্রুটি হয়েছে</h4>
                                <p className="text-slate-500 text-xs mb-4">{status.error}</p>
                                <button onClick={() => setStatus({isProcessing: false, message: ''})} className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors">
                                    ঠিক আছে
                                </button>
                            </div>
                        )}

                        {/* Success Result */}
                        {generatedImage && !status.isProcessing && (
                            <div className="relative z-10 flex flex-col items-center w-full max-w-sm animate-fade-in-up">
                                <div className="bg-white p-2.5 shadow-2xl shadow-slate-400/20 rounded-lg transform transition-all duration-300">
                                    <div 
                                        className="relative overflow-hidden cursor-move touch-none bg-slate-200"
                                        style={{ 
                                            width: settings.sizePreset === 'passport' ? '300px' : '300px',
                                            aspectRatio: getContainerAspectRatio(), 
                                        }}
                                        onMouseDown={handleMouseDown}
                                        onMouseMove={handleMouseMove}
                                        onMouseUp={handleMouseUp}
                                        onMouseLeave={handleMouseUp}
                                        onTouchStart={handleMouseDown}
                                        onTouchMove={handleMouseMove}
                                        onTouchEnd={handleMouseUp}
                                    >
                                        <img 
                                            src={generatedImage} 
                                            alt="Generated Result" 
                                            className="w-full h-full object-contain pointer-events-none select-none origin-center" 
                                            style={{
                                                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                                                transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                                            }}
                                        />
                                        
                                        {/* Guides */}
                                        <div className="absolute inset-0 border-2 border-white/20 pointer-events-none"></div>
                                        <div className="absolute top-1/2 left-0 w-full h-px bg-white/30 pointer-events-none"></div>
                                        <div className="absolute top-0 left-1/2 h-full w-px bg-white/30 pointer-events-none"></div>
                                    </div>
                                </div>

                                {/* Floating Controls for Preview */}
                                <div className="mt-6 w-full flex flex-col gap-3">
                                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                                        <ZoomIn size={16} className="text-slate-400"/>
                                        <input 
                                            type="range" 
                                            min="1" max="3" step="0.1" 
                                            value={transform.scale}
                                            onChange={(e) => setTransform(prev => ({ ...prev, scale: parseFloat(e.target.value) }))}
                                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                        />
                                        <button 
                                            onClick={handleResetPosition}
                                            className="p-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-full transition-colors"
                                            title="রিসেট"
                                        >
                                            <RotateCcw size={14} />
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => handleDownload()}
                                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Download size={18} />
                                        ডাউনলোড (HD)
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
          </div>

          {/* ================= RIGHT COLUMN: CONTROLS SIDEBAR (Span 3) ================= */}
          <div className="lg:col-span-3 order-3">
               <div className="sticky top-24">
                   <Controls 
                        settings={settings} 
                        setSettings={setSettings} 
                        disabled={status.isProcessing || !originalImage || analyzing}
                        onGenerate={handleGenerateClick}
                   />
               </div>
          </div>

        </div>

        {/* Cost Warning Modal */}
        {showCostModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up p-6 text-center">
                    <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-100">
                        <AlertTriangle size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">নিশ্চিতকরণ</h3>
                    <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                        এই ছবিটি তৈরি করতে আপনার ব্যালেন্স থেকে <span className="font-bold text-red-600">৩ টাকা</span> কাটা হবে। আপনি কি নিশ্চিত?
                    </p>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setShowCostModal(false)}
                            className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                        >
                            না, থাক
                        </button>
                        <button 
                            onClick={executeGeneration}
                            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
                        >
                            হ্যাঁ, তৈরি করুন
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Wallet Modal (Recharge + History) */}
        {showWalletModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
                    <div className="bg-pink-600 p-6 text-white text-center flex-shrink-0">
                        <h3 className="text-xl font-bold">আমার ওয়ালেট</h3>
                        <p className="text-pink-100 text-xs">ব্যালেন্স: ৳ {user.balance}</p>
                    </div>

                    {/* Tabs */}
                    <div className="flex bg-slate-50 border-b border-slate-200">
                        <button 
                            onClick={() => setWalletTab('recharge')}
                            className={`flex-1 py-3 text-xs font-bold transition-colors border-b-2 ${walletTab === 'recharge' ? 'text-pink-600 border-pink-600 bg-white' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
                        >
                            রিচার্জ
                        </button>
                        <button 
                            onClick={() => setWalletTab('history')}
                            className={`flex-1 py-3 text-xs font-bold transition-colors border-b-2 ${walletTab === 'history' ? 'text-pink-600 border-pink-600 bg-white' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
                        >
                            হিস্টোরি
                        </button>
                    </div>
                    
                    <div className="flex-grow overflow-y-auto custom-scrollbar p-6">
                        {walletTab === 'recharge' ? (
                            <>
                                {/* Info Section */}
                                <div className="bg-pink-50 border border-pink-100 rounded-xl p-4 mb-6 text-center">
                                    <p className="text-xs text-slate-600 mb-1">এই নাম্বারে টাকা সেন্ড মানি করুন:</p>
                                    <h4 className="text-xl font-bold text-pink-600 font-mono tracking-wide selection:bg-pink-200">01540-013418</h4>
                                    <p className="text-xs font-bold text-slate-500 mt-1">bKash Personal</p>
                                </div>

                                {/* Form */}
                                <form onSubmit={handleSubmitRecharge} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">পরিমাণ (টাকা)</label>
                                        <input 
                                            type="number" required placeholder="উদাহরণ: 100" min="50"
                                            value={rechargeAmount} onChange={e => setRechargeAmount(e.target.value)}
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none font-medium"
                                        />
                                        <p className="text-[10px] text-red-500 font-bold mt-1">* সর্বনিম্ন রিচার্জ হবে ৫০ টাকা</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">যে নাম্বার থেকে পাঠিয়েছেন</label>
                                        <input 
                                            type="text" required placeholder="01XXXXXXXXX"
                                            value={senderNumber} onChange={e => setSenderNumber(e.target.value)}
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">TrxID</label>
                                        <input 
                                            type="text" required placeholder="8N7..."
                                            value={trxId} onChange={e => setTrxId(e.target.value)}
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none font-medium uppercase font-mono"
                                        />
                                    </div>

                                    <button 
                                        type="submit" 
                                        disabled={isSubmittingRecharge}
                                        className="w-full py-3 bg-pink-600 text-white rounded-xl font-bold hover:bg-pink-700 transition-all shadow-lg shadow-pink-500/30 flex items-center justify-center gap-2"
                                    >
                                        {isSubmittingRecharge ? 'রিকোয়েস্ট পাঠানো হচ্ছে...' : 'ভেরিফাই করুন'}
                                    </button>
                                </form>

                                {/* Recent Recharge Requests */}
                                <div className="mt-8 border-t border-slate-100 pt-4">
                                    <h5 className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-1">
                                        <History size={12}/> সাম্প্রতিক রিকোয়েস্ট
                                    </h5>
                                    <div className="space-y-2">
                                        {rechargeRequests.length === 0 ? (
                                            <p className="text-center text-xs text-slate-400 py-2">কোনো রেকর্ড নেই</p>
                                        ) : rechargeRequests.map(req => (
                                            <div key={req.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                                                <div>
                                                    <p className="font-bold text-slate-700">৳ {req.amount}</p>
                                                    <p className="text-[10px] text-slate-400">{new Date(req.date).toLocaleDateString()}</p>
                                                </div>
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                                    req.status === 'approved' ? 'bg-green-100 text-green-600' :
                                                    req.status === 'rejected' ? 'bg-red-100 text-red-600' :
                                                    'bg-yellow-100 text-yellow-600'
                                                }`}>
                                                    {req.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-3">
                                {transactionHistory.length === 0 ? (
                                    <div className="text-center py-10">
                                        <History size={32} className="mx-auto text-slate-200 mb-2"/>
                                        <p className="text-xs text-slate-400">কোনো লেনদেনের হিস্টোরি নেই</p>
                                    </div>
                                ) : (
                                    transactionHistory.map(tx => (
                                        <div key={tx.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.type === 'credit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                    {tx.type === 'credit' ? <ArrowDownLeft size={16}/> : <ArrowUpRight size={16}/>}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-700">{tx.description}</p>
                                                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                                        <Clock size={10}/> {new Date(tx.date).toLocaleDateString()} at {new Date(tx.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`text-sm font-bold ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                                {tx.type === 'credit' ? '+' : '-'} ৳{tx.amount}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex-shrink-0">
                        <button 
                            onClick={() => setShowWalletModal(false)}
                            className="w-full py-2 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-100 transition-colors text-xs"
                        >
                            বন্ধ করুন
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Gallery Modal */}
        {showGallery && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                 <div className="bg-white w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col">
                     <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <div>
                             <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><LayoutGrid size={20}/> আমার গ্যালারি</h3>
                             <p className="text-xs text-slate-500">আপনার জেনারেট করা সকল ছবি এখানে পাবেন</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
                                <Calendar size={14} className="text-slate-400"/>
                                <input 
                                    type="date" 
                                    className="text-xs outline-none bg-transparent"
                                    value={filterDate}
                                    onChange={(e) => setFilterDate(e.target.value)}
                                />
                            </div>
                            <button onClick={() => setShowGallery(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
                        </div>
                     </div>
                     
                     <div className="flex-grow overflow-y-auto p-6 bg-slate-100/50 custom-scrollbar">
                        {filteredImages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <LayoutGrid size={48} className="mb-4 opacity-20" />
                                <p>কোনো ছবি পাওয়া যায়নি</p>
                                {filterDate && <button onClick={() => setFilterDate('')} className="mt-2 text-blue-600 text-xs font-bold hover:underline">ফিল্টার মুছুন</button>}
                            </div>
                        ) : (
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {filteredImages.map((img) => (
                                    <div key={img.id} className="group bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow relative">
                                        <div className="aspect-[3/4] bg-slate-100 relative">
                                            <img src={img.imageBase64} className="w-full h-full object-cover" alt="Generated" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                <button 
                                                    onClick={() => handleDownload(img.imageBase64)}
                                                    className="p-2 bg-white rounded-full text-slate-800 hover:text-blue-600 transition-colors"
                                                    title="ডাউনলোড"
                                                >
                                                    <Download size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="p-3">
                                            <p className="text-[10px] text-slate-400">{new Date(img.date).toLocaleDateString()}</p>
                                            <p className="text-[9px] text-slate-300 truncate">{img.settings}</p>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        )}
                     </div>
                 </div>
             </div>
        )}
      
        {/* Chat Widget for Users */}
        <ChatSupport />
      </main>
    </div>
  );
};
