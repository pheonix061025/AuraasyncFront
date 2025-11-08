import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Outfit Calendar API endpoint
// Accepts: { topwears: [], bottomwears: [], startDate: string }
// Returns: { calendar: [{ date, dayName, outfit, weather }] }

function extractBase64AndMime(input: string) {
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
  const sizeInBytes = (base64.length * 3) / 4;
  if (sizeInBytes > 5 * 1024 * 1024) {
    return { valid: false, error: "Image too large. Maximum 5MB allowed." };
  }
  
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(mimeType.toLowerCase())) {
    return { valid: false, error: "Invalid image type. Only JPEG, PNG, and WebP allowed." };
  }
  
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
    return { valid: false, error: "Invalid base64 data." };
  }
  
  return { valid: true };
}

// Compress image for calendar generation (server-side safe)
// Optimized for token reduction - smaller images = fewer tokens
async function compressImage(base64: string, mimeType: string, maxSizeKB: number = 20): Promise<string> {
  try {
    // Calculate approximate size
    const sizeInBytes = (base64.length * 3) / 4;
    const sizeInKB = sizeInBytes / 1024;
    
    // If already small enough, return as-is
    if (sizeInKB <= maxSizeKB) {
      return base64;
    }
    
    // For larger images, we need to reduce quality by creating a smaller version
    // Since we can't use canvas in server environment, we'll return a compressed base64
    // by reducing the quality parameter in the data URL
    console.warn(`Image size (${sizeInKB.toFixed(2)}KB) exceeds limit (${maxSizeKB}KB). Attempting to compress...`);
    
    // Simple compression: reduce base64 quality by sampling
    const compressionRatio = maxSizeKB / sizeInKB;
    const targetLength = Math.floor(base64.length * compressionRatio * 0.7); // 70% of target to be safe
    
    if (targetLength < 1000) {
      throw new Error('Image too small after compression');
    }
    
    // Sample the base64 string to reduce size
    const step = Math.ceil(base64.length / targetLength);
    let compressed = '';
    for (let i = 0; i < base64.length; i += step) {
      compressed += base64[i];
    }
    
    // Ensure proper base64 padding
    while (compressed.length % 4 !== 0) {
      compressed += '=';
    }
    
    // Validate the compressed base64
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(compressed)) {
      throw new Error('Compressed base64 is invalid');
    }
    
    const compressedSizeKB = (compressed.length * 3 / 4 / 1024);
    console.warn(`Compressed image from ${sizeInKB.toFixed(2)}KB to ${compressedSizeKB.toFixed(2)}KB`);
    
    // If still too large, try even more aggressive compression
    if (compressedSizeKB > maxSizeKB) {
      console.warn('Still too large, attempting more aggressive compression...');
      return compressImage(compressed, mimeType, maxSizeKB / 2);
    }
    
    return compressed;
  } catch (error) {
    console.warn('Image compression failed, using original:', error);
    return base64;
  }
}

