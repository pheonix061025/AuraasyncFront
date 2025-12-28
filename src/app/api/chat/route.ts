import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

// Import the product data
import productData from '../../data/Explore.json';

// Helper function to find relevant products
function findRelevantProducts(query: string): any[] {
    if (!query) return [];

    const lowerQuery = query.toLowerCase();
    const queryTokens = lowerQuery.split(" ").filter(t => t.length > 3); // Filter small words

    // Filter products that match keywords or title
    let matchedProducts = productData.filter((product: any) => {
        const keywordMatch = product.keyword && product.keyword.toLowerCase().includes(lowerQuery);
        const titleMatch = product.title && queryTokens.some(token => product.title.toLowerCase().includes(token));
        const typeMatch = product.type && lowerQuery.includes(product.type.toLowerCase());

        return keywordMatch || titleMatch || typeMatch;
    });

    // FALLBACK: If no specific products found, return some recommendations based on broad categories or random
    if (matchedProducts.length === 0) {
        console.log("No exact matches found for query:", lowerQuery);

        // If user mentions gender-specific terms, filter by that
        if (['women', 'girl', 'lady', 'female', 'she', 'her'].some(w => lowerQuery.includes(w))) {
            matchedProducts = productData.filter((p: any) => p.type === 'women' || p.type?.includes('women'));
        } else if (['men', 'boy', 'guy', 'male', 'he', 'him'].some(w => lowerQuery.includes(w))) {
            matchedProducts = productData.filter((p: any) => p.type === 'men' || p.type?.includes('men'));
        }

        // If still empty (or no gender specified), pick a random subset of the entire catalog
        if (matchedProducts.length === 0) {
            matchedProducts = productData;
        }
    }

    // Strategy to pick diverse yet relevant items (limit to 6 to save tokens)
    // We shuffle to give variety
    return matchedProducts.sort(() => 0.5 - Math.random()).slice(0, 6);
}

export async function POST(req: Request) {
    try {
        const { message, history } = await req.json();

        if (!process.env.GOOGLE_API_KEY) {
            return NextResponse.json(
                { error: "GOOGLE_API_KEY is not set" },
                { status: 500 }
            );
        }

        // 1. Search for relevant products based on the user's latest message
        const relevantProducts = findRelevantProducts(message);

        // 2. Format products for the AI context
        let productContext = "";
        if (relevantProducts.length > 0) {
            productContext = `
            HERE ARE THE AVAILABLE PRODUCTS THAT THE USER WILL SEE IN A GRID:
            
            ${relevantProducts.map((p, i) => `
            Item ${i + 1}: ${p.title} (${p.price})
            `).join("\n")}
            
            INSTRUCTIONS:
            - The user sees these products in a visual grid below your message.
            - DO NOT output these products as text, links, or markdown images.
            - Simply recommend them or comment on why they fit the user's request.
            `;
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-flash-latest",
            systemInstruction: `Role: Aura, Auraasync stylist.
        Goal: Style advice. Concise.
        
        Rules:
        - Brief, friendly, trendy.
        - Men->/male, Women->/female.
        - Style Qs only.
        
        ${productContext}

        IMPORTANT:
        - Products are SHOWN IN GRID.
        - DO NOT list products/prices/links in text.
        - Say: "Check these out!" & explain usage.
        - Max 2 sentences.`
        });

        const chat = model.startChat({
            history: history || [],
            generationConfig: {
                maxOutputTokens: 1000,
            },
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        if (response.usageMetadata) {
            console.log("\n--- Gemini Token Usage ---");
            console.log(`Prompt Tokens: ${response.usageMetadata.promptTokenCount}`);
            console.log(`Response Tokens: ${response.usageMetadata.candidatesTokenCount}`);
            console.log(`Total Tokens: ${response.usageMetadata.totalTokenCount}`);
            console.log("--------------------------\n");
        }

        // Limit products to 4 for the frontend grid
        const frontendProducts = relevantProducts.map(p => ({
            title: p.title,
            price: p.price,
            image: p.image,
            link: p.link,
            asin: p.asin
        })).slice(0, 4);

        return NextResponse.json({ text, products: frontendProducts });
    } catch (error: any) {
        console.error("Error in chat API:", error);
        return NextResponse.json(
            {
                error: error.message || "Failed to generate response",
                details: error.toString()
            },
            { status: 500 }
        );
    }
}
