import React from "react";
import {
  EnvelopeIcon,
  BoltIcon,
  PaperAirplaneIcon,
  ServerIcon,
} from "@heroicons/react/24/outline";
import Button from "../../../components/Button";
import { useAuth } from "../../../contexts/AuthContext";
import { fetchJsonOrThrow } from "../../../lib/apiError";
import { serverApiOrigin } from "../../../lib/serverApiOrigin";

function connPayload(
  useServerEnv: boolean,
  host: string,
  port: string,
  secure: boolean,
  username: string,
  password: string,
): Record<string, unknown> {
  if (useServerEnv) return {};
  const p = port.trim() ? parseInt(port.trim(), 10) : undefined;
  const body: Record<string, unknown> = {
    host: host.trim(),
    secure,
  };
  if (p !== undefined && Number.isFinite(p)) body.port = p;
  if (username.trim()) {
    body.username = username.trim();
    body.password = password;
  }
  return body;
}

const SmtpMail: React.FC = () => {
  const { user } = useAuth();
  const role = (user?.role || "").toLowerCase();
  const isAdmin = role === "admin";
  const baseUrl = serverApiOrigin();

  const roleHeaders = React.useMemo(
    () =>
      ({
        "Content-Type": "application/json",
        "x-user-role": role || "guest",
      }) as Record<string, string>,
    [role],
  );

  const [useServerEnv, setUseServerEnv] = React.useState(true);
  const [host, setHost] = React.useState("");
  const [port, setPort] = React.useState("587");
  const [secure, setSecure] = React.useState(false);
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");

  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [cc, setCc] = React.useState("");
  const [bcc, setBcc] = React.useState("");
  const [replyTo, setReplyTo] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [text, setText] = React.useState("");

  const [verifyMsg, setVerifyMsg] = React.useState<string | null>(null);
  const [verifyErr, setVerifyErr] = React.useState<string | null>(null);
  const [verifying, setVerifying] = React.useState(false);

  const [sendMsg, setSendMsg] = React.useState<string | null>(null);
  const [sendErr, setSendErr] = React.useState<string | null>(null);
  const [sending, setSending] = React.useState(false);

  const runVerify = async () => {
    setVerifyErr(null);
    setVerifyMsg(null);
    setVerifying(true);
    try {
      if (useServerEnv) {
        const data = await fetchJsonOrThrow<{ ok?: boolean; host?: string }>(
          `${baseUrl}/api/smtp/verify`,
          {
            method: "GET",
            headers: { "x-user-role": role || "guest" },
          },
        );
        setVerifyMsg(
          data.ok
            ? `Kết nối OK (SMTP_HOST=${data.host ?? "—"}).`
            : "Phản hồi không mong đợi.",
        );
      } else {
        const body = connPayload(
          false,
          host,
          port,
          secure,
          username,
          password,
        );
        const data = await fetchJsonOrThrow<{ ok?: boolean; host?: string }>(
          `${baseUrl}/api/smtp/verify`,
          {
            method: "POST",
            headers: roleHeaders,
            body: JSON.stringify(body),
          },
        );
        setVerifyMsg(
          data.ok
            ? `Kết nối OK (${data.host ?? body.host}).`
            : "Phản hồi không mong đợi.",
        );
      }
    } catch (e) {
      setVerifyErr(e instanceof Error ? e.message : "Verify thất bại.");
    } finally {
      setVerifying(false);
    }
  };

  const runSend = async () => {
    if (!isAdmin) return;
    setSendErr(null);
    setSendMsg(null);
    setSending(true);
    try {
      const extras = connPayload(
        useServerEnv,
        host,
        port,
        secure,
        username,
        password,
      );
      const ccList = cc
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const bccList = bcc
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      const body: Record<string, unknown> = {
        ...extras,
        to,
        subject,
        text,
        ...(from.trim() ? { from: from.trim() } : {}),
        ...(replyTo.trim() ? { replyTo: replyTo.trim() } : {}),
        ...(ccList.length ? { cc: ccList } : {}),
        ...(bccList.length ? { bcc: bccList } : {}),
      };

      const data = await fetchJsonOrThrow<{
        ok?: boolean;
        messageId?: string;
        error?: string;
      }>(`${baseUrl}/api/smtp/send`, {
        method: "POST",
        headers: roleHeaders,
        body: JSON.stringify(body),
      });
      if (!data.ok) {
        throw new Error(data.error || "Gửi thất bại.");
      }
      setSendMsg(
        data.messageId
          ? `Đã gửi. Message-ID: ${data.messageId}`
          : "Đã gửi thành công.",
      );
    } catch (e) {
      setSendErr(e instanceof Error ? e.message : "Gửi thất bại.");
    } finally {
      setSending(false);
    }
  };

  const inputLabel =
    "block text-[10px] font-black uppercase tracking-widest text-[#a3a3a3] mb-2";
  const inputClass =
    "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#4cceac]/40";

  return (
    <div className="w-full px-8 pt-10 space-y-6 pb-16 max-w-4xl">
      <header className="relative mb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <EnvelopeIcon className="w-6 h-6 text-[#4cceac]" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">
                SMTP
              </h1>
              <p className="text-[#a3a3a3] text-xs font-medium mt-1 max-w-xl">
                Kiểm tra kết nối{" "}
                <code className="text-white/70 text-[10px]">
                  POST/GET /api/smtp/verify
                </code>
                ; gửi mail{" "}
                <code className="text-white/70 text-[10px]">
                  POST /api/smtp/send
                </code>
                hoặc{" "}
                <code className="text-white/70 text-[10px]">
                  POST /api/send-email
                </code>{" "}
                (body{" "}
                <code className="text-white/70 text-[10px]">{`{to,subject,text}`}</code>;{" "}
                env Gmail:{" "}
                <code className="text-white/70 text-[10px]">EMAIL_USER</code>,{" "}
                <code className="text-white/70 text-[10px]">EMAIL_PASS</code>
                ). Chỉ admin.
              </p>
            </div>
          </div>
        </div>
        <div className="absolute -bottom-4 left-0 w-full h-px bg-gradient-to-r from-[#4cceac]/50 via-[#3d465d] to-transparent" />
      </header>

      <section className="rounded-[2rem] border border-white/5 bg-[#141b2d] shadow-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <BoltIcon className="w-5 h-5 text-[#4cceac]" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-tight italic">
              Kiểm tra SMTP
            </h2>
            <p className="text-[11px] text-[#a3a3a3] mt-0.5">
              Bật “chỉ server” để dùng biến môi trường SMTP_* trên máy chủ.
            </p>
          </div>
        </div>
        <div className="px-5 py-4 space-y-4">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={useServerEnv}
              onChange={(e) => setUseServerEnv(e.target.checked)}
              className="rounded border-white/20 bg-white/5 text-[#4cceac] focus:ring-[#4cceac]/40"
            />
            <span className="text-xs text-white/90 flex items-center gap-2">
              <ServerIcon className="w-4 h-4 text-[#a3a3a3]" />
              Chỉ dùng cấu hình SMTP trên server (.env)
            </span>
          </label>

          {!useServerEnv && (
            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              <label className="block sm:col-span-2">
                <span className={inputLabel}>Host</span>
                <input
                  className={inputClass}
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="smtp.example.com"
                  autoComplete="off"
                />
              </label>
              <label className="block">
                <span className={inputLabel}>Port</span>
                <input
                  className={inputClass}
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="587"
                />
              </label>
              <label className="flex items-end gap-2 pb-1">
                <input
                  type="checkbox"
                  checked={secure}
                  onChange={(e) => setSecure(e.target.checked)}
                  className="rounded border-white/20 bg-white/5 text-[#4cceac]"
                />
                <span className="text-xs text-white/80">TLS trực tiếp (SSL)</span>
              </label>
              <label className="block">
                <span className={inputLabel}>Username</span>
                <input
                  className={inputClass}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </label>
              <label className="block">
                <span className={inputLabel}>Password</span>
                <input
                  type="password"
                  className={inputClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </label>
            </div>
          )}

          {verifyErr && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
              {verifyErr}
            </div>
          )}
          {verifyMsg && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
              {verifyMsg}
            </div>
          )}

          <Button
            type="button"
            onClick={() => void runVerify()}
            disabled={verifying || (!useServerEnv && !host.trim())}
            className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[#4cceac]/90 text-[#141b2d] hover:bg-[#4cceac] disabled:opacity-40"
          >
            {verifying ? "Đang kiểm tra…" : "Kiểm tra kết nối"}
          </Button>
        </div>
      </section>

      <section
        className={`rounded-[2rem] border border-white/5 bg-[#141b2d] shadow-2xl overflow-hidden ${!isAdmin ? "opacity-75" : ""}`}
      >
        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <PaperAirplaneIcon className="w-5 h-5 text-[#4cceac]" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-tight italic">
              Gửi email
            </h2>
            <p className="text-[11px] text-[#a3a3a3] mt-0.5">
              From có thể bỏ trống nếu đã có{" "}
              <code className="text-white/70">SMTP_FROM</code> trên server.
            </p>
          </div>
        </div>
        <div className="px-5 py-4 space-y-4">
          {!isAdmin && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              Chỉ tài khoản <strong className="text-white">admin</strong> mới
              gọi được <code className="text-white/80">/api/smtp/send</code>.
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block sm:col-span-2">
              <span className={inputLabel}>To</span>
              <input
                className={inputClass}
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="you@company.com"
                disabled={!isAdmin}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className={inputLabel}>From (tuỳ chọn)</span>
              <input
                className={inputClass}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder="noreply@company.com"
                disabled={!isAdmin}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className={inputLabel}>Reply-To (tuỳ chọn)</span>
              <input
                className={inputClass}
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
                disabled={!isAdmin}
              />
            </label>
            <label className="block">
              <span className={inputLabel}>CC (phân cách bằng dấu phẩy)</span>
              <input
                className={inputClass}
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                disabled={!isAdmin}
              />
            </label>
            <label className="block">
              <span className={inputLabel}>BCC</span>
              <input
                className={inputClass}
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                disabled={!isAdmin}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className={inputLabel}>Subject</span>
              <input
                className={inputClass}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={!isAdmin}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className={inputLabel}>Nội dung (plain text)</span>
              <textarea
                className={`${inputClass} min-h-[140px] resize-y font-mono text-xs`}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="…"
                disabled={!isAdmin}
              />
            </label>
          </div>

          {sendErr && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
              {sendErr}
            </div>
          )}
          {sendMsg && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
              {sendMsg}
            </div>
          )}

          <Button
            type="button"
            onClick={() => void runSend()}
            disabled={
              !isAdmin ||
              sending ||
              !to.trim() ||
              !subject.trim() ||
              !text.trim()
            }
            className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/10 border border-white/15 text-white hover:bg-white/[0.14] disabled:opacity-40"
          >
            {sending ? "Đang gửi…" : "Gửi email"}
          </Button>
        </div>
      </section>
    </div>
  );
};

export default SmtpMail;
