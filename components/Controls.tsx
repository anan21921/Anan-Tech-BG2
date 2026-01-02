import React, { useState, useEffect } from 'react';
import { Palette, Ruler, ScanLine, Sparkles, Shirt, ChevronDown, Check, User, Edit3, Sun, Wand2, Fingerprint, X, ChevronUp, Play } from 'lucide-react';
import { BackgroundColor, DressType, PhotoSettings, SizePreset } from '../types';

interface ControlsProps {
  settings: PhotoSettings;
  setSettings: React.Dispatch<React.SetStateAction<PhotoSettings>>;
  disabled: boolean;
  onGenerate: () => void;
}

// Helper Data for Dress Visuals
const menDresses = [
    { id: DressType.SchoolShirtWhite, label: 'School Shirt', color: 'bg-white border border-slate-200' },
    { id: DressType.FormalSuitBlack, label: 'Black Suit', color: 'bg-slate-800' },
    { id: DressType.FormalSuitNavy, label: 'Navy Suit', color: 'bg-blue-900' },
    { id: DressType.FormalSuitGrey, label: 'Grey Suit', color: 'bg-slate-500' },
    { id: DressType.WhiteShirt, label: 'White Shirt', color: 'bg-white border border-slate-200' },
    { id: DressType.BlueShirt, label: 'Blue Shirt', color: 'bg-blue-100' },
    { id: DressType.PoloShirt, label: 'Navy Polo', color: 'bg-indigo-900' },
    { id: DressType.Panjabi, label: 'White Panjabi', color: 'bg-slate-50 border border-slate-200' },
    { id: DressType.BlackPanjabi, label: 'Black Panjabi', color: 'bg-black' },
    { id: DressType.Sherwani, label: 'Sherwani', color: 'bg-amber-100' },
    { id: DressType.Jubba, label: 'Jubba', color: 'bg-white border border-slate-200' },
];

const womenDresses = [
    { id: DressType.SchoolUniformWhite, label: 'School (White)', color: 'bg-white border border-slate-200' },
    { id: DressType.SchoolUniformGreen, label: 'School (Green)', color: 'bg-green-700' },
    { id: DressType.SchoolUniformBlue, label: 'School (Blue)', color: 'bg-blue-700' },
    { id: DressType.Saree, label: 'Formal Saree', color: 'bg-rose-100' },
    { id: DressType.SalwarKameez, label: 'Salwar Kameez', color: 'bg-emerald-100' },
    { id: DressType.WomenBlazer, label: 'Black Blazer', color: 'bg-slate-900' },
    { id: DressType.WomenWhiteShirt, label: 'White Shirt', color: 'bg-white border border-slate-200' },
    { id: DressType.Hijab, label: 'Hijab', color: 'bg-slate-800' },
    { id: DressType.Abaya, label: 'Abaya', color: 'bg-black' },
    { id: DressType.Kurti, label: 'Kurti', color: 'bg-pink-100' },
];

