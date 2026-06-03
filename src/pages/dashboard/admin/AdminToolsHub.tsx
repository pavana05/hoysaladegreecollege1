import { lazy, Suspense, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Shield, Cake, GraduationCap } from "lucide-react";
import SEOHead from "@/components/SEOHead";

const AdminReports = lazy(() => import("./AdminReports"));
const AdminRoles = lazy(() => import("./AdminRoles"));
const AdminBirthdaySettings = lazy(() => import("./AdminBirthdaySettings"));
const AdminAlumni = lazy(() => import("./AdminAlumni"));

import Loader from "@/components/HubLoader";

export default function AdminToolsHub() {
  const [tab, setTab] = useState("reports");
  return (
    <>
      <SEOHead title="Admin Tools | Admin" description="Reports, roles, birthday and alumni management" noIndex />
      <div className="space-y-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="rounded-xl bg-muted/50 p-1 flex flex-wrap h-auto gap-1">
            <TabsTrigger value="reports" className="rounded-lg gap-2 data-[state=active]:shadow-md">
              <Download className="w-4 h-4" /> Reports & Export
            </TabsTrigger>
            <TabsTrigger value="roles" className="rounded-lg gap-2 data-[state=active]:shadow-md">
              <Shield className="w-4 h-4" /> Roles
            </TabsTrigger>
            <TabsTrigger value="birthday" className="rounded-lg gap-2 data-[state=active]:shadow-md">
              <Cake className="w-4 h-4" /> Birthday Wishes
            </TabsTrigger>
            <TabsTrigger value="alumni" className="rounded-lg gap-2 data-[state=active]:shadow-md">
              <GraduationCap className="w-4 h-4" /> Alumni
            </TabsTrigger>
          </TabsList>
          <TabsContent value="reports"><Suspense fallback={<Loader />}><AdminReports /></Suspense></TabsContent>
          <TabsContent value="roles"><Suspense fallback={<Loader />}><AdminRoles /></Suspense></TabsContent>
          <TabsContent value="birthday"><Suspense fallback={<Loader />}><AdminBirthdaySettings /></Suspense></TabsContent>
          <TabsContent value="alumni"><Suspense fallback={<Loader />}><AdminAlumni /></Suspense></TabsContent>
        </Tabs>
      </div>
    </>
  );
}
