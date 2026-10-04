interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
}

export function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center">
      <p className="mb-3 text-sm font-medium text-primary">{eyebrow}</p>
      <h2 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      {description && <p className="mt-4 text-muted-foreground">{description}</p>}
    </div>
  );
}