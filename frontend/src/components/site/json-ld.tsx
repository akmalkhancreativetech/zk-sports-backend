/**
 * Renders a JSON-LD structured-data block.
 *
 * `<` is escaped to its unicode form before the payload reaches
 * `dangerouslySetInnerHTML`: values come from the CMS, and a `</script>` inside
 * a service title would otherwise close the tag and inject markup. This is the
 * escaping the Next JSON-LD guide prescribes.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
