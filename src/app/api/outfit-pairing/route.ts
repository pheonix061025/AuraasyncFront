import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Outfit Pairing API endpoint
// Accepts: { topwears: [{ image: string, name: string, color: string, style: string }], bottomwears: [{ image: string, name: string, color: string, style: string }], userPreferences?: string }
// Returns: { pairings: [{ topwear: object, bottomwear: object, accessories: string[], description: string, confidence: number }] }

function extractBase64AndMime(input: string) {
  // data URL format: data:<mime>;base64,<data>
  const match = input.match(/^data:(.*?);base64,(.*)$/);
  if (match) {
    return {
      mimeType: match[1] || "image/jpeg",
      base64: match[2]
    };
  }
  return {
    mimeType: "image/jpeg",
    base64: input
  };
}

// Validate image data
function validateImage(base64: string, mimeType: string): { valid: boolean; error?: string } {
  // Check file size (max 5MB for outfit images)
  const sizeInBytes = (base64.length * 3) / 4;
  if (sizeInBytes > 5 * 1024 * 1024) {
    return { valid: false, error: "Image too large. Maximum 5MB allowed." };
  }
  
  // Check MIME type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(mimeType.toLowerCase())) {
    return { valid: false, error: "Invalid image type. Only JPEG, PNG, and WebP allowed." };
  }
  
  // Basic base64 validation
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
    return { valid: false, error: "Invalid base64 data." };
  }
  
  return { valid: true };
}

// Compress image for outfit analysis (server-side safe)
// Note: For server-side, we'll skip compression or use sharp if available
// For now, we'll validate size and use original if within limits
async function compressImage(base64: string, mimeType: string, maxSizeKB: number = 100): Promise<string> {
  try {
    // Calculate approximate size
    const sizeInBytes = (base64.length * 3) / 4;
    const sizeInKB = sizeInBytes / 1024;
    
    // If already small enough, return as-is
    if (sizeInKB <= maxSizeKB) {
      return base64;
    }
    
    // For larger images, we'll truncate base64 if needed or skip compression
    // In production, consider using sharp for server-side image processing
    console.warn(`Image size (${sizeInKB.toFixed(2)}KB) exceeds limit (${maxSizeKB}KB). Using original.`);
    
    // Return original if compression not available on server
    // Note: Client-side compression should happen before sending to API
    return base64;
  } catch (error) {
    console.warn('Image compression check failed, using original:', error);
    return base64;
  }
}

function safeJsonParse<T = unknown>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch (_) {
    // try to extract from code fence
    const fence = text.match(/```(?:json)?\n([\s\S]*?)```/i);
    if (fence) {
      try {
        return JSON.parse(fence[1]) as T;
      } catch (_) {
        return null;
      }
    }
    return null;
  }
}

// Rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting function
function checkRateLimit(identifier: string, maxRequests: number = 5, windowMs: number = 60000): boolean {
  const now = Date.now();
  const key = identifier;
  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
}

