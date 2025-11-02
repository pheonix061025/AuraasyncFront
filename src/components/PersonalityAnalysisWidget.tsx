"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

// New 7-question personality test with visual options
const personalityQuestions = [
  {
    id: 1,
    question: "What type of outfits do you usually prefer?",
    options: [
      { label: "Classic & Timeless", value: "classic", image: "" },
      { label: "Trendy & Modern", value: "trendy", image: "" },
      { label: "Comfortable & Casual", value: "casual", image: "" },
      { label: "Bold & Statement", value: "bold", image: "" },
      { label: "Creative & Unique", value: "creative", image: "" },
      { label: "Sporty & Athletic", value: "sporty", image: "" },
      { label: "Elegant & Sophisticated", value: "elegant", image: "" },
      { label: "Bohemian & Free-spirited", value: "bohemian", image: "" },
      { label: "Streetwear & Urban", value: "streetwear", image: "" },
      { label: "Minimalist & Clean", value: "minimalist_style", image: "" },
    ],
    category: "outfit_preference",
  },
  {
    id: 2,
    question: "Which color palettes do you mostly have in your wardrobe?",
    options: [
      {
        label: "Neutrals (Black, White, Beige)",
        value: "charmer",
        image: "/assets/personality/q2-charmer.jpg",
      },
      {
        label: "Pastels (Soft Pink, Blue, Mint)",
        value: "dreamer",
        image: "/assets/personality/q2-dreamer.jpg",
      },
      {
        label: "Bright & Vibrant",
        value: "explorer",
        image: "/assets/personality/q2-explorer.jpg",
      },
      {
        label: "Earth Tones (Brown, Green, Orange)",
        value: "minimalist",
        image: "/assets/personality/q2-minimalist.jpg",
      },
      {
        label: "Mixed & Eclectic",
        value: "visionary",
        image: "/assets/personality/q2-visionary.jpg",
      },
    ],
    category: "color_palette",
  },
  {
    id: 3,
    question: "How much do you customize your outfits?",
    options: [
      { label: "Rarely", value: "minimalist", image: "" },
      { label: "Small touches", value: "dreamer", image: "" },
      { label: "Mix trends", value: "visionary", image: "" },
      { label: "Bold flair", value: "charmer", image: "" },
      { label: "DIY/Layered", value: "explorer", image: "" },
    ],
    category: "customization_level",
  },
  {
    id: 4,
    question: "What type of accessories do you prefer?",
    options: [
      { label: "Minimal & Simple", value: "minimalist", image: "" },
      { label: "Classic & Elegant", value: "dreamer", image: "" },
      { label: "Trendy & Modern", value: "visionary", image: "" },
      { label: "Bold & Statement", value: "charmer", image: "" },
      { label: "Creative & Unique", value: "explorer", image: "" },
    ],
    category: "accessory_preference",
  },
  {
    id: 5,
    question: "How often do you experiment with new looks?",
    options: [
      {
        label: "Rarely",
        value: "minimalist",
        image: "/assets/consistent-style.jpg",
      },
      {
        label: "Small touches",
        value: "dreamer",
        image: "/assets/inspired-style.jpg",
      },
      {
        label: "Mix trends",
        value: "visionary",
        image: "/assets/trendy-experiments.jpg",
      },
      {
        label: "Bold flair",
        value: "charmer",
        image: "/assets/bold-experiments.jpg",
      },
      {
        label: "DIY/Layered",
        value: "explorer",
        image: "/assets/dramatic-experiments.jpg",
      },
    ],
    category: "experimentation_frequency",
  },
  {
    id: 6,
    question: "Where do you get your fashion inspiration from?",
    options: [
      {
        label: "Feel-based style",
        value: "minimalist",
        image: "/assets/comfort-inspiration.jpg",
      },
      {
        label: "Movies/Art/Pinterest",
        value: "dreamer",
        image: "/assets/creative-inspiration.jpg",
      },
      {
        label: "Social media",
        value: "visionary",
        image: "/assets/social-media-inspiration.jpg",
      },
      {
        label: "Celebrity style",
        value: "charmer",
        image: "/assets/celebrity-inspiration.jpg",
      },
      {
        label: "Street/Travel",
        value: "explorer",
        image: "/assets/professional-inspiration.jpg",
      },
    ],
    category: "inspiration_source",
  },
  {
    id: 7,
    question: "What fabrics or fits do you enjoy most?",
    options: [
      {
        label: "Soft & Comfortable",
        value: "charmer",
        image: "/assets/personality/q7-charmer.jpg",
      },
      {
        label: "Structured & Tailored",
        value: "dreamer",
        image: "/assets/personality/q7-dreamer.jpg",
      },
      {
        label: "Flowing & Relaxed",
        value: "minialist",
        image: "/assets/personality/q7-minimalist.jpg",
      },
      {
        label: "Textured & Interesting",
        value: "visionary",
        image: "/assets/personality/q7-visionary.jpg",
      },
    ],
    category: "fabric_preference",
  },
];

