"use client";

import { useState } from "react";
import { AxiosError } from "axios";
import { api } from "@/lib/axios";
import {
  EducationEntry,
  ExperienceEntry,
  ParsedResumeData,
  ProjectEntry,
  Resume,
} from "@/lib/types/resume";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/tag-input";

// Matches the nested-entry treatment used for Experience/Education/
// Projects rows so they read as cards inside the "Parsed review" panel
// instead of the old plain bordered boxes.
const entryClassName = "space-y-3 rounded-2xl bg-background p-4 shadow-card";

const emptyExperience: ExperienceEntry = {
  title: "",
  company: "",
  start_date: "",
  end_date: "",
  description: "",
};

const emptyEducation: EducationEntry = {
  degree: "",
  institution: "",
  start_date: "",
  end_date: "",
};

const emptyProject: ProjectEntry = {
  name: "",
  description: "",
  technologies: [],
};

// Visible proof the human-in-the-loop step actually happened — which is the
// whole point of this screen, and otherwise invisible once saved.
function EditedMark({ on }: { on: boolean }) {
  if (!on) return null;
  return <Badge variant="warm">edited</Badge>;
}

export function ResumePreviewForm({
  resume,
  onConfirmed,
}: {
  resume: Resume;
  onConfirmed: (resume: Resume) => void;
}) {
  const [data, setData] = useState<ParsedResumeData>(
    resume.parsedData ?? {
      summary: "",
      skills: [],
      experience: [],
      education: [],
      projects: [],
    },
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setIsSaving(true);
    setError(null);
    try {
      const { data: updated } = await api.patch<Resume>(
        `/resumes/${resume.id}/confirm`,
        data,
      );
      onConfirmed(updated);
    } catch (err) {
      // Surface the backend's own message (same as the upload form):
      // a swallowed error here hid ValidationPipe's field-level
      // complaints behind a generic "try again" that never worked.
      const message =
        err instanceof AxiosError
          ? (err.response?.data?.message ?? "Failed to save — please try again")
          : "Failed to save — please try again";
      setError(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setIsSaving(false);
    }
  }

  // Diffed against the props, which still hold exactly what the parser
  // returned — so "edited" means the user actually corrected the AI, not
  // merely that the field has content.
  const original = resume.parsedData;
  const edited = {
    summary: (original?.summary ?? "") !== (data.summary ?? ""),
    skills: JSON.stringify(original?.skills ?? []) !== JSON.stringify(data.skills),
    experience:
      JSON.stringify(original?.experience ?? []) !== JSON.stringify(data.experience),
    education:
      JSON.stringify(original?.education ?? []) !== JSON.stringify(data.education),
    projects:
      JSON.stringify(original?.projects ?? []) !== JSON.stringify(data.projects),
  };

  return (
    <div className="space-y-6">
      {/* This is NOT the uploaded file — it's the structured data every AI
          feature reads (fit score, cover letter, interview prep all send
          parsedData and nothing else). Saying so plainly is the difference
          between "pointless data entry" and "correcting what the AI knows". */}
      <div className="space-y-1.5 rounded-2xl bg-card p-6 shadow-card">
        <h2 className="font-heading text-base font-medium">
          What the AI understood from your resume
        </h2>
        <p className="text-sm text-muted-foreground">
          Everything below was extracted automatically. Correcting it improves
          your fit scores, cover letters and interview questions — your
          uploaded file is never changed.
        </p>
      </div>

      <div className="space-y-3 rounded-2xl bg-card p-6 shadow-card">
        <h2 className="font-heading flex items-center gap-2 text-base font-medium">
          Summary
          <EditedMark on={edited.summary} />
        </h2>
        <Textarea
          value={data.summary ?? ""}
          onChange={(e) => setData({ ...data, summary: e.target.value })}
          placeholder="Professional summary"
        />
      </div>

      {/* One scrolling document rather than four tabs: three of the four
          sections used to be hidden behind a click, which is what made the
          page feel empty — the content was there, just not on screen. */}
      <section className="rounded-2xl bg-card p-6 shadow-card">
        <h2 className="font-heading mb-4 flex items-center gap-2 text-base font-medium">
          Skills <span className="text-muted-foreground">· {data.skills.length}</span>
          <EditedMark on={edited.skills} />
        </h2>
        <TagInput
          value={data.skills}
          onChange={(skills) => setData({ ...data, skills })}
          placeholder="Add a skill and press Enter"
        />
      </section>

      <section className="space-y-4 rounded-2xl bg-card p-6 shadow-card">
        <h2 className="font-heading flex items-center gap-2 text-base font-medium">
          Experience <span className="text-muted-foreground">· {data.experience.length}</span>
          <EditedMark on={edited.experience} />
        </h2>
          {data.experience.map((entry, index) => (
            <div key={index} className={entryClassName}>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Title"
                  value={entry.title}
                  onChange={(e) =>
                    updateAt(data.experience, index, { title: e.target.value }, (experience) =>
                      setData({ ...data, experience }),
                    )
                  }
                />
                <Input
                  placeholder="Company"
                  value={entry.company}
                  onChange={(e) =>
                    updateAt(data.experience, index, { company: e.target.value }, (experience) =>
                      setData({ ...data, experience }),
                    )
                  }
                />
                <Input
                  placeholder="Start date"
                  value={entry.start_date ?? ""}
                  onChange={(e) =>
                    updateAt(
                      data.experience,
                      index,
                      { start_date: e.target.value },
                      (experience) => setData({ ...data, experience }),
                    )
                  }
                />
                <Input
                  placeholder="End date"
                  value={entry.end_date ?? ""}
                  onChange={(e) =>
                    updateAt(data.experience, index, { end_date: e.target.value }, (experience) =>
                      setData({ ...data, experience }),
                    )
                  }
                />
              </div>
              <Textarea
                placeholder="Description"
                value={entry.description ?? ""}
                onChange={(e) =>
                  updateAt(
                    data.experience,
                    index,
                    { description: e.target.value },
                    (experience) => setData({ ...data, experience }),
                  )
                }
              />
              <Button
                variant="destructive"
                size="sm"
                onClick={() =>
                  setData({
                    ...data,
                    experience: data.experience.filter((_, i) => i !== index),
                  })
                }
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() =>
              setData({
                ...data,
                experience: [...data.experience, { ...emptyExperience }],
              })
            }
          >
            Add experience
          </Button>
      </section>

      <section className="space-y-4 rounded-2xl bg-card p-6 shadow-card">
        <h2 className="font-heading flex items-center gap-2 text-base font-medium">
          Education <span className="text-muted-foreground">· {data.education.length}</span>
          <EditedMark on={edited.education} />
        </h2>
          {data.education.map((entry, index) => (
            <div key={index} className={entryClassName}>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Degree"
                  value={entry.degree}
                  onChange={(e) =>
                    updateAt(data.education, index, { degree: e.target.value }, (education) =>
                      setData({ ...data, education }),
                    )
                  }
                />
                <Input
                  placeholder="Institution"
                  value={entry.institution}
                  onChange={(e) =>
                    updateAt(
                      data.education,
                      index,
                      { institution: e.target.value },
                      (education) => setData({ ...data, education }),
                    )
                  }
                />
                <Input
                  placeholder="Start date"
                  value={entry.start_date ?? ""}
                  onChange={(e) =>
                    updateAt(
                      data.education,
                      index,
                      { start_date: e.target.value },
                      (education) => setData({ ...data, education }),
                    )
                  }
                />
                <Input
                  placeholder="End date"
                  value={entry.end_date ?? ""}
                  onChange={(e) =>
                    updateAt(data.education, index, { end_date: e.target.value }, (education) =>
                      setData({ ...data, education }),
                    )
                  }
                />
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() =>
                  setData({
                    ...data,
                    education: data.education.filter((_, i) => i !== index),
                  })
                }
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() =>
              setData({
                ...data,
                education: [...data.education, { ...emptyEducation }],
              })
            }
          >
            Add education
          </Button>
      </section>

      <section className="space-y-4 rounded-2xl bg-card p-6 shadow-card">
        <h2 className="font-heading flex items-center gap-2 text-base font-medium">
          Projects <span className="text-muted-foreground">· {data.projects.length}</span>
          <EditedMark on={edited.projects} />
        </h2>
          {data.projects.map((entry, index) => (
            <div key={index} className={entryClassName}>
              <Input
                placeholder="Name"
                value={entry.name}
                onChange={(e) =>
                  updateAt(data.projects, index, { name: e.target.value }, (projects) =>
                    setData({ ...data, projects }),
                  )
                }
              />
              <Textarea
                placeholder="Description"
                value={entry.description ?? ""}
                onChange={(e) =>
                  updateAt(data.projects, index, { description: e.target.value }, (projects) =>
                    setData({ ...data, projects }),
                  )
                }
              />
              <TagInput
                value={entry.technologies}
                onChange={(technologies) =>
                  updateAt(data.projects, index, { technologies }, (projects) =>
                    setData({ ...data, projects }),
                  )
                }
                placeholder="Add a technology and press Enter"
              />
              <Button
                variant="destructive"
                size="sm"
                onClick={() =>
                  setData({
                    ...data,
                    projects: data.projects.filter((_, i) => i !== index),
                  })
                }
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() =>
              setData({
                ...data,
                projects: [...data.projects, { ...emptyProject }],
              })
            }
          >
            Add project
          </Button>
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button onClick={handleConfirm} disabled={isSaving} size="lg">
        {isSaving ? "Saving..." : "Confirm resume"}
      </Button>
    </div>
  );
}

// Small immutable-update helper for "one field of one array entry
// changed" — used throughout instead of writing
// `data.experience.map((e, i) => i === index ? { ...e, ...patch } : e)`
// inline at every call site above.
function updateAt<T>(
  list: T[],
  index: number,
  patch: Partial<T>,
  onChange: (next: T[]) => void,
) {
  onChange(list.map((item, i) => (i === index ? { ...item, ...patch } : item)));
}
