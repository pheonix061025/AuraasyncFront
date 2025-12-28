import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Add a simple in-memory rate limiter
const requestTimestamps: number[] = [];
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 2;

function checkRateLimit(): { allowed: boolean; waitTime: number } {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  while (requestTimestamps.length > 0 && requestTimestamps[0] < windowStart) {
    requestTimestamps.shift();
  }
  
  if (requestTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldestRequest = requestTimestamps[0];
    const waitTime = Math.ceil((oldestRequest + RATE_LIMIT_WINDOW - now) / 1000);
    return { allowed: false, waitTime };
  }
  
  requestTimestamps.push(now);
  return { allowed: true, waitTime: 0 };
}

export async function POST(request: NextRequest) {
  try {
    const rateLimitCheck = checkRateLimit();
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { 
          error: `Rate limit: Please wait ${rateLimitCheck.waitTime} seconds before trying again.`,
          isQuotaError: true,
          retryAfter: rateLimitCheck.waitTime,
        },
        { status: 429 }
      );
    }

    const { dressImage, modelImage } = await request.json();

    if (!dressImage || !modelImage) {
      return NextResponse.json(
        { error: 'Both dress and model images are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' });

    // Extract base64 data from data URLs
    const dressBase64 = dressImage.replace(/^data:image\/\w+;base64,/, '');
    const modelBase64 = modelImage.replace(/^data:image\/\w+;base64,/, '');

    // Detect mime types
    const dressMimeMatch = dressImage.match(/^data:(image\/\w+);base64,/);
    const modelMimeMatch = modelImage.match(/^data:(image\/\w+);base64,/);
    
    const dressMimeType = dressMimeMatch ? dressMimeMatch[1] : 'image/png';
    const modelMimeType = modelMimeMatch ? modelMimeMatch[1] : 'image/png';

    // Build prompt following Gemini docs format
    const prompt = [
      {
        inlineData: {
          mimeType: dressMimeType,
          data: dressBase64,
        },
      },
      {
        inlineData: {
          mimeType: modelMimeType,
          data: modelBase64,
        },
      },
      {
        text: `Image 1 contains the clothing reference. Extract the clothing from Image 1.
Image 2 is the model—do NOT modify the face, skin tone, body, pose, or identity.
Replace the clothing on the model with the clothing from Image 1.
Fit, scale, and align the clothing naturally to match the model's body and pose.`,
      },
    ];

    console.log('🚀 Sending request to Gemini 1.5 Pro Vision API...');
    const result = await model.generateContent(prompt);
    console.log('✅ Received response from Gemini API');
    console.log('Full response:', JSON.stringify(result, null, 2));

    // Process response - the SDK wraps it in a GenerateContentResponse
    const response = result.response;
    const candidates = response?.candidates;
    
    if (!candidates || candidates.length === 0) {
      console.error('❌ No candidates in response');
      console.error('Response structure:', {
        hasResponse: !!response,
        hasCandidates: !!candidates,
        candidatesLength: candidates?.length,
        keys: Object.keys(response || {})
      });
      return NextResponse.json(
        { error: 'No response from API', success: false },
        { status: 500 }
      );
    }

    const parts = candidates[0]?.content?.parts || [];
    console.log(`📦 Processing ${parts.length} parts in response`);

    // Look for image data in the response
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      console.log(`Part ${i} structure:`, Object.keys(part));
      
      // Check if this part has image data
      if (part.inlineData) {
        const imageData = part.inlineData.data;
        console.log(`✅ Found image data in part ${i}, length: ${imageData.length}`);
        
        return NextResponse.json({
          success: true,
          image: `data:image/png;base64,${imageData}`,
        });
      } else if (part.text) {
        console.log(`📝 Found text in part ${i}: ${part.text.substring(0, 100)}...`);
      }
    }

    // If we get here, no image was found - return text instead
    console.warn('⚠️ No image found in response, returning text analysis');
    const textContent = response.text?.() || 'No text response available';
    
    return NextResponse.json({
      success: false,
      message: textContent,
      hasImage: false,
    });

  } catch (error: any) {
    console.error('❌ Virtual try-on error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    
    if (error.message?.includes('quota') || error.message?.includes('429')) {
      const retryMatch = error.message.match(/retry in ([\d.]+)s/);
      const retrySeconds = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 60;
      
      return NextResponse.json(
        { 
          error: `Rate limit: Please wait ${retrySeconds} seconds and try again.`,
          isQuotaError: true,
          retryAfter: retrySeconds,
        },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to process virtual try-on',
        details: error.stack 
      },
      { status: 500 }
    );
  }
}
