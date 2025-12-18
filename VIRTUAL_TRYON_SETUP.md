# Virtual Try-On - Gemini API Integration

This feature uses Google's Gemini AI to perform virtual try-on of clothing.

## Setup Instructions

### 1. Get your Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. How It Works

The virtual try-on feature:
- Takes two images: a dress/clothing image and a model/person image
- Sends both images to Gemini AI API
- Uses the `gemini-2.0-flash-exp` model for image generation
- Returns a realistic photo of the person wearing the clothing

### 4. API Endpoint

- **URL**: `/api/virtual-tryon`
- **Method**: `POST`
- **Body**: 
  ```json
  {
    "dressImage": "base64_encoded_image",
    "modelImage": "base64_encoded_image"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "image": "data:image/png;base64,..."
  }
  ```

### 5. Usage

1. Upload a dress/clothing image
2. Upload a model/person image (full body recommended)
3. Click "TRY ON" button
4. Wait for AI processing (~5-10 seconds)
5. View the generated try-on result

### Important Notes

- Images should be clear and well-lit
- Full-body shots work best for models
- The clothing should be clearly visible in the dress image
- Processing time depends on image size and API response time
- The Gemini API has rate limits - check your quota in Google AI Studio

### Model Used

- **Model**: `gemini-2.0-flash-exp`
- This is an experimental model with image generation capabilities
- Provides fast processing with high-quality results