// Personality category mapping
function calculatePersonalityCategory(answers: (string | string[])[]): string {
  const categoryScores = {
    minimalist: 0,
    dreamer: 0,
    charmer: 0,
    visionary: 0,
    explorer: 0,
  };

  // Map answers to personality categories
  answers.forEach((answerItem) => {
    const values = Array.isArray(answerItem)
      ? answerItem
      : answerItem
      ? [answerItem]
      : [];
    values.forEach((answer) => {
      switch (answer) {
        case "minimalist":
          categoryScores.minimalist += 1;
          break;
        case "dreamer":
          categoryScores.dreamer += 1;
          break;
        case "charmer":
          categoryScores.charmer += 1;
          break;
        case "visionary":
          categoryScores.visionary += 1;
          break;
        case "explorer":
          categoryScores.explorer += 1;
          break;
        // Additional mappings for other answer values
        case "classic":
        case "neutrals":
        case "formal":
        case "minimal":
        case "comfortable":
        case "casual":
        case "sporty":
        case "minimalist_style":
          categoryScores.minimalist += 1;
          break;
        case "creative":
        case "pastels":
        case "relaxed":
        case "unique":
        case "flowing":
        case "bohemian":
          categoryScores.dreamer += 1;
          break;
        case "trendy":
        case "smart_casual":
        case "statement":
        case "structured":
        case "elegant":
          categoryScores.charmer += 1;
          break;
        case "bright":
        case "fashion_forward":
        case "textured":
          categoryScores.visionary += 1;
          break;
        case "bold":
        case "mixed":
        case "unconventional":
        case "streetwear":
          categoryScores.explorer += 1;
          break;
      }
    });
  });

  // Find the category with the highest score
  const maxScore = Math.max(...Object.values(categoryScores));
  const topCategory = Object.keys(categoryScores).find(
    (category) =>
      categoryScores[category as keyof typeof categoryScores] === maxScore
  );

  return topCategory || "minimalist";
}

interface PersonalityAnalysisWidgetProps {
  onComplete?: (personalityCategory: string) => void;
  gender?: "male" | "female" | "";
  // optional selection color as hex string (e.g. '#6366F1')
  selectionColor?: string;
}

