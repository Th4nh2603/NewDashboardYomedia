import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  EnvelopeIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
  ArchiveBoxIcon,
  TrashIcon,
  InboxIcon,
  StarIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

interface Email {
  id: string;
  sender: string;
  subject: string;
  preview: string;
  time: string;
  isRead: boolean;
  isStarred: boolean;
  aiSummary?: string;
  category: "Primary" | "Social" | "Promotions" | "Updates";
}

const mockEmails: Email[] = [
  {
    id: "1",
    sender: "Google Cloud",
    subject: "Your monthly billing statement is ready",
    preview:
      "Hello Creative Director, your statement for the period of Feb 1 - Feb 28 is now available...",
    time: "10:45 AM",
    isRead: false,
    isStarred: true,
    aiSummary:
      "Monthly cloud infrastructure billing report. Total usage within expected parameters.",
    category: "Updates",
  },
  {
    id: "2",
    sender: "Figma Team",
    subject: "New collaboration features in Figma",
    preview:
      "We have just launched multi-edit, a new way to edit multiple layers at once across your canvas...",
    time: "Yesterday",
    isRead: true,
    isStarred: false,
    aiSummary:
      'Product update notification regarding new "multi-edit" functionality in Figma.',
    category: "Promotions",
  },
  {
    id: "3",
    sender: "NVIDIA AI",
    subject: "Exclusive access to H200 Tensor Core GPU",
    preview:
      "As a valued partner of Nova AI, we are granting you early access to our latest hardware cluster...",
    time: "Mar 15",
    isRead: false,
    isStarred: true,
    aiSummary:
      "High-priority partnership invitation for early access to next-gen H200 GPU hardware.",
    category: "Primary",
  },
  {
    id: "4",
    sender: "GitHub",
    subject: "[Security] Action required for your repository",
    preview:
      "We found a potential security vulnerability in one of your dependencies. Please review...",
    time: "Mar 14",
    isRead: true,
    isStarred: false,
    aiSummary:
      "Security alert: Dependency vulnerability detected. Immediate review and patching recommended.",
    category: "Updates",
  },
];

