"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, User, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getUserData, setUserData } from "@/lib/userState";
import { deductChatPoints, savePointsToSupabase } from "@/lib/pointsSystem";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

interface Message {
    role: "user" | "model";
    parts: string;
    products?: any[];
}

export default function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setIsAuthenticated(!!user);
        });
        return () => unsubscribe();
    }, []);


    const toggleChat = () => setIsOpen(!isOpen);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async () => {
        if (!input.trim()) return;

        const userMessage = input.trim();
        setInput("");
        setMessages((prev) => [...prev, { role: "user", parts: userMessage }]);
        setIsLoading(true);

        try {
            // Limit history to last 6 messages (3 turns) to save tokens
            const recentMessages = messages.slice(-6);
            const history = recentMessages.map(msg => ({
                role: msg.role,
                parts: [{ text: msg.parts }]
            }));

            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userMessage, history }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                let errorMessage = errorData.error || "Failed to fetch";
                if (errorData.details) {
                    console.error("Advanced Error Details:", errorData.details);
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            setMessages((prev) => [
                ...prev,
                {
                    role: "model",
                    parts: data.text,
                    products: data.products
                }
            ]);

            // Deduct coins based on response length
            const currentUser = getUserData();
            if (currentUser) {
                const result = deductChatPoints(currentUser, data.text);
                if (result.success) {
                    setUserData(result.userData);
                    // Dispatch event for Navbar/RewardModal to update
                    window.dispatchEvent(new Event('user_points_updated'));
                    // Async sync to DB
                    savePointsToSupabase(result.userData, result.transaction);
                }
            }
        } catch (error: any) {
            console.error(error);
            setMessages((prev) => [
                ...prev,
                { role: "model", parts: `Error: ${error.message || "Sorry, I'm having trouble connecting to the fashion servers right now. Please try again later."}` },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    if (!isAuthenticated) return null;

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="fixed bottom-24 right-6 w-80 sm:w-96 h-[500px] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-zinc-800 to-black p-4 flex justify-between items-center border-b border-zinc-700">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-indigo-500/20 rounded-full">
                                    <Sparkles className="w-5 h-5 text-indigo-400" />
                                </div>
                                <div>
                                    <h3 className="text-white font-medium text-sm">Aura Stylist</h3>
                                    <p className="text-zinc-400 text-xs">AI Fashion Assistant</p>
                                </div>
                            </div>
                            <button
                                onClick={toggleChat}
                                className="text-zinc-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-900 custom-scrollbar">
                            {messages.length === 0 && (
                                <div className="text-center text-zinc-500 mt-10">
                                    <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">Hello! I&apos;m Aura, your personal stylist.</p>
                                    <p className="text-xs mt-1">Ask me anything about fashion, outfits, or style!</p>
                                </div>
                            )}
                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                                >
                                    <div
                                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${msg.role === "user"
                                            ? "bg-indigo-600 text-white rounded-br-none"
                                            : "bg-zinc-800 text-zinc-200 rounded-bl-none border border-zinc-700"
                                            }`}
                                    >
                                        <div className="whitespace-pre-wrap">{msg.parts}</div>
                                    </div>

                                    {/* Product Grid - Rendered only for model messages with products */}
                                    {msg.role === "model" && msg.products && msg.products.length > 0 && (
                                        <div className="mt-3 grid grid-cols-2 gap-2 w-full max-w-[90%]">
                                            {msg.products.map((product, pIdx) => (
                                                <a
                                                    key={pIdx}
                                                    href={product.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="group bg-zinc-800/50 border border-zinc-700 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-colors cursor-pointer flex flex-col"
                                                >
                                                    <div className="relative aspect-[3/4] w-full overflow-hidden bg-zinc-900">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={product.image}
                                                            alt={product.title}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                        />
                                                    </div>
                                                    <div className="p-2 flex flex-col flex-1">
                                                        <h4 className="text-[10px] text-zinc-300 line-clamp-2 leading-tight mb-1 flex-1">
                                                            {product.title}
                                                        </h4>
                                                        <p className="text-indigo-400 font-bold text-xs">
                                                            {product.price}
                                                        </p>
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-zinc-800 rounded-2xl rounded-bl-none px-4 py-3 border border-zinc-700">
                                        <div className="flex gap-1">
                                            <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                            <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                            <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce"></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-3 bg-black border-t border-zinc-800">
                            <div className="flex gap-2 items-center bg-zinc-900 rounded-xl px-3 py-2 border border-zinc-800 focus-within:border-zinc-700 transition-colors">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask for style advice..."
                                    className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!input.trim() || isLoading}
                                    className="p-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleChat}
                className="fixed bottom-4 right-4 md:bottom-6 md:right-6 p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg z-[9999] transition-colors flex items-center justify-center group"
            >
                <AnimatePresence mode="wait">
                    {isOpen ? (
                        <motion.div
                            key="close"
                            initial={{ rotate: -90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: 90, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <X className="w-6 h-6" />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="chat"
                            initial={{ rotate: 90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: -90, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <MessageCircle className="w-6 h-6" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {!isOpen && (
                    <span className="absolute right-0 top-0 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                    </span>
                )}
            </motion.button>
        </>
    );
}
