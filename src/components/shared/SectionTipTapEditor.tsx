import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import {
  Bold, Italic, List, ListOrdered, ListChecks,
  Link as LinkIcon, Unlink, Heading1, Heading2, Heading3,
} from "lucide-react";

interface SectionTipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
  minHeight?: number;
  hideHeadings?: boolean;
}

const btnStyle = (active: boolean): React.CSSProperties => ({
  display: "flex", alignItems: "center", justifyContent: "center",
  width: 30, height: 30, padding: 0,
  background: active ? "#E7EBEF" : "transparent",
  border: "none", borderRadius: 5, cursor: "pointer",
  color: active ? "#415162" : "#777",
});

/* ── Read-only renderer ──────────────────────────────────────────────
   Renders saved HTML directly via dangerouslySetInnerHTML.
   No TipTap instance = no ProseMirror overhead = smooth scrolling. */
const ReadOnlySection = ({ content }: { content: string }) => (
  <>
    <style>{readOnlyStyles}</style>
    <div
      className="section-html-content"
      style={{ fontSize: 14, lineHeight: 1.7, color: "#555" }}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  </>
);

/* ── Editable TipTap editor ──────────────────────────────────────────
   Only mounted when a section is being actively edited. */
const EditableEditor = ({ content, onChange, minHeight = 320, hideHeadings = false }: {
  content: string; onChange: (html: string) => void; minHeight?: number; hideHeadings?: boolean;
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { style: "color: #415162; text-decoration: underline; cursor: pointer;" },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content,
    editable: true,
    onUpdate: ({ editor }) => { onChange(editor.getHTML()); },
  });

  if (!editor) return null;

  return (
    <div>
      <style>{editorStyles}</style>
      {/* Toolbar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap",
        padding: "6px 8px", background: "#F5F3EE",
        border: "1px solid #C9CED4", borderBottom: "none",
        borderRadius: "6px 6px 0 0",
      }}>
        {!hideHeadings && (
          <>
            <button style={btnStyle(editor.isActive("heading", { level: 1 }))}
              onClick={() => (editor.chain().focus() as any).toggleHeading({ level: 1 }).run()}
              title="Heading 1" type="button">
              <Heading1 style={{ width: 15, height: 15 }} />
            </button>
            <button style={btnStyle(editor.isActive("heading", { level: 2 }))}
              onClick={() => (editor.chain().focus() as any).toggleHeading({ level: 2 }).run()}
              title="Heading 2" type="button">
              <Heading2 style={{ width: 15, height: 15 }} />
            </button>
            <button style={btnStyle(editor.isActive("heading", { level: 3 }))}
              onClick={() => (editor.chain().focus() as any).toggleHeading({ level: 3 }).run()}
              title="Heading 3" type="button">
              <Heading3 style={{ width: 15, height: 15 }} />
            </button>
            <div style={{ width: 1, height: 20, background: "#C9CED4", margin: "0 4px" }} />
          </>
        )}
        <button style={btnStyle(editor.isActive("bold"))}
          onClick={() => (editor.chain().focus() as any).toggleBold().run()}
          title="Bold" type="button">
          <Bold style={{ width: 14, height: 14 }} />
        </button>
        <button style={btnStyle(editor.isActive("italic"))}
          onClick={() => (editor.chain().focus() as any).toggleItalic().run()}
          title="Italic" type="button">
          <Italic style={{ width: 14, height: 14 }} />
        </button>
        <div style={{ width: 1, height: 20, background: "#C9CED4", margin: "0 4px" }} />
        <button style={btnStyle(editor.isActive("bulletList"))}
          onClick={() => (editor.chain().focus() as any).toggleBulletList().run()}
          title="Bullet list" type="button">
          <List style={{ width: 14, height: 14 }} />
        </button>
        <button style={btnStyle(editor.isActive("orderedList"))}
          onClick={() => (editor.chain().focus() as any).toggleOrderedList().run()}
          title="Numbered list" type="button">
          <ListOrdered style={{ width: 14, height: 14 }} />
        </button>
        <button style={btnStyle(editor.isActive("taskList"))}
          onClick={() => (editor.chain().focus() as any).toggleTaskList().run()}
          title="Checklist" type="button">
          <ListChecks style={{ width: 14, height: 14 }} />
        </button>
        <div style={{ width: 1, height: 20, background: "#C9CED4", margin: "0 4px" }} />
        <button style={btnStyle(editor.isActive("link"))}
          onClick={() => {
            const prev = editor.getAttributes("link").href;
            const url = window.prompt("URL", prev || "https://");
            if (url === null) return;
            if (url === "") { editor.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
            editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          }}
          title="Insert link" type="button">
          <LinkIcon style={{ width: 14, height: 14 }} />
        </button>
        {editor.isActive("link") && (
          <button style={btnStyle(false)}
            onClick={() => editor.chain().focus().unsetLink().run()}
            title="Remove link" type="button">
            <Unlink style={{ width: 14, height: 14 }} />
          </button>
        )}
      </div>

      {/* Editor area */}
      <div style={{
        border: "1px solid #C9CED4",
        borderRadius: "0 0 6px 6px",
        background: "#fff",
        minHeight,
        padding: 0,
      }}>
        <EditorContent
          editor={editor}
          style={{ padding: "12px 16px", minHeight }}
        />
      </div>
    </div>
  );
};

