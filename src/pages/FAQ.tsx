import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";
import SEOHead from "@/components/SEOHead";

const faqCategories = [
  {
    title: "Admissions",
    items: [
      { q: "What is the admission process?", a: "Visit the Admissions page, fill out the online application form, upload required documents, and track your application status using the application number provided." },
      { q: "What documents are required for admission?", a: "You need 10th & 12th mark sheets, transfer certificate, migration certificate, passport-size photos, Aadhaar card, and caste certificate (if applicable)." },
      { q: "When does the admission window open?", a: "Admissions typically open in June each year. Check the Notices section for exact dates and deadlines." },
      { q: "Can I apply online?", a: "Yes! Use the 'Apply Now' link in the Admissions section to submit your application entirely online." },
    ],
  },
  {
    title: "Fees & Finance",
    items: [
      { q: "What are the fee payment options?", a: "Fees can be paid via cash, bank transfer, or UPI. Contact the accounts office for detailed payment instructions." },
      { q: "Is there a fee installment facility?", a: "Yes, students can pay fees in installments. Speak with the administration for a customized payment plan." },
      { q: "How do I check my fee balance?", a: "Log in to the Student Dashboard and navigate to 'Fee Details' to view your complete fee summary and payment history." },
      { q: "Are there any scholarships available?", a: "Yes, government scholarships and merit-based fee concessions are available. Contact the office for eligibility details." },
    ],
  },
  {
    title: "Exams & Academics",
    items: [
      { q: "How can I view my marks?", a: "Log in to your Student Dashboard and go to the 'Marks' section to view internal and external exam results." },
      { q: "Where can I find the exam timetable?", a: "Exam schedules are posted in the Notices section and also available in the Timetable section of your dashboard." },
      { q: "How is attendance calculated?", a: "Attendance is tracked per subject. A minimum of 75% attendance is required to be eligible for exams." },
      { q: "Where can I find previous year question papers?", a: "Visit the 'Question Bank' section under the Other menu to download previous year papers organized by course and subject." },
    ],
  },
  {
    title: "Campus Life",
    items: [
      { q: "What extracurricular activities are available?", a: "The college offers sports, cultural events, NSS, NCC, and various student clubs. Check the Events page for upcoming activities." },
      { q: "Is there a library facility?", a: "Yes, the college has a well-stocked library with textbooks, reference materials, journals, and digital resources." },
      { q: "Are there hostel facilities?", a: "Hostel facilities are available for outstation students. Contact the administration office for availability and rates." },
      { q: "Is there a placement cell?", a: "Yes, the college has an active placement cell that organizes campus drives, training sessions, and career guidance programs." },
    ],
  },
  {
    title: "Technical Support",
    items: [
      { q: "I forgot my password. How can I reset it?", a: "Click 'Forgot Password' on the login page, enter your registered email, and follow the reset link sent to your inbox." },
      { q: "I'm unable to log in to my dashboard.", a: "Ensure you're using the correct email and password. If the issue persists, contact support via the Contact page." },
      { q: "How do I update my profile information?", a: "Log in to your dashboard, go to 'My Profile', and update your personal details. Some fields may require admin approval." },
      { q: "The website is not loading properly.", a: "Try clearing your browser cache, using a different browser, or checking your internet connection. If the problem continues, contact us." },
    ],
  },
];

export default function FAQ() {
  return (
    <>
      <SEOHead
        title="FAQ"
        description="Frequently asked questions about admissions, fees, exams, campus life, and technical support at Hoysala Degree College, Nelamangala."
        canonical="/faq"
        schemaJson={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqCategories.flatMap((cat) =>
            cat.items.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: { "@type": "Answer", text: item.a },
            }))
          ),
        }}
      />
      <div className="container py-12 px-4 max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <HelpCircle className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Frequently Asked Questions</h1>
          <p className="text-muted-foreground mt-2 max-w-lg mx-auto">Find answers to common questions about our college, admissions, academics, and more.</p>
        </div>

        <div className="space-y-8">
          {faqCategories.map((cat) => (
            <div key={cat.title}>
              <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="w-1.5 h-6 rounded-full bg-primary" />
                {cat.title}
              </h2>
              <Accordion type="single" collapsible className="bg-card rounded-xl border border-border/50">
                {cat.items.map((item, i) => (
                  <AccordionItem key={i} value={`${cat.title}-${i}`} className="border-border/30">
                    <AccordionTrigger className="px-5 text-sm font-medium text-foreground hover:no-underline">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="px-5 text-sm text-muted-foreground">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
