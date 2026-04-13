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
  return (
    <span className="relative ml-2">
      <span className="absolute inset-0 rounded-full bg-destructive/30 animate-pulse" />
      <span className="relative inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground font-body text-[11px] font-medium tabular-nums shadow-sm">
        {count > 99 ? "99+" : count}
      </span>
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
            <TabsTrigger value="applications" className="rounded-lg gap-2 data-[state=active]:shadow-md">
              <FileText className="w-4 h-4" /> Applications
              <AlertBadge count={pendingApps} />
            </TabsTrigger>
            <TabsTrigger value="messages" className="rounded-lg gap-2 data-[state=active]:shadow-md">
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