/* ── Main export ─────────────────────────────────────────────────────
   Routes to lightweight HTML display or full TipTap editor. */
const SectionTipTapEditor = ({ content, onChange, readOnly = false, minHeight = 320, hideHeadings = false }: SectionTipTapEditorProps) => {
  if (readOnly) {
    return <ReadOnlySection content={content} />;
  }
  return <EditableEditor content={content} onChange={onChange} minHeight={minHeight} hideHeadings={hideHeadings} />;
};

/* ── Styles ──────────────────────────────────────────────────────────── */
const readOnlyStyles = `
  .section-html-content h1 { font-size: 19px; font-weight: 700; color: #415162; margin: 26px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #E7EBEF; }
  .section-html-content h2 { font-size: 16px; font-weight: 600; color: #415162; margin: 24px 0 10px; padding-bottom: 5px; border-bottom: 1px solid #E7EBEF; }
  .section-html-content h3 { font-size: 15px; font-weight: 600; color: #333; margin: 18px 0 6px; }
  .section-html-content p { margin: 0 0 10px; font-size: 14px; line-height: 1.7; color: #555; }
  .section-html-content ul { list-style: disc; padding-left: 20px; margin: 8px 0 16px; }
  .section-html-content ol { list-style: decimal; padding-left: 20px; margin: 8px 0 16px; }
  .section-html-content li { font-size: 14px; line-height: 1.7; color: #555; margin-bottom: 4px; }
  .section-html-content a { color: #415162; text-decoration: underline; }
  .section-html-content strong { font-weight: 600; }
  .section-html-content em { font-style: italic; }
`;

const editorStyles = `
  .ProseMirror { outline: none; font-size: 14px; line-height: 1.7; color: #333; }
  .ProseMirror p { margin: 0 0 8px; }
  .ProseMirror h1 { font-size: 19px; font-weight: 700; color: #415162; margin: 20px 0 8px; }
  .ProseMirror h2 { font-size: 16px; font-weight: 600; color: #415162; margin: 16px 0 6px; }
  .ProseMirror h3 { font-size: 15px; font-weight: 600; color: #333; margin: 14px 0 4px; }
  .ProseMirror ul { list-style: disc; padding-left: 20px; margin: 6px 0 12px; }
  .ProseMirror ol { list-style: decimal; padding-left: 20px; margin: 6px 0 12px; }
  .ProseMirror li { margin-bottom: 3px; }
  .ProseMirror ul[data-type="taskList"] { list-style: none; padding-left: 4px; }
  .ProseMirror ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 6px; }
  .ProseMirror a { color: #415162; text-decoration: underline; cursor: pointer; }
`;

export default SectionTipTapEditor;
