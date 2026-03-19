import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Button } from "@/components/ui/button";
import { Bold, Italic, List, ListOrdered, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import DOMPurify from "dompurify";

const proseMirrorClasses = [
  "[&_.ProseMirror]:outline-none [&_.ProseMirror]:font-normal",
  "[&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ul]:my-1",
  "[&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_ol]:my-1",
  "[&_.ProseMirror_li:not([data-type=taskItem])]:my-0.5",
  "[&_.ProseMirror_p]:my-0.5",
  "[&_.ProseMirror_a]:text-primary [&_.ProseMirror_a]:underline",
].join(" ");

/** Compact TipTap editor for checklist detail fields */
export const DetailEditor = ({
  content,
  onChange,
}: {
  content: string;
  onChange: (html: string) => void;
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  return (
    <div style={{ border: "0.5px solid #C9CED4", borderRadius: 6, background: "#F5F3EE", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 2, borderBottom: "0.5px solid #C9CED4", padding: "2px 4px" }}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("h-6 w-6", editor.isActive("bold") && "bg-muted")}
          onClick={() => (editor.chain().focus() as any).toggleBold().run()}
        >
          <Bold className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("h-6 w-6", editor.isActive("italic") && "bg-muted")}
          onClick={() => (editor.chain().focus() as any).toggleItalic().run()}
        >
          <Italic className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("h-6 w-6", editor.isActive("bulletList") && "bg-muted")}
          onClick={() => (editor.chain().focus() as any).toggleBulletList().run()}
        >
          <List className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("h-6 w-6", editor.isActive("orderedList") && "bg-muted")}
          onClick={() => (editor.chain().focus() as any).toggleOrderedList().run()}
        >
          <ListOrdered className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("h-6 w-6", editor.isActive("taskList") && "bg-muted")}
          onClick={() => (editor.chain().focus() as any).toggleTaskList().run()}
        >
          <ListChecks className="h-3 w-3" />
        </Button>
      </div>
      <EditorContent
        editor={editor}
        className={cn(
          "px-2 py-1.5 text-[11px] min-h-[60px]",
          "[&_.ProseMirror]:min-h-[50px]",
          proseMirrorClasses
        )}
      />
    </div>
  );
};

/** Read-only rendered HTML for assessment popup */
export const DetailReadOnly = ({ html }: { html: string }) => {
  // Strip empty paragraphs
  const isEmpty = !html || html === "<p></p>" || html.trim() === "";
  if (isEmpty) return null;

  return (
    <div
      className={cn(
        "text-[11px] leading-relaxed",
        // Style the rendered HTML
        "[&_ul]:list-disc [&_ul]:pl-4 [&_ul]:my-0.5",
        "[&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:my-0.5",
        "[&_li]:my-0.5",
        "[&_p]:my-0.5",
        "[&_strong]:font-semibold",
        "[&_a]:text-primary [&_a]:underline",
        "[&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-0",
      )}
      style={{ color: "#666" }}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
    />
  );
};

/** Single-line plain text preview, strips HTML tags */
export const detailPreviewText = (html: string | null): string => {
  if (!html) return "";
  // Strip tags and collapse whitespace
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text;
};
