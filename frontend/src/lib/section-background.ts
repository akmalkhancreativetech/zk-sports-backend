import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Static artwork for a page section, or null when the file is not there.
 *
 * Convention over configuration: `public/images/<name>.<ext>` is picked up
 * automatically, so adding a background is dropping a file in rather than
 * editing a constant. A section with no file renders its plain treatment, which
 * keeps the page coherent before the artwork exists.
 *
 * Server-only — this touches the filesystem, so it must not be imported into a
 * client component.
 */

/** Preference order: webp first, since it is the smallest of the four. */
const EXTENSIONS = ["webp", "jpg", "jpeg", "png"] as const;

export function sectionBackground(name: string): string | null {
  for (const extension of EXTENSIONS) {
    const relative = `images/${name}.${extension}`;

    if (existsSync(join(process.cwd(), "public", relative))) {
      return `/${relative}`;
    }
  }

  return null;
}
