"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

// New 8-question personality test with visual options
const personalityQuestions = [
  {
    id: 1,
    question: "What type of outfits do you usually prefer?",
    options: [
      { label: "Classic & Timeless", value: "classic", image: "/assets/classic-outfit.jpg" },
      { label: "Trendy & Modern", value: "trendy", image: "/assets/trendy-outfit.jpg" },
      { label: "Comfortable & Casual", value: "casual", image: "/assets/casual-outfit.jpg" },
      { label: "Bold & Statement", value: "bold", image: "/assets/bold-outfit.jpg" },
      { label: "Creative & Unique", value: "creative", image: "/assets/creative-outfit.jpg" }
    ],
    category: "outfit_preference"
  },
  {
    id: 2,
    question: "Which color palettes do you mostly have in your wardrobe?",
    options: [
      { label: "Neutrals (Black, White, Beige)", value: "neutrals", image: "/assets/neutral-colors.jpg" },
      { label: "Pastels (Soft Pink, Blue, Mint)", value: "pastels", image: "/assets/pastel-colors.jpg" },
      { label: "Bright & Vibrant", value: "bright", image: "/assets/bright-colors.jpg" },
      { label: "Earth Tones (Brown, Green, Orange)", value: "earth", image: "/assets/earth-colors.jpg" },
      { label: "Mixed & Eclectic", value: "mixed", image: "/assets/mixed-colors.jpg" }
    ],
    category: "color_palette"
  },
  {
    id: 3,
    question: "How do you usually dress depending on the event?",
    options: [
      { label: "Always Formal & Polished", value: "formal", image: "/assets/formal-event.jpg" },
      { label: "Smart Casual", value: "smart_casual", image: "/assets/smart-casual.jpg" },
      { label: "Comfortable & Relaxed", value: "relaxed", image: "/assets/relaxed-event.jpg" },
      { label: "Trendy & Fashion-Forward", value: "fashion_forward", image: "/assets/fashion-forward.jpg" },
      { label: "Unique & Eye-Catching", value: "unique", image: "/assets/unique-event.jpg" }
    ],
    category: "event_dressing"
  },
  {
    id: 4,
    question: "How much do you customize your outfits?",
    options: [
      { label: "Rarely, stick to outfit as is", value: "minimalist", image: "/assets/minimalist-style.jpg" },
      { label: "Small unique touches", value: "dreamer", image: "/assets/dreamer-style.jpg" },
      { label: "Occasionally mix trends", value: "charmer", image: "/assets/charmer-style.jpg" },
      { label: "Often add bold flair", value: "visionary", image: "/assets/visionary-style.jpg" },
      { label: "Always dramatic & standout", value: "explorer", image: "/assets/explorer-style.jpg" }
    ],
    category: "customization_level"
  },
  {
    id: 5,
    question: "What type of accessories do you prefer?",
    options: [
      { label: "Minimal & Simple", value: "minimal", image: "/assets/minimal-accessories.jpg" },
      { label: "Classic & Elegant", value: "classic", image: "/assets/classic-accessories.jpg" },
      { label: "Trendy & Modern", value: "trendy", image: "/assets/trendy-accessories.jpg" },
      { label: "Bold & Statement", value: "statement", image: "/assets/statement-accessories.jpg" },
      { label: "Creative & Unique", value: "unique", image: "/assets/unique-accessories.jpg" }
    ],
    category: "accessory_preference"
  },
  {
    id: 6,
    question: "How often do you experiment with new looks?",
    options: [
      { label: "Rarely, prefer consistency", value: "minimalist", image: "/assets/consistent-style.jpg" },
      { label: "Sometimes, when inspired", value: "dreamer", image: "/assets/inspired-style.jpg" },
      { label: "Regularly, with trends", value: "charmer", image: "/assets/trendy-experiments.jpg" },
      { label: "Often, with bold changes", value: "visionary", image: "/assets/bold-experiments.jpg" },
      { label: "Always, dramatic transformations", value: "explorer", image: "/assets/dramatic-experiments.jpg" }
    ],
    category: "experimentation_frequency"
  },
  {
    id: 7,
    question: "Where do you get your fashion inspiration from?",
    options: [
      { label: "Comfort & daily ease", value: "minimalist", image: "/assets/comfort-inspiration.jpg" },
      { label: "Social media / trends", value: "visionary", image: "/assets/social-media-inspiration.jpg" },
      { label: "Personal creativity / mood", value: "dreamer", image: "/assets/creative-inspiration.jpg" },
      { label: "Professional / polished icons", value: "charmer", image: "/assets/professional-inspiration.jpg" },
      { label: "Celebrities / show-stopping style", value: "explorer", image: "/assets/celebrity-inspiration.jpg" }
    ],
    category: "inspiration_source"
  },
  {
    id: 8,
    question: "What fabrics or fits do you enjoy most?",
    options: [
      { label: "Soft & Comfortable", value: "comfortable", image: "/assets/soft-fabrics.jpg" },
      { label: "Structured & Tailored", value: "structured", image: "/assets/structured-fabrics.jpg" },
      { label: "Flowing & Relaxed", value: "flowing", image: "/assets/flowing-fabrics.jpg" },
      { label: "Textured & Interesting", value: "textured", image: "/assets/textured-fabrics.jpg" },
      { label: "Unique & Unconventional", value: "unconventional", image: "/assets/unconventional-fabrics.jpg" }
    ],
    category: "fabric_preference"
  }
];

