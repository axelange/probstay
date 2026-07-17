"use client";

import * as React from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

type Picture = { id: string; url: string; rank: number | null };

export function PropertyGallery({
  pictures,
  reference,
}: {
  pictures: Picture[];
  reference: number | null;
}) {
  const [activeIndex, setActiveIndex] = React.useState(0);

  if (pictures.length === 0) {
    return (
      <div className="bg-muted text-muted-foreground flex aspect-[3/2] w-full items-center justify-center rounded-lg">
        <ImageOff aria-hidden="true" className="size-6" />
        <span className="sr-only">Aucune photo disponible</span>
      </div>
    );
  }

  const active = pictures[activeIndex];

  return (
    <div className="space-y-3">
      <div className="bg-muted relative aspect-[3/2] w-full overflow-hidden rounded-lg">
        <Image
          key={active.id}
          src={active.url}
          alt={`Bien ${reference ?? ""} — photo ${activeIndex + 1} sur ${pictures.length}`}
          fill
          sizes="(min-width: 1024px) 60vw, 100vw"
          className="object-cover"
          priority
        />
      </div>

      {pictures.length > 1 ? (
        <ul className="grid grid-cols-6 gap-2 sm:grid-cols-8">
          {pictures.map((picture, index) => (
            <li key={picture.id}>
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Afficher la photo ${index + 1}`}
                aria-current={index === activeIndex}
                className={cn(
                  "bg-muted focus-visible:ring-ring relative block aspect-square w-full overflow-hidden rounded-md transition-opacity focus-visible:ring-2 focus-visible:outline-none",
                  index === activeIndex
                    ? "ring-primary ring-2"
                    : "opacity-60 hover:opacity-100"
                )}
              >
                <Image
                  src={picture.url}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
