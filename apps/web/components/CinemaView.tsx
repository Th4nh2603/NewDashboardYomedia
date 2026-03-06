
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { useError } from '../contexts/ErrorContext';

const CinemaView = () => {
  const [prompt, setPrompt] = useState('');
  const [videoUrl, setVideoUrl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const { handleApiError, notify } = useError();

  useEffect(() => {
    checkKeyStatus();
  }, []);

  const checkKeyStatus = async () => {
    if (window.aistudio?.hasSelectedApiKey) {
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasKey(selected);
    }
  };

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
      notify('API Key selected successfully. You can now generate videos.', 'info', 'Setup Complete');
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setStatusMessage('Initiating cinematic render engine...');
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });

      setStatusMessage('Capturing frames and light paths...');
      
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        setStatusMessage(`Polishing frames... ${new Date().toLocaleTimeString()}`);
        operation = await ai.operations.getVideosOperation({operation: operation});
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        setStatusMessage('Finalizing MP4 stream...');
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        if (!response.ok) throw new Error('Failed to fetch the generated video file.');
        const blob = await response.blob();
        setVideoUrl(URL.createObjectURL(blob));
        notify('Cinematic sequence rendered successfully!', 'info', 'Cinema Engine');
      }
    } catch (err) {
      handleApiError(err, 'Cinema Engine');
      if (err.message?.includes("Requested entity was not found")) {
        setHasKey(false);
      }
    } finally {
      setIsGenerating(false);
      setStatusMessage('');
    }
  };

  if (!hasKey) {
    return (
      <div className="max-w-2xl mx-auto mt-20 text-center space-y-8 p-12 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl">
        <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-bold">Cinema Engine Locked</h2>
          <p className="text-slate-400">Veo-3.1 requires a dedicated API key from a paid Google Cloud project. Please select your key to proceed.</p>
          <div className="text-sm bg-slate-800/50 p-4 rounded-xl text-slate-500">
            Learn more about <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-indigo-400 hover:underline">Gemini API Billing</a>.
          </div>
        </div>
        <button
          onClick={handleSelectKey}
          className="w-full py-4 bg-rose-600 hover:bg-rose-500 rounded-xl font-bold transition-all shadow-lg"
        >
          Select API Key
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">Cinema Engine</h2>
          <p className="text-slate-400">Generate professional 720p/1080p video content from text.</p>
        </div>
        <div className="px-3 py-1 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-full text-xs font-bold uppercase tracking-widest">
          Veo-3.1 High Quality
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-6">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A slow motion cinematic tracking shot of a mountain range at sunset, 8k resolution, highly detailed..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-slate-100 min-h-[160px] focus:ring-2 focus:ring-rose-500/50 outline-none transition-all"
            />
            
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="w-full py-4 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:grayscale transition-all rounded-xl font-bold flex items-center justify-center gap-2"
            >
              {isGenerating ? 'Rendering...' : 'Generate Video'}
            </button>

            {isGenerating && (
              <div className="space-y-3">
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full animate-[shimmer_2s_infinite] w-2/3"></div>
                </div>
                <p className="text-xs text-center text-slate-500 italic">{statusMessage}</p>
              </div>
            )}
          </div>

          <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl">
             <h4 className="text-sm font-bold text-amber-500 mb-1 flex items-center gap-2">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
               Pro Tip
             </h4>
             <p className="text-xs text-slate-500 leading-relaxed">Video generation typically takes 1-3 minutes. For best results, use descriptive cinematic terms like "wide angle", "tracking shot", or "bokeh".</p>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="aspect-video bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden relative group">
            {videoUrl ? (
              <video 
                src={videoUrl} 
                controls 
                autoPlay 
                loop 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-700">
                <VideoCameraIcon className="w-20 h-20 mb-4 opacity-20" />
                <p className="font-medium">Video preview will appear here</p>
              </div>
            )}
            
            {isGenerating && (
              <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center p-12 text-center">
                <div className="relative w-24 h-24 mb-6">
                   <div className="absolute inset-0 border-4 border-rose-500/20 rounded-full"></div>
                   <div className="absolute inset-0 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Creating Cinematic Magic</h3>
                <p className="text-slate-400 text-sm max-w-xs">{statusMessage}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};

const VideoCameraIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
);

export default CinemaView;
