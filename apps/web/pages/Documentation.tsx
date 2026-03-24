import React from "react";
import { motion } from "motion/react";
import {
  LightBulbIcon,
  CpuChipIcon,
  CommandLineIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
  CloudArrowUpIcon,
} from "@heroicons/react/24/outline";
import DocumentPage from "./Document";

const Documentation: React.FC = () => {
  const sections = [
    {
      title: "Core Intelligence",
      icon: CpuChipIcon,
      color: "text-[#4cceac]",
      bg: "bg-[#4cceac]/10",
      content: [
        {
          subtitle: "AI Chat (Conversational Brainstorming)",
          text: "Giao dien hoi thoai thong minh su dung Gemini 3.1 Pro de ho tro len y tuong sang tao va giai quyet van de phuc tap.",
          steps: [
            "Truy cap 'AI Chat' tu thanh dieu huong ben trai.",
            "Nhap yeu cau hoac cau hoi vao truong nhap lieu 'Neural Input'.",
            "Nhan 'Enter' hoac bieu tuong gui de bat dau phien lam viec.",
            "Su dung cac phan hoi tu AI de tinh chinh y tuong du an cua ban.",
          ],
        },
        {
          subtitle: "AI Gmail (Smart Email Management)",
          text: "He thong quan ly email tich hop AI giup tom tat, soan thao va phan loai thu dien tu mot cach tu dong.",
          steps: [
            "Mo 'AI Gmail' de xem danh sach thu duoc phan loai boi AI.",
            "Chon mot email de xem noi dung tom tat thong minh.",
            "Su dung tinh nang 'AI Reply' de soan thao phan hoi nhanh chong.",
            "Luu tru hoac danh dau cac email quan trong vao Neural Drive.",
          ],
        },
        {
          subtitle: "Vision AI (Visual Analysis)",
          text: "Phan tich hinh anh chuyen sau de trich xuat metadata, mo ta noi dung va nhan dien doi tuong.",
          steps: [
            "Tai hinh anh len vung 'Visual Ingestion'.",
            "Cho he thong xu ly va phan tich cac thanh phan trong anh.",
            "Xem cac the (tags) va mo ta chi tiet do AI tao ra.",
            "Xuat du lieu phan tich sang cac du an sang tao khac.",
          ],
        },
      ],
    },
    {
      title: "Creative Synthesis",
      icon: SparklesIcon,
      color: "text-indigo-400",
      bg: "bg-indigo-400/10",
      content: [
        {
          subtitle: "Image Gen (High-Fidelity Synthesis)",
          text: "Tao ra cac hinh anh chat luong cao tu mo ta van ban bang mo hinh Imagen 4.0.",
          steps: [
            "Nhap mo ta chi tiet ve hinh anh ban muon tao.",
            "Chon ty le khung hinh (Aspect Ratio) va do phan giai.",
            "Nhan 'Generate' de bat dau qua trinh tong hop neural.",
            "Tai xuong hoac luu truc tiep vao Neural Drive.",
          ],
        },
        {
          subtitle: "Cinema AI (Video Generation)",
          text: "San xuat cac doan phim ngan va hieu ung dien anh tu van ban hoac hinh anh goc.",
          steps: [
            "Cung cap kich ban hoac hinh anh lam diem bat dau.",
            "Thiet lap cac thong so chuyen dong va phong cach dien anh.",
            "Khoi dong tien trinh 'Cinema Synthesis'.",
            "Xem truoc va tinh chinh ket qua truoc khi xuat ban.",
          ],
        },
        {
          subtitle: "Live Stream (Real-time Processing)",
          text: "Xu ly va toi uu hoa luong video truc tiep voi cac hieu ung AI thoi gian thuc.",
          steps: [
            "Ket noi nguon video (Camera hoac luong RTMP).",
            "Kich hoat cac bo loc AI va lop phu thong minh.",
            "Giam sat do tre va hieu suat he thong qua Dashboard.",
            "Bat dau phat song truc tiep toi cac nen tang dich.",
          ],
        },
      ],
    },
    {
      title: "Asset & Data Management",
      icon: CloudArrowUpIcon,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
      content: [
        {
          subtitle: "Neural Drive (Cloud Storage)",
          text: "He thong luu tru dam may toi uu cho tai san sang tao voi kha nang keo tha va quan ly thong minh.",
          steps: [
            "Keo va tha tep tin vao vung 'Neural Drive' de tai len.",
            "Tao cac 'Neural Clusters' (thu muc) de to chuc du lieu.",
            "Su dung tinh nang tim kiem thong minh de dinh vi tai san.",
            "Chia se tai san voi cac thanh vien trong Team Hub.",
          ],
        },
        {
          subtitle: "Account Nexus (Profile & Security)",
          text: "Quan ly danh tinh nguoi dung, thiet lap bao mat va theo doi hoat dong tai khoan.",
          steps: [
            "Cap nhat thong tin ca nhan va vai tro chuyen mon.",
            "Thiet lap xac thuc hai yeu to (2FA) de bao ve tai khoan.",
            "Xem nhat ky hoat dong (System Feed) de phat hien truy cap la.",
            "Quan ly cac thiet bi dang ket noi voi he thong.",
          ],
        },
      ],
    },
    {
      title: "Project Pipeline",
      icon: CommandLineIcon,
      color: "text-rose-400",
      bg: "bg-rose-400/10",
      content: [
        {
          subtitle: "Build Demo (Pipeline Creation)",
          text: "Quy trinh xay dung cac ban demo tuy chinh cho khach hang hoac du an noi bo.",
          steps: [
            "Chon cac tai san tu Neural Drive de dua vao pipeline.",
            "Thiet lap logic tuong tac va luong trai nghiem nguoi dung.",
            "Chay thu nghiem (Simulation) de kiem tra loi.",
            "Trien khai ban demo len Creative Showcase.",
          ],
        },
        {
          subtitle: "Dashboard (System Monitoring)",
          text: "Trung tam dieu khien giam sat hieu suat GPU, RAM va luu luong mang.",
          steps: [
            "Kiem tra bieu do 'Neural Load' de biet trang thai he thong.",
            "Theo doi cac thong bao loi hoac canh bao tu 'System Feed'.",
            "Xem tom tat cac hoat dong gan day cua toan bo Creative Suite.",
            "Dieu chinh phan bo tai nguyen cho cac tac vu uu tien.",
          ],
        },
      ],
    },
  ];

  return (
    <div className="max-w-full mx-auto">
      <header className="mb-12 relative">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-1 h-8 bg-[#4cceac] rounded-full" />
          <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic">
            User Guide
          </h1>
        </div>
        <p className="text-[#a3a3a3] font-medium tracking-widest uppercase text-[10px] ml-5">
          Nova AI Creative Suite • Technical Documentation
        </p>
        <div className="absolute -bottom-4 left-0 w-full h-px bg-gradient-to-r from-[#4cceac]/50 via-[#3d465d] to-transparent" />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-16">
          {sections.map((section, idx) => (
            <motion.section
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="relative"
            >
              <div className="flex items-center gap-4 mb-8">
                <div
                  className={`w-14 h-14 ${section.bg} rounded-2xl flex items-center justify-center border border-white/5`}
                >
                  <section.icon className={`w-7 h-7 ${section.color}`} />
                </div>
                <h2 className="text-3xl font-black text-white tracking-tight uppercase italic">
                  {section.title}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 ml-4 border-l border-white/5 pl-10">
                {section.content.map((item, cIdx) => (
                  <div key={cIdx} className="space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-sm font-black text-[#4cceac] uppercase tracking-widest">
                        {item.subtitle}
                      </h3>
                      <p className="text-[#a3a3a3] text-sm leading-relaxed font-medium">
                        {item.text}
                      </p>
                    </div>

                    {item.steps && (
                      <div className="bg-white/5 rounded-2xl p-6 border border-white/5 space-y-3">
                        <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-2">
                          Huong dan thuc hien:
                        </h4>
                        <ul className="space-y-3">
                          {item.steps.map((step, sIdx) => (
                            <li
                              key={sIdx}
                              className="flex gap-3 text-xs font-medium text-[#a3a3a3] leading-relaxed"
                            >
                              <span className="text-[#4cceac] font-black">
                                {sIdx + 1}.
                              </span>
                              {step}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.section>
          ))}

          <section className="pt-8 border-t border-white/10">
            <DocumentPage />
          </section>
        </div>

        <div className="lg:col-span-4">
          <div className="sticky top-32 space-y-8">
            <div className="bg-[#141b2d] rounded-[2.5rem] border border-white/5 p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#4cceac]/20 to-transparent" />

              <div className="flex items-center gap-3 mb-6">
                <LightBulbIcon className="w-5 h-5 text-[#4cceac]" />
                <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">
                  Quick Tips
                </h3>
              </div>

              <ul className="space-y-6">
                {[
                  "Use 'Priority Turbo' mode for time-sensitive asset generation.",
                  "Monitor VRAM allocation when processing multiple 4K demos.",
                  "Revoke unused asset previews to optimize browser memory.",
                  "Check the Live System Feed for neural handshake confirmations.",
                ].map((tip, i) => (
                  <li
                    key={i}
                    className="flex gap-4 text-xs font-medium text-[#a3a3a3] leading-relaxed"
                  >
                    <span className="text-[#4cceac] font-black">0{i + 1}</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-indigo-500/5 rounded-[2.5rem] border border-indigo-500/10 p-8">
              <div className="flex items-center gap-3 mb-6">
                <QuestionMarkCircleIcon className="w-5 h-5 text-indigo-400" />
                <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">
                  Need Support?
                </h3>
              </div>
              <p className="text-xs text-[#a3a3a3] font-medium leading-relaxed mb-6">
                Our technical team is available 24/7 for Creative Directors.
                Reach out via the secure terminal.
              </p>
              <button className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20">
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documentation;
