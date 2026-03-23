"use client";

import {
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { it } from "@blocknote/core/locales";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

/** Italiano + placeholder più esplicito per chi non conosce gli editor a blocchi */
const dictionaryIt = {
  ...it,
  placeholders: {
    ...it.placeholders,
    default:
      "Scrivi qui… Premi / (slash) per titoli, elenchi, citazione, immagine e altro. Puoi trascinare qui un file immagine.",
  },
};

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
      dictionary: dictionaryIt,
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
      className="bn-editor-admin w-full min-w-0 [&_.bn-editor]:w-full! [&_.bn-block-outer]:max-w-none! [&_.bn-block-content]:max-w-none! [&_.bn-root]:rounded-b-lg"
    >
      <BlockNoteView
        editor={editor}
        onChange={handleChange}
        editable={!disabled}
        theme="dark"
      />
    </div>
  );
}

const BlockNoteEditor = forwardRef<BlockNoteEditorHandle, BlockNoteEditorProps>(
  InnerBlockNoteEditor
);

export default BlockNoteEditor;
