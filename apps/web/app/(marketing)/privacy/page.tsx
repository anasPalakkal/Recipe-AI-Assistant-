import type { Metadata } from "next";
import type { ReactNode } from "react";
import { APP_NAME } from "@/lib/brand";

const CONTACT_EMAIL = "mapshome.official@gmail.com";
const LAST_UPDATED = "October 7, 2026";

export const metadata: Metadata = {
  title: `Privacy Policy | ${APP_NAME}`,
  description: `How ${APP_NAME} collects, uses and protects your data.`,
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-heading text-2xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 leading-7 text-muted-foreground">{children}</div>
    </section>
  );
}

function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-6">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="font-heading text-4xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-3 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>

      <p className="mt-8 leading-7 text-muted-foreground">
        {APP_NAME} is a recipe assistant built and operated as an independent project from India.
        This policy explains what data the service collects, why, who processes it, and how you can
        ask for it to be deleted.
      </p>

      <Section title="Information we collect">
        <List
          items={[
            "Account details: your email address, your name (if you provide one or sign in with Google), and a password hash if you sign up with a password. We never store your password itself.",
            "Chat content: your conversations, the messages you send, and the responses generated for you.",
            "Photos: images you upload for food analysis, stored as processed copies with location metadata removed.",
            "Saved recipes: recipes you save, including ingredients, steps and image credits.",
            "AI request logs: for every AI request we store the prompt and the full response, including failed requests, for debugging and abuse prevention.",
            "API usage: if you create API keys, we store a hash of each key (never the key itself) and a record of each request made with it.",
            "Technical data: your IP address, which appears in server logs and is used for rate limiting, and a session cookie (see Cookies).",
          ]}
        />
      </Section>

      <Section title="How we use it">
        <List
          items={[
            "To create and secure your account and send verification and password reset emails.",
            "To generate recipes and answers, and to analyze photos you upload.",
            "To enforce rate limits and usage quotas and to detect abuse.",
            "To diagnose errors and keep the service reliable.",
          ]}
        />
        <p>We do not sell your data and we do not show advertising.</p>
      </Section>

      <Section title="Who processes your data">
        <p>These providers process data on our behalf:</p>
        <List
          items={[
            "Google: sign-in with Google, and the Gemini API that generates recipes, answers and photo analysis. Your messages and uploaded photos are sent to Gemini.",
            "Cloudflare (AI Gateway): requests to Gemini pass through it, and it may keep request logs that include prompts and responses.",
            "Cloudinary: stores the photos you upload.",
            "Brevo: delivers verification and password reset emails.",
            "Pexels: receives only a short dish description (for example, \"garlic butter pasta\") to find a stock photo. It receives no account information.",
            "Vercel and Render: host the website, API, database and cache.",
          ]}
        />
        <p>
          About AI processing: depending on the plan under which the Gemini API is used, Google may
          retain submitted content and use it to improve its products. Please do not submit
          sensitive personal information in your messages or photos.
        </p>
      </Section>

      <Section title="Cookies and local storage">
        <p>
          We set one essential cookie, <code>sid</code>, which keeps you signed in. It is
          http-only, and a session expires after 7 days without activity. Your theme choice is
          saved in your browser&apos;s local storage. If you use Google sign-in, Google&apos;s
          script may set its own cookies. We use no analytics or advertising trackers.
        </p>
      </Section>

      <Section title="Retention and deletion">
        <p>
          We keep your account, chats, recipes, photos and AI request logs until your account is
          deleted. To delete your account, email{" "}
          <a className="underline underline-offset-4" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>{" "}
          from the address on the account. Deletion removes your account, chats, saved recipes,
          uploaded photos, AI request logs and API keys. Copies held in provider logs, such as
          the AI gateway, are governed by that provider&apos;s own retention settings.
        </p>
        <p>
          You can also delete individual conversations and saved recipes at any time inside the
          app.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          You can ask for a copy of the data we hold about you, ask us to correct it, or ask us
          to delete it. Contact us at the address below and we will respond as soon as we
          reasonably can.
        </p>
      </Section>

      <Section title="Children">
        <p>
          {APP_NAME} is intended for people aged 18 and over. We do not knowingly collect data
          from anyone younger, and we will delete any such account we become aware of.
        </p>
      </Section>

      <Section title="Security">
        <p>
          Passwords are hashed, sessions are server-side and revocable, API keys are stored only
          as hashes, and traffic is encrypted in transit. No system is perfectly secure, so we
          cannot guarantee absolute security.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          If we change this policy, we will update the date at the top of this page.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions or requests:{" "}
          <a className="underline underline-offset-4" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
        </p>
      </Section>
    </main>
  );
}