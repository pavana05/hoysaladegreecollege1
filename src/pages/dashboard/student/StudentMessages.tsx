import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSignedUrls } from "@/hooks/useSignedUrls";
import { useQuery } from "@tanstack/react-query";
import {
  Send, MessageSquare, Search, ChevronLeft, CheckCheck, Check,
  Paperclip, FileText, Image as ImageIcon, Film, Archive, X, Download,
  GraduationCap, BookOpen, Trash2, Smile, Reply, CornerDownRight
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";

function formatMsgDate(d: string) {
  const date = new Date(d);
  if (isToday(date)) return format(date, "h:mm a");
  if (isYesterday(date)) return "Yesterday " + format(date, "h:mm a");
  return format(date, "MMM d, h:mm a");
}

function getFileIcon(type: string | null) {
  if (!type) return <FileText className="w-4 h-4" />;
  if (type.startsWith("image/")) return <ImageIcon className="w-4 h-4" />;
  if (type.startsWith("video/")) return <Film className="w-4 h-4" />;
  if (type.includes("pdf")) return <FileText className="w-4 h-4" />;
  if (type.includes("zip") || type.includes("rar") || type.includes("7z")) return <Archive className="w-4 h-4" />;
  return <FileText className="w-4 h-4" />;
}

function isImageType(type: string | null) {
  return type?.startsWith("image/");
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const QUICK_EMOJIS = ["👍", "❤️", "😊", "🎉", "👏", "🔥", "💯", "✅"];

type ContactTab = "teachers" | "students";

export default function StudentMessages() {
  const { user } = useAuth();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [contactTab, setContactTab] = useState<ContactTab>("teachers");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ file: File; url: string; name: string; type: string } | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch teachers
  const { data: teachers = [] } = useQuery({
    queryKey: ["student-msg-teachers"],
    queryFn: async () => {
      const { data: teacherRows } = await supabase.from("teachers").select("id, user_id, employee_id, subjects").eq("is_active", true);
      if (!teacherRows?.length) return [];
      const userIds = teacherRows.map((t) => t.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds);
      const profileMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]));
      return teacherRows.map((t) => ({
        ...t,
        name: profileMap[t.user_id]?.full_name || t.employee_id,
        email: profileMap[t.user_id]?.email || "",
        role: "teacher" as const,
      }));
    },
  });

  // Fetch students (peers)
  const { data: students = [] } = useQuery({
    queryKey: ["student-msg-students", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: peers } = await supabase.rpc("get_student_peers", { _user_id: user.id });
      if (!peers?.length) return [];
      return peers.map((s: any) => ({
        id: s.id,
        user_id: s.user_id,
        roll_number: s.roll_number,
        course_id: s.course_id,
        name: s.full_name || s.roll_number,
        email: s.email || "",
        role: "student" as const,
      }));
    },
    enabled: !!user,
  });

  // Fetch conversations
  const { data: conversations = [], refetch: refetchConversations } = useQuery({
    queryKey: ["student-conversations", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("direct_messages")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .is("parent_message_id", null)
        .order("created_at", { ascending: false });
      if (!data?.length) return [];
      const otherIds = [...new Set(data.map((m) => m.sender_id === user.id ? m.receiver_id : m.sender_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", otherIds);
      const profileMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]));
      const grouped: Record<string, any> = {};
      data.forEach((m) => {
        const otherId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
        if (!grouped[otherId]) {
          grouped[otherId] = {
            userId: otherId,
            name: profileMap[otherId]?.full_name || "Unknown",
            lastMessage: m,
            unread: 0,
          };
        }
        if (m.receiver_id === user.id && !m.is_read) grouped[otherId].unread++;
      });
      return Object.values(grouped);
    },
    enabled: !!user,
  });

  // Fetch thread messages
  const { data: threadMessages = [], refetch: refetchThread } = useQuery({
    queryKey: ["student-thread", user?.id, selectedContactId],
    queryFn: async () => {
      if (!user || !selectedContactId) return [];
      const { data } = await supabase.from("direct_messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedContactId}),and(sender_id.eq.${selectedContactId},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });
      const unreadIds = (data || []).filter((m) => m.receiver_id === user.id && !m.is_read).map((m) => m.id);
      if (unreadIds.length > 0) {
        await supabase.from("direct_messages").update({ is_read: true }).in("id", unreadIds);
      }
      return data || [];
    },
    enabled: !!user && !!selectedContactId,
  });

  // Resolve signed URLs for message attachments
  const signedUrlMap = useSignedUrls(threadMessages);

  // Realtime: subscribe to my own private dm topic
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`dm:${user.id}`, { config: { private: true } })
      .on("broadcast", { event: "new_message" }, () => {
        refetchConversations();
        if (selectedContactId) refetchThread();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, selectedContactId]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadMessages]);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  }, []);

  useEffect(() => { autoResize(); }, [message, autoResize]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 20 * 1024 * 1024) { toast.error("File size must be under 20MB"); return; }
    setUploadingFile(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("message-attachments").upload(path, file);
      if (error) throw error;
      // Store just the path, not the public URL - signed URLs will be generated on display
      setPendingFile({ file, url: path, name: file.name, type: file.type });
    } catch (err: any) {
      toast.error("Failed to upload file: " + err.message);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSend = async () => {
    if ((!message.trim() && !pendingFile) || !user || !selectedContactId) return;
    setSending(true);
    const insertData: any = {
      sender_id: user.id,
      receiver_id: selectedContactId,
      message: message.trim() || (pendingFile ? `📎 ${pendingFile.name}` : ""),
      subject: subject.trim() || "Message",
    };
    if (pendingFile) {
      insertData.file_url = pendingFile.url;
      insertData.file_name = pendingFile.name;
      insertData.file_type = pendingFile.type;
    }
    if (replyTo) {
      insertData.parent_message_id = replyTo.id;
    }
    await supabase.from("direct_messages").insert(insertData);

    // Notify receiver via their private dm broadcast channel
    try {
      const notifyChannel = supabase.channel(`dm:${selectedContactId}`, { config: { private: true } });
      await new Promise<void>((resolve) => {
        notifyChannel.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            notifyChannel.send({ type: "broadcast", event: "new_message", payload: { from: user.id } })
              .finally(() => { supabase.removeChannel(notifyChannel); resolve(); });
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            supabase.removeChannel(notifyChannel); resolve();
          }
        });
      });
    } catch { /* best-effort */ }

    // Send notification to receiver
    try {
      const { data: senderProfile } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).single();
      const displayName = senderProfile?.full_name || "Student";

      // Determine the receiver's dashboard link
      const isTeacherReceiver = teachers.find((t: any) => t.user_id === selectedContactId);
      const link = isTeacherReceiver ? "/dashboard/teacher/messages" : "/dashboard/student/messages";

      await supabase.from("notifications").insert({
        user_id: selectedContactId,
        title: "💬 New Message",
        message: `${displayName}: ${(message.trim() || pendingFile?.name || "sent a file").slice(0, 100)}`,
        type: "message",
        link,
      });

      supabase.functions.invoke("send-push-notification", {
        body: {
          user_id: selectedContactId,
          title: "💬 New Message",
          body: `${displayName}: ${(message.trim() || "sent a file").slice(0, 80)}`,
        },
      }).catch(() => {});
    } catch {}

    setMessage("");
    setPendingFile(null);
    setShowEmoji(false);
    setReplyTo(null);
    setSending(false);
    refetchThread();
    refetchConversations();
  };

  const handleDelete = async (msgId: string) => {
    setDeletingId(msgId);
    const { error } = await supabase.from("direct_messages").delete().eq("id", msgId);
    if (error) toast.error("Failed to delete");
    else { refetchThread(); refetchConversations(); }
    setDeletingId(null);
  };

  const getParentMessage = (parentId: string | null) => {
    if (!parentId) return null;
    return threadMessages.find((m: any) => m.id === parentId);
  };

  const contactList = contactTab === "teachers" ? teachers : students;
  const filteredContacts = contactList.filter((c: any) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedName = conversations.find((c: any) => c.userId === selectedContactId)?.name
    || contactList.find((c: any) => c.user_id === selectedContactId)?.name
    || "Select a contact";

  const selectedRole = teachers.find((t: any) => t.user_id === selectedContactId) ? "Teacher" : "Student";

  return (
    <div className="h-[calc(100vh-12rem)] flex rounded-2xl border border-border/30 overflow-hidden bg-card/50 backdrop-blur-sm shadow-2xl">
      {/* ─── SIDEBAR ─── */}
      <div className={`w-full sm:w-[340px] shrink-0 border-r border-border/20 flex flex-col ${selectedContactId ? "hidden sm:flex" : "flex"}`}
        style={{ background: "linear-gradient(180deg, hsl(var(--card)), hsl(var(--card) / 0.85))", backdropFilter: "blur(20px)" }}>
        
        <div className="p-4 border-b border-border/20 space-y-3 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_3s_ease-in-out_infinite]"
              style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.03), transparent)" }} />
          </div>

          <div className="flex items-center justify-between relative">
            <h2 className="font-body text-lg font-bold text-foreground flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg"
                style={{ boxShadow: "0 4px 20px hsl(var(--primary) / 0.3)" }}>
                <MessageSquare className="w-4.5 h-4.5 text-primary-foreground" />
              </div>
              Messages
            </h2>
            {threadMessages.length > 0 && selectedContactId && (
              <span className="px-2.5 py-1 rounded-2xl bg-primary/10 text-primary text-[10px] font-bold">
                {threadMessages.length} msgs
              </span>
            )}
          </div>

          <div className="flex rounded-2xl bg-muted/30 p-1 gap-1 backdrop-blur-sm border border-border/20">
            <button
              onClick={() => { setContactTab("teachers"); setSearchQuery(""); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                contactTab === "teachers"
                  ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
              style={contactTab === "teachers" ? { boxShadow: "0 4px 16px hsl(var(--primary) / 0.3)" } : {}}
            >
              <BookOpen className="w-3.5 h-3.5" /> Teachers
            </button>
            <button
              onClick={() => { setContactTab("students"); setSearchQuery(""); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                contactTab === "students"
                  ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
              style={contactTab === "students" ? { boxShadow: "0 4px 16px hsl(var(--primary) / 0.3)" } : {}}
            >
              <GraduationCap className="w-3.5 h-3.5" /> Students
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${contactTab}...`}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-muted/20 border border-border/30 font-body text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length > 0 && (
            <div className="p-2">
              <p className="px-3 py-2 font-body text-[10px] font-extrabold text-muted-foreground/60 uppercase tracking-[0.15em]">Recent Chats</p>
              {conversations.map((conv: any, i: number) => (
                <button
                  key={conv.userId}
                  onClick={() => setSelectedContactId(conv.userId)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-300 text-left group mb-0.5 ${
                    selectedContactId === conv.userId
                      ? "bg-primary/10 border border-primary/20 shadow-sm"
                      : "hover:bg-muted/30 border border-transparent"
                  }`}
                  style={{ animation: `spring-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 50}ms both` }}
                >
                  <div className="relative shrink-0">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                      selectedContactId === conv.userId
                        ? "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg"
                        : "bg-gradient-to-br from-muted to-muted/60 text-muted-foreground group-hover:from-primary/20 group-hover:to-primary/10 group-hover:text-primary"
                    }`} style={selectedContactId === conv.userId ? { boxShadow: "0 4px 16px hsl(var(--primary) / 0.25)" } : {}}>
                      {getInitials(conv.name)}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-card" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-body text-[13px] font-semibold text-foreground truncate">{conv.name}</p>
                      <span className="font-body text-[9px] text-muted-foreground/50 shrink-0 ml-2">{formatMsgDate(conv.lastMessage.created_at)}</span>
                    </div>
                    <p className="font-body text-[11px] text-muted-foreground/60 truncate mt-0.5">
                      {conv.lastMessage.file_name ? `📎 ${conv.lastMessage.file_name}` : conv.lastMessage.message}
                    </p>
                  </div>
                  {conv.unread > 0 && (
                    <span className="w-5.5 h-5.5 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0 shadow-lg animate-pulse"
                      style={{ boxShadow: "0 2px 12px hsl(var(--primary) / 0.4)" }}>
                      {conv.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="p-2">
            <p className="px-3 py-2 font-body text-[10px] font-extrabold text-muted-foreground/60 uppercase tracking-[0.15em]">
              All {contactTab === "teachers" ? "Teachers" : "Students"}
            </p>
            {filteredContacts.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
                  {contactTab === "teachers" ? <BookOpen className="w-5 h-5 text-muted-foreground/40" /> : <GraduationCap className="w-5 h-5 text-muted-foreground/40" />}
                </div>
                <p className="font-body text-sm text-muted-foreground/50">No {contactTab} found</p>
              </div>
            ) : (
              filteredContacts.map((c: any, i: number) => (
                <button
                  key={c.user_id}
                  onClick={() => setSelectedContactId(c.user_id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-300 text-left group mb-0.5 ${
                    selectedContactId === c.user_id
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted/30 border border-transparent"
                  }`}
                  style={{ animation: `spring-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 30}ms both` }}
                >
                  <div className="relative shrink-0">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-bold transition-all ${
                      selectedContactId === c.user_id
                        ? "bg-gradient-to-br from-primary/30 to-primary/10 text-primary"
                        : "bg-muted/40 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                    }`}>
                      {getInitials(c.name)}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500/70 border-2 border-card" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-body text-[13px] font-medium text-foreground truncate">{c.name}</p>
                    <p className="font-body text-[10px] text-muted-foreground/50 truncate">
                      {contactTab === "teachers" ? (c.subjects?.join(", ") || "Teacher") : (c.roll_number || "Student")}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ─── CHAT AREA ─── */}
      <div className={`flex-1 flex flex-col min-w-0 ${!selectedContactId ? "hidden sm:flex" : "flex"}`}>
        {!selectedContactId ? (
          <div className="flex-1 flex items-center justify-center relative overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-[0.04] animate-pulse"
              style={{ background: "radial-gradient(circle, hsl(var(--primary)), transparent)" }} />
            <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full opacity-[0.03] animate-pulse"
              style={{ background: "radial-gradient(circle, hsl(var(--primary)), transparent)", animationDelay: "1s" }} />
            <div className="text-center relative z-10">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mx-auto mb-5 border border-primary/10"
                style={{ boxShadow: "0 8px 32px hsl(var(--primary) / 0.1)" }}>
                <MessageSquare className="w-10 h-10 text-primary/30" />
              </div>
              <p className="font-body text-xl font-bold text-foreground">Start a Conversation</p>
              <p className="font-body text-sm text-muted-foreground/60 mt-2 max-w-xs mx-auto">Choose a teacher or student from the list to begin messaging</p>
            </div>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-border/20 flex items-center gap-3 relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, hsl(var(--card)), hsl(var(--card) / 0.9))", backdropFilter: "blur(20px)" }}>
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_4s_ease-in-out_infinite]"
                  style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.02), transparent)" }} />
              </div>
              <button onClick={() => setSelectedContactId(null)} className="sm:hidden p-2 rounded-2xl hover:bg-muted/30 transition-colors">
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-sm font-bold text-primary-foreground shadow-lg"
                  style={{ boxShadow: "0 4px 20px hsl(var(--primary) / 0.25)" }}>
                  {getInitials(selectedName)}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-card" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-body text-sm font-bold text-foreground truncate">{selectedName}</p>
                <p className="font-body text-[10px] text-emerald-500 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Online • {selectedRole}
                </p>
              </div>
              {threadMessages.length > 0 && (
                <span className="px-3 py-1.5 rounded-2xl bg-muted/30 text-muted-foreground text-[10px] font-bold border border-border/20">
                  {threadMessages.length} messages
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{
              background: "linear-gradient(180deg, hsl(var(--background)), hsl(var(--muted) / 0.08))"
            }}>
              {threadMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto mb-3">
                      <Send className="w-7 h-7 text-muted-foreground/20" />
                    </div>
                    <p className="font-body text-sm text-muted-foreground/50">No messages yet. Start the conversation!</p>
                  </div>
                </div>
              ) : (
                threadMessages.map((msg: any, i: number) => {
                  const isMe = msg.sender_id === user?.id;
                  const parentMsg = getParentMessage(msg.parent_message_id);
                  return (
                    <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} group`}
                      style={{ animation: `scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) ${Math.min(i * 20, 150)}ms both` }}>
                      <div className={`relative max-w-[75%] px-4 py-3 rounded-2xl transition-all duration-200 ${
                        isMe
                          ? "bg-gradient-to-br from-primary to-primary/85 text-primary-foreground rounded-br-md"
                          : "bg-card border border-border/30 text-foreground rounded-bl-md backdrop-blur-sm"
                      }`} style={isMe ? { boxShadow: "0 4px 20px hsl(var(--primary) / 0.2)" } : { boxShadow: "0 2px 8px hsl(var(--foreground) / 0.03)" }}>
                        
                        {/* Quoted reply */}
                        {parentMsg && (
                          <div className={`mb-2 px-3 py-2 rounded-xl border-l-[3px] ${
                            isMe ? "bg-primary-foreground/10 border-primary-foreground/40" : "bg-muted/30 border-primary/40"
                          }`} style={{ animation: "slide-in-left 0.2s ease-out" }}>
                            <div className="flex items-center gap-1 mb-0.5">
                              <CornerDownRight className="w-3 h-3 opacity-50" />
                              <span className={`text-[9px] font-bold ${isMe ? "text-primary-foreground/50" : "text-primary/60"}`}>
                                {parentMsg.sender_id === user?.id ? "You" : selectedName}
                              </span>
                            </div>
                            <p className={`text-[11px] line-clamp-2 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground/70"}`}>
                              {parentMsg.message}
                            </p>
                          </div>
                        )}

                        {msg.subject && msg.subject !== "Message" && (
                          <p className={`text-[10px] font-bold mb-1.5 ${isMe ? "text-primary-foreground/60" : "text-primary/70"}`}>{msg.subject}</p>
                        )}

                        {msg.file_url && (() => {
                          const resolvedUrl = signedUrlMap[msg.id] || msg.file_url;
                          return (
                          <div className="mb-2">
                            {isImageType(msg.file_type) ? (
                              <a href={resolvedUrl} target="_blank" rel="noopener noreferrer">
                                <img src={resolvedUrl} alt={msg.file_name || "Image"} className="max-w-full max-h-48 rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity shadow-sm" />
                              </a>
                            ) : (
                              <a href={resolvedUrl} target="_blank" rel="noopener noreferrer"
                                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-colors ${isMe ? "bg-primary-foreground/10 hover:bg-primary-foreground/20" : "bg-muted/30 hover:bg-muted/50"}`}>
                                {getFileIcon(msg.file_type)}
                                <span className="text-xs font-medium truncate flex-1">{msg.file_name || "File"}</span>
                                <Download className="w-3.5 h-3.5 shrink-0 opacity-60" />
                              </a>
                            )}
                          </div>
                          );
                        })()}

                        {msg.message && !(msg.file_url && msg.message.startsWith("📎")) && (
                          <p className="font-body text-[13px] whitespace-pre-line leading-relaxed">{msg.message}</p>
                        )}
                        <div className={`flex items-center gap-1.5 mt-1.5 ${isMe ? "justify-end" : ""}`}>
                          <span className={`font-body text-[9px] ${isMe ? "text-primary-foreground/40" : "text-muted-foreground/40"}`}>
                            {formatMsgDate(msg.created_at)}
                          </span>
                          {isMe && (msg.is_read
                            ? <CheckCheck className="w-3 h-3 text-primary-foreground/50" />
                            : <Check className="w-3 h-3 text-primary-foreground/30" />
                          )}
                        </div>

                        {/* Action buttons on hover */}
                        <div className={`absolute -top-2 ${isMe ? "-left-2" : "-right-2"} flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200`}>
                          <button
                            onClick={() => { setReplyTo(msg); textareaRef.current?.focus(); }}
                            className="w-6 h-6 rounded-full bg-muted border border-border/30 text-muted-foreground flex items-center justify-center hover:scale-110 hover:bg-primary/10 hover:text-primary transition-all shadow-lg"
                            title="Reply"
                          >
                            <Reply className="w-3 h-3" />
                          </button>
                          {isMe && (
                            <button
                              onClick={() => handleDelete(msg.id)}
                              disabled={deletingId === msg.id}
                              className="w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:scale-110 transition-all shadow-lg"
                              title="Delete message"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply preview bar */}
            {replyTo && (
              <div className="px-4 py-2 border-t border-border/20 bg-card/90 backdrop-blur-sm flex items-center gap-3"
                style={{ animation: "slide-up 0.2s ease-out" }}>
                <div className="w-1 h-10 rounded-full bg-gradient-to-b from-primary to-primary/50" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-primary flex items-center gap-1">
                    <Reply className="w-3 h-3" /> Replying to {replyTo.sender_id === user?.id ? "yourself" : selectedName}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{replyTo.message}</p>
                </div>
                <button onClick={() => setReplyTo(null)} className="p-1.5 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {pendingFile && (
              <div className="px-4 pt-2 border-t border-border/20 bg-card/80 backdrop-blur-sm flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-primary/5 border border-primary/10 flex-1 min-w-0">
                  {getFileIcon(pendingFile.type)}
                  <span className="text-xs font-medium text-foreground truncate">{pendingFile.name}</span>
                </div>
                <button onClick={() => setPendingFile(null)} className="p-1.5 rounded-xl hover:bg-destructive/10 text-destructive transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {showEmoji && (
              <div className="px-4 py-2 border-t border-border/20 bg-card/80 backdrop-blur-sm"
                style={{ animation: "slide-up 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button key={emoji} onClick={() => { setMessage((prev) => prev + emoji); setShowEmoji(false); }}
                      className="w-9 h-9 rounded-2xl hover:bg-muted/40 flex items-center justify-center text-lg transition-all hover:scale-125 active:scale-95">
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3 border-t border-border/20 bg-card/80 backdrop-blur-sm">
              {threadMessages.length === 0 && (
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject (optional)"
                  className="w-full mb-2 px-4 py-2 rounded-2xl bg-muted/20 border border-border/30 font-body text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              )}
              <div className="flex items-end gap-2">
                <input ref={fileInputRef} type="file" className="hidden"
                  accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z,.txt"
                  onChange={handleFileSelect} />
                <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFile || sending}
                  className="w-10 h-10 rounded-2xl bg-muted/20 border border-border/30 flex items-center justify-center shrink-0 hover:bg-muted/40 disabled:opacity-30 transition-all hover:border-primary/30 active:scale-95" title="Attach file">
                  <Paperclip className={`w-4 h-4 text-muted-foreground ${uploadingFile ? "animate-spin" : ""}`} />
                </button>
                <button onClick={() => setShowEmoji(!showEmoji)}
                  className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 transition-all active:scale-95 ${showEmoji ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted/20 border-border/30 text-muted-foreground hover:bg-muted/40 hover:border-primary/30"}`} title="Emoji">
                  <Smile className="w-4 h-4" />
                </button>
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder={replyTo ? "Type your reply..." : "Type a message..."}
                    disabled={sending}
                    rows={1}
                    className="w-full px-4 py-2.5 rounded-2xl bg-muted/20 border border-border/30 font-body text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 disabled:opacity-50 transition-all resize-none overflow-hidden"
                    style={{ minHeight: "42px", maxHeight: "120px" }}
                  />
                  {message.length > 200 && (
                    <span className={`absolute bottom-1 right-3 text-[9px] font-medium ${message.length > 500 ? "text-destructive" : "text-muted-foreground/40"}`}>
                      {message.length}
                    </span>
                  )}
                </div>
                <button onClick={handleSend} disabled={(!message.trim() && !pendingFile) || sending}
                  className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center shrink-0 disabled:opacity-30 hover:scale-105 active:scale-90 transition-all duration-200 shadow-lg"
                  style={{ boxShadow: (message.trim() || pendingFile) ? "0 4px 20px hsl(var(--primary) / 0.35)" : "none" }}>
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes spring-in {
          0% { opacity: 0; transform: translateY(8px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes scale-in {
          0% { opacity: 0; transform: scale(0.92); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes slide-up {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-in-left {
          0% { opacity: 0; transform: translateX(-6px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
