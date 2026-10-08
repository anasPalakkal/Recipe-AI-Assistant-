import type { Metadata } from "next";
import type { ReactNode } from "react";
import { APP_NAME } from "@/lib/brand";

const CONTACT_EMAIL = "mapshome.official@gmail.com";
const LAST_UPDATED = "October 8, 2026";

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

function EmailLink() {
  return (
    <a className="underline underline-offset-4" href={`mailto:${CONTACT_EMAIL}`}>
      {CONTACT_EMAIL}
    </a>
  );
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="font-heading text-4xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-3 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>

      <div className="mt-8 rounded-lg border bg-muted/40 p-5">
        <p className="font-medium">In short</p>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
          <li>We collect what is needed to run your account, chats and saved recipes.</li>
          <li>Your messages and photos are processed by AI services to generate answers.</li>
          <li>We do not sell your data and we do not show ads.</li>
          <li>
            You can ask us to delete your account by emailing <EmailLink />.
          </li>
        </ul>
      </div>

      <p className="mt-8 leading-7 text-muted-foreground">
        {APP_NAME} is an AI recipe assistant, built and operated as an independent project from
        India. This policy explains what data we collect, why, who processes it, and how you can
        have it deleted.
      </p>

      <Section title="Information we collect">
        <List
          items={[
            "Your account: your email address, your name if you give one or sign in with Google, and a password hash if you sign up with a password. We never store your actual password.",
            "Your chats and photos: the messages you send, the responses generated for you, and photos you upload for food analysis.",
            "Your saved recipes: the recipes you choose to save.",
            "AI request records: for every request to the AI, we store your message and the response, including failed requests. We use these to fix problems and prevent abuse.",
            "API usage: if you create API keys, we store a hash of each key and a record of each request made with it.",
            "Technical data: your IP address, which appears in our server logs and is used to limit excessive requests.",
          ]}
        />
      </Section>

      <Section title="How we use your information">
        <List
          items={[
            "To create and secure your account, and to send verification and password reset emails.",
            "To generate recipes and answers, and to analyze photos you upload.",
            "To limit usage, detect abuse and keep the service reliable.",
          ]}
        />
        <p>We do not sell your data, and we do not use it for advertising.</p>
      </Section>

      <Section title="Who processes your data">
        <p>We rely on these providers to run the service:</p>
        <List
          items={[
            "Google: sign-in with Google, and the Gemini AI service that generates recipes, answers and photo analysis.",
            "Cloudflare: AI requests pass through its gateway, which may keep logs that include messages and responses.",
            "Cloudinary: stores the photos you upload.",
            "Brevo: sends verification and password reset emails.",
            "Pexels: receives only a short dish description, such as \"garlic butter pasta\", to find a stock photo. It receives no account information.",
            "Vercel, Render, Neon and Upstash: host the website, the API, the database and the temporary data (such as sign-in sessions and verification codes) that keeps the service running.",
          ]}
        />
        <p>
          Your messages and photos are sent to Google&apos;s Gemini service. Google may retain this
          content and use it to improve its products, so please do not submit sensitive personal
          information.
        </p>
      </Section>

      <Section title="Cookies and browser storage">
        <p>
          We use one essential cookie to keep you signed in. Your session ends after 7 days
          without activity. We also save your light or dark theme choice in your browser. If you
          sign in with Google, Google may set its own cookies. We do not use analytics or
          advertising trackers.
        </p>
      </Section>

      <Section title="Retention and deletion">
        <p>
          We keep your account, chats, saved recipes, photos and AI request records until your
          account is deleted. To delete your account, email <EmailLink /> from the address
          registered to it. This removes your account and the data listed above. Copies held in
          our providers&apos; own logs, such as the AI gateway, follow those providers&apos;
          retention settings.
        </p>
        <p>You can also delete individual conversations and saved recipes inside the app.</p>
      </Section>

      <Section title="Your rights">
        <p>
          You can ask us for a copy of your data, ask us to correct it, or ask us to delete it.
          Contact us at the address below.
        </p>
      </Section>

      <Section title="Age requirement">
        <p>
          {APP_NAME} is for people aged 18 and over. If we learn that someone younger has
          created an account, we will delete it.
        </p>
      </Section>

      <Section title="Security">
        <p>
          We store passwords and API keys only as hashes, and connections to the service are
          encrypted. No online service can be made perfectly secure, so we cannot guarantee
          absolute security.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>If we change this policy, we will update the date at the top of this page.</p>
      </Section>

      <Section title="Contact">
        <p>
          Questions or requests: <EmailLink />
        </p>
      </Section>
    </main>
  );
}