const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

// Read .env.local
const envPath = path.resolve(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const apiKeyMatch = envContent.match(/GOOGLE_API_KEY=(.*)/);

if (!apiKeyMatch) {
    console.error("GOOGLE_API_KEY not found");
    process.exit(1);
}
const apiKey = apiKeyMatch[1].trim();

// Mock the backend logic since we can't easily import TS files here without compilation
// We will test if the logic works by running a similar flow with the REAL data file
const productDataPath = path.resolve(__dirname, '..', 'src', 'app', 'data', 'Explore.json');
const productData = JSON.parse(fs.readFileSync(productDataPath, 'utf-8'));

function findRelevantProducts(query) {
    if (!query) return [];

    const lowerQuery = query.toLowerCase();
    const queryTokens = lowerQuery.split(" ").filter(t => t.length > 3);

    const matchedProducts = productData.filter((product) => {
        const keywordMatch = product.keyword && product.keyword.toLowerCase().includes(lowerQuery);
        const titleMatch = product.title && queryTokens.some(token => product.title.toLowerCase().includes(token));
        const typeMatch = product.type && lowerQuery.includes(product.type.toLowerCase());

        return keywordMatch || titleMatch || typeMatch;
    });

    return matchedProducts.slice(0, 3); // Test with top 3
}

async function run() {
    const query = "beach dress";
    console.log(`Testing query: "${query}"`);

    const relevantProducts = findRelevantProducts(query);
    console.log(`Found ${relevantProducts.length} products locally.`);

    if (relevantProducts.length > 0) {
        console.log("Top product title:", relevantProducts[0].title);
    }

    // Now try to generate content with this context
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: "gemini-flash-latest",
        systemInstruction: `You are a stylist. Recommend products from this list ONLY: ${JSON.stringify(relevantProducts)}`
    });

    try {
        const result = await model.generateContent("I need a dress for the beach.");
        const text = await result.response.text();
        console.log("\nAI Response:\n", text);
    } catch (e) {
        console.error("AI Error:", e.message);
    }
}

run();
