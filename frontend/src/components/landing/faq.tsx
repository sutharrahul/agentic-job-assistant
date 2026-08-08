import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Reveal } from "@/components/landing/reveal";
import { SectionHeading } from "@/components/landing/section-heading";

const FAQS = [
  {
    question: "Is my resume secure?",
    answer:
      "Yes. Your resume and profile data are stored securely in Supabase and are only ever accessible to your authenticated account — nothing is shared without your consent.",
  },
  {
    question: "Which file formats are supported?",
    answer: "You can upload your resume as a PDF or a DOCX file.",
  },
  {
    question: "Does AI apply to jobs?",
    answer:
      "No. The AI drafts fit analysis and cover letters, but nothing is ever submitted automatically — you review and approve every step before anything is saved or sent.",
  },
  {
    question: "Can I edit the generated cover letter?",
    answer:
      "Yes, every generated cover letter is fully editable inline before you approve it.",
  },
  {
    question: "Which AI model powers this?",
    answer:
      "The AI pipeline is built on Google's Gemini models, orchestrated through a multi-agent LangGraph workflow.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="border-t border-border px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Reveal>
          <SectionHeading eyebrow="FAQ" title="Frequently asked questions" />
        </Reveal>

        <Reveal delay={100}>
          <Accordion className="mt-10">
            {FAQS.map(({ question, answer }) => (
              <AccordionItem key={question} value={question}>
                <AccordionTrigger>{question}</AccordionTrigger>
                <AccordionContent>{answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
