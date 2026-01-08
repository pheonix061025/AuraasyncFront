import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import productData from "../../data/Explore.json";

// Simple in-memory rate limiter
const requestTimestamps = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW;

    const timestamps = requestTimestamps.get(ip) || [];
    const validTimestamps = timestamps.filter((t) => t > windowStart);

    if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
        return false;
    }

    validTimestamps.push(now);
    requestTimestamps.set(ip, validTimestamps);
    return true;
}

// Helper: find relevant products
function findRelevantProducts(query: string): any[] {
    if (!query) return [];

    const lowerQuery = query.toLowerCase();
    const queryTokens = lowerQuery.split(" ").filter(t => t.length > 3);

    let matchedProducts = productData.filter((product: any) => {
        const keywordMatch =
            product.keyword?.toLowerCase().includes(lowerQuery);

        const titleMatch =
            product.title &&
            queryTokens.some(token =>
                product.title.toLowerCase().includes(token)
            );

        const typeMatch =
            product.type && lowerQuery.includes(product.type.toLowerCase());

        return keywordMatch || titleMatch || typeMatch;
    });

    if (matchedProducts.length === 0) {
        if (["women", "girl", "female", "she", "her"].some(w => lowerQuery.includes(w))) {
            matchedProducts = productData.filter(p => p.type?.includes("women"));
        } else if (["men", "boy", "male", "he", "him"].some(w => lowerQuery.includes(w))) {
            matchedProducts = productData.filter(p => p.type?.includes("men"));
        } else {
            matchedProducts = productData;
        }
    }

    return matchedProducts.sort(() => 0.5 - Math.random()).slice(0, 6);
}

export async function POST(req: Request) {
    try {
        // Basic IP detection (fallback to 'unknown' in dev/local)
        const ip = req.headers.get("x-forwarded-for") || "unknown";

        if (!checkRateLimit(ip)) {
            return NextResponse.json(
                { error: "Too many requests. Please try again later." },
                { status: 429 }
            );
        }

        const { message, history } = await req.json();

        // ✅ Correct env var
        const rawApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        const apiKey = rawApiKey ? rawApiKey.trim() : "";

        if (!apiKey) {
            return NextResponse.json(
                { error: "GEMINI_API_KEY is not set" },
                { status: 500 }
            );
        }

        // ✅ Initialize INSIDE handler (prevents stale / leaked key caching)
        const genAI = new GoogleGenerativeAI(apiKey);

        const relevantProducts = findRelevantProducts(message);

        let productContext = "";
        if (relevantProducts.length > 0) {
            productContext = `
AVAILABLE PRODUCTS (SHOWN IN GRID BELOW):

${relevantProducts
                    .map((p, i) => `Item ${i + 1}: ${p.title} (${p.price})`)
                    .join("\n")}

RULES:
- DO NOT list products explicitly
- DO NOT show prices or links
- Just explain why they fit
`;
        }

        const model = genAI.getGenerativeModel({
            // ✅ Stable model (recommended)
            model: "gemini-1.5-flash",
            systemInstruction: `
Role: Aura, Auraasync stylist.
Goal: Style advice, concise.

Rules:
- Friendly, trendy, max 2 sentences
- Men → /male, Women → /female
- Style questions only

${productContext}
`,
        });

        const chat = model.startChat({
            history: history || [],
            generationConfig: {
                maxOutputTokens: 300,
            },
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        // Log token usage if available


        const frontendProducts = relevantProducts.slice(0, 4).map(p => ({
            title: p.title,
            price: p.price,
            image: p.image,
            link: p.link,
            asin: p.asin,
        }));

        return NextResponse.json({
            text: response.text(),
            products: frontendProducts,
        });
    } catch (error: any) {
        const debugKeyRaw = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        const safeKey = debugKeyRaw ? `${debugKeyRaw.substring(0, 4)}...${debugKeyRaw.substring(debugKeyRaw.length - 4)} (len: ${debugKeyRaw.length})` : "missing";

        console.error("Error in chat API:", error);
        return NextResponse.json(
            {
                error: error.message || "Chat generation failed",
                details: error.toString(),
                debugKey: safeKey,
                modelUsed: "gemini-flash-latest"
            },
            { status: 500 }
        );
    }
}
