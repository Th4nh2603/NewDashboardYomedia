
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { useError } from '../contexts/ErrorContext';

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const Live = () => {
  const [isActive, setIsActive] = useState(false);
  const [transcriptions, setTranscriptions] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const { handleApiError, notify } = useError();
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const stopConversation = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    setIsActive(false);
    setIsConnecting(false);
  };

  const startConversation = async () => {
    try {
      setIsConnecting(true);
      // Create fresh instance right before connection to ensure latest API key
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      const outputCtx = new AudioContextClass({ sampleRate: 24000 });
      
      audioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const media = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              // Fix: Solely rely on sessionPromise resolves to send data
              sessionPromise.then(session => session.sendRealtimeInput({ media }));
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
            setIsActive(true);
            setIsConnecting(false);
            notify('Live session started.', 'info', 'Live Audio');
          },
          onmessage: async (message: LiveServerMessage) => {
            // Fix: Handle transcription chunks by appending to the last message if role matches
            if (message.serverContent?.outputTranscription) {
               const text = message.serverContent.outputTranscription.text;
               setTranscriptions(prev => {
                 const last = prev[prev.length - 1];
                 if (last && last.startsWith('AI: ')) {
                    return [...prev.slice(0, -1), last + text];
                 }
                 return [...prev, `AI: ${text}`];
               });
            } else if (message.serverContent?.inputTranscription) {
               const text = message.serverContent.inputTranscription.text;
               setTranscriptions(prev => {
                 const last = prev[prev.length - 1];
                 if (last && last.startsWith('You: ')) {
                    return [...prev.slice(0, -1), last + text];
                 }
                 return [...prev, `You: ${text}`];
               });
            }

            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              const audioCtx = outputAudioContextRef.current;
              if (audioCtx) {
                // Fix: Sync playback timing to prevent gaps
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioCtx.currentTime);
                const buffer = await decodeAudioData(decode(base64Audio), audioCtx, 24000, 1);
                const source = audioCtx.createBufferSource();
                source.buffer = buffer;
                source.connect(audioCtx.destination);
                source.addEventListener('ended', () => sourcesRef.current.delete(source));
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += buffer.duration;
                sourcesRef.current.add(source);
              }
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => {
                try { s.stop(); } catch(e) {}
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e: any) => {
            handleApiError(e, 'Live Session');
            stopConversation();
          },
          onclose: () => {
            setIsActive(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
          }
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      handleApiError(err, 'Live Setup');
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    return () => stopConversation();
  }, []);

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-6rem)] flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl relative transition-colors duration-300">
      <div className="p-8 text-center space-y-6">
        <div className="relative mx-auto w-32 h-32">
          <div className={`absolute inset-0 bg-amber-500/20 rounded-full ${isActive ? 'animate-ping' : ''}`}></div>
          <div className={`relative w-full h-full bg-slate-100 dark:bg-slate-800 border-4 ${isActive ? 'border-amber-500' : 'border-slate-200 dark:border-slate-700'} rounded-full flex items-center justify-center transition-all duration-500`}>
             <svg className={`w-12 h-12 ${isActive ? 'text-amber-500' : 'text-slate-400 dark:text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
          </div>
        </div>

        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Live Audio Session</h2>
          <p className="text-slate-500 dark:text-slate-400">Low-latency human-like conversation with Gemini 2.5 Flash.</p>
        </div>

        <button
          onClick={isActive ? stopConversation : startConversation}
          disabled={isConnecting}
          className={`px-12 py-4 rounded-2xl font-bold text-lg text-white transition-all shadow-xl ${
            isActive 
              ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20' 
              : 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20 disabled:opacity-50'
          }`}
        >
          {isConnecting ? 'Connecting...' : isActive ? 'End Conversation' : 'Start Talking'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800">
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">Transcription Log</h4>
          {transcriptions.map((t, i) => (
            <div key={i} className={`p-3 rounded-xl text-sm ${t.startsWith('You:') ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 ml-8 shadow-sm' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-200 mr-8 border border-amber-200 dark:border-amber-500/20'}`}>
              {t}
            </div>
          ))}
          {transcriptions.length === 0 && !isActive && (
            <p className="text-slate-400 dark:text-slate-600 text-sm italic text-center py-10">No active transcription history.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Live;
