import { lazy, Suspense, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUpCircle, Calendar, GraduationCap, BarChart3 } from "lucide-react";
import SEOHead from "@/components/SEOHead";

const AdminSemesterPromotion = lazy(() => import("./AdminSemesterPromotion"));
const AdminAcademicYear = lazy(() => import("./AdminAcademicYear"));
const AdminFinalSemesterMove = lazy(() => import("./AdminFinalSemesterMove"));
const AdminAcademicOverview = lazy(() => import("./AdminAcademicOverview"));

const Loader = () => <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

export default function AdminPromotionHub() {
  const [tab, setTab] = useState("promotion");
  return (
    <>
      <SEOHead title="Promotion & Academic Years | Admin" description="Semester promotion and academic year management" noIndex />
      <div className="space-y-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="rounded-xl bg-muted/50 p-1 flex flex-wrap h-auto gap-1">
            <TabsTrigger value="promotion" className="rounded-lg gap-2 data-[state=active]:shadow-md">
              <ArrowUpCircle className="w-4 h-4" /> Semester Promotion
            </TabsTrigger>
            <TabsTrigger value="academic-years" className="rounded-lg gap-2 data-[state=active]:shadow-md">
              <Calendar className="w-4 h-4" /> Academic Years
            </TabsTrigger>
            <TabsTrigger value="final-move" className="rounded-lg gap-2 data-[state=active]:shadow-md">
              <GraduationCap className="w-4 h-4" /> Final Semester
            </TabsTrigger>
            <TabsTrigger value="academic-overview" className="rounded-lg gap-2 data-[state=active]:shadow-md">
              <BarChart3 className="w-4 h-4" /> Academic Overview
            </TabsTrigger>
          </TabsList>
          <TabsContent value="promotion"><Suspense fallback={<Loader />}><AdminSemesterPromotion /></Suspense></TabsContent>
          <TabsContent value="academic-years"><Suspense fallback={<Loader />}><AdminAcademicYear /></Suspense></TabsContent>
          <TabsContent value="final-move"><Suspense fallback={<Loader />}><AdminFinalSemesterMove /></Suspense></TabsContent>
          <TabsContent value="academic-overview"><Suspense fallback={<Loader />}><AdminAcademicOverview /></Suspense></TabsContent>
        </Tabs>
      </div>
    </>
  );
}
