import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { connection } from "next/server";

export const instant = false;

const types: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  m4v: "video/mp4",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  svg: "image/svg+xml",
};

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  await connection();
  const { path: parts } = await context.params;
  const root = path.resolve(process.cwd(), "public", "uploads");
  if (!parts?.length || parts.some((part) => part === ".." || part.includes("\0") || part.includes("/") || part.includes("\\"))) {
    return new Response("Not found", { status: 404 });
  }
  const target = path.resolve(root, ...parts);
  const real = await realpath(target).catch(() => "");
  if (!real || (real !== root && !real.startsWith(`${root}${path.sep}`))) return new Response("Not found", { status: 404 });
  const info = await stat(real);
  if (!info.isFile()) return new Response("Not found", { status: 404 });
  const type = types[path.extname(real).slice(1).toLowerCase()] ?? "application/octet-stream";
  const size = info.size;
  const headers = {
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=604800",
    "Content-Type": type,
  };
  const range = request.headers.get("range");
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!match) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2] || 0));
    const end = match[1] && match[2] ? Number(match[2]) : match[1] ? size - 1 : size - 1;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= size) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    const last = Math.min(end, size - 1);
    const stream = Readable.toWeb(createReadStream(real, { start, end: last })) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: {
        ...headers,
        "Content-Range": `bytes ${start}-${last}/${size}`,
        "Content-Length": String(last - start + 1),
      },
    });
  }
  const stream = Readable.toWeb(createReadStream(real)) as ReadableStream;
  return new Response(stream, { headers: { ...headers, "Content-Length": String(size) } });
}