// Personality category mapping
function calculatePersonalityCategory(answers: string[]): string {
  const categoryScores = {
    minimalist: 0,
    dreamer: 0,
    charmer: 0,
    visionary: 0,
    explorer: 0
  };

  // Map answers to personality categories
  answers.forEach(answer => {
    switch(answer) {
      case 'minimalist':
        categoryScores.minimalist += 1;
        break;
      case 'dreamer':
        categoryScores.dreamer += 1;
        break;
      case 'charmer':
        categoryScores.charmer += 1;
        break;
      case 'visionary':
        categoryScores.visionary += 1;
        break;
      case 'explorer':
        categoryScores.explorer += 1;
        break;
      // Additional mappings for other answer values
      case 'classic':
      case 'neutrals':
      case 'formal':
      case 'minimal':
      case 'comfortable':
        categoryScores.minimalist += 1;
        break;
      case 'creative':
      case 'pastels':
      case 'relaxed':
      case 'unique':
      case 'flowing':
        categoryScores.dreamer += 1;
        break;
      case 'trendy':
      case 'smart_casual':
      case 'statement':
      case 'structured':
        categoryScores.charmer += 1;
        break;
      case 'bright':
      case 'fashion_forward':
      case 'textured':
        categoryScores.visionary += 1;
        break;
      case 'bold':
      case 'mixed':
      case 'unconventional':
        categoryScores.explorer += 1;
        break;
    }
  });

  // Find the category with the highest score
  const maxScore = Math.max(...Object.values(categoryScores));
  const topCategory = Object.keys(categoryScores).find(
    category => categoryScores[category as keyof typeof categoryScores] === maxScore
  );

  return topCategory || 'minimalist';
}

interface PersonalityAnalysisWidgetProps {
  onComplete?: (personalityCategory: string) => void;
  gender?: 'male' | 'female' | '';
}

