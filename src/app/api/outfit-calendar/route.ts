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

// Compress image for calendar generation
async function compressImage(base64: string, mimeType: string, maxSizeKB: number = 80): Promise<string> {
  try {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    
    if (blob.size <= maxSizeKB * 1024) {
      return base64;
    }
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return base64;
    
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = `data:${mimeType};base64,${base64}`;
    });
    
    const maxDimension = 300;
    let { width, height } = img;
    if (width > height) {
      if (width > maxDimension) {
        height = (height * maxDimension) / width;
        width = maxDimension;
      }
    } else {
      if (height > maxDimension) {
        width = (width * maxDimension) / height;
        height = maxDimension;
      }
    }
    
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);
    
    const quality = 0.7;
    const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
    const compressedBase64 = compressedDataUrl.split(',')[1];
    
    return compressedBase64;
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
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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

    // Create system prompt for calendar generation
    const systemPrompt = [
      "You are a professional fashion stylist creating a 10-day personalized outfit calendar.",
      "",
      "Instructions:",
      "1. Create 10 unique outfit combinations for each day",
      "2. Ensure variety in styles, colors, and occasions across the week",
      "3. Consider different activities: work, casual, formal, weekend, etc.",
      "4. Rotate through all available clothing items to maximize wardrobe usage",
      "5. Provide specific styling tips for each day",
      "6. Make each outfit appropriate for the day of the week",
      "",
      "Calendar dates:",
      ...calendarDates.map((date, index) => `${index + 1}. ${date.dayName}, ${date.date}`),
      "",
      "Requirements:",
      "- Each day should have a different outfit combination",
      "- Include variety in formality levels (casual, business casual, formal, etc.)",
      "- Rotate through all available items",
      "- Provide practical styling tips",
      "- Consider seasonal appropriateness",
      "",
      "Return JSON with calendar in this format:",
      "{\"calendar\": [{\"date\": \"YYYY-MM-DD\", \"dayName\": \"Day\", \"outfit\": {\"topwear\": \"\", \"bottomwear\": \"\", \"accessories\": [\"\"], \"description\": \"\", \"occasion\": \"\", \"styling_tips\": [\"\"]}}]}"
    ].join("\n");

    // Prepare image parts for Gemini
    const imageParts = [
      ...processedTopwears.map(item => item.image),
      ...processedBottomwears.map(item => item.image)
    ];

    // Add text description of items
    const itemDescriptions = [
      "Available Topwears:",
      ...processedTopwears.map((item, index) => `${index + 1}. ${item.name || 'Item'} - ${item.color || 'Unknown color'} ${item.style || 'style'}`),
      "",
      "Available Bottomwears:",
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
        temperature: 0.8,
        topK: 40,
        topP: 0.95,
        responseMimeType: "application/json"
      }
    });

    const text = result.response.text();
    const parsed = safeJsonParse<any>(text);

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

    const response = NextResponse.json({ 
      calendar: finalCalendar,
      totalDays: finalCalendar.length
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
    console.error("/api/outfit-calendar error", err);
    
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
