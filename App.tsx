import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, Download, RefreshCw, User, Image as ImageIcon } from 'lucide-react';
import { Controls } from './components/Controls';
import { generatePassportPhoto, blobToBase64 } from './services/geminiService';
import { BackgroundColor, DressType, PhotoSettings, ProcessingStatus } from './types';

const App: React.FC = () => {
  // State
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>({ isProcessing: false, message: '' });
  
  const [settings, setSettings] = useState<PhotoSettings>({
    bgColor: BackgroundColor.White,
    dress: DressType.None,
    smoothFace: true,
    enhanceLighting: true
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handlers
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File size is too large. Please upload an image under 5MB.");
        return;
      }
      try {
        const base64 = await blobToBase64(file);
        setOriginalImage(base64);
        setGeneratedImage(null);
      } catch (error) {
        console.error("Error reading file", error);
      }
    }
  };

  const handleCameraCapture = useCallback(async () => {
    try {
        // Simple implementation: Trigger input with capture="user" for mobile devices,
        // or just fallback to file upload on desktop if capture isn't supported directly by input type.
        // For a true camera UI, we'd need a video stream, but keeping it simple for this MVP 
        // using the file input's native capability.
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    } catch (e) {
        console.error(e);
    }
  }, []);

  const handleGenerate = async () => {
    if (!originalImage) return;

    setStatus({ isProcessing: true, message: 'এআই ছবি বিশ্লেষণ করছে... (Analyzing...)' });
    setGeneratedImage(null);

    try {
      // Step 1: Send to Gemini
      setStatus({ isProcessing: true, message: 'ছবি প্রসেসিং হচ্ছে... (Processing...)' });
      const processedBase64 = await generatePassportPhoto(originalImage, settings);
      
      setGeneratedImage(`data:image/jpeg;base64,${processedBase64}`);
      setStatus({ isProcessing: false, message: '' });

    } catch (error) {
      console.error(error);
      setStatus({ isProcessing: false, message: '', error: 'দুঃখিত, সমস্যা হয়েছে। আবার চেষ্টা করুন।' });
    }
  };

  const handleDownload = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = `bd-passport-photo-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleReset = () => {
    setOriginalImage(null);
    setGeneratedImage(null);
    setStatus({ isProcessing: false, message: '' });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white">
              <User size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">পাসপোর্ট ফটো মেকার</h1>
              <p className="text-xs text-gray-500">AI Powered BD Passport Tool</p>
            </div>
          </div>
          <button 
            onClick={handleReset}
            className="text-gray-500 hover:text-red-500 transition-colors"
            title="Reset"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto w-full p-4 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Input & Controls */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Upload Area */}
            {!originalImage ? (
              <div 
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-white hover:bg-gray-50 transition-colors cursor-pointer min-h-[300px]"
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileUpload}
                />
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mb-4">
                  <Upload size={32} />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">ছবি আপলোড করুন</h3>
                <p className="text-gray-500 text-sm mt-2">কম্পিউটার বা গ্যালারি থেকে ছবি নিন</p>
                <div className="my-4 text-gray-300">- অথবা -</div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleCameraCapture(); }}
                  className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <Camera size={18} />
                  ক্যামেরা চালু করুন
                </button>
              </div>
            ) : (
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-semibold text-gray-500">অরিজিনাল ছবি</span>
                  <button onClick={handleReset} className="text-xs text-red-500 hover:underline">পরিবর্তন করুন</button>
                </div>
                <div className="aspect-[4/5] w-full bg-gray-100 rounded-lg overflow-hidden relative">
                   {/* Overlay guide for user to see approximate crop */}
                   <img 
                    src={`data:image/jpeg;base64,${originalImage}`} 
                    alt="Original" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Controls */}
            <Controls 
              settings={settings} 
              setSettings={setSettings} 
              disabled={!originalImage || status.isProcessing}
              onGenerate={handleGenerate}
            />
          </div>

          {/* Right Column: Preview & Result */}
          <div className="lg:col-span-2 flex flex-col">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 flex-grow flex flex-col items-center justify-center min-h-[500px] relative overflow-hidden">
              
              {!originalImage && !generatedImage && (
                <div className="text-center text-gray-400">
                  <ImageIcon size={64} className="mx-auto mb-4 opacity-20" />
                  <p>ছবি আপলোড করার পর এখানে ফলাফল দেখা যাবে</p>
                </div>
              )}

              {/* Processing State */}
              {status.isProcessing && (
                <div className="absolute inset-0 bg-white/90 z-20 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-lg font-medium text-gray-700 animate-pulse">{status.message}</p>
                </div>
              )}

              {/* Error State */}
              {status.error && (
                <div className="text-center p-6 bg-red-50 rounded-xl border border-red-100 max-w-md">
                  <p className="text-red-600 font-medium">{status.error}</p>
                  <button onClick={handleGenerate} className="mt-4 text-sm text-red-700 underline">আবার চেষ্টা করুন</button>
                </div>
              )}

              {/* Result Display */}
              {generatedImage && !status.isProcessing && (
                <div className="flex flex-col items-center w-full max-w-md animate-fade-in">
                  <h3 className="text-xl font-bold text-gray-800 mb-6">আপনার পাসপোর্ট সাইজ ছবি</h3>
                  
                  <div className="relative shadow-2xl rounded-sm overflow-hidden border-4 border-white ring-1 ring-gray-200">
                    {/* Standard Passport Size Aspect Ratio Visual Container */}
                    <div style={{ width: '360px', height: '450px' }} className="relative bg-gray-200 max-w-full">
                       <img 
                        src={generatedImage} 
                        alt="Passport Result" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 mt-8 w-full">
                    <button 
                      onClick={handleDownload}
                      className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-3 px-6 rounded-xl hover:bg-green-700 transition-all font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                      <Download size={20} />
                      ডাউনলোড (JPG)
                    </button>
                  </div>
                  <p className="mt-4 text-xs text-gray-400">Standard BD Passport Size (40mm x 50mm)</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
      
      <footer className="bg-white border-t border-gray-200 mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} BD Passport Photo AI. Privacy First.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;