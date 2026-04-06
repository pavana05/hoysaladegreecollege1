import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GraduationCap, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import SEOHead from "@/components/SEOHead";

interface Scholarship {
  id: string;
  name: string;
  provider: string;
  scholarship_type: string;
  description: string;
  eligibility: string;
  eligible_courses: string[];
  amount: string;
  application_link: string;
  deadline: string | null;
  is_active: boolean;
  created_at: string;
}

export default function AdminScholarships() {
  const { user } = useAuth();
  const [items, setItems] = useState<Scholarship[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Scholarship | null>(null);

  const [name, setName] = useState("");
  const [provider, setProvider] = useState("");
  const [schType, setSchType] = useState("government");
  const [description, setDescription] = useState("");
  const [eligibility, setEligibility] = useState("");
  const [courses, setCourses] = useState<string[]>([]);
  const [amount, setAmount] = useState("");
  const [appLink, setAppLink] = useState("");
  const [deadline, setDeadline] = useState("");

  useEffect(() => { fetch(); }, []);

  const fetch = async () => {
    const { data } = await supabase.from("scholarships").select("*").order("created_at", { ascending: false });
    if (data) setItems(data);
  };

  const resetForm = () => {
    setName(""); setProvider(""); setSchType("government"); setDescription("");
    setEligibility(""); setCourses([]); setAmount(""); setAppLink(""); setDeadline("");
    setEditing(null);
  };

  const openEdit = (s: Scholarship) => {
    setEditing(s);
    setName(s.name); setProvider(s.provider); setSchType(s.scholarship_type);
    setDescription(s.description); setEligibility(s.eligibility);
    setCourses(s.eligible_courses || []); setAmount(s.amount || "");
    setAppLink(s.application_link || ""); setDeadline(s.deadline || "");
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return toast.error("Name required");
    const payload = {
      name, provider, scholarship_type: schType, description, eligibility,
      eligible_courses: courses, amount, application_link: appLink,
      deadline: deadline || null, posted_by: user?.id
    };
    if (editing) {
      const { error } = await supabase.from("scholarships").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Updated");
    } else {
      const { error } = await supabase.from("scholarships").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Scholarship added");
    }
    setShowDialog(false); resetForm(); fetch();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("scholarships").update({ is_active: !current }).eq("id", id);
    fetch();
  };

  const deleteItem = async (id: string) => {
    await supabase.from("scholarships").delete().eq("id", id);
    fetch(); toast.success("Deleted");
  };

  const toggleCourse = (code: string) => {
    setCourses(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  };

  const courseOptions = ["BCA", "BCom", "BBA", "BCom (Professional)"];
  const typeColors: Record<string, string> = {
    government: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    private: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    merit: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    sports: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
  };

  return (
    <>
      <SEOHead title="Scholarships | Admin" noIndex />
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Scholarship Management</h2>
            <p className="text-sm text-muted-foreground mt-1">Add and manage scholarship information for students</p>
          </div>
          <Dialog open={showDialog} onOpenChange={(v) => { setShowDialog(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" /> Add Scholarship</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-auto">
              <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Scholarship</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Scholarship Name *</Label>
                  <Input placeholder="e.g. Post-Matric Scholarship" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Provider</Label>
                    <Input placeholder="e.g. Govt. of Karnataka" value={provider} onChange={e => setProvider(e.target.value)} />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select value={schType} onValueChange={setSchType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="government">Government</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                        <SelectItem value="merit">Merit-Based</SelectItem>
                        <SelectItem value="sports">Sports</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea placeholder="Brief description..." value={description} onChange={e => setDescription(e.target.value)} rows={2} />
                </div>
                <div>
                  <Label>Eligibility Criteria</Label>
                  <Textarea placeholder="Who is eligible..." value={eligibility} onChange={e => setEligibility(e.target.value)} rows={2} />
                </div>
                <div>
                  <Label>Eligible Courses</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {courseOptions.map(c => (
                      <Badge key={c} variant={courses.includes(c) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleCourse(c)}>
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Amount</Label>
                    <Input placeholder="e.g. ₹25,000/year" value={amount} onChange={e => setAmount(e.target.value)} />
                  </div>
                  <div>
                    <Label>Deadline</Label>
                    <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Application Link</Label>
                  <Input placeholder="https://..." value={appLink} onChange={e => setAppLink(e.target.value)} />
                </div>
                <Button onClick={handleSubmit} className="w-full">{editing ? "Update" : "Add"} Scholarship</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Courses</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No scholarships added yet</TableCell></TableRow>
                ) : items.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.provider || "—"}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${typeColors[s.scholarship_type] || ""}`}>
                        {s.scholarship_type}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{s.amount || "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(s.eligible_courses || []).map(c => <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.deadline ? format(new Date(s.deadline), "dd MMM yyyy") : "—"}</TableCell>
                    <TableCell><Switch checked={s.is_active} onCheckedChange={() => toggleActive(s.id, s.is_active)} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(s)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteItem(s.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
