
import React from 'react';
import { Link } from 'react-router-dom';

const FeatureCard = ({ title, description, link, color, icon }: any) => (
  <Link to={link} className={`group p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-${color}-500/50 transition-all cursor-pointer overflow-hidden relative shadow-sm hover:shadow-md`}>
    <div className={`absolute -right-4 -bottom-4 w-24 h-24 bg-${color}-500/10 rounded-full blur-2xl group-hover:bg-${color}-500/20 transition-all`}></div>
    <div className={`w-12 h-12 rounded-xl bg-${color}-500/10 flex items-center justify-center text-${color}-600 dark:text-${color}-400 mb-4`}>
      {icon}
    </div>
    <h3 className="text-xl font-bold mb-2 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{title}</h3>
    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{description}</p>
  </Link>
);

const Dashboard: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto pt-10">
      <header className="mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4 bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-500 bg-clip-text text-transparent">
          Welcome to Nova AI
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl">
          The ultimate creative workstation powered by the world's most advanced generative models.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <FeatureCard 
          title="Intelligent Chat"
          description="Advanced reasoning and coding with Gemini 3 Pro. Perfect for complex problem solving."
          link="/chat"
          color="indigo"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>}
        />
        <FeatureCard 
          title="Vision Studio"
          description="Generate photorealistic images with Gemini 2.5 Flash Image. Edit and refine with ease."
          link="/vision"
          color="emerald"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>}
        />
        <FeatureCard 
          title="Cinema Engine"
          description="High-definition cinematic video generation powered by Google's Veo-3.1."
          link="/cinema"
          color="rose"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>}
        />
        <FeatureCard 
          title="Live Voice"
          description="Natural, low-latency audio conversations. Talk to AI as if it's a real person."
          link="/live"
          color="amber"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>}
        />
      </div>

      <div className="mt-16 p-8 rounded-3xl bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/10 flex flex-col md:flex-row items-center gap-8 shadow-sm">
        <div className="flex-1">
          <h2 className="text-2xl font-bold mb-4 text-indigo-900 dark:text-indigo-100">Start Creating Now</h2>
          <p className="text-slate-600 dark:text-slate-400">All tools are integrated into a single seamless experience. Use the sidebar to navigate between different AI modalities.</p>
        </div>
        <img src="https://picsum.photos/seed/nova/800/400" alt="Banner" className="w-full md:w-1/3 rounded-2xl shadow-xl grayscale dark:grayscale hover:grayscale-0 transition-all duration-700" />
      </div>
    </div>
  );
};

export default Dashboard;
