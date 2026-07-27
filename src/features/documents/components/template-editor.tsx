"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Lock, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveTemplate } from "@/features/documents/actions/save-template";
import {
  BLOCK_KIND_LABELS,
  TEXT_KINDS,
  type TemplateBlock,
} from "@/features/documents/template-blocks";
import { formatDate } from "@/features/rentals/components/rental-labels";

export type EditorTemplate = {
  id: string;
  type: string;
  name: string;
  currentVersion: number;
  blocks: TemplateBlock[];
  versions: { version: number; createdAt: Date; author: string | null }[];
};

const isText = (
  b: TemplateBlock
): b is Extract<TemplateBlock, { fr: string }> =>
  (TEXT_KINDS as readonly string[]).includes(b.kind);

function TextArea({
  value,
  onChange,
  lang,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  lang: "FR" | "EN";
  disabled: boolean;
}) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground w-6 shrink-0 pt-2 text-[10px] font-medium">
        {lang}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={Math.min(6, Math.max(2, Math.ceil(value.length / 90)))}
        className="border-input focus-visible:ring-ring w-full rounded-md border bg-transparent px-3 py-1.5 text-sm leading-relaxed focus-visible:ring-1 focus-visible:outline-none disabled:opacity-50"
      />
    </div>
  );
}

/**
 * The template editor: ordered blocks — bilingual text, or data slots the
 * renderer fills from the rental (movable, never rewritable). Saving
 * always creates a new immutable version; generation only ever uses the
 * newest one, older versions are kept read-only for traceability.
 */
export function TemplateEditor({
  template,
  canEdit,
}: {
  template: EditorTemplate;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [blocks, setBlocks] = React.useState<TemplateBlock[]>(template.blocks);
  const [dirty, setDirty] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const disabled = isPending || !canEdit;

  function mutate(fn: (list: TemplateBlock[]) => TemplateBlock[]) {
    setBlocks(fn);
    setDirty(true);
  }
  const move = (i: number, dir: -1 | 1) =>
    mutate((list) => {
      const j = i + dir;
      if (j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  function save() {
    startTransition(async () => {
      const result = await saveTemplate({ templateId: template.id, blocks });
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      toast.success(`Version ${result.version} enregistrée — c'est désormais la version utilisée.`);
      setDirty(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-medium">{template.name}</h3>
        <Badge variant="secondary" className="font-normal tabular-nums">
          v{template.currentVersion}
        </Badge>
        {!canEdit ? (
          <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
            <Lock aria-hidden="true" className="size-3" />
            Lecture seule
          </span>
        ) : null}
      </div>

      <ul className="space-y-2">
        {blocks.map((b, i) => (
          <li key={i} className="rounded-md border p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-muted-foreground text-xs font-medium">
                {BLOCK_KIND_LABELS[b.kind]}
              </span>
              {!isText(b) ? (
                <span className="text-muted-foreground text-[10px]">
                  rempli depuis la location — déplaçable, non modifiable
                </span>
              ) : null}
              <span className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Monter"
                  onClick={() => move(i, -1)}
                  disabled={disabled || i === 0}
                  className="text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30"
                >
                  <ArrowUp aria-hidden="true" className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Descendre"
                  onClick={() => move(i, 1)}
                  disabled={disabled || i === blocks.length - 1}
                  className="text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30"
                >
                  <ArrowDown aria-hidden="true" className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Retirer"
                  onClick={() => mutate((list) => list.filter((_, j) => j !== i))}
                  disabled={disabled}
                  className="text-muted-foreground hover:text-destructive ml-1 cursor-pointer disabled:opacity-30"
                >
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              </span>
            </div>

            {isText(b) ? (
              <div className="space-y-1.5">
                <TextArea
                  lang="FR"
                  value={b.fr}
                  disabled={disabled}
                  onChange={(v) =>
                    mutate((list) =>
                      list.map((x, j) => (j === i ? { ...x, fr: v } : x))
                    )
                  }
                />
                <TextArea
                  lang="EN"
                  value={b.en}
                  disabled={disabled}
                  onChange={(v) =>
                    mutate((list) =>
                      list.map((x, j) => (j === i ? { ...x, en: v } : x))
                    )
                  }
                />
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {canEdit ? (
        <div className="flex flex-wrap items-center gap-2">
          {TEXT_KINDS.map((k) => (
            <Button
              key={k}
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() =>
                mutate((list) => [...list, { kind: k, fr: "", en: "" }])
              }
            >
              <Plus aria-hidden="true" />
              {BLOCK_KIND_LABELS[k]}
            </Button>
          ))}
        </div>
      ) : null}

      {canEdit ? (
        <div className="flex items-center gap-3 border-t pt-3">
          <Button type="button" onClick={save} disabled={disabled || !dirty}>
            {isPending
              ? "Enregistrement…"
              : `Enregistrer (crée la version ${template.currentVersion + 1})`}
          </Button>
          <p className="text-muted-foreground text-xs">
            Les versions sont immuables : la génération utilise toujours la
            dernière, les anciennes restent pour la traçabilité.
          </p>
        </div>
      ) : null}

      <div className="space-y-1">
        <p className="text-muted-foreground text-xs font-medium">Historique</p>
        <ul className="text-muted-foreground space-y-0.5 text-xs">
          {template.versions.map((v) => (
            <li key={v.version} className="tabular-nums">
              v{v.version} — {formatDate(v.createdAt)}
              {v.author ? ` — ${v.author}` : ""}
              {v.version === template.currentVersion ? " · utilisée" : ""}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Template picker + editor, one template shown at a time. */
export function TemplatesManager({
  templates,
  canEdit,
}: {
  templates: EditorTemplate[];
  canEdit: boolean;
}) {
  const [selectedId, setSelectedId] = React.useState(templates[0]?.id ?? "");
  const selected = templates.find((t) => t.id === selectedId);

  return (
    <div className="space-y-5">
      <div className="max-w-sm">
        <Select
          value={selectedId}
          onValueChange={(v) => v !== null && setSelectedId(v)}
          items={templates.map((t) => ({ value: t.id, label: t.name }))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choisir un modèle" />
          </SelectTrigger>
          <SelectContent>
            {templates.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selected ? (
        <TemplateEditor
          // Remount on switch so local edits don't bleed across templates.
          key={`${selected.id}-v${selected.currentVersion}`}
          template={selected}
          canEdit={canEdit}
        />
      ) : null}
    </div>
  );
}
