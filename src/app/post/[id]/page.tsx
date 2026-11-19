export const instant = false;

import { notFound } from "next/navigation";
import { CommentBox, PostCard } from "@/components/post";
import { Quiet, Shell, Stack } from "@/components/ui";
import { listComments } from "@/domain/social";
import { getPost } from "@/domain/social";
import { requireViewer } from "@/lib/viewer";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { db, lang } = await requireViewer();
  const { id } = await params;
  const post = await getPost(db, id);
  if (!post) notFound();
  const comments = await listComments(db, id);
  return (
    <Shell lang={lang}>
      <PostCard post={post} lang={lang} back={`/post/${id}`} />
      <CommentBox lang={lang} postId={id} />
      <Stack>
        {comments.length === 0 ? <Quiet>No comments yet.</Quiet> : null}
        {comments.map((comment) => (
          <p key={comment.id} className="rounded-2xl bg-card px-4 py-3 text-sm leading-6">{comment.body}</p>
        ))}
      </Stack>
    </Shell>
  );
}
