import { type FormEvent, useState } from "react";
import { Link } from "react-router";
import { LogInIcon, MessageSquareIcon, SendIcon, Trash2Icon } from "lucide-react";
import {
  createComment,
  deleteComment,
  type AuthUser,
  type ProductComment,
} from "../lib/api";

type CommentSectionProps = {
  productId: string;
  currentUser?: AuthUser | null;
  initialComments?: ProductComment[];
};

function CommentSection({
  productId,
  currentUser = null,
  initialComments = [],
}: CommentSectionProps) {
  const [comments, setComments] = useState(initialComments);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextContent = content.trim();
    if (!nextContent || isSubmitting) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const response = await createComment({ productId, content: nextContent });
      setComments((current) => [...current, response.data]);
      setContent("");
    } catch {
      setError("Unable to post your comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    setError(null);
    setDeletingId(commentId);
    try {
      await deleteComment({ commentId });
      setComments((current) => current.filter((comment) => comment.id !== commentId));
    } catch {
      setError("Unable to delete your comment. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="space-y-5" aria-labelledby="comments-heading">
      <div className="flex items-center gap-2">
        <MessageSquareIcon className="size-5 text-primary" />
        <h2 id="comments-heading" className="text-lg font-semibold">
          Comments
        </h2>
        <span className="badge badge-ghost badge-sm">{comments.length}</span>
      </div>

      {currentUser ? (
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <label className="form-control flex-1">
            <span className="sr-only">Add a comment</span>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className="textarea textarea-bordered min-h-20 w-full resize-none"
              placeholder="Share your thoughts..."
              maxLength={1000}
            />
          </label>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!content.trim() || isSubmitting}
          >
            <SendIcon className="size-4" />
            <span className="hidden sm:inline">{isSubmitting ? "Posting..." : "Post"}</span>
          </button>
        </form>
      ) : (
        <div className="alert bg-base-200">
          <LogInIcon className="size-5" />
          <span>Sign in to join the conversation.</span>
          <Link to="/login" className="btn btn-primary btn-sm">
            Sign In
          </Link>
        </div>
      )}

      {error && <div className="alert alert-error text-sm">{error}</div>}

      <div className="space-y-3">
        {comments.length === 0 ? (
          <p className="rounded-box border border-dashed border-base-300 p-6 text-center text-sm opacity-70">
            No comments yet. Start the conversation.
          </p>
        ) : (
          comments.map((comment) => (
            <article key={comment.id} className="rounded-box bg-base-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="whitespace-pre-wrap wrap-break-word">{comment.content}</p>
                  <time className="mt-2 block text-xs opacity-60" dateTime={comment.createdAt}>
                    {new Date(comment.createdAt).toLocaleString()}
                  </time>
                </div>
                {currentUser?.id === comment.userId && (
                  <button
                    type="button"
                    onClick={() => handleDelete(comment.id)}
                    className="btn btn-ghost btn-square btn-sm text-error"
                    disabled={deletingId === comment.id}
                    aria-label="Delete comment"
                  >
                    <Trash2Icon className="size-4" />
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export default CommentSection;
