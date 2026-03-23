"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useCallback,
  useRef,
} from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import "prosemirror-view/style/prosemirror.css";

export type ArticleHtmlEditorHandle = {
  insertImageFromUrl: (url: string) => void;
};

type ArticleHtmlEditorProps = {
  /** HTML iniziale (solo al mount; il parent usa `key` per forzare remount) */
  initialContent?: string;
  onChange?: (html: string) => void;
  disabled?: boolean;
  /** Valore CSS per altezza minima (es. `min(70vh, 560px)`) */
  minHeight?: string;
};

async function uploadFileToServer(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/admin/upload", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "Upload fallito");
  }
  const data = (await res.json()) as { url: string };
  return data.url;
}

function Toolbar({
  editor,
  disabled,
}: {
  editor: Editor;
  disabled: boolean;
}) {
  const setLink = useCallback(() => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Indirizzo del link (lascia vuoto per rimuovere)", prev ?? "https://");
    if (url === null) return;
    const trimmed = url.trim();
    if (trimmed === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run();
  }, [editor]);

  const btn =
    "px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const active =
    "bg-[#f5a623]/25 border-[#f5a623]/50 text-[#f5d48a]";
  const idle =
    "bg-white/5 border-white/15 text-white/85 hover:bg-white/10 hover:border-white/25";

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-2 py-2 border-b border-white/10 bg-[#2a2a2a]">
      <span className="text-[10px] uppercase tracking-wide text-white/40 w-full sm:w-auto sm:mr-1 mb-1 sm:mb-0">
        Formattazione
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`${btn} ${editor.isActive("heading", { level: 2 }) ? active : idle}`}
      >
        Titolo 2
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`${btn} ${editor.isActive("heading", { level: 3 }) ? active : idle}`}
      >
        Titolo 3
      </button>
      <span className="w-px h-5 bg-white/15 mx-0.5 hidden sm:block" aria-hidden />
      <button
        type="button"
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`${btn} ${editor.isActive("bold") ? active : idle}`}
      >
        Grassetto
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`${btn} ${editor.isActive("italic") ? active : idle}`}
      >
        Corsivo
      </button>
      <button type="button" disabled={disabled} onClick={setLink} className={`${btn} ${editor.isActive("link") ? active : idle}`}>
        Link
      </button>
      <span className="w-px h-5 bg-white/15 mx-0.5 hidden sm:block" aria-hidden />
      <button
        type="button"
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`${btn} ${editor.isActive("bulletList") ? active : idle}`}
      >
        Elenco
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`${btn} ${editor.isActive("orderedList") ? active : idle}`}
      >
        Numerato
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`${btn} ${editor.isActive("blockquote") ? active : idle}`}
      >
        Citazione
      </button>
      <span className="w-px h-5 bg-white/15 mx-0.5 hidden sm:block" aria-hidden />
      <button
        type="button"
        disabled={disabled}
        onClick={() => editor.chain().focus().undo().run()}
        className={`${btn} ${idle}`}
        title="Annulla"
      >
        Annulla
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => editor.chain().focus().redo().run()}
        className={`${btn} ${idle}`}
        title="Ripeti"
      >
        Ripeti
      </button>
    </div>
  );
}

const ArticleHtmlEditor = forwardRef<ArticleHtmlEditorHandle, ArticleHtmlEditorProps>(
  function ArticleHtmlEditorInner(
    {
      initialContent = "",
      onChange,
      disabled = false,
      minHeight = "min(70vh, 560px)",
    },
    ref
  ) {
    const editorRef = useRef<Editor | null>(null);
    const initialSynced = useRef(false);

    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          codeBlock: false,
          heading: { levels: [2, 3] },
          link: {
            openOnClick: false,
            HTMLAttributes: { rel: "noopener noreferrer" },
          },
        }),
        Image.configure({}),
        Placeholder.configure({
          placeholder:
            "Scrivi qui il testo dell’articolo. In alto: titoli, grassetto, link, elenchi. Immagini: «Immagine dalla libreria» o trascina un file qui.",
        }),
      ],
      content: initialContent?.trim() ? initialContent : "<p></p>",
      editable: !disabled,
      onUpdate: ({ editor: ed }) => {
        onChange?.(ed.getHTML());
      },
      editorProps: {
        attributes: {
          class:
            "tiptap-article px-4 py-4 max-w-none focus:outline-none text-[15px] leading-relaxed text-white/90",
        },
        handleDrop: (_view, event, _slice, moved) => {
          if (moved || disabled) return false;
          const files = event.dataTransfer?.files;
          if (files?.length && files[0].type.startsWith("image/")) {
            event.preventDefault();
            void uploadFileToServer(files[0])
              .then((url) => {
                editorRef.current?.chain().focus().setImage({ src: url }).run();
              })
              .catch(() => {});
            return true;
          }
          return false;
        },
      },
    });

    useEffect(() => {
      editorRef.current = editor;
    }, [editor]);

    useEffect(() => {
      if (!editor) return;
      editor.setEditable(!disabled);
    }, [disabled, editor]);

    useEffect(() => {
      if (!editor || !onChange || initialSynced.current) return;
      initialSynced.current = true;
      onChange(editor.getHTML());
    }, [editor, onChange]);

    useImperativeHandle(
      ref,
      () => ({
        insertImageFromUrl: (url: string) => {
          editor?.chain().focus().setImage({ src: url }).run();
        },
      }),
      [editor]
    );

    if (!editor) {
      return (
        <div
          className="animate-pulse rounded-b-lg bg-white/5"
          style={{ minHeight }}
        />
      );
    }

    return (
      <div
        className="article-html-editor flex flex-col rounded-b-lg overflow-hidden"
        style={{ minHeight }}
      >
        <Toolbar editor={editor} disabled={disabled} />
        <div className="flex-1 min-h-0 overflow-y-auto bg-[#252525]">
          <EditorContent editor={editor} />
        </div>
      </div>
    );
  }
);

ArticleHtmlEditor.displayName = "ArticleHtmlEditor";

export default ArticleHtmlEditor;
