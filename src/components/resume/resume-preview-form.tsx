"use client";

import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    } catch {
      setError("Failed to save — please try again");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.summary ?? ""}
            onChange={(e) => setData({ ...data, summary: e.target.value })}
            placeholder="Professional summary"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Skills</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="skills">Comma-separated</Label>
          <Input
            id="skills"
            value={data.skills.join(", ")}
            onChange={(e) =>
              setData({
                ...data,
                skills: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Experience</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.experience.map((entry, index) => (
            <div key={index} className="space-y-2 rounded-md border p-4">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Education</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.education.map((entry, index) => (
            <div key={index} className="space-y-2 rounded-md border p-4">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.projects.map((entry, index) => (
            <div key={index} className="space-y-2 rounded-md border p-4">
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
              <Input
                placeholder="Technologies (comma-separated)"
                value={entry.technologies.join(", ")}
                onChange={(e) =>
                  updateAt(
                    data.projects,
                    index,
                    {
                      technologies: e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    },
                    (projects) => setData({ ...data, projects }),
                  )
                }
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
        </CardContent>
      </Card>

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