const PersonalityAnalysisWidget: React.FC<PersonalityAnalysisWidgetProps> = ({
  onComplete,
  gender,
  selectionColor = '#6366F1',
}) => {
  const hexToRgba = (hex: string, alpha = 1) => {
    const cleaned = hex.replace('#', '');
    const full = cleaned.length === 3 ? cleaned.split('').map((c) => c + c).join('') : cleaned;
    const bigint = parseInt(full, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<(string | string[])[]>(
    Array(personalityQuestions.length).fill("")
  );
  const [showResult, setShowResult] = useState(false);
  const [personalityCategory, setPersonalityCategory] = useState("");
  const [showNext, setShowNext] = useState(false);

  // Build image candidates from files placed under public/assets/personality/
  // Supports names like: "Q1 F Charmer.jpg", "Q1 F Charmer (2).jpg", etc.
  const toTitleCase = (v: string) =>
    v
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase())
      .trim();
  // Map option value to the display name used in your filenames
  // Special handling for Q1 where your images are named by personality categories (Charmer, Dreamer, etc.)
  const mapQ1ValueToCategoryName = (value: string): string => {
    switch (value) {
      case "classic":
      case "casual":
      case "minimalist_style":
        return "Minimalist";
      case "trendy":
      case "elegant":
        return "Charmer";
      case "bold":
        return "Visionary";
      case "creative":
      case "bohemian":
        return "Dreamer";
      case "sporty":
      case "streetwear":
        return "Explorer";
      default:
        return toTitleCase(value);
    }
  };
  const normalizeForFilename = (value: string, questionId: number) => {
    if (questionId === 1) return mapQ1ValueToCategoryName(value);
    if (value === "minimalist_style") return "Minimalist";
    return toTitleCase(value);
  };
  const getGenderLetter = (g?: "male" | "female" | "") =>
    g === "male" ? "M" : "F";
  const getOptionImageCandidates = (
    questionId: number,
    value: string
  ): string[] => {
    console.log(questionId);
    const base = "/assets/personality";
    const name = normalizeForFilename(value, questionId);
    const g = getGenderLetter(gender);
    const folder = gender === "male" ? "male" : "female";
    return [
      // Pattern 1: Your arranged folder files (recommended)
      `${base}/${folder}/q${questionId}-${value}.jpg`,
      `${base}/${folder}/q${questionId}-${value}-1.jpg`,
      `${base}/${folder}/q${questionId}-${value}-2.jpg`,
      // Pattern 2: Legacy "Q{num} {G} Name.jpg"
      `${base}/Q${questionId} ${g} ${name}.jpg`,
      `${base}/Q${questionId} ${g} ${name} (2).jpg`,
    ];
  };

  // Multi-select configuration: Q1 (id 1) up to 5; Q7 (id 7) up to 3
  const getQuestionByStep = () => personalityQuestions[step];
  const isMultiSelect = (questionId: number) =>
    questionId === 1 || questionId === 7;
  const getMaxSelections = (questionId: number) =>
    questionId === 1 ? 5 : questionId === 7 ? 3 : 1;

  const handleChange = (value: string) => {
    const q = getQuestionByStep();
    if (isMultiSelect(q.id)) {
      setAnswers((prev) => {
        const current = prev[step];
        const currentArray = Array.isArray(current)
          ? current
          : current
          ? [current]
          : [];
        const exists = currentArray.includes(value);
        let nextArray = exists
          ? currentArray.filter((v) => v !== value)
          : [...currentArray, value];
        const max = getMaxSelections(q.id);
        if (nextArray.length > max) {
          nextArray = nextArray.slice(1);
        }
        const next = [...prev];
        next[step] = nextArray;
        return next;
      });
    } else {
      setAnswers((a) => a.map((v, i) => (i === step ? value : v)));
    }
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
                  <span>
                    Question {step + 1} of {personalityQuestions.length}
                  </span>
                  <span>
                    {Math.round(
                      ((step + 1) / personalityQuestions.length) * 100
                    )}
                    %
                  </span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        ((step + 1) / personalityQuestions.length) * 100
                      }%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Question */}
              <div className=" w-full ">
                <div className="text-center mb-8 md:flex md:justify-center md:items-center">
                  <h2 className="md:text-4xl text-2xl font-semibold leading-snug">
                    {personalityQuestions[step].question}
                  </h2>
                </div>

                {/* Visual Options Grid - Adjust columns based on question */}
                <div className="w-full md:p-6">
                  <div
                    className={`grid grid-cols-2 gap-4 mb-8 ${
                      personalityQuestions[step].id === 1
                        ? "md:grid-cols-2 lg:grid-cols-4" // 10 options for Q1
                        : "md:grid-cols-2 lg:grid-cols-3" // Default 3 columns
                    }`}
                  >
                    {personalityQuestions[step].options.map((option) => {
                      const isSelected = Array.isArray(answers[step])
                        ? (answers[step] as string[]).includes(option.value)
                        : answers[step] === option.value;
                      return (
                      <label
                        key={option.value}
                        className={`relative cursor-pointer group transition-all duration-300 ${
                          (
                            Array.isArray(answers[step])
                              ? (answers[step] as string[]).includes(
                                  option.value
                                )
                              : answers[step] === option.value
                          )
                            ? ""
                            : "hover:bg-white/5"
                        }`}
                      >
                        <input
                          type={
                            isMultiSelect(personalityQuestions[step].id)
                              ? "checkbox"
                              : "radio"
                          }
                          name={`q${step}`}
                          value={option.value}
                          checked={
                            Array.isArray(answers[step])
                              ? (answers[step] as string[]).includes(
                                  option.value
                                )
                              : answers[step] === option.value
                          }
                          onChange={() => handleChange(option.value)}
                          className="sr-only"
                        />
                        <div
                          className=" rounded-xl   relative h-full overflow-hidden"
                          style={
                            isSelected
                              ? {
                                  border: `2px solid ${selectionColor}`,
                                  backgroundColor: hexToRgba(selectionColor, 0.12),
                                }
                              : undefined
                          }
                        >
                          {/* Image rendering rules per question:
                        - Q1 and Q4: gender-based images (use candidate list)
                        - Q2 and Q7: use option.image (same for both genders)
                        - Q3, Q5, Q6: no images; show only question number and value
                      */}
                          <div
                            className={`w-full rounded-lg  overflow-hidden `}
                          >
                            {(() => {
                              const qId = personalityQuestions[step].id;
                              // Questions with no images: show only question number and value
                              if ([3, 5, 6].includes(qId)) {
                                return (
                                  <div className="flex bg-[#251F1E] border  items-center justify-center py-8">
                                            {/* <div className="text-sm text-gray-300">{`Q${qId} - ${option.value}`}</div> */}
                                  </div>
                                );
                              }

                              // Questions that rely on option.image (gender-agnostic)
                              if ([2, 7].includes(qId)) {
                                if (!option.image) return null;
                                return (
                                  <motion.div
                                    className="relative w-full h-[200px] md:h-[350px]"
                                    whileHover={{ scale: 1.04 }}
                                    animate={isSelected ? { scale: 1.06 } : { scale: 1 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                  >
                                    <Image
                                      src={option.image}
                                      alt={option.label}
                                      fill
                                      className="object-cover"
                                      priority={false}
                                      onError={(e) => {
                                        const parent = (e.target as HTMLElement)
                                          .parentElement as HTMLElement | null;
                                        if (parent)
                                          parent.style.display = "none";
                                      }}
                                    />
                                  </motion.div>
                                );
                              }

                              // Fallback: gender-based images for Q1 and Q4 (and any others)
                              const candidates = getOptionImageCandidates(
                                personalityQuestions[step].id,
                                option.value
                              );
                              const multiple = candidates.length > 1;
                              return (
                                <div className={multiple ? "flex gap-1" : ""}>
                                  {candidates.map((src) => (
                                    <motion.div
                                      key={src}
                                      className={"relative w-full h-[200px] md:h-[350px]"}
                                      whileHover={{ scale: 1.04 }}
                                      animate={isSelected ? { scale: 1.06 } : { scale: 1 }}
                                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    >
                                      <Image
                                        src={src}
                                        alt={option.label}
                                        fill
                                        className="object-cover"
                                        priority={false}
                                        onError={(e) => {
                                          const parent = (
                                            e.target as HTMLElement
                                          ).parentElement as HTMLElement | null;
                                          if (parent)
                                            parent.style.display = "none";
                                        }}
                                      />
                                    </motion.div>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                          
                          <div className="absolute bg-gradient-to-b from-transparent via-transparent to-black/50 inset-0" />
                          <div className="text-center absolute bottom-2 p-2 ">
                            <span className="text-sm font-medium">
                              {option.label}
                            </span>
                          </div>
                        </div>
                      </label>
                      );
                    })}
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
                      className="px-6 py-3 bg-white/30 border rounded-xl text-lg font-semibold hover:bg-white/70 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleNext}
                      disabled={(() => {
                        const ans = answers[step];
                        if (isMultiSelect(personalityQuestions[step].id)) {
                          return !Array.isArray(ans) || ans.length === 0;
                        }
                        return !ans;
                      })()}
                    >
                      {step === personalityQuestions.length - 1
                        ? "Finish"
                        : "Next"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      ) : (
        <div className="bg-gray-800 p-8 rounded-xl shadow-lg flex flex-col items-center w-full max-w-xl">
          <div className="text-2xl font-bold text-green-400 mb-4">
            Your Style Personality:{" "}
            {personalityCategory.charAt(0).toUpperCase() +
              personalityCategory.slice(1)}
          </div>
          <div className="text-center text-gray-300 mb-6">
            {personalityCategory === "minimalist" &&
              "You prefer clean, simple, and timeless styles that focus on comfort and functionality."}
            {personalityCategory === "dreamer" &&
              "You're creative and expressive, drawn to unique pieces that reflect your personal mood and artistic vision."}
            {personalityCategory === "charmer" &&
              "You love trendy, polished looks that help you make a great impression in social and professional settings."}
            {personalityCategory === "visionary" &&
              "You're bold and fashion-forward, always experimenting with new trends and statement pieces."}
            {personalityCategory === "explorer" &&
              "You're adventurous and dramatic, always pushing boundaries with unconventional and eye-catching styles."}
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