const AIGmail: React.FC = () => {
  const [emails, setEmails] = useState<Email[]>(mockEmails);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [activeTab, setActiveTab] = useState<
    "Primary" | "Social" | "Promotions" | "Updates"
  >("Primary");
  const [searchQuery, setSearchQuery] = useState("");
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const toggleStar = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setEmails((prev) =>
      prev.map((email) =>
        email.id === id ? { ...email, isStarred: !email.isStarred } : email,
      ),
    );
  };

  const deleteEmail = (id: string) => {
    setEmails((prev) => prev.filter((email) => email.id !== id));
    setSelectedEmail(null);
    showNotification("Email moved to trash");
  };

  const archiveEmail = (id: string) => {
    setEmails((prev) => prev.filter((email) => email.id !== id));
    setSelectedEmail(null);
    showNotification("Email archived");
  };

  const markAsRead = (id: string) => {
    setEmails((prev) =>
      prev.map((email) =>
        email.id === id ? { ...email, isRead: true } : email,
      ),
    );
  };

  const generateAIReply = (tone: string) => {
    setIsGeneratingReply(true);
    setTimeout(() => {
      const replies: Record<string, string> = {
        Professional: `Dear ${selectedEmail?.sender},\n\nThank you for reaching out. I have reviewed the information regarding "${selectedEmail?.subject}" and would like to schedule a follow-up discussion.\n\nBest regards,\nCreative Director`,
        Casual:
          "Hey! Thanks for the update. This looks great, let's move forward with it. Catch you later!",
        Interested:
          "This sounds very promising! I'd love to learn more about the H200 cluster early access. What are the next steps?",
        Decline:
          "Thank you for the offer, but we are currently focusing our resources on other priorities. We'll keep this in mind for the future.",
      };
      setReplyText(replies[tone] || "");
      setIsGeneratingReply(false);
    }, 1000);
  };

  const sendReply = () => {
    if (!replyText) return;
    setIsGeneratingReply(true);
    setTimeout(() => {
      setIsGeneratingReply(false);
      setReplyText("");
      setSelectedEmail(null);
      showNotification("Reply sent successfully");
    }, 1500);
  };

  const filteredEmails = emails.filter(
    (email) =>
      (email.category === activeTab || searchQuery) &&
      (email.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
        email.subject.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <div className="max-w-full mx-auto h-[calc(100vh-120px)] flex flex-col">
      <header className="mb-8 relative shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-1 h-6 bg-[#4cceac] rounded-full" />
              <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
                AI Gmail Assistant
              </h1>
            </div>
            <p className="text-[#a3a3a3] font-medium tracking-widest uppercase text-[9px] ml-4">
              Neural Email Ingestion & Automated Response Pipeline
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <input
                type="text"
                placeholder="Search neural inbox..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#141b2d] border border-white/5 rounded-2xl py-3 pl-10 pr-4 text-xs font-medium text-white outline-none focus:border-[#4cceac]/50 transition-all w-64 shadow-xl"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a3a3a3] group-focus-within:text-[#4cceac] transition-colors" />
            </div>
            <button
              onClick={() => setIsComposeOpen(true)}
              className="bg-[#4cceac] text-[#141b2d] px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-lg shadow-[#4cceac]/20 hover:scale-105 transition-all"
            >
              <PencilSquareIcon className="w-4 h-4" />
              Compose
            </button>
          </div>
        </div>
        <div className="absolute -bottom-3 left-0 w-full h-px bg-gradient-to-r from-[#4cceac]/50 via-[#3d465d] to-transparent" />
      </header>

      <div className="flex-1 flex gap-8 overflow-hidden">
        <div className="w-64 shrink-0 flex flex-col gap-2">
          {[
            { name: "Primary", icon: InboxIcon, color: "text-[#4cceac]" },
            { name: "Social", icon: UserIcon, color: "text-blue-400" },
            { name: "Promotions", icon: SparklesIcon, color: "text-purple-400" },
            { name: "Updates", icon: ExclamationCircleIcon, color: "text-amber-400" },
          ].map((tab) => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name as any)}
              className={`flex items-center justify-between px-5 py-4 rounded-2xl transition-all border ${
                activeTab === tab.name
                  ? "bg-[#4cceac]/10 border-[#4cceac]/20 text-white"
                  : "bg-[#141b2d] border-white/5 text-[#a3a3a3] hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-3">
                <tab.icon
                  className={`w-5 h-5 ${
                    activeTab === tab.name ? tab.color : "text-[#3d465d]"
                  }`}
                />
                <span className="text-xs font-bold uppercase tracking-widest">
                  {tab.name}
                </span>
              </div>
              {tab.name === "Primary" && (
                <span className="bg-[#4cceac] text-[#141b2d] text-[8px] font-black px-2 py-0.5 rounded-full">
                  3
                </span>
              )}
            </button>
          ))}

          <div className="mt-auto p-6 bg-[#141b2d] rounded-3xl border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#4cceac] to-transparent opacity-30" />
            <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-3 flex items-center gap-2">
              <SparklesIcon className="w-3 h-3 text-[#4cceac]" />
              AI Insights
            </h4>
            <p className="text-[10px] text-[#a3a3a3] leading-relaxed font-medium">
              Neural engine suggests prioritizing the{" "}
              <span className="text-white">NVIDIA AI</span> partnership email for
              immediate growth.
            </p>
          </div>
        </div>

        <div className="flex-1 bg-[#141b2d] rounded-[2.5rem] border border-white/5 overflow-hidden flex flex-col shadow-2xl">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredEmails.map((email) => (
                <motion.div
                  key={email.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onClick={() => {
                    setSelectedEmail(email);
                    markAsRead(email.id);
                  }}
                  className={`group relative p-5 rounded-3xl border transition-all cursor-pointer ${
                    selectedEmail?.id === email.id
                      ? "bg-[#4cceac]/5 border-[#4cceac]/30"
                      : "bg-[#1f2a40]/20 border-white/5 hover:border-[#4cceac]/20 hover:bg-[#1f2a40]/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/10 ${
                          !email.isRead
                            ? "bg-[#4cceac]/20 text-[#4cceac]"
                            : "bg-[#141b2d] text-[#3d465d]"
                        }`}
                      >
                        <UserIcon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h4
                            className={`text-sm font-black tracking-tight truncate ${
                              !email.isRead ? "text-white" : "text-[#a3a3a3]"
                            }`}
                          >
                            {email.sender}
                          </h4>
                          {!email.isRead && (
                            <div className="w-1.5 h-1.5 rounded-full bg-[#4cceac]" />
                          )}
                        </div>
                        <h5
                          className={`text-xs font-bold mb-2 truncate ${
                            !email.isRead ? "text-[#e0e0e0]" : "text-[#71717a]"
                          }`}
                        >
                          {email.subject}
                        </h5>
                        <p className="text-[11px] text-[#71717a] font-medium truncate">
                          {email.preview}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3 shrink-0">
                      <span className="text-[10px] font-bold text-[#3d465d] uppercase tracking-widest">
                        {email.time}
                      </span>
                      <button onClick={(e) => toggleStar(e, email.id)}>
                        <StarIcon
                          className={`w-4 h-4 transition-all hover:scale-125 ${
                            email.isStarred
                              ? "text-amber-400 fill-amber-400"
                              : "text-[#3d465d]"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {email.aiSummary && (
                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-3">
                      <div className="bg-[#4cceac]/10 p-1.5 rounded-lg">
                        <SparklesIcon className="w-3 h-3 text-[#4cceac]" />
                      </div>
                      <p className="text-[10px] text-[#4cceac] font-bold italic tracking-tight opacity-80">
                        AI Summary: {email.aiSummary}
                      </p>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <AnimatePresence>
          {selectedEmail && (
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className="w-[450px] bg-[#141b2d] rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="text-[#a3a3a3] hover:text-white transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-3">
                  <ArchiveBoxIcon
                    onClick={() => archiveEmail(selectedEmail.id)}
                    className="w-5 h-5 text-[#3d465d] hover:text-white cursor-pointer transition-colors"
                  />
                  <TrashIcon
                    onClick={() => deleteEmail(selectedEmail.id)}
                    className="w-5 h-5 text-rose-400/50 hover:text-rose-400 cursor-pointer transition-colors"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#4cceac] to-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg">
                    {selectedEmail.sender[0]}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white tracking-tight">
                      {selectedEmail.sender}
                    </h3>
                    <p className="text-[10px] text-[#a3a3a3] font-bold uppercase tracking-widest">
                      To: creative-director@nova-ai.io
                    </p>
                  </div>
                </div>

                <h2 className="text-xl font-black text-white mb-6 leading-tight tracking-tight italic uppercase">
                  {selectedEmail.subject}
                </h2>

                <div className="text-sm text-[#a3a3a3] leading-relaxed font-medium space-y-4">
                  <p>Dear Creative Director,</p>
                  <p>
                    {selectedEmail.preview} This is a placeholder for the full
                    email content that would be ingested via the neural
                    pipeline.
                  </p>
                  <p>
                    Best regards,
                    <br />
                    {selectedEmail.sender} Team
                  </p>
                </div>

                <div className="mt-12 pt-8 border-t border-white/5">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-[10px] font-black text-[#4cceac] uppercase tracking-[0.2em] flex items-center gap-2">
                      <SparklesIcon className="w-4 h-4" />
                      Neural Reply Generator
                    </h4>
                  </div>

                  <div className="bg-[#1f2a40]/30 rounded-3xl p-6 border border-[#4cceac]/20 relative group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#4cceac] to-transparent opacity-50" />

                    <div className="flex flex-wrap gap-2 mb-6">
                      {["Professional", "Casual", "Interested", "Decline"].map(
                        (tone) => (
                          <button
                            key={tone}
                            onClick={() => generateAIReply(tone)}
                            className="bg-[#141b2d] border border-white/5 text-[9px] font-black text-[#a3a3a3] px-3 py-1.5 rounded-full hover:border-[#4cceac]/50 hover:text-white transition-all uppercase tracking-widest"
                          >
                            {tone}
                          </button>
                        ),
                      )}
                    </div>

                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Neural engine is ready to draft a response..."
                      className="w-full bg-transparent border-none outline-none text-xs text-white placeholder-[#3d465d] min-h-[100px] resize-none font-medium"
                    />

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#4cceac] animate-pulse" />
                        <span className="text-[9px] font-bold text-[#3d465d] uppercase tracking-widest">
                          AI Model: Gemini 3.1 Pro
                        </span>
                      </div>
                      <button
                        onClick={sendReply}
                        disabled={!replyText || isGeneratingReply}
                        className="bg-[#4cceac] text-[#141b2d] p-2.5 rounded-xl hover:scale-110 disabled:opacity-50 disabled:hover:scale-100 transition-all shadow-lg shadow-[#4cceac]/20"
                      >
                        {isGeneratingReply ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                              repeat: Infinity,
                              duration: 1,
                              ease: "linear",
                            }}
                          >
                            <ArrowPathIcon className="w-5 h-5" />
                          </motion.div>
                        ) : (
                          <PaperAirplaneIcon className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isComposeOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsComposeOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
                <h3 className="text-lg font-black text-white uppercase tracking-widest italic">
                  New Message
                </h3>
                <button
                  onClick={() => setIsComposeOpen(false)}
                  className="text-[#a3a3a3] hover:text-white"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                    <span className="text-xs font-bold text-[#3d465d] uppercase tracking-widest w-16">
                      To
                    </span>
                    <input
                      type="text"
                      className="flex-1 bg-transparent border-none outline-none text-sm text-white font-medium"
                      placeholder="recipients@example.com"
                    />
                  </div>
                  <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                    <span className="text-xs font-bold text-[#3d465d] uppercase tracking-widest w-16">
                      Subject
                    </span>
                    <input
                      type="text"
                      className="flex-1 bg-transparent border-none outline-none text-sm text-white font-medium"
                      placeholder="Project Neural Handshake"
                    />
                  </div>
                </div>
                <textarea
                  className="w-full bg-transparent border-none outline-none text-sm text-white placeholder-[#3d465d] min-h-[250px] resize-none font-medium"
                  placeholder="Draft your message here..."
                />
                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                  <div className="flex items-center gap-3">
                    <button className="p-2 text-[#a3a3a3] hover:text-white transition-colors">
                      <PaperClipIcon className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-[#a3a3a3] hover:text-white transition-colors">
                      <SparklesIcon className="w-5 h-5" />
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setIsComposeOpen(false);
                      showNotification("Message sent successfully");
                    }}
                    className="bg-[#4cceac] text-[#141b2d] px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 shadow-lg shadow-[#4cceac]/20 hover:scale-105 transition-all"
                  >
                    <PaperAirplaneIcon className="w-4 h-4" />
                    Send Message
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[110] bg-[#4cceac] text-[#141b2d] px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl flex items-center gap-3"
          >
            <CheckCircleIcon className="w-4 h-4" />
            {notification}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PaperClipIcon = (props: any) => (
  <svg
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.5l-10.5 10.5a1.5 1.5 0 1 1-2.122-2.122l9.01-9.009"
    />
  </svg>
);

const UserIcon = (props: any) => (
  <svg
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
    />
  </svg>
);

const XMarkIcon = (props: any) => (
  <svg
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18 18 6M6 6l12 12"
    />
  </svg>
);

const ArrowPathIcon = (props: any) => (
  <svg
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
);

export default AIGmail;

