import { lazy, Suspense, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Activity } from "lucide-react";
import SEOHead from "@/components/SEOHead";

const AdminFeedback = lazy(() => import("./AdminFeedback"));
const AdminActivityLog = lazy(() => import("./AdminActivityLog"));

const Loader = () => <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

export default function AdminFeedbackAndLogs() {
  const [tab, setTab] = useState("feedback");
  return (
    <>
      <SEOHead title="Feedback & Logs | Admin" description="Manage feedback and activity logs" noIndex />
      <div className="space-y-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="rounded-xl bg-muted/50 p-1">
            <TabsTrigger value="feedback" className="rounded-lg gap-2 data-[state=active]:shadow-md">
              <MessageSquare className="w-4 h-4" /> Feedback
            </TabsTrigger>
            <TabsTrigger value="activity" className="rounded-lg gap-2 data-[state=active]:shadow-md">
              <Activity className="w-4 h-4" /> Activity Log
            </TabsTrigger>
          </TabsList>
          <TabsContent value="feedback"><Suspense fallback={<Loader />}><AdminFeedback /></Suspense></TabsContent>
          <TabsContent value="activity"><Suspense fallback={<Loader />}><AdminActivityLog /></Suspense></TabsContent>
        </Tabs>
      </div>
    </>
  );
}
