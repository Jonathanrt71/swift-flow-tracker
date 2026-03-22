import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

interface PlainTextEditorProps {
  content: string;
  onChange: (html: string) => void;
}

const PlainTextEditor = ({ content, onChange }: PlainTextEditorProps) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content]);

  if (!editor) return null;

  return (
    <div
      className="rounded-md min-h-[80px] text-sm"
      style={{
        background: "white",
        border: "1px solid #C9CED4",
      }}
    >
      <EditorContent
        editor={editor}
        className="px-3 py-2.5 prose prose-sm max-w-none min-h-[80px] focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[60px]"
      />
    </div>
  );
};

export default PlainTextEditor;
