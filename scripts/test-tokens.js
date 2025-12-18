const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envPath = path.resolve(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const apiKeyMatch = envContent.match(/GOOGLE_API_KEY=(.*)/);

if (!apiKeyMatch) {
    console.error("GOOGLE_API_KEY not found in .env.local");
    process.exit(1);
}

const apiKey = apiKeyMatch[1].trim();
const genAI = new GoogleGenerativeAI(apiKey);

async function run() {
    try {
        const modelName = "gemini-flash-latest";
        console.log(`Testing model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });

        const result = await model.generateContent("Hello! Count to 5.");
        const response = await result.response;
        const text = response.text();

        console.log("Response Text:", text);

        if (response.usageMetadata) {
            console.log("\n--- Gemini Token Usage (Verified) ---");
            console.log(`Prompt Tokens: ${response.usageMetadata.promptTokenCount}`);
            console.log(`Response Tokens: ${response.usageMetadata.candidatesTokenCount}`);
            console.log(`Total Tokens: ${response.usageMetadata.totalTokenCount}`);
            console.log("-------------------------------------");
        } else {
            console.warn("No usage metadata returned.");
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

run();
