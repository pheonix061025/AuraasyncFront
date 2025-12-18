'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Upload,CloudDownload, HelpCircle, Info, User, Maximize2, Play, GitCompare, Clock } from 'lucide-react';

const VirtualTryOnPage = () => {
  const [dressImage, setDressImage] = useState<string | null>(null);
  const [modelImage, setModelImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'adjustments' | 'share' | 'tryon'>('tryon');
  const [countdown, setCountdown] = useState<number>(0);

  const [showGuidelines, setShowGuidelines] = useState(false);

  const dressInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleDressUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDressImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleModelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setModelImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTryOn = async () => {
    if (!dressImage || !modelImage) return;
    setIsProcessing(true);

    try {
      const response = await fetch('/api/virtual-tryon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dressImage, modelImage })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.isQuotaError) {
          const retryTime = data.retryAfter || 10;
          setCountdown(retryTime);
          alert(`⚠️ Rate Limit Reached\nPlease wait ${retryTime}s.`);
        } else {
          alert(data.error || 'Failed to process virtual try-on');
        }
        return;
      }

      if (data.success && data.image) {
        setResultImage(data.image);
      } else {
        alert('Failed to generate try-on image');
      }
    } catch (error: any) {
      alert(error.message || 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1414] text-white">
      <main className="max-w-[90vw] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT PANEL */}
          <div className="lg:col-span-4 space-y-6">

            {/* UPLOAD DRESS */}
            <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-white/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Upload Dress Image</h3>
              </div>

              <div className="space-y-4">
                <div
                  onClick={() => dressInputRef.current?.click()}
                  className="border border-white/8 bg-white/2 backdrop-blur-[6px] rounded-xl p-8 text-center cursor-pointer hover:border-white/12 hover:bg-white/4 transition-all group"
                >
                  {dressImage ? (
                    <div className="relative w-full h-32">
                      <Image src={dressImage} alt="Dress" fill className="object-contain rounded-lg" />
                    </div>
                  ) : (
                    <>
                      <CloudDownload className="w-10 h-10 text-white/50 mx-auto mb-3 group-hover:text-white/60" />
                      <p className="text-sm text-white/50">Upload dress image</p>
                    </>
                  )}
                 <div className='h-[200px]  mt-10 relative'>
                   <Image
                  src={'/virtual-tryon/dressInstruction.png'}
                  fill
                  alt='dress Instruction'
                  className='object-contain '
                  />
                 </div>
                </div>

                <input ref={dressInputRef} type="file" accept="image/*" onChange={handleDressUpload} className="hidden" />
              </div>
            </div>

            {/* UPLOAD MODEL */}
            <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-white/5">
              <div className="flex items-center justify-between mb-4">
                
                {/* TITLE + MOBILE INFO ICON */}
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  Upload Model Image
                  <Info 
                    className="w-5 h-5 text-white/40 lg:hidden cursor-pointer"
                    onClick={() => setShowGuidelines(true)}
                  />
                </h3>
              </div>

              <div className="space-y-4">
                <div
                  onClick={() => modelInputRef.current?.click()}
                  className="border border-white/8 bg-white/2 backdrop-blur-[6px] rounded-xl p-8 text-center cursor-pointer hover:border-white/12 hover:bg-white/4 transition-all group"
                >
                  {modelImage ? (
                    <div className="relative w-full h-32">
                      <Image src={modelImage} alt="Model" fill className="object-contain rounded-lg" />
                    </div>
                  ) : (
                    <>
                      <CloudDownload className="w-10 h-10 text-white/50 mx-auto mb-3 group-hover:text-white/60" />
                      <p className="text-sm text-white/50">Upload model image</p>
                    </>
                  )}
                </div>

                <input ref={modelInputRef} type="file" accept="image/*" onChange={handleModelUpload} className="hidden" />
              
                  <div className='h-[200px]  mt-10 relative'>
                   <Image
                  src={'/virtual-tryon/modelInstruction.png'}
                  fill
                  alt='dress Instruction'
                  className='object-contain'
                  />
                 </div>
              </div>
            </div>
          </div>

          {/* CENTER PREVIEW PANEL */}
          <div className="lg:col-span-5">
            <div className="bg-[#1C1C1C] rounded-2xl p-6 shadow-xl h-full flex flex-col">

              <div className="flex-1 relative rounded-xl overflow-hidden bg-white/5 min-h-[400px]">
                {isProcessing ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                      <p className="text-white/70">Generating...</p>
                    </div>
                  </div>
                ) : resultImage ? (
                  <Image src={resultImage} alt="Result" fill className="object-contain" unoptimized />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-white/50">
                    Upload images to see preview
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center justify-center gap-4">
                <button className="flex items-center gap-2 px-4 py-2 text-white/50 hover:bg-white/10 rounded-full">
                  <Maximize2 className="w-5 h-5" />
                  Full Screen
                </button>

                <button
                  onClick={handleTryOn}
                  disabled={!dressImage || !modelImage || isProcessing || countdown > 0}
                  className="flex items-center gap-2 px-8 py-3 bg-white text-[#1a1414] rounded-full font-medium disabled:opacity-50"
                >
                  {countdown > 0 ? (
                    <>
                      <Clock className="w-5 h-5" />
                      Wait {countdown}s
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      TRY ON
                    </>
                  )}
                </button>

                <button className="flex items-center gap-2 px-4 py-2 text-white/50 hover:bg-white/10 rounded-full">
                  <GitCompare className="w-5 h-5" />
                  Compare
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL — BUTTONS + GUIDELINES */}
          <div className="lg:col-span-3">
            <div className="bg-[#181818] rounded-2xl p-4 border border-white/10">
              <div className="space-y-2">
                <button onClick={() => setActiveTab('adjustments')} 
                  className={`w-full text-left px-4 py-3 rounded-xl ${
                    activeTab === 'adjustments' ? 'bg-white/10 border border-white/20' : 'text-white/50'
                  }`}
                >
                  Adjustments
                </button>

                <button onClick={() => setActiveTab('share')}
                  className={`w-full text-left px-4 py-3 rounded-xl ${
                    activeTab === 'share' ? 'bg-white/10 border border-white/20' : 'text-white/50'
                  }`}
                >
                  Share / Save
                </button>

                <button onClick={() => setActiveTab('tryon')}
                  className={`w-full text-left px-4 py-3 rounded-xl ${
                    activeTab === 'tryon' ? 'bg-white/10 border border-white/20' : 'text-white/50'
                  }`}
                >
                  Try-On
                </button>
              </div>
            </div>

            {/* GUIDELINES DESKTOP PANEL */}
            <div className="mt-6 bg-[#181818] rounded-2xl p-5 border border-white/10 hidden lg:block">
              <h3 className="text-white font-semibold text-lg mb-4">Guidelines</h3>

              <div className="space-y-4 text-white/70 text-sm">
                <div>
                  <h4 className="text-white font-medium mb-1">Good Inputs</h4>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>Single person</li>
                    <li>Front-facing photo</li>
                    <li>Clear lighting</li>
                    <li>No shadows</li>
                    <li>No accessories (bag, scarf)</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-white font-medium mb-1">Bad Inputs</h4>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>Strong shadows</li>
                    <li>Low resolution photos</li>
                    <li>Back-facing</li>
                    <li>Group photos</li>
                    <li>Complex poses</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-white font-medium mb-1">Limitations</h4>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>Crossed arms may fail</li>
                    <li>White clothes may blend</li>
                    <li>Not 100% physics accurate</li>
                    <li>Slight skin smoothing</li>
                    <li>Patterns may distort</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MOBILE — GUIDELINES MODAL */}
      {showGuidelines && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-[#1e1e1e] w-full max-w-sm rounded-2xl p-6 border border-white/10">
            <h3 className="text-white text-xl font-semibold mb-4">Guidelines</h3>

            <div className="space-y-4 text-white/70 text-sm max-h-[60vh] overflow-y-auto pr-2">
              <div>
                <h4 className="text-white font-medium mb-1">Good Inputs</h4>
                <ul className="list-disc ml-5 space-y-1">
                  <li>Front-facing photo</li>
                  <li>Clear lighting</li>
                  <li>No accessories</li>
                  <li>High resolution</li>
                </ul>
              </div>

              <div>
                <h4 className="text-white font-medium mb-1">Bad Inputs</h4>
                <ul className="list-disc ml-5 space-y-1">
                  <li>Dark lighting</li>
                  <li>Group photos</li>
                  <li>Crossed arms</li>
                  <li>Complex poses</li>
                </ul>
              </div>

              <div>
                <h4 className="text-white font-medium mb-1">Limitations</h4>
                <ul className="list-disc ml-5 space-y-1">
                  <li>Fit may not be perfect</li>
                  <li>White clothes may blend</li>
                  <li>Slight skin smoothing</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setShowGuidelines(false)}
              className="mt-6 w-full py-2 bg-white text-black rounded-xl font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VirtualTryOnPage;
