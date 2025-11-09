"use client";

import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import Webcam from "react-webcam";
import Image from "next/image";
import FacePhoto from "@/app/assets/onboarding/face.png";
import MobileFacePhoto from "@/app/assets/onboarding/faceMobile.png";
import mobilecam from '@/app/assets/MobileCamera.png';
import { awardAnalysisPoints, savePointsToSupabase } from "../../lib/pointsSystem";
import { updateUserData } from "../../lib/userState";

interface SkinFaceAnalysisStepProps {
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

const SkinFaceAnalysisStep = ({
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
}: SkinFaceAnalysisStepProps) => {
  const [analysisData, setAnalysisData] = useState({
    skin_tone: "",
    face_shape: "",
  });

  const [currentAnalysis, setCurrentAnalysis] = useState<
    "skin_tone" | "face_shape" | null
  >(null);
  const [progress, setProgress] = useState(0);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [analysisResults, setAnalysisResults] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isAutoCapturing, setIsAutoCapturing] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [faceLocked, setFaceLocked] = useState(false);
  const [showFaceInstructions, setShowFaceInstructions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const webcamRef = useRef<Webcam>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Mobile-only preloader before starting camera capture
  const [isMobilePreloading, setIsMobilePreloading] = useState(false);

  const handleNext = async () => {
    if (analysisData.skin_tone) {
      const updatedData = { ...userData, ...analysisData };
      
      // Award points for completing skin/face analysis
      const pointsResult = awardAnalysisPoints(updatedData, 'Skin & Face Analysis');
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

      setCurrentStep(STEPS.BODY_ANALYSIS);
    }
  };

  const startAnalysis = async (
    type: "skin_tone" | "face_shape",
    method: "camera" | "upload" = "camera"
  ) => {
    if (type === "face_shape" && faceLocked) return;
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

  // Removed random value generators. All analyses now use API results or manual input.

  // Triggered only from Mobile UI: show 3s preloader, then start camera capture
  const handleMobileCaptureClick = async () => {
    // Determine which analysis to run based on current singleMode/target
    const targetType = singleMode && singleTarget === 'skin' ? "skin_tone" : "face_shape";
    setIsMobilePreloading(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsMobilePreloading(false);
    
    startAnalysis(targetType as "skin_tone" | "face_shape", "camera");
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
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 2 seconds

        await captureImage();
        setProgress((i + 1) * 25);
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
      handleManualInput(currentAnalysis!);
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
      // Retry wrapper to handle transient 5xx/429 failures from the API route
      const fetchWithRetry = async (
        url: string,
        options: RequestInit,
        maxAttempts: number = 3
      ): Promise<Response> => {
        const retryable = new Set([408, 429, 500, 502, 503, 504]);
        let lastErr: any;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          try {
            const resp = await fetch(url, options);
            if (resp.ok || !retryable.has(resp.status)) return resp;
            const backoff = Math.min(2000, 500 * Math.pow(2, attempt));
            await new Promise((r) => setTimeout(r, backoff));
          } catch (e) {
            lastErr = e;
            const backoff = Math.min(2000, 500 * Math.pow(2, attempt));
            await new Promise((r) => setTimeout(r, backoff));
          }
        }
        if (lastErr) throw lastErr;
        return fetch(url, options);
      };

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

      const resp = await fetchWithRetry("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "face_skin",
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
        const text = await resp.text().catch(() => "");
        throw new Error(`Gemini API error: ${resp.status} ${text}`);
      }
      const payload = await resp.json();
      const { face_shape, skin_tone, face_confidence, skin_confidence } = payload.data || {};
      if (!face_shape || !skin_tone) {
        throw new Error("Gemini did not return required fields");
      }
      // Confidence gate for better accuracy (handle gracefully)
      if (typeof face_confidence === 'number' && face_confidence < 0.55) {
        alert("Face not clear enough. Please retake a clearer photo or upload a better image.");
        setShowUpload(true);
        setIsAnalyzing(false);
        return;
      }
      if (typeof skin_confidence === 'number' && skin_confidence < 0.55) {
        alert("Skin not clear enough. Please retake a clearer photo or upload a better image.");
        setShowUpload(true);
        setIsAnalyzing(false);
        return;
      }
      const faceShapeResult = face_shape;
      const skinToneResult = skin_tone;

      setAnalysisData((prev) => ({
        ...prev,
        skin_tone: skinToneResult,
        face_shape: faceShapeResult,
      }));

      setAnalysisResults((prev) => [...prev, faceShapeResult]);

      if (analysisResults.length + 1 >= 3) {
        const finalResults = [...analysisResults, faceShapeResult];
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
      console.error("Analysis error (face/skin):", error);
      alert(
        "We couldn't clearly detect your face. Please retake a clearer photo (good lighting, face centered) or upload a better image."
      );
      setShowUpload(true);
      setShowManualInput(false);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleManualInput = (type: "skin_tone" | "face_shape") => {
    setCurrentAnalysis(type);
    setShowManualInput(true);
    setShowCamera(false);
    setIsAutoCapturing(false);
    setShowUpload(false);
    if (type === "skin_tone") {
      setFaceLocked(true);
      setAnalysisData((prev) => ({ ...prev, face_shape: "" }));
    }
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

      // Call backend Gemini route
      const resp = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "face_skin",
          images: [{ base64, mimeType: file.type || "image/jpeg" }],
        }),
      });

      if (!resp.ok) {
        throw new Error(`Gemini API error: ${resp.status}`);
      }
      const payload = await resp.json();
      const { face_shape, skin_tone } = payload.data || {};
      if (!face_shape || !skin_tone) {
        throw new Error("Gemini did not return required fields");
      }

      // Update both values from real response
      setAnalysisData((prev) => ({ ...prev, skin_tone, face_shape }));

      const result = currentAnalysis === "skin_tone" ? skin_tone : face_shape;
      setAnalysisResults([result]);
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

  // Upload Analysis Component
  const UploadAnalysis = () => (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
      <h3 className="text-xl font-semibold mb-4">
        {currentAnalysis === "skin_tone"
          ? "Skin Tone Analysis"
          : "Face Shape Analysis"}
        <span className="ml-2 text-sm px-2 py-1 rounded bg-green-500/20 text-green-300">
          Upload Analysis
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
              {currentAnalysis === "skin_tone" ? "Skin Tone" : "Face Shape"}:{" "}
              {analysisResults[0]}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const SkinToneManualInput = () => {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<string[]>([]);

    const questions = [
      {
        question: "What color are the veins on your wrist?",
        options: [
          "Greenish",
          "Bluish or Purple",
          "Hard to tell / Mix of both",
        ],
        values: ["WARM", "COLD", "NEUTRAL"],
      },
      {
        question: "How does your skin react to sunlight?",
        options: [
          "Tans easily, rarely burns",
          "Burns or turns pink easily",
          "Sometimes tans, sometimes burns",
        ],
        values: ["WARM", "COLD", "NEUTRAL"],
      },
      {
        question: "What undertone does your bare skin have in natural light?",
        options: [
          "Yellow, peachy, or golden",
          "Pink, red, or bluish",
          "Olive or hard to tell",
        ],
        values: ["WARM", "COLD", "NEUTRAL"],
      },
    ];

    const determineSkinTone = (answers: string[]) => {
      // Count occurrences of each type
      const warmCount = answers.filter((answer) => answer === "WARM").length;
      const coldCount = answers.filter((answer) => answer === "COLD").length;
      const neutralCount = answers.filter(
        (answer) => answer === "NEUTRAL"
      ).length;

      // If 2 or more of the same answers are selected, that's the result
      if (warmCount >= 2) return "Warm";
      if (coldCount >= 2) return "Cold";
      if (neutralCount >= 2) return "Neutral";

      // If all three show different values, result is Neutral
      if (warmCount === 1 && coldCount === 1 && neutralCount === 1)
        return "Neutral";

      // Default fallback
      return "Neutral";
    };

    const handleAnswer = (answer: string) => {
      const newAnswers = [...answers, answer];
      setAnswers(newAnswers);

      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        // Determine skin tone based on the logic you specified
        const skinTone = determineSkinTone(newAnswers);

        setAnalysisData((prev) => ({ ...prev, skin_tone: skinTone }));
        setCurrentAnalysis(null);
        setShowManualInput(false);
      }
    };

    const resetQuestionnaire = () => {
      setCurrentQuestion(0);
      setAnswers([]);
    };

    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
        <h3 className="text-xl font-semibold mb-4">Skin Tone Analysis</h3>

        {currentQuestion < questions.length ? (
          <div>
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-300">
                  Question {currentQuestion + 1} of {questions.length}
                </span>
                <div className="flex space-x-1">
                  {questions.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full ${index <= currentQuestion ? "bg-white" : "bg-white/30"
                        }`}
                    />
                  ))}
                </div>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${((currentQuestion + 1) / questions.length) * 100
                      }%`,
                  }}
                />
              </div>
            </div>

            <h4 className="text-lg font-medium mb-6">
              {questions[currentQuestion].question}
            </h4>

            <div className="space-y-3">
              {questions[currentQuestion].options.map((option, index) => (
                <button
                  key={index}
                  onClick={() =>
                    handleAnswer(questions[currentQuestion].values[index])
                  }
                  className="w-full p-4 rounded-lg border-2 border-white/30 bg-white/10 hover:border-white/50 transition-colors text-left"
                >
                  <div className="flex justify-between items-center">
                    <span>{option}</span>
                    <span
                      className={`text-xs px-2 py-1 rounded ${questions[currentQuestion].values[index] === "WARM"
                        ? "bg-orange-500/20 text-orange-300"
                        : questions[currentQuestion].values[index] ===
                          "COLD"
                          ? "bg-blue-500/20 text-blue-300"
                          : "bg-gray-500/20 text-gray-300"
                        }`}
                    >
                      {questions[currentQuestion].values[index]}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {currentQuestion > 0 && (
              <button
                onClick={() => {
                  setCurrentQuestion(currentQuestion - 1);
                  setAnswers(answers.slice(0, -1));
                }}
                className="mt-4 w-full text-gray-300 underline text-sm"
              >
                ← Back to previous question
              </button>
            )}
          </div>
        ) : (
          <div className="text-center">
            <div className="text-4xl mb-4">✨</div>
            <h4 className="text-lg font-medium mb-2">Analysis Complete!</h4>
            <p className="text-gray-300 mb-4">
              Your skin tone has been determined based on your answers.
            </p>

            {/* Show answers summary */}
            <div className="bg-white/10 rounded-lg p-4 mb-4 text-left">
              <h5 className="font-semibold mb-2">Your Answers:</h5>
              {questions.map((q, index) => (
                <div key={index} className="text-sm mb-2">
                  <span className="text-gray-300">Q{index + 1}:</span>{" "}
                  {q.question}
                  <br />
                  <span className="text-gray-300">Answer:</span>{" "}
                  {q.options[q.values.indexOf(answers[index])]}
                  <span
                    className={`ml-2 text-xs px-2 py-1 rounded ${answers[index] === "WARM"
                      ? "bg-orange-500/20 text-orange-300"
                      : answers[index] === "COLD"
                        ? "bg-blue-500/20 text-blue-300"
                        : "bg-gray-500/20 text-gray-300"
                      }`}
                  >
                    {answers[index]}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-green-500/20 rounded-lg p-4 mb-4">
              <p className="text-green-300 font-medium">
                Final Result: {analysisData.skin_tone}
              </p>
            </div>
            <button
              onClick={resetQuestionnaire}
              className="text-gray-300 underline text-sm"
            >
              Retake questionnaire
            </button>
          </div>
        )}
      </div>
    );
  };

  const FaceShapeManualInput = () => (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
      <h3 className="text-xl font-semibold mb-4">Select Your Face Shape</h3>
      <div className="space-y-3">
        {["Oval", "Round", "Square", "Heart", "Diamond", "Rectangle"].map(
          (shape) => (
            <button
              key={shape}
              onClick={() => handleManualSelection(shape)}
              className="w-full p-3 rounded-lg border-2 border-white/30 bg-white/10 hover:border-white/50 transition-colors"
            >
              {shape}
            </button>
          )
        )}
      </div>
    </div>
  );

  // Camera Analysis Component
  const CameraAnalysis = () => (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
      <h3 className="text-xl font-semibold mb-4">
        {currentAnalysis === "skin_tone"
          ? "Skin Tone Analysis"
          : "Face Shape Analysis"}
      </h3>

      {/* Progress Bar */}
      <div className="w-full bg-white/20 rounded-full h-2 mb-4">
        <div
          className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <p className="text-sm text-gray-300 mb-4">
        Progress: {progress}% - {capturedImages.length} images captured
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
      <div className="mt-6 flex gap-4">
        <button
          onClick={() => setCurrentStep(STEPS.BASIC_INFO)}
          className="px-6 py-2 rounded-lg border-2 border-white/30 bg-white/10 text-white hover:border-white/50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={() => {
            if (singleMode && singleTarget === 'face' && saveSingleModeAndReturn) {
              saveSingleModeAndReturn({ face_shape: analysisData.face_shape || undefined });
            } else if (singleMode && singleTarget === 'skin' && saveSingleModeAndReturn) {
              saveSingleModeAndReturn({ skin_tone: analysisData.skin_tone || undefined });
            } else {
              handleNext();
            }
          }}
          disabled={singleMode ? (singleTarget === 'skin' ? !analysisData.skin_tone : !analysisData.face_shape) : !analysisData.skin_tone}
          className="px-6 py-2 rounded-lg bg-[#444141] text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#555] transition-all"
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
        <div className=" mx-auto flex flex-col items-center w-full">
          {/* Progress */}
          <div className="w-full mb-6">
            <ProgressBar currentStep={STEPS.SKIN_FACE_ANALYSIS} />
          </div>

          <div className="w-full flex flex-col md:flex-row gap-6 items-stretch">
            {/* LEFT PANEL: IMAGE / CAMERA / UPLOAD */}
            <div className="md:w-[65%] w-full flex items-center justify-center relative rounded-lg overflow-hidden min-h-[60vh] md:min-h-[80vh]">
              {showUpload && uploadedImage ? (
                <Image
                  src={uploadedImage}
                  alt="Uploaded face"
                  fill
                  className=" object-fit lg:object-contain"
                />
              ) : showManualInput && currentAnalysis === "skin_tone" ? (
                <SkinToneManualInput />
              ) : showManualInput && currentAnalysis === "face_shape" ? (
                <FaceShapeManualInput />
              ) : (currentAnalysis === "face_shape" || currentAnalysis === "skin_tone") && showCamera && !showManualInput && !showUpload ? (
                <CameraAnalysis />
              ) : (
                <Image
                  src={FacePhoto}
                  alt="Placeholder Face"
                  fill
                  className="object-contain"
                />
              )}
            </div>

            {/* RIGHT PANEL: CONTROLS */}
            <div className="md:w-[35%] w-full flex flex-col space-y-6">
              {/* Instructions */}
              <div className="w-full h-auto bg-[#444141] p-4 rounded-3xl backdrop-blur-lg text-white">
                <h3 className="text-lg font-bold mb-3">
                  Analysis Status
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Skin Tone:</span>
                    <span
                      className={`text-sm px-2 py-1 rounded ${analysisData.skin_tone
                        ? "bg-green-500/20 text-green-300"
                        : "bg-gray-500/20 text-gray-300"
                        }`}
                    >
                      {analysisData.skin_tone || "Pending"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Face Shape:</span>
                    <span
                      className={`text-sm px-2 py-1 rounded ${analysisData.face_shape
                        ? "bg-green-500/20 text-green-300"
                        : "bg-yellow-500/20 text-yellow-300"
                        }`}
                    >
                      {analysisData.face_shape || "Optional"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="w-full bg-[#444141] p-3 px-6 rounded-3xl text-white">


                <h1 className="text-xl font-bold mb-4">
                  Face & Skin Analysis Instructions
                </h1>
                <ul className="list-disc list-inside text-sm space-y-2 mb-3">
                  <li>Sit in a well-lit area (avoid shadows or backlight).</li>
                  <li>Keep your head straight and look directly into the camera.</li>
                  <li>Remove glasses, masks, or anything covering your face.</li>
                  <li>Stay still for a few seconds while we scan.</li>
                </ul>
                <p className="text-sm">
                  ✨ <span className="font-semibold">Tip:</span> Natural daylight
                  works best for accurate skin tone detection.
                </p>
              </div>

              {/* Upload/Capture Section - switches to Skin when target=skin */}
              {singleMode ? (
                singleTarget === 'skin' ? (
                  <>
                    <div className="flex flex-col items-center bg-[#444141]  rounded-3xl text-center">
                      <h1 className="text-lg font-bold mb-3">Upload picture from your device</h1>
                      <button
                        onClick={() => startAnalysis("skin_tone", "upload")}
                        className="border-2 border-white px-6 py-2 text-white rounded-full font-semibold hover:border-white/70 transition-all"
                      >
                        Upload +
                      </button>
                    </div>
                    <button
                      onClick={() => startAnalysis("skin_tone", "camera")}
                      className="w-full bg-[#444141] text-white py-3 rounded-lg font-semibold hover:bg-[#555] transition-all"
                    >
                      Capture from Web Camera
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col items-center bg-[#444141] p-4 rounded-3xl text-center">
                      <h1 className="text-lg font-bold mb-3">Upload picture from your device</h1>
                      <button
                        onClick={() => startAnalysis("face_shape", "upload")}
                        className="border-2 border-white px-6 py-2 text-white rounded-full font-semibold hover:border-white/70 transition-all"
                      >
                        Upload +
                      </button>
                    </div>
                    <button
                      onClick={() => startAnalysis("face_shape", "camera")}
                      className="w-full bg-[#444141] text-white py-3 rounded-lg font-semibold hover:bg-[#555] transition-all"
                    >
                      Capture from Web Camera
                    </button>
                  </>
                )
              ) : (
                <>
                  <div className="flex flex-col items-center bg-[#444141] p-4 rounded-3xl text-center">
                    <h1 className="text-lg font-bold mb-3">Upload picture from your device</h1>
                    <button
                      onClick={() => startAnalysis("face_shape", "upload")}
                      className="border-2 border-white px-6 py-2 text-white rounded-full font-semibold hover:border-white/70 transition-all"
                    >
                      Upload +
                    </button>
                  </div>
                  <button
                    onClick={() => startAnalysis("face_shape", "camera")}
                    className="w-full bg-[#444141] text-white py-3 rounded-lg font-semibold hover:bg-[#555] transition-all"
                  >
                    Capture from Web Camera
                  </button>
                </>
              )}

              {/* Manual Input */}
              <div className="flex  items-center gap-8 justify-between">
                {!(singleMode && singleTarget === 'face') && (
                  <button
                    onClick={() => handleManualInput("skin_tone")}
                    className=" text-white w-full py-1 rounded hover:bg-gray-700 transition-colors"
                  >
                    <span className="underline"> Insert Skin Tone Manually</span>
                  </button>
                )}
                {!(singleMode && singleTarget === 'skin') && (
                  <button
                    onClick={() => handleManualInput("face_shape")}
                    className="w-full text-white py-1 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <span className="underline"> Insert Face Shape Manually</span>
                  </button>
                )}
              </div>

              {/* Navigation */}
              <div className="flex justify-between gap-4 mt-6">
                {!singleMode && (
                  <button
                    onClick={() => setCurrentStep(STEPS.BASIC_INFO)}
                    className="w-1/2 py-3 rounded-lg border-2 border-white/30 bg-white/10 text-white hover:border-white/50 transition-colors"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={() => {
                    if (singleMode && singleTarget === 'skin' && saveSingleModeAndReturn) {
                      saveSingleModeAndReturn({ skin_tone: analysisData.skin_tone });
                    } else if (singleMode && singleTarget === 'face' && saveSingleModeAndReturn) {
                      saveSingleModeAndReturn({ face_shape: analysisData.face_shape || null });
                    } else {
                      handleNext();
                    }
                  }}
                  disabled={singleMode ? (singleTarget === 'skin' ? !analysisData.skin_tone : !analysisData.face_shape) : !analysisData.skin_tone}
                  className="w-1/2 py-3 rounded-lg bg-[#444141] text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#555] transition-all"
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
            <ProgressBar currentStep={STEPS.SKIN_FACE_ANALYSIS} />
          </div>

          {/* Show upload analysis if active */}
          {showUpload && currentAnalysis && (
            <div className="mb-8">
              <UploadAnalysis />
            </div>
          )}

          {/* Show camera analysis if active */}
          {currentAnalysis &&
            !showManualInput &&
            !showUpload && (
              <div className="mb-8">
                <CameraAnalysis />
              </div>
            )}

          {/* Show manual input if active */}
          {showManualInput && currentAnalysis === "skin_tone" && (
            <SkinToneManualInput />
          )}
          {showManualInput && currentAnalysis === "face_shape" && (
            <FaceShapeManualInput />
          )}

          {/* Show analysis options if no analysis is active */}
          {!currentAnalysis && !showManualInput && (
            <div className="w-full md:w-[100vw] md:h-[80vh] gap-8">
              {/* Face Analysis */}
              <div className="backdrop-blur-lg rounded-xl p-6 mt-20">
                <div className="flex flex-col gap-6 items-start">
                  {/* Image Section - Now on Top */}
                  <div className="w-full flex items-center justify-center relative overflow-hidden">
                    <Image
                      src={MobileFacePhoto}
                      alt="Face Photo"
                      height={200}
                      width={200}
                      className="object-cover w-[300px] h-[300px] rounded-full"
                    />
                  </div>

                  {/* Content Section - Now Below */}
                  <div className="w-full flex flex-col space-y-4">
                    <button
                      onClick={handleMobileCaptureClick}
                      className="w-full bg-[#444141] text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all"
                    >
                      Capture from Web Camera
                    </button>
                    <button
                      onClick={() => setShowFaceInstructions(true)}
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
                          <span className="text-sm">Skin Tone:</span>
                          <span
                            className={`text-sm px-2 py-1 rounded ${analysisData.skin_tone
                              ? "bg-green-500/20 text-green-300"
                              : "bg-gray-500/20 text-gray-300"
                              }`}
                          >
                            {analysisData.skin_tone || "Pending"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Face Shape:</span>
                          <span
                            className={`text-sm px-2 py-1 rounded ${analysisData.face_shape
                              ? "bg-green-500/20 text-green-300"
                              : "bg-yellow-500/20 text-yellow-300"
                              }`}
                          >
                            {analysisData.face_shape || "Optional"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex bg-[#444141] p-6 rounded-3xl justify-center items-center flex-col">
                      <h1 className="text-xl font-bold mb-4 text-center">
                        Upload picture from your device{" "}
                      </h1>
                      <button
                        onClick={() => startAnalysis(singleMode && singleTarget === 'skin' ? "skin_tone" : "face_shape", "upload")}
                        className="border-2 border-white px-16 text-white py-3 rounded-full font-semibold hover:border-white hover:from-green-600 hover:to-emerald-700 transition-all"
                      >
                        Upload +
                      </button>
                    </div>
                    
                    <div className=" justify-between  ">
                      {!(singleMode && singleTarget === 'face') && (
                        <button
                          onClick={() => handleManualInput("skin_tone")}
                          className=" text-white w-full py-3 rounded hover:bg-gray-700 transition-colors"
                        >
                          <span className="underline"> Insert Skin Tone Manually</span>
                        </button>
                      )}
                      {!(singleMode && singleTarget === 'skin') && (
                        <button
                          onClick={() => handleManualInput("face_shape")}
                          className="w-full text-white py-3 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          <span className="underline"> Insert Face Shape Manually</span>
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        // Skip face analysis, only do skin tone
                        if (!analysisData.skin_tone) {
                          setAnalysisData((prev) => ({
                            ...prev,
                            skin_tone: "Warm",
                          })); // Default skin tone
                        }
                      }}
                      className="w-full text-gray-400 py-2 text-sm underline hover:text-white transition-colors"
                    >
                      Skip Face Analysis
                    </button>
                    <div className="flex justify-center gap-4 mt-8">
                      <button
                        onClick={() => setCurrentStep(STEPS.BASIC_INFO)}
                        className="px-8 py-3 w-full rounded-lg border-2 border-white/30 bg-white/10 text-white hover:border-white/50 transition-colors"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => {
                          if (singleMode && singleTarget === 'skin' && saveSingleModeAndReturn) {
                            saveSingleModeAndReturn({ skin_tone: analysisData.skin_tone });
                          } else if (singleMode && singleTarget === 'face' && saveSingleModeAndReturn) {
                            saveSingleModeAndReturn({ face_shape: analysisData.face_shape || null });
                          } else {
                            handleNext();
                          }
                        }}
                        disabled={singleMode ? (singleTarget === 'skin' ? !analysisData.skin_tone : !analysisData.face_shape) : !analysisData.skin_tone}
                        className="px-8 py-3 w-full rounded-lg bg-[white]/10 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-600 hover:to-purple-700 transition-all"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />

          {/* Mobile Preloader Overlay (2s before camera capture) */}
          {isMobilePreloading && (
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

          {/* Face Instructions Modal */}
          {showFaceInstructions && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-[#444141] rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-white">
                    ✨ Face & Skin Analysis Instructions
                  </h3>
                  <button
                    onClick={() => setShowFaceInstructions(false)}
                    className="text-white hover:text-gray-300 text-2xl"
                  >
                    ×
                  </button>
                </div>
                <div className="text-white text-sm space-y-3">
                  <p>To get the best results, please follow these steps:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>
                      Sit in a well-lit area (avoid shadows or backlight).
                    </li>
                    <li>
                      Keep your head straight and look directly into the
                      camera.
                    </li>
                    <li>
                      Remove glasses, masks, or anything covering your face.
                    </li>
                    <li>Stay still for a few seconds while we scan.</li>
                  </ul>
                  <p className="mt-4">
                    ✨ <span className="font-semibold">Tip:</span> Natural
                    daylight works best for accurate skin tone detection.
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

export default SkinFaceAnalysisStep;
