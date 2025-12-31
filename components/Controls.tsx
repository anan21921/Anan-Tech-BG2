import React from 'react';
import { BackgroundColor, DressType, PhotoSettings } from '../types';

interface ControlsProps {
  settings: PhotoSettings;
  setSettings: React.Dispatch<React.SetStateAction<PhotoSettings>>;
  disabled: boolean;
  onGenerate: () => void;
}

export const Controls: React.FC<ControlsProps> = ({ settings, setSettings, disabled, onGenerate }) => {
  
  const handleBgChange = (color: BackgroundColor) => {
    setSettings(prev => ({ ...prev, bgColor: color }));
  };

  const handleDressChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSettings(prev => ({ ...prev, dress: e.target.value as DressType }));
  };

  const toggleSetting = (key: keyof Pick<PhotoSettings, 'smoothFace' | 'enhanceLighting'>) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 space-y-6">
      <h2 className="text-xl font-bold text-gray-800 border-b pb-2">সেটিংস (Settings)</h2>

      {/* Background Color */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-700">ব্যাকগ্রাউন্ড কালার (Background Color)</label>
        <div className="flex gap-3 flex-wrap">
          {Object.entries(BackgroundColor).map(([key, value]) => (
            <button
              key={key}
              onClick={() => handleBgChange(value)}
              className={`w-10 h-10 rounded-full border-2 shadow-sm transition-transform hover:scale-110 focus:outline-none ${
                settings.bgColor === value ? 'border-green-600 ring-2 ring-green-200 scale-110' : 'border-gray-300'
              }`}
              style={{ backgroundColor: value }}
              title={key}
            />
          ))}
        </div>
      </div>

      {/* Dress Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-700">পোষাক পরিবর্তন (Change Dress)</label>
        <select
          value={settings.dress}
          onChange={handleDressChange}
          disabled={disabled}
          className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block"
        >
          <option value={DressType.None}>অরিজিনাল (Original)</option>
          <optgroup label="পুরুষদের জন্য (For Men)">
            <option value={DressType.FormalSuitBlack}>কালো ফরমাল স্যুট (Black Suit)</option>
            <option value={DressType.FormalSuitNavy}>নেভি ব্লু স্যুট (Navy Suit)</option>
            <option value={DressType.FormalSuitGrey}>ধূসর ফরমাল স্যুট (Grey Suit)</option>
            <option value={DressType.WhiteShirt}>সাদা শার্ট (White Shirt)</option>
            <option value={DressType.BlueShirt}>নীল শার্ট (Blue Shirt)</option>
            <option value={DressType.CheckeredShirt}>চেক শার্ট (Checkered Shirt)</option>
            <option value={DressType.PoloShirt}>নেভি ব্লু পোলো শার্ট (Polo Shirt)</option>
            <option value={DressType.Panjabi}>সাদা পাঞ্জাবি (White Panjabi)</option>
            <option value={DressType.BlackPanjabi}>কালো পাঞ্জাবি (Black Panjabi)</option>
            <option value={DressType.Jubba}>জুব্বা (Jubba/Thobe)</option>
            <option value={DressType.Sherwani}>শেরওয়ানি (Sherwani)</option>
          </optgroup>
          <optgroup label="মহিলাদের জন্য (For Women)">
            <option value={DressType.Saree}>শাড়ি (Saree)</option>
            <option value={DressType.SalwarKameez}>সালোয়ার কামিজ (Salwar Kameez)</option>
            <option value={DressType.Hijab}>হিজাব (Hijab)</option>
            <option value={DressType.Abaya}>বোরকা/আবায়া (Abaya)</option>
            <option value={DressType.WomenBlazer}>ফরমাল ব্লেজার (Women's Blazer)</option>
            <option value={DressType.WomenWhiteShirt}>সাদা শার্ট (Women's White Shirt)</option>
            <option value={DressType.Kurti}>কুর্তি (Kurti)</option>
          </optgroup>
        </select>
      </div>

      {/* Enhancements */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-700">অন্যান্য (Enhancements)</label>
        
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.smoothFace}
            onChange={() => toggleSetting('smoothFace')}
            className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
          />
          <span className="text-gray-700">মুখমন্ডল স্মুথ করুন (Smooth Face)</span>
        </label>

        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.enhanceLighting}
            onChange={() => toggleSetting('enhanceLighting')}
            className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
          />
          <span className="text-gray-700">আলোর মান বৃদ্ধি (Enhance Lighting)</span>
        </label>
      </div>

      {/* Action Button */}
      <div className="pt-4">
        <button
          onClick={onGenerate}
          disabled={disabled}
          className={`w-full py-3 px-4 rounded-lg text-white font-bold text-lg shadow-md transition-all ${
            disabled
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 active:scale-95'
          }`}
        >
          {disabled ? 'কাজ চলছে...' : 'ছবি তৈরী করুন (Generate)'}
        </button>
      </div>
    </div>
  );
};