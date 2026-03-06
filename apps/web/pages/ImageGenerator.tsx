
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { PhotoIcon, SparklesIcon, ArrowDownTrayIcon, KeyIcon } from '@heroicons/react/24/outline';
import { useError } from '../contexts/ErrorContext';

const ImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const { notify, handleApiError } = useError();

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    try {
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(selected);
    } catch (e) {
      console.error("Failed to check API key:", e);
    }
  };

  const handleOpenKeySelector = async () => {
    try {
      await window.aistudio.openSelectKey();
      // Assume success and update state
      setHasApiKey(true);
    } catch (e) {
      console.error("Failed to open key selector:", e);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      notify('Please enter a prompt', 'warning');
      return;
    }

    setIsGenerating(true);
    try {
      // Create a new instance right before making an API call to ensure it always uses the most up-to-date API key
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K"
          }
        },
      });

      let imageUrl = null;
      if (response.candidates && response.candidates[0] && response.candidates[0].content) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            imageUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (imageUrl) {
        setGeneratedImage(imageUrl);
      } else {
        throw new Error('No image was generated in the response');
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      if (error.message?.includes("Requested entity was not found")) {
        setHasApiKey(false);
        notify('API Key error. Please select a valid key again.', 'error', 'Key Error');
      } else {
        handleApiError(error, 'Image Generation');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `generated-${Date.now()}.png`;
    link.click();
  };

  if (!hasApiKey) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-160px)] text-center px-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#1f2a40] p-10 rounded-3xl border border-[#3d465d] shadow-2xl max-w-md"
        >
          <KeyIcon className="w-16 h-16 text-[#4cceac] mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-[#e0e0e0] mb-4">API Key Required</h2>
          <p className="text-[#a3a3a3] mb-8 leading-relaxed">
            To use Gemini 3 Image Generation, you must select a paid Google Cloud project API key.
          </p>
          <button
            onClick={handleOpenKeySelector}
            className="w-full bg-[#4cceac] hover:bg-[#3da58a] text-[#141b2d] font-bold py-4 rounded-xl transition-all shadow-lg shadow-[#4cceac]/20"
          >
            Select API Key
          </button>
          <p className="mt-4 text-xs text-[#a3a3a3]">
            Learn more about <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-[#4cceac] underline">Gemini API billing</a>.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-[#e0e0e0] tracking-tight">Image Generator</h1>
        <p className="text-[#4cceac] font-medium mt-2">Powered by Gemini 3 Pro Image</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div className="bg-[#1f2a40] p-8 rounded-3xl border border-[#3d465d] shadow-xl">
            <label className="block text-sm font-bold text-[#a3a3a3] uppercase tracking-widest mb-4">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to create..."
              className="w-full h-40 bg-[#141b2d] border border-[#3d465d] rounded-2xl p-4 text-[#e0e0e0] focus:border-[#4cceac]/50 outline-none transition-all resize-none placeholder-[#3d465d]"
            />
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full mt-6 bg-[#4cceac] disabled:bg-[#3d465d] disabled:cursor-not-allowed hover:bg-[#3da58a] text-[#141b2d] font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#4cceac]/10"
            >
              {isGenerating ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  >
                    <SparklesIcon className="w-5 h-5" />
                  </motion.div>
                  Generating...
                </>
              ) : (
                <>
                  <SparklesIcon className="w-5 h-5" />
                  Generate Image
                </>
              )}
            </button>
          </div>

          <div className="bg-[#1f2a40]/50 p-6 rounded-2xl border border-[#3d465d]/50">
            <h4 className="text-xs font-bold text-[#a3a3a3] uppercase tracking-widest mb-3">Tips</h4>
            <ul className="text-sm text-[#a3a3a3] space-y-2 list-disc list-inside">
              <li>Be specific about styles (e.g., "oil painting", "cyberpunk")</li>
              <li>Mention lighting and atmosphere</li>
              <li>Describe the subject and background in detail</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col">
          <div className="bg-[#1f2a40] rounded-3xl border border-[#3d465d] shadow-xl aspect-square flex items-center justify-center overflow-hidden relative group">
            <AnimatePresence mode="wait">
              {generatedImage ? (
                <motion.img
                  key="image"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  src={generatedImage}
                  alt="Generated"
                  className="w-full h-full object-cover"
                />
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center text-[#3d465d]"
                >
                  <PhotoIcon className="w-20 h-20 mb-4" />
                  <p className="font-medium">Your masterpiece will appear here</p>
                </motion.div>
              )}
            </AnimatePresence>

            {generatedImage && !isGenerating && (
              <motion.div 
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 transition-opacity"
              >
                <button
                  onClick={handleDownload}
                  className="bg-white/10 hover:bg-white/20 text-white p-4 rounded-full backdrop-blur-md border border-white/20 transition-all"
                >
                  <ArrowDownTrayIcon className="w-8 h-8" />
                </button>
              </motion.div>
            )}

            {isGenerating && (
              <div className="absolute inset-0 bg-[#141b2d]/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-10">
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-20 h-20 bg-[#4cceac]/20 rounded-full flex items-center justify-center mb-6"
                >
                  <SparklesIcon className="w-10 h-10 text-[#4cceac]" />
                </motion.div>
                <h3 className="text-xl font-bold text-[#e0e0e0] mb-2">Creating Magic...</h3>
                <p className="text-[#a3a3a3] text-sm max-w-xs">
                  Gemini is processing your prompt. This usually takes a few seconds.
                </p>
              </div>
            )}
          </div>
          
          {generatedImage && (
            <div className="mt-4 flex justify-between items-center px-2">
              <span className="text-xs text-[#a3a3a3] font-medium uppercase tracking-widest">
                1024 x 1024 px
              </span>
              <button 
                onClick={() => setGeneratedImage(null)}
                className="text-xs text-[#a3a3a3] hover:text-red-400 font-bold uppercase tracking-widest transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageGenerator;
