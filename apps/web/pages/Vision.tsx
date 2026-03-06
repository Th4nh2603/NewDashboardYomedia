
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { useError } from '../contexts/ErrorContext';

const Vision = () => {
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const { handleApiError } = useError();

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any,
          }
        }
      });

      let found = false;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          setGeneratedImage(`data:image/png;base64,${part.inlineData.data}`);
          found = true;
          break;
        }
      }
      
      if (!found) {
        handleApiError(new Error('No image was returned by the model.'), 'Vision');
      }
    } catch (err) {
      handleApiError(err, 'Image Generation');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header>
        <h2 className="text-3xl font-bold mb-2">Vision Studio</h2>
        <p className="text-slate-400">Describe what you want to see, and let Nova's vision model bring it to life.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A futuristic city with neon lights and flying cars..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-slate-100 min-h-[120px] focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Aspect Ratio</label>
              <div className="grid grid-cols-3 gap-2">
                {['1:1', '4:3', '16:9'].map(ratio => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`py-2 rounded-lg text-sm transition-all ${
                      aspectRatio === ratio 
                        ? 'bg-emerald-600 text-white shadow-lg' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:grayscale transition-all rounded-xl font-bold flex items-center justify-center gap-2 text-white shadow-lg shadow-emerald-500/20"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                  Create Image
                </>
              )}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="aspect-square lg:aspect-video bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden relative flex items-center justify-center shadow-xl">
            {generatedImage ? (
              <img src={generatedImage} alt="Generated" className="w-full h-full object-contain" />
            ) : (
              <div className="text-center p-8">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2v12a2 2 0 002 2z"/></svg>
                </div>
                <p className="text-slate-400 dark:text-slate-500">Your generated masterpiece will appear here</p>
              </div>
            )}
            {isGenerating && (
              <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-emerald-600 dark:text-emerald-400 font-medium animate-pulse">Refining pixels...</p>
              </div>
            )}
          </div>
          {generatedImage && (
             <div className="mt-4 flex justify-end">
                <a 
                  href={generatedImage} 
                  download="nova-vision-export.png"
                  className="px-6 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm transition-all"
                >
                  Download Asset
                </a>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Vision;
