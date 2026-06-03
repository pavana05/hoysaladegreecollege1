import { lazy, Suspense, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, ScrollText } from "lucide-react";
import SEOHead from "@/components/SEOHead";

const AdminJobBoard = lazy(() => import("./AdminJobBoard"));
const AdminScholarships = lazy(() => import("./AdminScholarships"));

import Loader from "@/components/HubLoader";

export default function AdminCareerHub() {
  const [tab, setTab] = useState("jobs");
  return (
    <>
      <SEOHead title="Career Hub | Admin" description="Manage jobs and scholarships" noIndex />
      <div className="space-y-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="rounded-xl bg-muted/50 p-1">
            <TabsTrigger value="jobs" className="rounded-lg gap-2 data-[state=active]:shadow-md">
              <Briefcase className="w-4 h-4" /> Job Board
            </TabsTrigger>
            <TabsTrigger value="scholarships" className="rounded-lg gap-2 data-[state=active]:shadow-md">
              <ScrollText className="w-4 h-4" /> Scholarships
            </TabsTrigger>
          </TabsList>
          <TabsContent value="jobs"><Suspense fallback={<Loader />}><AdminJobBoard /></Suspense></TabsContent>
          <TabsContent value="scholarships"><Suspense fallback={<Loader />}><AdminScholarships /></Suspense></TabsContent>
        </Tabs>
      </div>
    </>
  );
}
