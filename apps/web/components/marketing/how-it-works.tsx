import { SectionHeading } from "./section-heading";
import { MediaFrame } from "./media-frame";

const STEPS = [
    {
        title: "Ask",
        body: "Type what you feel like eating, or send a photo of a dish.",
        placeholder: "Screenshot placeholder: chat with a prompt",
    },
    {
        title: "Refine",
        body: "Ask for changes in plain language until the recipe fits your kitchen.",
        placeholder: "Screenshot placeholder: a recipe being modified",
    },
    {
        title: "Save",
        body: "Keep the recipes you love in your library and open them any time.",
        placeholder: "Screenshot placeholder: saved recipes grid",
    },
];

export function HowItWorks() {
    return (
        <section id="workflow" className="scroll-mt-20 border-y bg-muted/40">
            <div className="mx-auto max-w-6xl px-6 py-20">
                <SectionHeading eyebrow="Ask, refine, save" title="Three steps from idea to dinner" />
                <ol className="grid gap-8 md:grid-cols-3">
                    {STEPS.map((step, index) => (
                        <li key={step.title}>
                            <MediaFrame label={step.placeholder} aspectClassName="aspect-4/3" />
                            <div className="mt-5 flex items-start gap-3">
                                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                                    {index + 1}
                                </span>
                                <div>
                                    <h3 className="font-serif text-lg font-semibold">{step.title}</h3>
                                    <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
                                </div>
                            </div>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}