import { lazy, Suspense, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Monitor } from "lucide-react";
import SEOHead from "@/components/SEOHead";

const AdminCourses = lazy(() => import("./AdminCourses"));
const AdminDepartmentsAndSeats = lazy(() => import("./AdminDepartmentsAndSeats"));

const Loader = () => <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

export default function AdminAcademicsHub() {
  const [tab, setTab] = useState("courses");
  return (
    <>
      <SEOHead title="Academics | Admin" description="Courses and departments management" noIndex />
      <div className="space-y-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="rounded-xl bg-muted/50 p-1">
            <TabsTrigger value="courses" className="rounded-lg gap-2 data-[state=active]:shadow-md">
              <BookOpen className="w-4 h-4" /> Courses
            </TabsTrigger>
            <TabsTrigger value="departments" className="rounded-lg gap-2 data-[state=active]:shadow-md">
              <Monitor className="w-4 h-4" /> Departments & Seats
            </TabsTrigger>
          </TabsList>
          <TabsContent value="courses"><Suspense fallback={<Loader />}><AdminCourses /></Suspense></TabsContent>
          <TabsContent value="departments"><Suspense fallback={<Loader />}><AdminDepartmentsAndSeats /></Suspense></TabsContent>
        </Tabs>
      </div>
    </>
  );
}
