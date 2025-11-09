"use client";

import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import Webcam from "react-webcam";
import Image from "next/image";
import BodyPhoto from "@/app/assets/onboarding/body.png";
import MobileBodyPhoto from "@/app/assets/onboarding/bodyMobile.png";
import mobilecam from '@/app/assets/MobileCamera.png';
import { awardAnalysisPoints, savePointsToSupabase } from "../../lib/pointsSystem";
import { updateUserData } from "../../lib/userState";
import { guessFemaleType, guessMaleType, inchesToCm, cmToInches } from "../../lib/bodyTypes";

// Body Type Images
import HourglassImage from "@/app/assets/Bodytype/hourglass.png";
import RectangleImage from "@/app/assets/Bodytype/rectangle.png";
import InvertedTriangleImage from "@/app/assets/Bodytype/inverted_triangle.png";
import AppleImage from "@/app/assets/Bodytype/apple.png";
import PearImage from "@/app/assets/Bodytype/pear.png";
import MesomorphImage from "@/app/assets/Bodytype/mesomorph.png";
import EctomorphImage from "@/app/assets/Bodytype/ectomorph.png";
import TrapezoidImage from "@/app/assets/Bodytype/trapezoid.png";
import EndomorphImage from "@/app/assets/Bodytype/endomorph.png";

interface BodyAnalysisStepProps {
  userData: any;
  setUserDataState: (data: any) => void;
  setCurrentStep: (step: any) => void;
  STEPS: any;
  reviewPopup?: any;
  ProgressBar: any;
  saveUserDataToSupabase?: (data: any) => Promise<boolean>;
  singleMode?: boolean;
  singleTarget?: 'skin' | 'face' | 'body' | 'personality' | null;
  saveSingleModeAndReturn?: (data: any) => void;
}