const PersonalityAnalysisWidget: React.FC<PersonalityAnalysisWidgetProps> = ({
  onComplete,
  gender,
}) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>(
    Array(personalityQuestions.length).fill("")
  );
  const [showResult, setShowResult] = useState(false);
  const [personalityCategory, setPersonalityCategory] = useState("");
  const [showNext, setShowNext] = useState(false);

  // Build a gender-specific image path for each question option
  const getGenderFolder = (g?: 'male' | 'female' | '') => (g === 'male' ? 'male' : g === 'female' ? 'female' : 'neutral');
  const getOptionImage = (questionId: number, value: string) => {
    const folder = getGenderFolder(gender);
    // Example path you should provide under public/:
    // public/assets/personality/{male|female|neutral}/q{questionId}-{value}.jpg
    return `/assets/personality/${folder}/q${questionId}-${value}.jpg`;
  };

  const handleChange = (value: string) => {
    setAnswers((a) => a.map((v, i) => (i === step ? value : v)));
  };
  
  const handleNext = () => {
    if (step < personalityQuestions.length - 1) setStep((s) => s + 1);
    else {
      const result = calculatePersonalityCategory(answers);
      setPersonalityCategory(result);
      setShowResult(true);
      setShowNext(true);
    }
  };
  
  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };
  return (
    <div className="flex flex-col items-center justify-center text-white p-4">
      {!showResult ? (
        <div className="w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.4 }}
              className="bg-[#353333] p-8 rounded-3xl shadow-lg w-full md:w-[80vw] mx-auto"
            >
              {/* Progress Bar */}
              <div className="mb-8">
                <div className="flex justify-between text-sm text-gray-400 mb-2">
                  <span>Question {step + 1} of {personalityQuestions.length}</span>
                  <span>{Math.round(((step + 1) / personalityQuestions.length) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((step + 1) / personalityQuestions.length) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Question */}
              <div className="text-center mb-8">
                <h2 className="md:text-4xl text-2xl font-semibold leading-snug">
                  {personalityQuestions[step].question}
                </h2>
              </div>

              {/* Visual Options Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {personalityQuestions[step].options.map((option) => (
                  <label
                    key={option.value}
                    className={`relative cursor-pointer group transition-all duration-300 ${
                      answers[step] === option.value 
                        ? 'ring-2 ring-indigo-500 bg-indigo-500/20' 
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q${step}`}
                      value={option.value}
                      checked={answers[step] === option.value}
                      onChange={() => handleChange(option.value)}
                      className="sr-only"
                    />
                    <div className="p-4 rounded-xl border border-white/20 h-full">
                      {/* Gender-specific image derived from question and option */}
                      <div className="relative w-full h-32 rounded-lg mb-3 overflow-hidden bg-gray-700">
                        <Image
                          src={getOptionImage(personalityQuestions[step].id, option.value)}
                          alt={option.label}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          priority={false}
                        />
                      </div>
                      <div className="text-center">
                        <span className="text-sm font-medium">{option.label}</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between gap-4">
                <button
                  className="px-6 py-3 bg-gray-600 rounded-xl text-lg font-semibold hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleBack}
                  disabled={step === 0}
                >
                  Back
                </button>
                <button
                  className="px-6 py-3 bg-indigo-600 rounded-xl text-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleNext}
                  disabled={!answers[step]}
                >
                  {step === personalityQuestions.length - 1 ? "Finish" : "Next"}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      ) : (
        <div className="bg-gray-800 p-8 rounded-xl shadow-lg flex flex-col items-center w-full max-w-xl">
          <div className="text-2xl font-bold text-green-400 mb-4">
            Your Style Personality: {personalityCategory.charAt(0).toUpperCase() + personalityCategory.slice(1)}
          </div>
          <div className="text-center text-gray-300 mb-6">
            {personalityCategory === 'minimalist' && "You prefer clean, simple, and timeless styles that focus on comfort and functionality."}
            {personalityCategory === 'dreamer' && "You're creative and expressive, drawn to unique pieces that reflect your personal mood and artistic vision."}
            {personalityCategory === 'charmer' && "You love trendy, polished looks that help you make a great impression in social and professional settings."}
            {personalityCategory === 'visionary' && "You're bold and fashion-forward, always experimenting with new trends and statement pieces."}
            {personalityCategory === 'explorer' && "You're adventurous and dramatic, always pushing boundaries with unconventional and eye-catching styles."}
          </div>
          {showNext && (
            <button
              className="mt-4 px-8 py-3 bg-indigo-600 rounded-xl text-xl font-bold hover:bg-indigo-700 transition"
              onClick={() => onComplete && onComplete(personalityCategory)}
            >
              Next
            </button>
          )}
          <button
            className="mt-4 px-8 py-3 bg-gray-600 rounded-xl text-xl font-bold hover:bg-gray-700 transition"
            onClick={() => setShowResult(false)}
          >
            Retake Quiz
          </button>
        </div>
      )}
    </div>
  );
};

export default PersonalityAnalysisWidget;
