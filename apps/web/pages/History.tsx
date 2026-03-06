
import React from 'react';
import DataTable from '../components/DataTable';

const History = () => {
  // Marketing-focused mock data
  const historyData = [
    {
      id: '1',
      type: 'Strategy',
      prompt: 'Q3 Social Media Strategy for Eco-friendly SaaS',
      model: 'Gemini 3 Pro',
      date: '2024-05-20',
      status: <span className="text-green-500 font-medium">Finalized</span>
    },
    {
      id: '2',
      type: 'Graphics',
      prompt: 'Instagram Story background: abstract gradients, purple/orange',
      model: 'Gemini 2.5 Flash',
      date: '2024-05-19',
      status: <span className="text-green-500 font-medium">Rendered</span>
    },
    {
      id: '3',
      type: 'Video Ad',
      prompt: 'Cinematic 15s teaser for Summer Flash Sale',
      model: 'Veo-3.1',
      date: '2024-05-18',
      status: <span className="text-amber-500 font-medium">Processing</span>
    },
    {
      id: '4',
      type: 'Copywriting',
      prompt: '5 Google Search Ad headlines for "Nova Marketing Tools"',
      model: 'Gemini 3 Pro',
      date: '2024-05-18',
      status: <span className="text-green-500 font-medium">Finalized</span>
    },
    {
      id: '5',
      type: 'Graphics',
      prompt: 'Ebook cover: "The Future of AI in Digital Marketing"',
      model: 'Gemini 2.5 Flash',
      date: '2024-05-17',
      status: <span className="text-red-500 font-medium">Failed</span>
    },
  ];

  const headers = ['Type', 'Campaign Item', 'AI Model', 'Date Created', 'Status'];

  // Map data for DataTable to match headers exactly
  const mappedData = historyData.map(({ type, prompt, model, date, status }) => ({
    type,
    prompt: <span className="truncate max-w-[200px] inline-block font-medium">{prompt}</span>,
    model,
    date,
    status
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header>
        <h2 className="text-3xl font-bold mb-2">Campaign Archive</h2>
        <p className="text-slate-500 dark:text-slate-400">Review and retrieve all marketing assets generated. Re-download visuals or copy-paste strategies for your next campaign.</p>
      </header>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Recent Campaign Assets</h3>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Search assets..." 
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
            <button className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              Filter
            </button>
          </div>
        </div>

        <DataTable headers={headers} data={mappedData} />
        
        <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
          <span>Displaying 5 of 128 campaign items</span>
          <div className="flex gap-1">
            <button className="px-3 py-1 rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Prev</button>
            <button className="px-3 py-1 rounded bg-indigo-600 text-white font-medium">1</button>
            <button className="px-3 py-1 rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">2</button>
            <button className="px-3 py-1 rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default History;
