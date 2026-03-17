"use client";

import {
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

type BlockNoteEditorProps = {
  /** Contenuto iniziale: JSON string di blocchi (editor.document) */
  initialContent?: string | null;
  /** Chiamato quando il contenuto cambia (JSON string) */
  onChange?: (contentJson: string) => void;
  /** Disabilita l'editor */
  disabled?: boolean;
  /** Altezza minima (es. "400px") */
  minHeight?: string;
};

export type BlockNoteEditorHandle = {
  /** Inserisce un blocco immagine usando l'URL passato */
  insertImageFromUrl: (url: string) => void;
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

function InnerBlockNoteEditor(
  {
    initialContent,
    onChange,
    disabled = false,
    minHeight = "400px",
  }: BlockNoteEditorProps,
  ref: React.Ref<BlockNoteEditorHandle>
) {
  const initialBlocks = useMemo((): Record<string, unknown>[] | undefined => {
    if (!initialContent || initialContent.trim() === "") return undefined;
    try {
      const parsed = JSON.parse(initialContent) as unknown;
      return Array.isArray(parsed) ? (parsed as Record<string, unknown>[]) : undefined;
    } catch {
      return undefined;
    }
  }, [initialContent]);

  const uploadFile = useCallback(async (file: File) => {
    return uploadFileToServer(file);
  }, []);

  const editor = useCreateBlockNote(
    {
      initialContent: initialBlocks,
      uploadFile,
    },
    [initialBlocks, uploadFile]
  );

  useImperativeHandle(
    ref,
    () => ({
      insertImageFromUrl: (url: string) => {
        try {
          const selection = editor.getSelection();
          // Inserisce l'immagine dopo il blocco corrente; se la selection non è valida, lascia che l'editor
          // decida la posizione di default.
          editor.insertBlocks(
            [
              {
                type: "image",
                props: { url },
              } as any,
            ],
            selection as any
          );
        } catch {
          // ignore
        }
      },
    }),
    [editor]
  );

  const handleChange = useCallback(() => {
    if (onChange && editor.document) {
      try {
        onChange(JSON.stringify(editor.document));
      } catch {
        // ignore
      }
    }
  }, [onChange, editor]);

  return (
    <div
      style={{ minHeight }}
      className="bn-editor-admin w-full min-w-0 [&_.bn-editor]:w-full! [&_.bn-block-outer]:max-w-none! [&_.bn-block-content]:max-w-none!"
    >
      <BlockNoteView
        editor={editor}
        onChange={handleChange}
        editable={!disabled}
        theme="dark"
        data-theming-css-variables-demo
      />
    </div>
  );
}

const BlockNoteEditor = forwardRef<BlockNoteEditorHandle, BlockNoteEditorProps>(
  InnerBlockNoteEditor
);

export default BlockNoteEditor;