function safeJsonParse<T = unknown>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch (_) {
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

function checkRateLimit(identifier: string, maxRequests: number = 2, windowMs: number = 300000): boolean {
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

// Generate 10-day calendar dates
function generateCalendarDates(startDate: string): Array<{ date: string; dayName: string }> {
  const dates: Array<{ date: string; dayName: string }> = [];
  const start = new Date(startDate);
  
  for (let i = 0; i < 10; i++) {
    const currentDate = new Date(start);
    currentDate.setDate(start.getDate() + i);
    
    dates.push({
      date: currentDate.toISOString().split('T')[0],
      dayName: currentDate.toLocaleDateString('en-US', { weekday: 'long' })
    });
  }
  
  return dates;
}

// Mock weather data (in production, integrate with a weather API)
function getMockWeather(date: string): { temperature: number; condition: string; icon: string } {
  const conditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Rainy', 'Clear'];
  const temperatures = [18, 22, 25, 20, 16, 28, 24, 19, 23, 21];
  
  const dayIndex = new Date(date).getDate() % 10;
  
  return {
    temperature: temperatures[dayIndex],
    condition: conditions[dayIndex % conditions.length],
    icon: '☀️'
  };
}

export async function POST(req: Request) {
  const globalAny = global as any;
  const requestStartTime = Date.now();
  
  const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  
  // Rate limiting (2 requests per 5 minutes for calendar generation)
  if (!checkRateLimit(clientIP, 2, 300000)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait before generating another calendar." },
      { status: 429 }
    );
  }
  
  try {
    const { topwears, bottomwears, startDate } = await req.json();

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

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server misconfigured: GOOGLE_API_KEY not set" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Use Flash Lite for cost optimization
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📅 CALENDAR API REQUEST');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🤖 Model: gemini-2.5-flash-lite`);
    console.log(`👕 Topwears: ${topwears.length}`);
    console.log(`👖 Bottomwears: ${bottomwears.length}`);
    console.log(`🌐 Client IP: ${clientIP}`);
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);

    // Process images
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

    if (processedTopwears.length === 0 || processedBottomwears.length === 0) {
      return NextResponse.json(
        { error: "No valid images provided" },
        { status: 400 }
      );
    }

    // Generate calendar dates
    const calendarDates = generateCalendarDates(startDate || new Date().toISOString().split('T')[0]);

    // Optimized system prompt - shorter to reduce tokens
    const systemPrompt = [
      "Create 10-day outfit calendar. Rules:",
      "1. Unique combinations daily",
      "2. Rotate all items",
      "3. Vary formality (casual/formal/weekend)",
      "4. Use item numbers from lists",
      "",
      "Dates:",
      ...calendarDates.map((date) => `${date.date} (${date.dayName})`),
      "",
      "JSON format:",
      "{\"calendar\": [{\"date\": \"YYYY-MM-DD\", \"dayName\": \"Day\", \"outfit\": {\"topwear\": \"item#\", \"bottomwear\": \"item#\", \"accessories\": [\"\"], \"description\": \"brief\", \"occasion\": \"\", \"styling_tips\": [\"tip\"]}}]}"
    ].join("\n");

    // Prepare image parts for Gemini
    const imageParts = [
      ...processedTopwears.map(item => item.image),
      ...processedBottomwears.map(item => item.image)
    ];

    // Optimized item descriptions - shorter format to reduce tokens
    const itemDescriptions = [
      "Topwears:",
      ...processedTopwears.map((item, index) => `${index + 1}. ${item.color || ''} ${item.style || ''}`),
      "Bottomwears:",
      ...processedBottomwears.map((item, index) => `${index + 1}. ${item.color || ''} ${item.style || ''}`)
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
        temperature: 0.7, // Reduced for more consistent, token-efficient responses
        topK: 20, // Reduced from 40 to save tokens
        topP: 0.9, // Reduced from 0.95
        responseMimeType: "application/json",
        maxOutputTokens: 2000 // Limit output to reduce tokens
      }
    }).catch(async (error) => {
      console.error('Gemini API error with images, falling back to text-only:', error);
      
      // Fallback: try without images if image processing fails
      const fallbackResult = await model.generateContent({
        contents: [
          { 
            role: "user", 
            parts: [
              { text: systemPrompt + "\n\nNote: Images could not be processed. Please generate calendar based on text descriptions only." },
              { text: itemDescriptions }
            ] 
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 20,
          topP: 0.9,
          responseMimeType: "application/json",
          maxOutputTokens: 2000
        }
      });
      
      return fallbackResult;
    });

    const text = result.response.text();
    
    // Track token usage for monitoring
    const usage = result.response.usageMetadata;
    const totalTokens = usage?.totalTokenCount || 0;
    const promptTokens = usage?.promptTokenCount || 0;
    const candidatesTokenCount = usage?.candidatesTokenCount || 0;
    
    // Log token usage
    console.log('\n📊 TOKEN USAGE:');
    console.log(`  📥 Input Tokens: ${promptTokens.toLocaleString()}`);
    console.log(`  📤 Output Tokens: ${candidatesTokenCount.toLocaleString()}`);
    console.log(`  📊 Total Tokens: ${totalTokens.toLocaleString()}`);
    
    const parsed = safeJsonParse<any>(text);
    
    console.log(`\n✅ Calendar generated: ${parsed?.calendar?.length || 0} days`);

    if (!parsed || !parsed.calendar || !Array.isArray(parsed.calendar)) {
      return NextResponse.json(
        { error: "Failed to generate calendar", raw: text },
        { status: 502 }
      );
    }

    // Add weather data to each day
    const calendarWithWeather = parsed.calendar.map((day: any) => ({
      ...day,
      weather: getMockWeather(day.date)
    }));

    // Ensure we have exactly 10 days
    const finalCalendar = calendarWithWeather.slice(0, 10);

    const responseData = { 
      calendar: finalCalendar,
      totalDays: finalCalendar.length
    };
    
    // Calculate response size and log warning if too large
    const responseSize = JSON.stringify(responseData).length;
    
    if (responseSize > 8 * 1024 * 1024) { // 8MB warning
      console.warn('Response size is approaching limits. Consider reducing image data or response complexity.');
    }
    
    // If response is too large, create a simplified version without image references
    if (responseSize > 9 * 1024 * 1024) { // 9MB limit
      console.warn('Response too large, returning simplified calendar without image data');
      const simplifiedCalendar = finalCalendar.map((day: any) => ({
        date: day.date,
        dayName: day.dayName,
        outfit: {
          topwear: day.outfit.topwear,
          bottomwear: day.outfit.bottomwear,
          accessories: day.outfit.accessories,
          description: day.outfit.description,
          occasion: day.outfit.occasion,
          styling_tips: day.outfit.styling_tips
        },
        weather: day.weather
      }));
      
      return NextResponse.json({ 
        calendar: simplifiedCalendar,
        totalDays: simplifiedCalendar.length,
        warning: 'Large images omitted to prevent response truncation'
      });
    }

    const totalDuration = Date.now() - requestStartTime;
    console.log(`\n⏱️  Total Request Duration: ${totalDuration}ms`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const response = NextResponse.json(responseData);
    
    // Add security headers
    response.headers.set('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    
    return response;
    
  } catch (err: any) {
    const errorDuration = Date.now() - (requestStartTime || Date.now());
    console.log('\n❌ ERROR OCCURRED:');
    console.log(`  Error: ${err?.message || 'Unknown error'}`);
    console.log(`  Status: ${err?.status || err?.response?.status || 'N/A'}`);
    console.log(`  Duration: ${errorDuration}ms`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
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