const BodyAnalysisStep = ({
  userData,
  setUserDataState,
  setCurrentStep,
  STEPS,
  reviewPopup,
  ProgressBar,
  saveUserDataToSupabase,
  singleMode,
  singleTarget,
  saveSingleModeAndReturn,
}: BodyAnalysisStepProps) => {
  const [analysisData, setAnalysisData] = useState({
    body_shape: "",
  });

  const [currentAnalysis, setCurrentAnalysis] = useState<"body_shape" | null>(
    null
  );
  const [progress, setProgress] = useState(0);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [analysisResults, setAnalysisResults] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [showManualMeasurements, setShowManualMeasurements] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isAutoCapturing, setIsAutoCapturing] = useState(false);
  const [measurements, setMeasurements] = useState({
    bust: '',
    waist: '',
    hips: '',
    shoulders: '',
    chest: '',
    bicep: ''
  });
  const [unit, setUnit] = useState<'cm' | 'in'>('cm');

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showBodyInstructions, setShowBodyInstructions] = useState(false);
  const [isMobilePreloadingBody, setIsMobilePreloadingBody] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const webcamRef = useRef<Webcam>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleNext = async () => {
    const updatedData = { ...userData, body_shape: analysisData.body_shape };
    
    // Award points for completing body analysis
    const pointsResult = awardAnalysisPoints(updatedData, 'Body Analysis');
    const finalData = pointsResult.userData;
    
    // Save points to Supabase if user_id is available
    if (finalData.user_id) {
      await savePointsToSupabase(finalData, pointsResult.transaction);
    }
    
    // Save analysis data to Supabase
    if (saveUserDataToSupabase) {
      await saveUserDataToSupabase(finalData);
    }
    
    updateUserData(finalData);
    setUserDataState(finalData);

    // Update localStorage with the new data
    localStorage.setItem('aurasync_user_data', JSON.stringify(finalData));

    // Show review popup after analysis completion
    if (reviewPopup) {
      setTimeout(() => {
        reviewPopup.showAfterAnalysis();
      }, 1000);
    }

    setCurrentStep(STEPS.PERSONALITY_ANALYSIS);
  };

  const startAnalysis = async (
    type: "body_shape",
    method: "camera" | "upload" = "camera"
  ) => {
    setCurrentAnalysis(type);
    setProgress(0);
    setCapturedImages([]);
    setAnalysisResults([]);
    setIsAnalyzing(false);
    setShowManualInput(false);
    setUploadedImage(null);

    if (method === "upload") {
      setShowUpload(true);
      setShowCamera(false);
      setIsAutoCapturing(false);
      // Trigger file input
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    } else {
      setShowCamera(true);
      setIsAutoCapturing(true);
      setShowUpload(false);
      
      // Start automatic capture process
      startAutoCapture();
    }
  };

  // Triggered only from Mobile UI for body: show 2s preloader, then start camera capture
  const handleMobileBodyCaptureClick = async () => {
    setIsMobilePreloadingBody(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsMobilePreloadingBody(false);
    
    startAnalysis("body_shape", "camera");
  };

  const startAutoCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Start automatic capture sequence
      for (let i = 0; i < 3; i++) {
        // small delay between captures (2s)
        await new Promise((resolve) => setTimeout(resolve, 5000));

        if (!videoRef.current || !canvasRef.current) break;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;

        // draw current video frame to canvas (this will be used as preview)
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // create a data URL preview immediately so UI can show the captured frame
        try {
          const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
          setCapturedImages((prev) => [...prev, dataUrl]);

          // update progress based on number of captures
          setProgress(Math.min(100, Math.round(((i + 1) / 3) * 100)));
        } catch (err) {
          console.warn("Failed to create preview dataURL", err);
        }

        // convert canvas to blob and analyze (await so we preserve order)
        await new Promise<void>((resolveBlob) => {
          canvas.toBlob(
            async (blob) => {
              if (blob) {
                try {
                  await analyzeImage(blob);
                } catch (e) {
                  console.error("analyzeImage error:", e);
                }
              }
              resolveBlob();
            },
            "image/jpeg",
            0.9
          );
        });
      }

      // Stop camera after capturing
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      setShowCamera(false);
      setIsAutoCapturing(false);
    } catch (err) {
      console.error("Camera access error:", err);
      setShowCamera(false);
      setIsAutoCapturing(false);
      // Fallback to manual input
      handleManualInput("body_shape");
    }
  };

  const captureImage = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(async (blob) => {
          if (blob) {
            const imageUrl = URL.createObjectURL(blob);
            setCapturedImages((prev) => [...prev, imageUrl]);

            // Analyze the captured image
            await analyzeImage(blob);
          }
        }, "image/jpeg");
      }
    }
  };

  const analyzeImage = async (blob: Blob) => {
    setIsAnalyzing(true);
    try {
      const blobToBase64 = (b: Blob) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const res = (reader.result as string) || "";
            const base64 = res.split(",")[1] || res;
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(b);
        });

      const base64 = await blobToBase64(blob);

      const resp = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "body_shape",
          gender: userData.gender,
          images: [{ base64, mimeType: blob.type || "image/jpeg" }],
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) {
          const info = await resp.json().catch(() => ({}));
          alert(info?.message || "Model quota exceeded. Please wait ~1 minute and retry.");
          setIsAnalyzing(false);
          return;
        }
        throw new Error(`Gemini API error: ${resp.status}`);
      }
      const payload = await resp.json();
      const { body_shape, body_confidence } = payload.data || {};
      if (!body_shape) {
        throw new Error("Gemini did not return body_shape");
      }
      if (typeof body_confidence === 'number' && body_confidence < 0.7) {
        alert("Body not clear enough. Please retake a full-body photo or upload a better image.");
        setShowUpload(true);
        setIsAnalyzing(false);
        return;
      }
      const result = body_shape;

      setAnalysisData((prev) => ({
        ...prev,
        body_shape: result,
      }));

      setAnalysisResults((prev) => [...prev, result]);

      if (analysisResults.length + 1 >= 3) {
        const finalResults = [...analysisResults, result];
        const mostCommon = finalResults.reduce((acc, val) => {
          acc[val] = (acc[val] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const finalResult = Object.entries(mostCommon).reduce((a, b) =>
          mostCommon[a[0]] > mostCommon[b[0]] ? a : b
        )[0];

        setAnalysisData((prev) => ({
          ...prev,
          [currentAnalysis!]: finalResult,
        }));
        setCurrentAnalysis(null);
        setProgress(100);
      }
    } catch (error: any) {
      console.error("Analysis error (body):", error);
      alert(
        "We couldn't clearly detect your body shape. Please retake a full-body photo (standing, good lighting) or upload a better image."
      );
      setShowUpload(true);
      setShowManualInput(false);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleManualInput = (type: "body_shape") => {
    setCurrentAnalysis(type);
    setShowManualInput(true);
    setShowCamera(false);
    setIsAutoCapturing(false);
    setShowUpload(false);
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Create preview
    const imageUrl = URL.createObjectURL(file);
    setUploadedImage(imageUrl);
    setProgress(50);

    try {
      setIsAnalyzing(true);
      // Convert file to base64
      const toBase64 = (b: Blob) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const res = (reader.result as string) || "";
            const base64 = res.split(",")[1] || res;
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(b);
        });

      const base64 = await toBase64(file);

      // Call backend Gemini route for body shape
      const resp = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "body_shape",
          gender: userData.gender,
          images: [{ base64, mimeType: file.type || "image/jpeg" }],
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) {
          const info = await resp.json().catch(() => ({}));
          alert(info?.message || "Model quota exceeded. Please wait ~1 minute and retry.");
          setIsAnalyzing(false);
          return;
        }
        throw new Error(`Gemini API error: ${resp.status}`);
      }
      const payload = await resp.json();
      const { body_shape } = payload.data || {};
      if (!body_shape) {
        throw new Error("Gemini did not return body_shape");
      }

      setAnalysisResults([body_shape]);
      setAnalysisData((prev) => ({ ...prev, [currentAnalysis!]: body_shape }));
      setCurrentAnalysis(null);
      setProgress(100);
      setShowUpload(false);
    } catch (error) {
      console.error("Analysis error:", error);
      alert("Analysis failed. Please try again or use manual selection.");
      setShowUpload(false);
      setCurrentAnalysis(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleManualSelection = (value: string) => {
    setAnalysisData((prev) => ({ ...prev, [currentAnalysis!]: value }));
    setCurrentAnalysis(null);
    setShowManualInput(false);
  };

  const handleManualMeasurements = () => {
    setShowManualMeasurements(true);
    setShowManualInput(false);
    setShowCamera(false);
    setShowUpload(false);
  };

  const analyzeMeasurements = () => {
    // Convert measurements to numbers and cm if needed
    const measurementData: any = {};
    Object.keys(measurements).forEach(key => {
      const value = measurements[key as keyof typeof measurements];
      if (value && !isNaN(Number(value))) {
        let numValue = Number(value);
        if (unit === 'in') {
          numValue = inchesToCm(numValue);
        }
        measurementData[key] = numValue;
      }
    });

    // Analyze based on gender
    let results;
    if (userData.gender === 'female') {
      results = guessFemaleType(measurementData);
    } else {
      results = guessMaleType(measurementData);
    }

    if (results && results.length > 0) {
      const bestMatch = results[0];
      setAnalysisData((prev) => ({
        ...prev,
        body_shape: bestMatch.label
      }));
      setAnalysisResults([bestMatch.label]);
      setProgress(100);
    }

    setShowManualMeasurements(false);
    setCurrentAnalysis(null);
  };

  const updateMeasurement = (field: string, value: string) => {
    setMeasurements(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Upload Analysis Component
  const UploadAnalysis = () => (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
      <h3 className="text-xl font-semibold mb-4">
        Body Shape Analysis
        <span className="ml-2 text-sm px-2 py-1 rounded bg-blue-500/20 text-blue-300">
          Upload
        </span>
      </h3>

      {/* Progress Bar */}
      <div className="w-full bg-white/20 rounded-full h-2 mb-4">
        <div
          className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <p className="text-sm text-gray-300 mb-4">
        Progress: {progress}% - {isAnalyzing ? "Analyzing..." : "Ready"}
      </p>

      {isAnalyzing && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
          <p>Analyzing uploaded image...</p>
        </div>
      )}

      {/* Uploaded Image Preview */}
      {uploadedImage && (
        <div className="mb-6 flex flex-col items-center">
          <img
            src={uploadedImage}
            alt="Uploaded image"
            className="w-full max-w-md rounded-lg border-2 border-gray-700 mb-2 shadow-lg"
          />
          <p className="text-sm text-gray-300">Uploaded image preview</p>
        </div>
      )}

      {analysisResults.length > 0 && (
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Analysis Result:</h4>
          <div className="bg-green-500/20 rounded-lg p-3">
            <p className="text-green-300 font-medium">
              Body Shape: {analysisResults[0]}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  // Manual Measurements Component
  const ManualMeasurementsInput = () => {
    const handleNumericInput = (field: string, rawValue: string) => {
      const normalized = rawValue.replace(/,/g, '.');
      if (normalized === '' || /^\d*\.?\d*$/.test(normalized)) {
        updateMeasurement(field, normalized);
      }
    };

    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
        <h3 className="text-xl font-semibold mb-4 text-center">
          Manual Measurements
          <span className="ml-2 text-sm px-2 py-1 rounded bg-green-500/20 text-green-300">
            Measurements
          </span>
        </h3>

        <p className="text-sm text-gray-300 text-center mb-6">
          Enter your body measurements for accurate body type analysis
        </p>

        {/* Unit Toggle */}
        <div className="flex justify-center mb-6">
          <div className="bg-white/10 rounded-lg p-1">
            <button
              onClick={() => setUnit('cm')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${unit === 'cm'
                ? 'bg-blue-500 text-white'
                : 'text-gray-300 hover:text-white'
                }`}
            >
              Centimeters
            </button>
            <button
              onClick={() => setUnit('in')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${unit === 'in'
                ? 'bg-blue-500 text-white'
                : 'text-gray-300 hover:text-white'
                }`}
            >
              Inches
            </button>
          </div>
        </div>

        {/* Measurement Inputs */}
        <div className="space-y-4">
          {userData.gender === 'female' ? (
            // Female measurements
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Bust ({unit})
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={measurements.bust}
                    onChange={(e) => handleNumericInput('bust', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    placeholder="Enter bust measurement"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Waist ({unit})
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={measurements.waist}
                    onChange={(e) => handleNumericInput('waist', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    placeholder="Enter waist measurement"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Hips ({unit})
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={measurements.hips}
                    onChange={(e) => handleNumericInput('hips', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    placeholder="Enter hips measurement"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Shoulders ({unit})
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={measurements.shoulders}
                    onChange={(e) => handleNumericInput('shoulders', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    placeholder="Enter shoulders measurement"
                  />
                </div>
              </div>
            </>
          ) : (
            // Male measurements
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Chest ({unit})
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={measurements.chest}
                    onChange={(e) => handleNumericInput('chest', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    placeholder="Enter chest measurement"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Waist ({unit})
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={measurements.waist}
                    onChange={(e) => handleNumericInput('waist', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    placeholder="Enter waist measurement"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Shoulders ({unit})
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={measurements.shoulders}
                    onChange={(e) => handleNumericInput('shoulders', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    placeholder="Enter shoulders measurement"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Bicep ({unit})
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={measurements.bicep}
                    onChange={(e) => handleNumericInput('bicep', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    placeholder="Enter bicep measurement"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            onClick={analyzeMeasurements}
            className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Analyze Measurements
          </button>
          <button
            onClick={() => setShowManualMeasurements(false)}
            className="flex-1 bg-gray-600 text-white py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Cancel
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400">
            {userData.gender === 'female'
              ? 'Enter at least bust, waist, and hips for best results'
              : 'Enter at least chest, waist, and shoulders for best results'
            }
          </p>
        </div>
      </div>
    );
  };

  // Manual Input Component
  const BodyShapeManualInput = ({ userData, handleManualSelection }: any) => {
    const femaleShapes = [
      {
        name: "Hourglass",
        image: HourglassImage,
        bgColor: "from-pink-400 to-rose-500",
        description: "Balanced proportions",
      },
      {
        name: "Rectangle",
        image: RectangleImage,
        bgColor: "from-blue-400 to-indigo-500",
        description: "Straight silhouette",
      },
      {
        name: "Inverted Triangle",
        image: InvertedTriangleImage,
        bgColor: "from-purple-400 to-violet-500",
        description: "Broad shoulders",
      },
      {
        name: "Apple",
        image: AppleImage,
        bgColor: "from-red-400 to-pink-500",
        description: "Full midsection",
      },
      {
        name: "Pear",
        image: PearImage,
        bgColor: "from-green-400 to-emerald-500",
        description: "Full hips",
      },
    ];

    const maleShapes = [
      {
        name: "Mesomorph",
        image: MesomorphImage,
        bgColor: "from-blue-500 to-cyan-500",
        description: "Athletic build",
      },
      {
        name: "Ectomorph",
        image: EctomorphImage,
        bgColor: "from-gray-400 to-slate-500",
        description: "Lean frame",
      },
      {
        name: "Trapezoid",
        image: TrapezoidImage,
        bgColor: "from-orange-400 to-amber-500",
        description: "V-shaped torso",
      },
      {
        name: "Endomorph",
        image: EndomorphImage,
        bgColor: "from-yellow-400 to-orange-500",
        description: "Fuller build",
      },
    ];

    const shapes = userData?.gender === "female" ? femaleShapes : maleShapes;

    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
        <h3 className="text-xl font-semibold mb-4 text-center">
          Select Your Body Shape
        </h3>
        <p className="text-sm text-gray-300 text-center mb-6">
          Choose the body shape that best describes your natural silhouette
        </p>

        {/* Responsive grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {shapes.map((shape) => (
            <button
              key={shape.name}
              onClick={() => handleManualSelection(shape.name)}
              className="group flex flex-col items-center justify-center p-4 rounded-xl border-2 border-white/20 bg-white/5 hover:border-white/50 hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-white/10"
            >
              {/* Body type image with background */}
              <div
                className={`h-28 w-28 flex items-center justify-center rounded-xl mb-3 bg-gradient-to-br ${shape.bgColor} p-3 shadow-lg group-hover:shadow-xl transition-all duration-300`}
              >
                <Image
                  src={shape.image}
                  alt={shape.name}
                  width={90}
                  height={90}
                  className="object-contain rounded-lg group-hover:scale-110 transition-transform duration-300"
                />
              </div>

              {/* Body type name */}
              <span className="text-sm font-semibold text-center mb-1">
                {shape.name}
              </span>

              {/* Description */}
              <span className="text-xs text-gray-300 text-center ">
                {shape.description}
              </span>
            </button>
          ))}
        </div>

        {/* Help text */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            Hover over each option to see more details
          </p>
        </div>
      </div>
    );
  };

  // Camera Analysis Component
  const CameraAnalysis = () => (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
      <h3 className="text-xl font-semibold mb-4">
        Body Shape Analysis
        <span className="ml-2 text-sm px-2 py-1 rounded bg-blue-500/20 text-blue-300">
          Camera
        </span>
      </h3>

      {/* Progress Bar */}
      <div className="w-full bg-white/20 rounded-full h-2 mb-4">
        <div
          className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <p className="text-sm text-gray-300 mb-4">
        Progress: {progress}% - {capturedImages.length}
      </p>

      {isAutoCapturing && (
        <div className="text-center py-4">
          <div className="text-2xl font-bold text-yellow-400 mb-2">
            Auto-capturing in progress...
          </div>
          <p className="text-sm text-gray-300">
            Please stay still while we capture 3 images
          </p>
        </div>
      )}

      {isAnalyzing && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
          <p>Analyzing image...</p>
        </div>
      )}

      {/* Camera Feed */}
      {showCamera && (
        <div className="mb-6 flex flex-col items-center">
          <video
            ref={videoRef}
            className="w-full h-[70vh] md:max-w-md md:h-auto rounded-lg border-2 border-gray-700 mb-2 shadow-lg object-cover"
            autoPlay
            playsInline
          />
          <canvas ref={canvasRef} style={{ display: "none" }} />
        </div>
      )}

      {capturedImages.length > 0 && (
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Captured Images:</h4>
          <div className="grid grid-cols-3 gap-2">
            {capturedImages.map((img, index) => (
              <div
                key={index}
                className="bg-white/20 rounded p-2 text-center text-sm"
              >
                <img
                  src={img}
                  alt={`Image ${index + 1}`}
                  className="w-full h-20 object-cover rounded mb-1"
                />
                Image {index + 1}
              </div>
            ))}
          </div>
        </div>
      )}

      {analysisResults.length > 0 && (
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Analysis Results:</h4>
          <div className="space-y-1">
            {analysisResults.map((result, index) => (
              <div key={index} className="text-sm text-gray-300">
                Image {index + 1}: {result}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex justify-between gap-4 mt-6">
        <button
          onClick={() => setCurrentStep(STEPS.SKIN_FACE_ANALYSIS)}
          className="w-1/2 py-3 rounded-lg border-2 border-white/30 bg-white/10 text-white hover:border-white/50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={() => {
            if (singleMode && singleTarget === 'body' && saveSingleModeAndReturn) {
              saveSingleModeAndReturn({ body_shape: analysisData.body_shape || null });
            } else {
              handleNext();
            }
          }}
          disabled={!analysisData.body_shape}
          className="w-1/2 py-3 px-1 rounded-lg bg-[#444141] text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#555] transition-all"
        >
          Next
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/**desktop */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="min-h-screen hidden md:flex bg-[#251F1E] items-center justify-center text-white p-4 md:p-8"
      >
        <div className="mx-auto flex flex-col items-center w-full">
          {/* Progress */}
          <div className="w-full mb-6">
            <ProgressBar currentStep={STEPS.BODY_ANALYSIS} />
          </div>

          <div className="w-full flex flex-col md:flex-row gap-6 items-stretch">
            {/* LEFT PANEL: IMAGE / CAMERA / UPLOAD */}
            <div className="md:w-[65%] w-full flex items-center justify-center relative rounded-lg overflow-hidden min-h-[60vh] md:min-h-[80vh]">
              {showUpload && uploadedImage ? (
                <Image
                  src={uploadedImage}
                  alt="Uploaded body"
                  fill
                  className="object-contain"
                />
              ) : showManualInput && currentAnalysis === "body_shape" ? (
                <BodyShapeManualInput
                  userData={userData}
                  handleManualSelection={handleManualSelection}
                />
              ) : showManualMeasurements ? (
                <ManualMeasurementsInput />
              ) : currentAnalysis === "body_shape" && !showManualInput && !showUpload ? (
                <CameraAnalysis />
              ) : (
                <Image
                  src={BodyPhoto}
                  alt="Placeholder Body"
                  fill
                  className="object-contain"
                />
              )}
            </div>

            {/* RIGHT PANEL: CONTROLS */}
            <div className="md:w-[35%] w-full flex flex-col space-y-6">
              <div className="w-full h-auto bg-[#444141] p-4 rounded-3xl backdrop-blur-lg text-white">
                <h3 className="text-lg font-bold mb-3">
                  Analysis Status
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Body Shape:</span>
                    <span
                      className={`text-sm px-2 py-1 rounded ${analysisData.body_shape
                        ? "bg-green-500/20 text-green-300"
                        : "bg-gray-500/20 text-gray-300"
                        }`}
                    >
                      {analysisData.body_shape || "Pending"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="w-full bg-[#444141] p-5 rounded-3xl text-white">
                <h1 className="text-xl font-bold mb-4">
                  Body Shape Analysis Instructions
                </h1>
                <ul className="list-disc list-inside text-sm space-y-2 mb-3">
                  <li>Wear fitted or light clothing (avoid bulky outfits).</li>
                  <li>Stand straight in front of the camera.</li>
                  <li>Keep the background clear (avoid clutter).</li>
                  <li>Ensure full body is visible in frame.</li>
                </ul>
                <p className="text-sm">
                  ✨ <span className="font-semibold">Tip:</span> Stand about 2-3 meters away for better results.
                </p>
              </div>

              {/* Upload Section */}
              <div className="flex flex-col items-center bg-[#444141] p-4 rounded-3xl text-center">
                <h1 className="text-lg font-bold mb-3">
                  Upload picture from your device
                </h1>
                <button
                  onClick={() => startAnalysis("body_shape", "upload")}
                  className="border-2 border-white px-6  text-white rounded-full font-semibold hover:border-white/70 transition-all"
                >
                  Upload +
                </button>
              </div>

              {/* Camera Button */}
              <button
                onClick={() => startAnalysis("body_shape", "camera")}
                className="w-full bg-[#444141] text-white py-3 rounded-lg font-semibold hover:bg-[#555] transition-all"
              >
                Capture from Web Camera
              </button>

              {/* Manual Input */}
              <button
                onClick={() => handleManualInput("body_shape")}
                className="w-full text-white py-3 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <span className="underline">Or Insert Manually</span>
              </button>

              {/* Manual Measurements */}
              <button
                onClick={handleManualMeasurements}
                className="w-full bg-white/10 border border-white/40 text-white py-3 rounded-lg font-semibold hover:bg-white/20 transition-colors"
              >
                Insert Measurements Manually
              </button>

              {/* Navigation */}
              <div className="flex justify-between gap-4 mt-6">
                <button
                  onClick={() => setCurrentStep(STEPS.SKIN_FACE_ANALYSIS)}
                  className="w-1/2 py-3 rounded-lg border-2 border-white/30 bg-white/10 text-white hover:border-white/50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    if (singleMode && singleTarget === 'body' && saveSingleModeAndReturn) {
                      saveSingleModeAndReturn({ body_shape: analysisData.body_shape || null });
                    } else {
                      handleNext();
                    }
                  }}
                  disabled={!analysisData.body_shape}
                  className="w-1/2 py-3 px-1 rounded-lg bg-[#444141] text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#555] transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />
        </div>
      </motion.div>

      {/* Mobile */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="min-h-screen md:hidden bg-[#251F1E] flex items-center justify-center text-white p-4 md:p-8"
      >
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          <div className="w-full">
            <ProgressBar currentStep={STEPS.BODY_ANALYSIS} />
          </div>

          {/* Show upload analysis if active */}
          {showUpload && currentAnalysis && (
            <div className="mb-8">
              <UploadAnalysis />
            </div>
          )}

          {/* Show camera analysis if active */}
          {currentAnalysis && !showManualInput && !showUpload && (
            <div className="mb-8">
              <CameraAnalysis />
            </div>
          )}

          {/* Show manual input if active */}
          {showManualInput && currentAnalysis === "body_shape" && (
            <BodyShapeManualInput
              userData={userData}
              handleManualSelection={handleManualSelection}
            />
          )}

          {/* Show manual measurements if active */}
          {showManualMeasurements && (
            <ManualMeasurementsInput />
          )}

          {/* Show analysis options if no analysis is active */}
          {!currentAnalysis && !showManualInput && !showManualMeasurements && (
            <div className="w-full md:w-[100vw] md:h-[80vh] gap-8">
              {/* Body Analysis */}
              <div className="backdrop-blur-lg rounded-xl p-6 mt-20">
                <div className="flex flex-col gap-6 items-start">
                  {/* Image Section - Now on Top */}
                  <div className="w-full flex items-center justify-center relative overflow-hidden">
                    <Image
                      src={MobileBodyPhoto}
                      alt="Body Photo"
                      height={200}
                      width={200}
                      className="object-cover w-[300px] h-[300px] rounded-full"
                    />
                  </div>

                  {/* Content Section - Now Below */}
                  <div className="w-full flex flex-col space-y-4">
                    <button
                      onClick={handleMobileBodyCaptureClick}
                      className="w-full bg-[#444141] text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all"
                    >
                      Capture from Web Camera
                    </button>
                    <button
                      onClick={() => setShowBodyInstructions(true)}
                      className="w-full bg-[#444141] text-white py-3 rounded-lg font-semibold hover:bg-[#555555] transition-all"
                    >
                      Instructions
                    </button>
                    {/* Analysis Status */}
                    <div className="w-full h-auto bg-[#444141] p-4 rounded-3xl backdrop-blur-lg text-white">
                      <h3 className="text-lg font-bold mb-3">
                        Analysis Status
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Body Shape:</span>
                          <span
                            className={`text-sm px-2 py-1 rounded ${analysisData.body_shape
                              ? "bg-green-500/20 text-green-300"
                              : "bg-gray-500/20 text-gray-300"
                              }`}
                          >
                            {analysisData.body_shape || "Pending"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex bg-[#444141] p-6 rounded-3xl justify-center items-center flex-col">
                      <h1 className="text-xl font-bold mb-4 text-center">
                        Upload picture from your device
                      </h1>
                      <button
                        onClick={() => startAnalysis("body_shape", "upload")}
                        className="border-2 border-white px-16 text-white py-3 rounded-full font-semibold hover:border-white hover:from-green-600 hover:to-emerald-700 transition-all"
                      >
                        Upload Photo +
                      </button>
                    </div>

                    <button
                      onClick={() => handleManualInput("body_shape")}
                      className="w-full text-white py-3 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <span className="underline">Manual Selection</span>
                    </button>

                    {/* Manual Measurements */}
                    <button
                      onClick={handleManualMeasurements}
                      className="w-full bg-white/10 border border-white/30 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                    >
                      Insert Measurements Manually
                    </button>

                    <div className="flex justify-center gap-4 mt-8">
                      <button
                        onClick={() =>
                          setCurrentStep(STEPS.SKIN_FACE_ANALYSIS)
                        }
                        className="px-8 py-3 w-full rounded-lg border-2 border-white/30 bg-white/10 text-white hover:border-white/50 transition-colors"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleNext}
                        disabled={!analysisData.body_shape}
                        className="px-8 py-3 w-full rounded-lg bg-white/10 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-600 hover:to-purple-700 transition-all"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />

          {/* Mobile Preloader Overlay for Body (2s before camera capture) */}
          {isMobilePreloadingBody && (
            <div className="fixed inset-0 z-50 flex items-center justify-center ">
              <motion.div
                initial={{ clipPath: "circle(0% at 50% 50%)" }}
                animate={{ clipPath: "circle(150% at 50% 50%)" }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="fixed inset-0 z-50"
              >
                <Image
                  fill
                  alt="image"
                  src={mobilecam}
                  className="object-cover"
                />
              </motion.div>
            </div>
          )}

          {/* Body Instructions Modal */}
          {showBodyInstructions && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-[#444141] rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-white">
                    💪 Body Shape Analysis Instructions
                  </h3>
                  <button
                    onClick={() => setShowBodyInstructions(false)}
                    className="text-white hover:text-gray-300 text-2xl"
                  >
                    ×
                  </button>
                </div>
                <div className="text-white text-sm space-y-3">
                  <p>Follow these steps for best accuracy:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>
                      Wear fitted or light clothing (avoid bulky outfits).
                    </li>
                    <li>Stand straight in front of the camera.</li>
                    <li>Keep the background clear (avoid clutter).</li>
                    <li>Ensure full body is visible in frame.</li>
                  </ul>
                  <p className="mt-4">
                    ✨ <span className="font-semibold">Tip:</span> Stand about 2-3 meters away for better results.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
};

export default BodyAnalysisStep;
