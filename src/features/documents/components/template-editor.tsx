"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Lock, Plus, X } from "lucide-react";
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
  CLAUSE_FIELDS,
  CLAUSE_VARIABLES,
  DEFAULT_CLAUSES,
  type DocumentTemplateTypeKey,
  type TemplateClauses,
} from "@/features/documents/template-clauses";
import { formatDate } from "@/features/rentals/components/rental-labels";

export type EditorTemplate = {
  id: string;
  type: string;
  name: string;
  currentVersion: number;
  clauses: TemplateClauses;
  versions: { version: number; createdAt: Date; author: string | null }[];
};

function Paragraph({
  value,
  onChange,
  onRemove,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onRemove: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex gap-2">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={Math.min(8, Math.max(2, Math.ceil(value.length / 90)))}
        className="border-input focus-visible:ring-ring w-full rounded-md border bg-transparent px-3 py-1.5 text-sm leading-relaxed focus-visible:ring-1 focus-visible:outline-none disabled:opacity-50"
      />
      <button
        type="button"
        aria-label="Retirer le paragraphe"
        onClick={onRemove}
        disabled={disabled}
        className="text-muted-foreground hover:text-destructive mt-1 h-fit cursor-pointer disabled:opacity-30"
      >
        <X aria-hidden="true" className="size-3.5" />
      </button>
    </div>
  );
}

/** One language of one clause: its paragraphs, in order. */
function LanguageColumn({
  lang,
  paragraphs,
  onChange,
  disabled,
}: {
  lang: "FR" | "EN";
  paragraphs: string[];
  onChange: (next: string[]) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-muted-foreground text-[10px] font-medium">
        {lang}
        {lang === "FR" ? " — fait foi" : " — courtoisie"}
      </p>
      {paragraphs.map((p, i) => (
        <Paragraph
          key={i}
          value={p}
          disabled={disabled}
          onChange={(v) => onChange(paragraphs.map((x, j) => (j === i ? v : x)))}
          onRemove={() => onChange(paragraphs.filter((_, j) => j !== i))}
        />
      ))}
      {!disabled ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...paragraphs, ""])}
        >
          <Plus aria-hidden="true" />
          Paragraphe
        </Button>
      ) : null}
    </div>
  );
}

/**
 * The template editor: the document's legal wording, clause by clause.
 *
 * Only the prose is editable. The composition — which section follows which,
 * where the parties, stay and financial tables sit, where the pages break —
 * stays in the template components, which match the agency's Figma master.
 * Saving always creates a new immutable version; generation only ever uses
 * the newest, older versions are kept read-only for traceability.
 */
export function TemplateEditor({
  template,
  canEdit,
}: {
  template: EditorTemplate;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [clauses, setClauses] = React.useState<TemplateClauses>(
    template.clauses
  );
  const [dirty, setDirty] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const disabled = isPending || !canEdit;

  const type = template.type as DocumentTemplateTypeKey;
  const fields = CLAUSE_FIELDS[type] ?? [];
  const variables = CLAUSE_VARIABLES[type] ?? [];

  /** What a clause currently reads — the stored wording, else the shipped one. */
  function clauseOf(key: string) {
    const stored = clauses[key];
    if (stored && (stored.fr.length > 0 || stored.en.length > 0)) return stored;
    return DEFAULT_CLAUSES[type]?.[key] ?? { fr: [], en: [] };
  }

  function setClause(key: string, lang: "fr" | "en", next: string[]) {
    setClauses((prev) => {
      const current = prev[key] ?? clauseOf(key);
      return { ...prev, [key]: { ...current, [lang]: next } };
    });
    setDirty(true);
  }

  function save() {
    startTransition(async () => {
      const result = await saveTemplate({ templateId: template.id, clauses });
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      toast.success(
        `Version ${result.version} enregistrée — c'est désormais la version utilisée.`
      );
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

      <p className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-xs">
        Seul le texte des clauses se modifie ici. La mise en page, l&apos;ordre
        des sections et les tableaux (parties, séjour, montants, signatures)
        sont fixés par la maquette.
        {variables.length > 0 ? (
          <>
            {" "}
            Variables disponibles :{" "}
            <span className="font-mono">
              {variables.map((v) => `{{${v}}}`).join(" ")}
            </span>
          </>
        ) : null}
      </p>

      <ul className="space-y-4">
        {fields.map((f) => {
          const clause = clauseOf(f.key);
          return (
            <li key={f.key} className="rounded-md border p-3">
              <p className="mb-2 text-xs font-medium">{f.label}</p>
              <div className="grid gap-3 md:grid-cols-2">
                <LanguageColumn
                  lang="FR"
                  paragraphs={clause.fr}
                  disabled={disabled}
                  onChange={(next) => setClause(f.key, "fr", next)}
                />
                <LanguageColumn
                  lang="EN"
                  paragraphs={clause.en}
                  disabled={disabled}
                  onChange={(next) => setClause(f.key, "en", next)}
                />
              </div>
            </li>
          );
        })}
      </ul>

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
