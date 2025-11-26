"use client";

export function Newsletter() {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-semibold text-base leading-6 text-foreground">Stay up to date</h3>
      {/* Mobile: vertical, taller */}
      <div className="block md:hidden">
        <iframe
          src="https://paragraph.com/@karmahq/embed?minimal=true&vertical=true"
          width="256"
          height="90"
          frameBorder="0"
          scrolling="no"
          title="Subscribe to KarmaHQ via Paragraph (mobile)"
        ></iframe>
      </div>
      {/* Desktop: horizontal, shorter */}
      <div className="hidden md:block">
        <iframe
          src="https://paragraph.com/@karmahq/embed?minimal=true"
          width="320"
          height="45"
          frameBorder="0"
          scrolling="no"
          title="Subscribe to KarmaHQ via Paragraph (desktop)"
        ></iframe>
      </div>
    </div>
  );
}