export const Controls: React.FC<ControlsProps> = ({ settings, setSettings, disabled, onGenerate }) => {
  // Use a string to track which section is open. Default to 'size' or null.
  const [openSection, setOpenSection] = useState<string | null>('size');
  const [dressTab, setDressTab] = useState<'original' | 'men' | 'women' | 'custom'>('original');

  // Sync tab with setting
  useEffect(() => {
    if (settings.dress === DressType.None) setDressTab('original');
    else if (settings.dress === DressType.Custom) setDressTab('custom');
    else if (menDresses.some(d => d.id === settings.dress)) setDressTab('men');
    else if (womenDresses.some(d => d.id === settings.dress)) setDressTab('women');
  }, [settings.dress]);

  const toggleSection = (section: string) => {
    setOpenSection(prev => prev === section ? null : section);
  };

  const handleBgChange = (color: string) => {
    setSettings(prev => ({ ...prev, bgColor: color }));
  };

  const handleSizeChange = (preset: SizePreset) => {
    setSettings(prev => ({ ...prev, sizePreset: preset }));
  };

  const toggleSetting = (key: keyof Pick<PhotoSettings, 'smoothFace' | 'enhanceLighting' | 'brightenFace'>) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const selectDress = (type: DressType) => {
      setSettings(prev => ({ ...prev, dress: type }));
  };

  // --- CONTENT RENDERERS ---

  const renderSizeContent = () => (
    <div className="space-y-3 pt-2">
            {[
                { id: 'passport', label: 'পাসপোর্ট সাইজ', sub: '৪০x৫০ মিমি', icon: Fingerprint },
                { id: '300x300', label: 'স্কয়ার সাইজ', sub: '৩০০x৩০০ পিক্সেল', icon: ScanLine },
                { id: 'custom', label: 'কাস্টম সাইজ', sub: 'পছন্দমতো মাপ', icon: Edit3 },
            ].map((item) => (
                <button
                    key={item.id}
                    onClick={() => handleSizeChange(item.id as SizePreset)}
                    className={`flex items-center p-3 rounded-xl border w-full transition-all text-left
                        ${settings.sizePreset === item.id 
                            ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                            : 'border-slate-100 hover:bg-slate-50'
                        }`}
                >
                    <item.icon size={18} className={settings.sizePreset === item.id ? 'text-blue-600' : 'text-slate-400'} />
                    <div className="ml-3 flex-1">
                        <span className={`block text-xs font-bold ${settings.sizePreset === item.id ? 'text-slate-900' : 'text-slate-700'}`}>{item.label}</span>
                        <span className="block text-[10px] text-slate-500">{item.sub}</span>
                    </div>
                    {settings.sizePreset === item.id && <Check size={14} className="text-blue-600" strokeWidth={3} />}
                </button>
            ))}
        
        {settings.sizePreset === 'custom' && (
            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                     <label className="text-[10px] font-bold text-slate-400 block mb-1">Width</label>
                     <input 
                        type="number" 
                        value={settings.customWidth} 
                        onChange={e => setSettings(p=>({...p, customWidth: +e.target.value}))} 
                        className="w-full p-2 border border-slate-300 rounded-md text-xs text-center font-bold focus:ring-1 focus:ring-blue-500 outline-none" 
                    />
                </div>
                <div>
                     <label className="text-[10px] font-bold text-slate-400 block mb-1">Height</label>
                     <input 
                        type="number" 
                        value={settings.customHeight} 
                        onChange={e => setSettings(p=>({...p, customHeight: +e.target.value}))} 
                        className="w-full p-2 border border-slate-300 rounded-md text-xs text-center font-bold focus:ring-1 focus:ring-blue-500 outline-none" 
                    />
                </div>
            </div>
        )}
    </div>
  );

  const renderBgContent = () => (
    <div className="pt-2">
        <div className="grid grid-cols-5 gap-2">
            {Object.entries(BackgroundColor).map(([name, color]) => (
                <button
                    key={name}
                    onClick={() => handleBgChange(color)}
                    className={`w-8 h-8 rounded-full border shadow-sm flex items-center justify-center transition-transform hover:scale-110
                        ${settings.bgColor === color 
                            ? 'border-blue-500 ring-2 ring-blue-100 scale-110' 
                            : 'border-slate-200'
                        }`}
                    style={{ backgroundColor: color }}
                    title={name}
                >
                    {settings.bgColor === color && <Check size={12} className={['#ffffff', '#f8f9fa'].includes(color) ? 'text-slate-900' : 'text-white'} strokeWidth={3} />}
                </button>
            ))}
            
             <div className="relative w-8 h-8 rounded-full overflow-hidden border border-slate-200 shadow-sm cursor-pointer hover:scale-110 transition-transform">
                <input 
                    type="color" 
                    value={settings.bgColor}
                    onChange={(e) => handleBgChange(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">+</div>
            </div>
        </div>
        <div className="mt-3 text-center">
             <span className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-500 font-mono">{settings.bgColor}</span>
        </div>
    </div>
  );

  const renderDressContent = () => (
    <div className="pt-2">
        <div className="flex bg-slate-100 p-1 rounded-lg mb-3">
            {[
                { id: 'original', label: 'আসল' },
                { id: 'men', label: 'পুরুষ' },
                { id: 'women', label: 'নারী' },
            ].map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => {
                        setDressTab(tab.id as any);
                        if (tab.id === 'original') selectDress(DressType.None);
                    }}
                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all
                        ${dressTab === tab.id 
                            ? 'bg-white text-blue-600 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>

        <div className="max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
            {dressTab === 'original' && (
                <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                    <User size={20} className="mx-auto text-slate-300 mb-2"/>
                    <p className="text-xs text-slate-400">কোনো পরিবর্তন হবে না</p>
                </div>
            )}

            {(dressTab === 'men' || dressTab === 'women') && (
                <div className="grid grid-cols-2 gap-2">
                    {(dressTab === 'men' ? menDresses : womenDresses).map((dress) => (
                        <button
                            key={dress.id}
                            onClick={() => selectDress(dress.id)}
                            className={`flex flex-col items-center p-2 rounded-lg border transition-all
                                ${settings.dress === dress.id 
                                    ? 'border-blue-500 bg-blue-50' 
                                    : 'border-slate-100 bg-white hover:border-blue-200'
                                    }`}
                        >
                            <div className={`w-6 h-6 rounded-full mb-1.5 shadow-sm ${dress.color}`}></div>
                            <span className={`text-[9px] font-bold text-center leading-tight ${settings.dress === dress.id ? 'text-blue-700' : 'text-slate-500'}`}>
                                {dress.label}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    </div>
  );

  const renderAIContent = () => (
    <div className="space-y-3 pt-2">
        {[
            { key: 'smoothFace', title: 'ফেস স্মুথ', icon: Wand2 },
            { key: 'enhanceLighting', title: 'লাইট ফিক্স', icon: Sun },
        ].map((item) => (
            <div 
                key={item.key}
                onClick={() => toggleSetting(item.key as any)}
                className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                    (settings as any)[item.key]
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-white border-slate-100 hover:border-slate-200'
                }`}
            >
                <div className="flex items-center gap-2">
                    <item.icon size={14} className={(settings as any)[item.key] ? 'text-blue-600' : 'text-slate-400'} />
                    <span className={`text-xs font-bold ${(settings as any)[item.key] ? 'text-slate-800' : 'text-slate-600'}`}>{item.title}</span>
                </div>
                <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-300 flex ${(settings as any)[item.key] ? 'bg-blue-500 justify-end' : 'bg-slate-300 justify-start'}`}>
                    <div className="bg-white w-3 h-3 rounded-full shadow-sm"></div>
                </div>
            </div>
        ))}
        
        {/* Brightness Slider */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><Sparkles size={10}/> ফর্সা করা</span>
                <span className="text-[10px] font-bold text-blue-600">{settings.brightenFaceIntensity}%</span>
            </div>
            <input 
                type="range" 
                min="0" max="100" step="10"
                value={settings.brightenFaceIntensity} 
                onChange={(e) => setSettings(prev => ({ ...prev, brightenFaceIntensity: parseInt(e.target.value) }))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
        </div>
    </div>
  );

  const AccordionItem = ({ id, title, icon: Icon, children }: any) => {
      const isOpen = openSection === id;
      return (
          <div className="border-b border-slate-100 last:border-0">
              <button 
                onClick={() => toggleSection(id)}
                className={`w-full flex items-center justify-between py-4 px-1 group transition-colors ${isOpen ? 'text-blue-600' : 'text-slate-700 hover:text-blue-600'}`}
              >
                  <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-md transition-colors ${isOpen ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-50'}`}>
                          <Icon size={16} />
                      </div>
                      <span className="font-bold text-sm">{title}</span>
                  </div>
                  <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : 'text-slate-400'}`} />
              </button>
              
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100 mb-4' : 'max-h-0 opacity-0'}`}>
                  {children}
              </div>
          </div>
      );
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">কনফিগারেশন</h3>
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
        </div>

        {/* Scrollable List */}
        <div className="flex-grow px-5 py-2">
            <AccordionItem id="size" title="ছবির সাইজ" icon={Ruler}>
                {renderSizeContent()}
            </AccordionItem>
            
            <AccordionItem id="bg" title="ব্যাকগ্রাউন্ড" icon={Palette}>
                {renderBgContent()}
            </AccordionItem>
            
            <AccordionItem id="dress" title="পোশাক পরিবর্তন" icon={Shirt}>
                {renderDressContent()}
            </AccordionItem>
            
            <AccordionItem id="ai" title="AI ফিনিশিং" icon={Sparkles}>
                {renderAIContent()}
            </AccordionItem>
        </div>

        {/* Footer Action */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/50">
            <button
                onClick={onGenerate}
                disabled={disabled}
                className={`w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 transform active:scale-95
                ${disabled 
                    ? 'bg-slate-300 cursor-not-allowed text-slate-500 shadow-none' 
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                }`}
            >
                {disabled ? (
                    <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        প্রসেসিং...
                    </>
                ) : (
                    <>
                        <Wand2 size={18} />
                        ছবি তৈরি করুন
                    </>
                )}
            </button>
        </div>
    </div>
  );
};