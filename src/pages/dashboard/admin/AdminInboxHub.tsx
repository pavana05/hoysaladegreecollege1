import { lazy, Suspense, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Mail } from "lucide-react";
import SEOHead from "@/components/SEOHead";

const AdminApplications = lazy(() => import("./AdminApplications"));
const AdminContacts = lazy(() => import("./AdminContacts"));

const Loader = () => <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

export default function AdminInboxHub() {
  const [tab, setTab] = useState("applications");
  return (
    <>
      <SEOHead title="Inbox | Admin" description="Applications and messages" noIndex />
      <div className="space-y-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="rounded-xl bg-muted/50 p-1">
            <TabsTrigger value="applications" className="rounded-lg gap-2 data-[state=active]:shadow-md">
              <FileText className="w-4 h-4" /> Applications
            </TabsTrigger>
            <TabsTrigger value="messages" className="rounded-lg gap-2 data-[state=active]:shadow-md">
              <Mail className="w-4 h-4" /> Messages
            </TabsTrigger>
          </TabsList>
          <TabsContent value="applications"><Suspense fallback={<Loader />}><AdminApplications /></Suspense></TabsContent>
          <TabsContent value="messages"><Suspense fallback={<Loader />}><AdminContacts /></Suspense></TabsContent>
        </Tabs>
      </div>
    </>
  );
}
