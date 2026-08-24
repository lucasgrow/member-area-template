import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { generatePresignedUploadUrl } from "@/lib/r2";
import { z } from "zod";

const schema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(100),
  prefix: z.enum(["courses", "attachments", "thumbnails", "uploads"]).default("uploads"),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const result = await generatePresignedUploadUrl(parsed.data);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
