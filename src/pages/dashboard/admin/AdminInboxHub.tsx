import { lazy, Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Mail } from "lucide-react";
import SEOHead from "@/components/SEOHead";

const AdminApplications = lazy(() => import("./AdminApplications"));
const AdminContacts = lazy(() => import("./AdminContacts"));

const Loader = () => <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

function AlertBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = count > 99 ? "99+" : String(count);
  return (
    <span className="absolute -top-2 -right-3 flex items-center justify-center">
      {/* Smooth breathing glow */}
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle, hsl(var(--destructive) / 0.5), transparent 70%)",
          animation: "badge-breathe 2.4s cubic-bezier(0.4,0,0.6,1) infinite",
          transform: "scale(2.2)",
        }}
      />
      {/* Badge pill */}
      <span
        className="relative inline-flex items-center justify-center rounded-full text-destructive-foreground font-body tabular-nums shadow-lg"
        style={{
          minWidth: 20,
          height: 20,
          padding: "0 5px",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.02em",
          background: "linear-gradient(135deg, hsl(var(--destructive)), hsl(var(--destructive) / 0.85))",
          boxShadow: "0 2px 8px hsl(var(--destructive) / 0.4), 0 0 0 2px hsl(var(--card))",
          animation: "badge-pop 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
        }}
      >
        {label}
      </span>
      <style>{`
        @keyframes badge-breathe {
          0%, 100% { opacity: 0.4; transform: scale(1.8); }
          50% { opacity: 0.7; transform: scale(2.4); }
        }
        @keyframes badge-pop {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </span>
  );
}

export default function AdminInboxHub() {
  const [tab, setTab] = useState("applications");

  const { data: pendingApps = 0 } = useQuery({
    queryKey: ["inbox-pending-apps"],
    queryFn: async () => {
      const { count } = await supabase
        .from("admission_applications")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      return count || 0;
    },
    refetchInterval: 30000,
  });

  const { data: newMessages = 0 } = useQuery({
    queryKey: ["inbox-new-messages"],
    queryFn: async () => {
      const { count } = await supabase
        .from("contact_submissions")
        .select("*", { count: "exact", head: true })
        .eq("status", "new");
      return count || 0;
    },
    refetchInterval: 30000,
  });

  return (
    <>
      <SEOHead title="Inbox | Admin" description="Applications and messages" noIndex />
      <div className="space-y-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="rounded-xl bg-muted/50 p-1">
            <TabsTrigger value="applications" className="relative rounded-lg gap-2 data-[state=active]:shadow-md pr-5">
              <FileText className="w-4 h-4" /> Applications
              <AlertBadge count={pendingApps} />
            </TabsTrigger>
            <TabsTrigger value="messages" className="relative rounded-lg gap-2 data-[state=active]:shadow-md pr-5">
              <Mail className="w-4 h-4" /> Messages
              <AlertBadge count={newMessages} />
            </TabsTrigger>
          </TabsList>
          <TabsContent value="applications"><Suspense fallback={<Loader />}><AdminApplications /></Suspense></TabsContent>
          <TabsContent value="messages"><Suspense fallback={<Loader />}><AdminContacts /></Suspense></TabsContent>
        </Tabs>
      </div>
    </>
  );
}
