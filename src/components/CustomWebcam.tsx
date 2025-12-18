'use client'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import Webcam from 'react-webcam'

interface CustomWebcamProps {
  onCapture?: (imageBlob: Blob, imageUrl: string) => void;
  autoCapture?: boolean;
  countdownSeconds?: number;
  captureCount?: number;
  captureInterval?: number;
  onAllCapturesComplete?: () => void;
  className?: string;
  showPreview?: boolean;
}

const CustomWebcam = ({
  onCapture,
  autoCapture = true,
  countdownSeconds = 5,
  captureCount = 1,
  captureInterval = 5000,
  onAllCapturesComplete,
  className = '',
  showPreview = false
}: CustomWebcamProps) => {
    const webcamRef = useRef<Webcam>(null)
    const [ImgSrc, setImgSrc] = useState<string | null>(null);
    const [countdown, setCountdown] = useState<number>(countdownSeconds);
    const [isCountingDown, setIsCountingDown] = useState<boolean>(false);
    const [capturedCount, setCapturedCount] = useState<number>(0);
    const [isWaiting, setIsWaiting] = useState<boolean>(false);
    const [isWebcamReady, setIsWebcamReady] = useState<boolean>(false);

    const capture = useCallback(async () => {
        const imageSrc = webcamRef.current?.getScreenshot() ?? null;
        if (!imageSrc) {
          console.error('Webcam screenshot returned null');
          return;
        }

        // Validate the screenshot is a valid data URL
        if (!imageSrc.startsWith('data:image')) {
          console.error('Invalid image format from webcam:', imageSrc.substring(0, 50));
          return;
        }

        setImgSrc(imageSrc);
        
        // Convert base64 to Blob if onCapture callback is provided
        if (onCapture) {
          try {
            // Convert base64 to blob with explicit JPEG mime type
            const parts = imageSrc.split(',');
            if (parts.length < 2) {
              console.error('Invalid data URL format:', imageSrc.substring(0, 100));
              return;
            }
            
            const base64Data = parts[1];
            if (!base64Data || base64Data.trim() === '') {
              console.error('No base64 data found in image');
              return;
            }
            
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'image/jpeg' });
            
            // Validate blob has data
            if (blob.size === 0) {
              console.error('Generated blob is empty');
              return;
            }
            
            onCapture(blob, imageSrc);
          } catch (error) {
            console.error('Error converting image to blob:', error);
            return;
          }
        }

        const newCapturedCount = capturedCount + 1;
        setCapturedCount(newCapturedCount);
        setIsCountingDown(false);

        // Check if we need more captures
        if (newCapturedCount < captureCount && autoCapture) {
          setIsWaiting(true);
          // Wait for interval before next capture
          setTimeout(() => {
            setIsWaiting(false);
            setCountdown(countdownSeconds);
            setIsCountingDown(true);
          }, captureInterval);
        } else if (newCapturedCount >= captureCount) {
          // All captures complete
          if (onAllCapturesComplete) {
            onAllCapturesComplete();
          }
        }
     }, [capturedCount, captureCount, onCapture, autoCapture, captureInterval, countdownSeconds, onAllCapturesComplete])

    // Start auto-capture on mount if enabled
    useEffect(() => {
        if (autoCapture && !isCountingDown && capturedCount === 0 && !isWaiting && isWebcamReady) {
            setIsCountingDown(true);
            setCountdown(countdownSeconds);
        }
    }, [autoCapture, isCountingDown, capturedCount, countdownSeconds, isWaiting, isWebcamReady]);

    // Countdown timer
    useEffect(() => {
        if (isCountingDown && countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown(countdown - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (isCountingDown && countdown === 0) {
            capture();
        }
    }, [isCountingDown, countdown, capture]);

  return (
    <div className={`relative ${className}`}>
      {showPreview && ImgSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ImgSrc} alt="webcam capture" className="w-full h-auto" />
      ) : (
        <div className="relative w-full">
          <Webcam 
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            className="w-full h-auto rounded-lg"
            videoConstraints={{
              facingMode: "user"
            }}
            onUserMedia={() => {
              console.log('Webcam ready');
              setIsWebcamReady(true);
            }}
            onUserMediaError={(error) => {
              console.error('Webcam error:', error);
            }}
          />
          {isCountingDown && countdown > 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-white text-9xl font-bold bg-black bg-opacity-50 rounded-full w-48 h-48 flex items-center justify-center animate-pulse">
                {countdown}
              </div>
            </div>
          )}
          {isWaiting && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-white text-2xl font-bold bg-black bg-opacity-50 rounded-lg px-6 py-4">
                Preparing next capture... ({capturedCount}/{captureCount})
              </div>
            </div>
          )}
          {capturedCount > 0 && capturedCount < captureCount && !isWaiting && !isCountingDown && (
            <div className="absolute top-4 right-4 bg-black bg-opacity-70 rounded-full px-4 py-2 text-white font-semibold">
              {capturedCount}/{captureCount}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default CustomWebcam
