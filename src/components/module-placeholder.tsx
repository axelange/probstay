import { Construction } from "lucide-react";

/**
 * Stands in for a module that has a route and navigation but no
 * implementation yet, so the shell is navigable end to end. Each is
 * replaced as its module is built.
 */
export function ModulePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md space-y-3 text-center">
        <Construction
          aria-hidden="true"
          className="text-muted-foreground mx-auto size-8"
        />
        <h2 className="text-lg font-medium">{title}</h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </div>
  );
}
