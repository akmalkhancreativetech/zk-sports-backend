/**
 * The glyph for a product's `icon` field.
 *
 * The API stores an icon *name* ("shirt"), not an image, so something has to
 * map names to shapes. Unknown names render nothing rather than printing the
 * raw string — a product labelled with the word "shirt" beside its title is
 * worse than no icon at all. Add a name below to support it.
 */

const ICONS: Record<string, readonly string[]> = {
  shirt: [
    "M8.5 4L4 6.5 6 11l2.5-1.2V20h7V9.8L18 11l2-4.5L15.5 4",
    "M8.5 4h7a3.5 3.5 0 01-7 0z",
  ],
  cap: [
    "M4 14a8 8 0 0116 0",
    "M2 14h20v1.5a1.5 1.5 0 01-1.5 1.5h-17A1.5 1.5 0 012 15.5V14z",
  ],
  shorts: ["M5 4h14l1 16h-6l-2-7-2 7H4L5 4z"],
  socks: ["M8 3h5v9l4 4a3.5 3.5 0 01-5 5l-6-6V3z"],
  jacket: [
    "M8 4L4 6v14h4V4zM16 4l4 2v14h-4V4z",
    "M8 4h8v16H8z",
    "M12 4v16",
  ],
  ball: [
    "M12 21a9 9 0 100-18 9 9 0 000 18z",
    "M12 7.5l4 2.9-1.5 4.6h-5L8 10.4l4-2.9z",
  ],
};

export function ProductIcon({ name }: { name: string | null }) {
  const paths = name ? ICONS[name.toLowerCase()] : undefined;

  if (!paths) {
    return null;
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5 shrink-0 text-muted"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths.map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}