export async function POST(req: Request) {
  const globalAny = global as any;
  
  // Security checks
  const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  
  // Rate limiting
  if (!checkRateLimit(clientIP, 3, 60000)) { // 3 requests per minute for outfit pairing
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait before trying again." },
      { status: 429 }
    );
  }
  
  try {
    const { topwears, bottomwears, userPreferences } = await req.json();

    // Input validation
    if (!Array.isArray(topwears) || !Array.isArray(bottomwears)) {
      return NextResponse.json(
        { error: "Missing required fields: topwears[] and bottomwears[]" },
        { status: 400 }
      );
    }
    
    if (topwears.length === 0 || bottomwears.length === 0) {
      return NextResponse.json(
        { error: "At least one topwear and one bottomwear required" },
        { status: 400 }
      );
    }
    
    if (topwears.length > 5 || bottomwears.length > 5) {
      return NextResponse.json(
        { error: "Maximum 5 topwears and 5 bottomwears allowed" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server misconfigured: GOOGLE_API_KEY not set" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Process and validate images
    const processImages = async (items: any[]): Promise<{ items: any[] } | { error: string }> => {
      const processedItems: any[] = [];
      
      for (const item of items) {
        if (!item.image) continue;
        
        const { mimeType, base64 } = extractBase64AndMime(item.image);
        const validation = validateImage(base64, mimeType);
        
        if (!validation.valid) {
          return { error: validation.error || 'Invalid image' };
        }
        
        const compressedBase64 = await compressImage(base64, mimeType);
        
        processedItems.push({
          ...item,
          image: {
            inlineData: { data: compressedBase64, mimeType: 'image/jpeg' }
          }
        });
      }
      
      return { items: processedItems };
    };

    const topwearResult = await processImages(topwears);
    if ('error' in topwearResult) {
      return NextResponse.json({ error: topwearResult.error }, { status: 400 });
    }

    const bottomwearResult = await processImages(bottomwears);
    if ('error' in bottomwearResult) {
      return NextResponse.json({ error: bottomwearResult.error }, { status: 400 });
    }

    const processedTopwears = topwearResult.items;
    const processedBottomwears = bottomwearResult.items;

    if (!processedTopwears || !processedBottomwears || processedTopwears.length === 0 || processedBottomwears.length === 0) {
      return NextResponse.json(
        { error: "No valid images provided" },
        { status: 400 }
      );
    }

    // Create system prompt for outfit pairing
    const systemPrompt = [
      "You are a professional fashion stylist and color expert. Analyze the provided clothing items and create stylish outfit combinations.",
      "",
      "Instructions:",
      "1. Analyze each clothing item for color, style, pattern, and formality level",
      "2. Create 5-8 diverse outfit combinations that work well together",
      "3. Consider color harmony, style compatibility, and occasion appropriateness",
      "4. Suggest appropriate accessories for each outfit",
      "5. Provide styling tips and confidence scores",
      "",
      "For each combination, consider:",
      "- Color theory (complementary, analogous, monochromatic)",
      "- Style balance (casual, formal, trendy, classic)",
      "- Body flattery and proportions",
      "- Seasonal appropriateness",
      "- Occasion suitability",
      "",
      "Return JSON with outfit combinations in this format:",
      "{\"pairings\": [{\"topwear\": {\"name\": \"\", \"color\": \"\", \"style\": \"\"}, \"bottomwear\": {\"name\": \"\", \"color\": \"\", \"style\": \"\"}, \"accessories\": [\"\"], \"description\": \"\", \"confidence\": 0.0-1.0, \"occasion\": \"\", \"styling_tips\": [\"\"]}]}",
      "",
      userPreferences ? `User preferences: ${userPreferences}` : ""
    ].join("\n");

    // Prepare image parts for Gemini
    const imageParts = [
      ...processedTopwears.map(item => item.image),
      ...processedBottomwears.map(item => item.image)
    ];

    // Add text description of items
    const itemDescriptions = [
      "Topwears:",
      ...processedTopwears.map((item, index) => `${index + 1}. ${item.name || 'Item'} - ${item.color || 'Unknown color'} ${item.style || 'style'}`),
      "",
      "Bottomwears:",
      ...processedBottomwears.map((item, index) => `${index + 1}. ${item.name || 'Item'} - ${item.color || 'Unknown color'} ${item.style || 'style'}`)
    ].join("\n");

    const result = await model.generateContent({
      contents: [
        { 
          role: "user", 
          parts: [
            { text: systemPrompt },
            { text: itemDescriptions },
            ...imageParts
          ] 
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            pairings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  topwear: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      color: { type: "string" },
                      style: { type: "string" }
                    }
                  },
                  bottomwear: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      color: { type: "string" },
                      style: { type: "string" }
                    }
                  },
                  accessories: {
                    type: "array",
                    items: { type: "string" }
                  },
                  description: { type: "string" },
                  confidence: { type: "number", minimum: 0, maximum: 1 },
                  occasion: { type: "string" },
                  styling_tips: {
                    type: "array",
                    items: { type: "string" }
                  }
                },
                required: ["topwear", "bottomwear", "accessories", "description", "confidence", "occasion", "styling_tips"]
              }
            }
          },
          required: ["pairings"]
        } as any
      }
    });

    const text = result.response.text();
    
    // Track token usage for monitoring
    const usage = result.response.usageMetadata;
    const totalTokens = usage?.totalTokenCount || 0;
    console.log("/api/outfit-pairing usage:", {
      promptTokens: usage?.promptTokenCount || 0,
      completionTokens: usage?.candidatesTokenCount || 0,
      totalTokens,
      model: "gemini-2.5-flash"
    });
    
    const parsed = safeJsonParse<any>(text);

    if (!parsed || !parsed.pairings) {
      return NextResponse.json(
        { error: "Failed to generate outfit pairings", raw: text },
        { status: 502 }
      );
    }

    // Filter out low confidence pairings
    const highConfidencePairings = parsed.pairings.filter((pairing: any) => 
      pairing.confidence && pairing.confidence >= 0.6
    );

    if (highConfidencePairings.length === 0) {
      return NextResponse.json(
        { error: "Unable to generate confident outfit pairings. Please try with clearer images." },
        { status: 422 }
      );
    }

    // Limit to 6 best pairings
    const bestPairings = highConfidencePairings
      .sort((a: any, b: any) => b.confidence - a.confidence)
      .slice(0, 6);

    const response = NextResponse.json({ 
      pairings: bestPairings,
      totalItems: (processedTopwears?.length || 0) + (processedBottomwears?.length || 0)
    });
    
    // Add security headers
    response.headers.set('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    
    return response;
    
  } catch (err: any) {
    console.error("/api/outfit-pairing error", err);
    
    const status: number | undefined = err?.status || err?.response?.status;
    if (status === 429) {
      return NextResponse.json(
        { error: "quota_exceeded", message: "Gemini quota exceeded. Please wait and try again." },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: err?.message || "Unknown server error" },
      { status: 500 }
    );
  }
}
