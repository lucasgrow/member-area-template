"use client";

import {
  Button,
  Input,
  Select,
  SelectItem,
  Tab,
  Tabs,
  Textarea,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type Tier = "free" | "start" | "pro" | "ultra";

export type AdminConsoleData = {
  courses: { id: string; slug: string; title: string; status: "active" | "draft" | "archived"; requiredTier: Tier }[];
  sections: { id: string; courseId: string; slug: string; title: string }[];
  lessons: { id: string; sectionId: string; slug: string; title: string }[];
  transcripts: { id: string; lessonId: string; language: string }[];
  attachments: { id: string; lessonId: string; title: string; type: string }[];
  chapters: { id: string; lessonId: string; title: string; startSeconds: number }[];
  users: { id: string; name: string | null; email: string; role: "user" | "admin"; membership: Tier }[];
  subscriptions: { id: string; userId: string; plan: "start" | "pro" | "ultra"; status: "active" | "expired" | "canceled"; source: string; expiresAt: string | null }[];
  events: { id: string; source: string; eventType: string; projectionStatus: string; lastError: string | null; createdAt: string }[];
  mappings: { id: string; source: string; externalProductId: string; plan: "start" | "pro" | "ultra"; requiresOnboarding: boolean; label: string | null }[];
};

const tiers = ["free", "start", "pro", "ultra"] as const;
const paidTiers = ["start", "pro", "ultra"] as const;

function stringValue(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}

export function AdminConsole({ data }: { data: AdminConsoleData }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function request(path: string, method: string, body?: unknown) {
    setPending(true);
    setNotice(null);
    const response = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await response.json().catch(() => ({})) as { error?: unknown };
    setPending(false);
    if (!response.ok) {
      setNotice({ type: "error", text: typeof payload.error === "string" ? payload.error : "Request failed" });
      return false;
    }
    setNotice({ type: "success", text: "Saved" });
    router.refresh();
    return true;
  }

  async function submitCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (await request("/api/admin/courses", "POST", {
      title: stringValue(form, "title"),
      slug: stringValue(form, "slug"),
      requiredTier: stringValue(form, "requiredTier"),
      status: stringValue(form, "status"),
      description: stringValue(form, "description") || null,
      sortOrder: 0,
    })) event.currentTarget.reset();
  }

  async function submitSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const courseId = stringValue(form, "courseId");
    if (await request(`/api/admin/courses/${courseId}/sections`, "POST", {
      title: stringValue(form, "title"),
      slug: stringValue(form, "slug"),
      description: stringValue(form, "description") || null,
      sortOrder: 0,
    })) event.currentTarget.reset();
  }

  async function submitLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const sectionId = stringValue(form, "sectionId");
    const duration = Number(stringValue(form, "durationSeconds") || 0);
    if (await request(`/api/admin/sections/${sectionId}/lessons`, "POST", {
      title: stringValue(form, "title"),
      slug: stringValue(form, "slug"),
      videoUrl: stringValue(form, "videoUrl") || null,
      summary: stringValue(form, "summary") || null,
      content: stringValue(form, "content") || null,
      exerciseData: stringValue(form, "exerciseData") || null,
      durationSeconds: duration,
      sortOrder: 0,
    })) event.currentTarget.reset();
  }

  async function submitTranscript(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const lessonId = stringValue(form, "lessonId");
    if (await request(`/api/admin/lessons/${lessonId}/transcripts`, "POST", {
      language: stringValue(form, "language"),
      content: stringValue(form, "content"),
    })) event.currentTarget.reset();
  }

  async function submitAttachment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const lessonId = stringValue(form, "lessonId");
    let externalUrl = stringValue(form, "externalUrl");
    let r2Key = stringValue(form, "r2Key");
    let filename = stringValue(form, "filename");
    let fileSizeBytes: number | null = null;
    let mimeType: string | null = null;
    const file = form.get("file");

    if (file instanceof File && file.size > 0) {
      setPending(true);
      setNotice(null);
      const presignResponse = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          prefix: "attachments",
        }),
      });
      const presign = await presignResponse.json().catch(() => ({})) as {
        uploadUrl?: string;
        key?: string;
      };
      if (!presignResponse.ok || !presign.uploadUrl || !presign.key) {
        setPending(false);
        setNotice({ type: "error", text: "Could not prepare the R2 upload" });
        return;
      }
      const uploadResponse = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!uploadResponse.ok) {
        setPending(false);
        setNotice({ type: "error", text: "R2 upload failed" });
        return;
      }
      r2Key = presign.key;
      externalUrl = "";
      filename = file.name;
      fileSizeBytes = file.size;
      mimeType = file.type || "application/octet-stream";
    }

    if (await request(`/api/admin/lessons/${lessonId}/attachments`, "POST", {
      title: stringValue(form, "title"),
      type: stringValue(form, "type"),
      externalUrl: externalUrl || null,
      r2Key: r2Key || null,
      filename: filename || null,
      fileSizeBytes,
      mimeType,
      sortOrder: 0,
    })) event.currentTarget.reset();
  }

  async function submitChapter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const lessonId = stringValue(form, "lessonId");
    if (await request(`/api/admin/lessons/${lessonId}/chapters`, "POST", {
      title: stringValue(form, "title"),
      startSeconds: Number(stringValue(form, "startSeconds") || 0),
      endSeconds: Number(stringValue(form, "endSeconds") || 0),
      sortOrder: 0,
    })) event.currentTarget.reset();
  }

  async function submitSubscription(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const userId = stringValue(form, "userId");
    if (await request(`/api/admin/users/${userId}/subscriptions`, "POST", {
      plan: stringValue(form, "plan"),
      amount: Number(stringValue(form, "amount") || 0),
      expiresAt: stringValue(form, "expiresAt") ? new Date(stringValue(form, "expiresAt")).toISOString() : null,
      notes: stringValue(form, "notes") || undefined,
    })) event.currentTarget.reset();
  }

  async function submitMapping(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (await request("/api/admin/product-access-mappings", "POST", {
      source: stringValue(form, "source"),
      externalProductId: stringValue(form, "externalProductId"),
      plan: stringValue(form, "plan"),
      label: stringValue(form, "label") || null,
      requiresOnboarding: form.get("requiresOnboarding") === "on",
    })) event.currentTarget.reset();
  }

  const iconButton = "min-h-9 min-w-9";

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-default-500">Kernel control plane</p>
          <h1 className="text-2xl font-semibold">Admin</h1>
        </div>
        {notice ? (
          <span className={`text-sm ${notice.type === "error" ? "text-danger" : "text-success"}`}>{notice.text}</span>
        ) : null}
      </header>

      <Tabs aria-label="Admin sections" variant="underlined" classNames={{ panel: "px-0 pt-6" }}>
        <Tab key="content" title="Content">
          <div className="space-y-10">
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">New course</h2>
              <form onSubmit={submitCourse} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Input name="title" label="Title" isRequired />
                <Input name="slug" label="Slug" isRequired />
                <Select name="requiredTier" label="Required tier" defaultSelectedKeys={["free"]}>
                  {tiers.map((tier) => <SelectItem key={tier}>{tier}</SelectItem>)}
                </Select>
                <Select name="status" label="Status" defaultSelectedKeys={["draft"]}>
                  {(["draft", "active", "archived"] as const).map((status) => <SelectItem key={status}>{status}</SelectItem>)}
                </Select>
                <Textarea name="description" label="Description" className="md:col-span-2 xl:col-span-3" />
                <Button type="submit" color="primary" isLoading={pending}>Create course</Button>
              </form>
            </section>

            <section className="space-y-3 border-t border-divider pt-7">
              <h2 className="text-lg font-semibold">Course structure</h2>
              {data.courses.length === 0 ? <p className="text-sm text-default-500">No courses.</p> : data.courses.map((course) => (
                <div key={course.id} className="border-b border-divider py-4 last:border-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <strong className="min-w-48 flex-1">{course.title}</strong>
                    <Select
                      aria-label={`Tier for ${course.title}`}
                      size="sm"
                      className="w-28"
                      selectedKeys={[course.requiredTier]}
                      onChange={(event) => void request(`/api/admin/courses/${course.id}`, "PATCH", { requiredTier: event.target.value })}
                    >
                      {tiers.map((tier) => <SelectItem key={tier}>{tier}</SelectItem>)}
                    </Select>
                    <Select
                      aria-label={`Status for ${course.title}`}
                      size="sm"
                      className="w-32"
                      selectedKeys={[course.status]}
                      onChange={(event) => void request(`/api/admin/courses/${course.id}`, "PATCH", { status: event.target.value })}
                    >
                      {(["draft", "active", "archived"] as const).map((status) => <SelectItem key={status}>{status}</SelectItem>)}
                    </Select>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      color="danger"
                      className={iconButton}
                      aria-label={`Delete ${course.title}`}
                      onPress={() => window.confirm(`Delete ${course.title}?`) && void request(`/api/admin/courses/${course.id}`, "DELETE")}
                    >
                      <Icon icon="solar:trash-bin-trash-linear" width={18} />
                    </Button>
                  </div>
                  <div className="ml-4 mt-3 space-y-2 border-l border-divider pl-4">
                    {data.sections.filter((section) => section.courseId === course.id).map((section) => (
                      <div key={section.id}>
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <span className="flex-1">{section.title}</span>
                          <Button isIconOnly size="sm" variant="light" color="danger" aria-label={`Delete ${section.title}`} onPress={() => void request(`/api/admin/sections/${section.id}`, "DELETE")}>
                            <Icon icon="solar:trash-bin-trash-linear" width={16} />
                          </Button>
                        </div>
                        <div className="ml-4 text-sm text-default-500">
                          {data.lessons.filter((lesson) => lesson.sectionId === section.id).map((lesson) => (
                            <div key={lesson.id} className="flex min-h-9 items-center gap-2">
                              <span className="flex-1">{lesson.title}</span>
                              <Button isIconOnly size="sm" variant="light" color="danger" aria-label={`Delete ${lesson.title}`} onPress={() => void request(`/api/admin/lessons/${lesson.id}`, "DELETE")}>
                                <Icon icon="solar:trash-bin-trash-linear" width={16} />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>

            <section className="grid gap-8 border-t border-divider pt-7 lg:grid-cols-2">
              <form onSubmit={submitSection} className="space-y-3">
                <h2 className="text-lg font-semibold">New section</h2>
                <Select name="courseId" label="Course" isRequired>
                  {data.courses.map((course) => <SelectItem key={course.id}>{course.title}</SelectItem>)}
                </Select>
                <div className="grid gap-3 sm:grid-cols-2"><Input name="title" label="Title" isRequired /><Input name="slug" label="Slug" isRequired /></div>
                <Input name="description" label="Description" />
                <Button type="submit" color="primary" isLoading={pending}>Create section</Button>
              </form>
              <form onSubmit={submitLesson} className="space-y-3">
                <h2 className="text-lg font-semibold">New lesson</h2>
                <Select name="sectionId" label="Section" isRequired>
                  {data.sections.map((section) => <SelectItem key={section.id}>{section.title}</SelectItem>)}
                </Select>
                <div className="grid gap-3 sm:grid-cols-2"><Input name="title" label="Title" isRequired /><Input name="slug" label="Slug" isRequired /></div>
                <div className="grid gap-3 sm:grid-cols-[1fr_10rem]"><Input name="videoUrl" label="Video URL" type="url" /><Input name="durationSeconds" label="Duration (s)" type="number" min={0} /></div>
                <Input name="summary" label="Summary" />
                <Textarea name="content" label="Content" minRows={4} />
                <Textarea name="exerciseData" label="Exercise JSON" minRows={3} />
                <Button type="submit" color="primary" isLoading={pending}>Create lesson</Button>
              </form>
            </section>

            <section className="grid gap-8 border-t border-divider pt-7 lg:grid-cols-3">
              <form onSubmit={submitTranscript} className="space-y-3">
                <h2 className="text-lg font-semibold">Transcript</h2>
                <Select name="lessonId" label="Lesson" isRequired>{data.lessons.map((lesson) => <SelectItem key={lesson.id}>{lesson.title}</SelectItem>)}</Select>
                <Input name="language" label="Language" defaultValue="en" isRequired />
                <Textarea name="content" label="Content" minRows={5} isRequired />
                <Button type="submit" color="primary" isLoading={pending}>Save transcript</Button>
                {data.transcripts.map((item) => <ResourceRow key={item.id} label={`${item.language} - ${data.lessons.find((lesson) => lesson.id === item.lessonId)?.title ?? item.lessonId}`} onDelete={() => request(`/api/admin/transcripts/${item.id}`, "DELETE")} />)}
              </form>
              <form onSubmit={submitAttachment} className="space-y-3">
                <h2 className="text-lg font-semibold">Attachment</h2>
                <Select name="lessonId" label="Lesson" isRequired>{data.lessons.map((lesson) => <SelectItem key={lesson.id}>{lesson.title}</SelectItem>)}</Select>
                <div className="grid gap-3 sm:grid-cols-2"><Input name="title" label="Title" isRequired /><Select name="type" label="Type" defaultSelectedKeys={["file"]}>{(["file", "pdf", "image", "video", "link"] as const).map((type) => <SelectItem key={type}>{type}</SelectItem>)}</Select></div>
                <Input name="externalUrl" label="External URL" type="url" />
                <Input name="file" label="Upload to R2" type="file" />
                <Input name="r2Key" label="R2 key" placeholder="attachments/..." />
                <Input name="filename" label="Filename" />
                <Button type="submit" color="primary" isLoading={pending}>Add attachment</Button>
                {data.attachments.map((item) => <ResourceRow key={item.id} label={item.title} onDelete={() => request(`/api/admin/attachments/${item.id}`, "DELETE")} />)}
              </form>
              <form onSubmit={submitChapter} className="space-y-3">
                <h2 className="text-lg font-semibold">Chapter</h2>
                <Select name="lessonId" label="Lesson" isRequired>{data.lessons.map((lesson) => <SelectItem key={lesson.id}>{lesson.title}</SelectItem>)}</Select>
                <Input name="title" label="Title" isRequired />
                <div className="grid grid-cols-2 gap-3"><Input name="startSeconds" label="Start (s)" type="number" min={0} isRequired /><Input name="endSeconds" label="End (s)" type="number" min={0} isRequired /></div>
                <Button type="submit" color="primary" isLoading={pending}>Add chapter</Button>
                {data.chapters.map((item) => <ResourceRow key={item.id} label={`${item.title} (${item.startSeconds}s)`} onDelete={() => request(`/api/admin/chapters/${item.id}`, "DELETE")} />)}
              </form>
            </section>
          </div>
        </Tab>

        <Tab key="users" title="Users">
          <div className="space-y-8">
            <div className="overflow-x-auto rounded-lg border border-divider">
              <table className="w-full text-left text-sm">
                <thead className="bg-default-50 text-default-500"><tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Membership</th></tr></thead>
                <tbody className="divide-y divide-divider">{data.users.map((user) => (
                  <tr key={user.id}><td className="px-4 py-3"><span className="block font-medium">{user.name ?? "Unnamed"}</span><span className="text-default-500">{user.email}</span></td><td className="px-4 py-3">{user.role}</td><td className="w-40 px-4 py-3"><Select aria-label={`Membership for ${user.email}`} size="sm" selectedKeys={[user.membership]} onChange={(event) => void request(`/api/admin/users/${user.id}/membership`, "PATCH", { membership: event.target.value })}>{tiers.map((tier) => <SelectItem key={tier}>{tier}</SelectItem>)}</Select></td></tr>
                ))}</tbody>
              </table>
            </div>
            <form onSubmit={submitSubscription} className="grid gap-3 border-t border-divider pt-7 md:grid-cols-2 xl:grid-cols-5">
              <h2 className="text-lg font-semibold md:col-span-2 xl:col-span-5">Manual subscription</h2>
              <Select name="userId" label="User" isRequired>{data.users.map((user) => <SelectItem key={user.id}>{user.email}</SelectItem>)}</Select>
              <Select name="plan" label="Plan" isRequired>{paidTiers.map((tier) => <SelectItem key={tier}>{tier}</SelectItem>)}</Select>
              <Input name="amount" label="Amount (minor units)" type="number" min={0} defaultValue="0" />
              <Input name="expiresAt" label="Expires at" type="datetime-local" />
              <Button type="submit" color="primary" isLoading={pending}>Create subscription</Button>
            </form>
            <div className="divide-y divide-divider rounded-lg border border-divider">{data.subscriptions.map((subscription) => (
              <div key={subscription.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"><span className="flex-1 font-medium">{data.users.find((user) => user.id === subscription.userId)?.email ?? subscription.userId}</span><span>{subscription.plan}</span><span className="text-default-500">{subscription.source}</span><span>{subscription.status}</span>{subscription.status === "active" ? <Button size="sm" variant="flat" color="danger" onPress={() => void request(`/api/admin/subscriptions/${subscription.id}`, "PATCH", { status: "canceled" })}>Cancel</Button> : null}</div>
            ))}</div>
          </div>
        </Tab>

        <Tab key="billing" title="Billing">
          <div className="space-y-9">
            <form onSubmit={submitMapping} className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <Input name="source" label="Provider" isRequired />
              <Input name="externalProductId" label="External product ID" isRequired />
              <Select name="plan" label="Plan" isRequired>{paidTiers.map((tier) => <SelectItem key={tier}>{tier}</SelectItem>)}</Select>
              <Input name="label" label="Label" />
              <label className="flex min-h-12 items-center gap-2 text-sm"><input name="requiresOnboarding" type="checkbox" /> Require onboarding</label>
              <Button type="submit" color="primary" isLoading={pending}>Save mapping</Button>
            </form>
            <div className="divide-y divide-divider rounded-lg border border-divider">{data.mappings.map((mapping) => (
              <div key={mapping.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"><span className="flex-1 font-medium">{mapping.source} / {mapping.externalProductId}</span><span>{mapping.plan}</span><span className="text-default-500">{mapping.requiresOnboarding ? "onboarding" : "direct"}</span><Button isIconOnly size="sm" variant="light" color="danger" aria-label="Delete mapping" onPress={() => void request(`/api/admin/product-access-mappings/${mapping.id}`, "DELETE")}><Icon icon="solar:trash-bin-trash-linear" width={17} /></Button></div>
            ))}</div>
            <section className="space-y-3 border-t border-divider pt-7">
              <h2 className="text-lg font-semibold">Events</h2>
              <div className="overflow-x-auto rounded-lg border border-divider"><table className="w-full text-left text-sm"><thead className="bg-default-50 text-default-500"><tr><th className="px-4 py-3">Event</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Error</th><th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr></thead><tbody className="divide-y divide-divider">{data.events.map((event) => <tr key={event.id}><td className="px-4 py-3"><span className="block font-medium">{event.source}</span><span className="text-default-500">{event.eventType}</span></td><td className="px-4 py-3">{event.projectionStatus}</td><td className="max-w-sm truncate px-4 py-3 text-danger">{event.lastError ?? "-"}</td><td className="px-4 py-3"><Button size="sm" variant="flat" onPress={() => void request("/api/admin/billing/replay", "POST", { eventId: event.id })}>Replay</Button></td></tr>)}</tbody></table></div>
            </section>
          </div>
        </Tab>
      </Tabs>
    </div>
  );
}

function ResourceRow({ label, onDelete }: { label: string; onDelete: () => Promise<boolean> }) {
  return (
    <div className="flex min-h-10 items-center gap-2 border-b border-divider text-sm last:border-0">
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <Button isIconOnly size="sm" variant="light" color="danger" aria-label={`Delete ${label}`} onPress={() => void onDelete()}>
        <Icon icon="solar:trash-bin-trash-linear" width={16} />
      </Button>
    </div>
  );
}
