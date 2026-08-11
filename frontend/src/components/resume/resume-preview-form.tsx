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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-2xl bg-card p-6 shadow-card">
        <h2 className="font-heading text-base font-medium">Summary</h2>
        <Textarea
          value={data.summary ?? ""}
          onChange={(e) => setData({ ...data, summary: e.target.value })}
          placeholder="Professional summary"
        />
      </div>

      <div className="rounded-2xl bg-card p-6 shadow-card">
        <h2 className="font-heading mb-4 text-base font-medium">
          Parsed review
        </h2>
        <Tabs defaultValue="skills" className="gap-6">
          <TabsList
            variant="line"
            className="h-auto w-fit gap-1 bg-transparent p-0"
          >
            <TabsTrigger
              value="skills"
              className="h-auto flex-none rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground after:hidden data-active:!bg-primary data-active:!text-primary-foreground data-active:!shadow-none"
            >
              Skills
            </TabsTrigger>
            <TabsTrigger
              value="experience"
              className="h-auto flex-none rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground after:hidden data-active:!bg-primary data-active:!text-primary-foreground data-active:!shadow-none"
            >
              Experience
            </TabsTrigger>
            <TabsTrigger
              value="education"
              className="h-auto flex-none rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground after:hidden data-active:!bg-primary data-active:!text-primary-foreground data-active:!shadow-none"
            >
              Education
            </TabsTrigger>
            <TabsTrigger
              value="projects"
              className="h-auto flex-none rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground after:hidden data-active:!bg-primary data-active:!text-primary-foreground data-active:!shadow-none"
            >
              Projects
            </TabsTrigger>
          </TabsList>

          <TabsContent value="skills">
            <TagInput
              value={data.skills}
              onChange={(skills) => setData({ ...data, skills })}
              placeholder="Add a skill and press Enter"
            />
          </TabsContent>

          <TabsContent value="experience" className="space-y-4">
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
          </TabsContent>

          <TabsContent value="education" className="space-y-4">
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
          </TabsContent>

          <TabsContent value="projects" className="space-y-4">
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
          </TabsContent>
        </Tabs>
      </div>

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
