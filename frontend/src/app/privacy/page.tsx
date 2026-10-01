import type { Metadata } from "next";
import Link from "next/link";

import { LegalSection } from "@/components/site/legal-section";
import { SectionHeading } from "@/components/site/section-heading";
import { SITE } from "@/lib/site";

/**
 * The privacy policy.
 *
 * Written from what this codebase actually does, not from a template: the site
 * sets no cookies of its own, runs no analytics, self-hosts its fonts, and
 * collects personal data in exactly one place — the quote enquiry. Anything
 * stated here should stay true of the code; if a tracker or a form is added,
 * this page is part of that change.
 *
 * Square-bracketed text is a placeholder that must be completed before launch.
 * It is deliberately visible rather than invented, so an unreviewed policy
 * cannot quietly look finished. This is a draft and is not legal advice.
 */

export const metadata: Metadata = {
  title: "Privacy policy",
  description: `How ${SITE.name} collects, uses and stores personal information.`,
  alternates: { canonical: "/privacy" },
};

/** Fixed, not `new Date()`: a policy that redates itself every day is a lie. */
const LAST_UPDATED = "[date]";

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionHeading
        id="privacy-heading"
        level={1}
        title="Privacy policy"
        lead={`How ${SITE.name} handles personal information collected through this website.`}
        meta={`Last updated ${LAST_UPDATED}`}
      />

      <LegalSection id="who-we-are" title="Who we are">
        <p>
          This website is operated by [full legal company name], [registered
          address], which is the data controller for the information described
          below. You can reach us at{" "}
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a> or {SITE.phone}.
        </p>
      </LegalSection>

      <LegalSection id="what-we-collect" title="What we collect">
        <p>
          <strong className="text-foreground">Information you send us.</strong>{" "}
          When you request a quote we ask for your name, email address, phone
          number, and optionally your club or company name. We also record what
          you enquired about — the product, quantity, any options you chose and
          the notes you wrote.
        </p>
        <p>
          <strong className="text-foreground">Technical information.</strong>{" "}
          Our hosting provider, [hosting provider], keeps standard server logs.
          These typically include your IP address, the pages requested and your
          browser&rsquo;s user-agent string, and exist so the service can be run
          and abuse investigated.
        </p>
        <p>
          We do not run analytics, advertising or tracking software on this
          site, and we do not build profiles of visitors.
        </p>
      </LegalSection>

      <LegalSection id="why-we-use-it" title="Why we use it">
        <p>
          Enquiry details are used to prepare and send you a quote, to answer
          your questions, and to fulfil an order if you place one. The lawful
          basis is taking steps at your request before entering a contract, and
          our legitimate interest in responding to people who contact us.
        </p>
        <p>
          We do not send marketing email unless you ask us to, and we do not
          sell or rent your information to anyone.
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="Cookies and local storage">
        <p>
          This site sets no cookies of its own. If you use the light and dark
          mode switch, your choice is saved in your browser&rsquo;s local
          storage under the name <code>theme</code>. It never leaves your device
          and you can clear it at any time through your browser settings.
        </p>
        <p>
          Our typefaces are served from this site rather than from a font
          service, so displaying a page makes no request to a third party.
        </p>
      </LegalSection>

      <LegalSection id="third-parties" title="Third-party content and services">
        <p>
          <strong className="text-foreground">Google Maps.</strong> The{" "}
          <Link href="/contact">contact page</Link> embeds a map from Google.
          Opening that page loads content from Google, which can set its own
          cookies and receives your IP address. This is governed by{" "}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google&rsquo;s privacy policy
          </a>
          . No other page loads it.
        </p>
        <p>
          <strong className="text-foreground">WhatsApp.</strong> The WhatsApp
          button opens a conversation on WhatsApp. Nothing is sent until you
          send it, and any conversation there is subject to{" "}
          <a
            href="https://www.whatsapp.com/legal/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp&rsquo;s privacy policy
          </a>
          .
        </p>
        <p>
          <strong className="text-foreground">Processors.</strong> Enquiries are
          stored on infrastructure operated by [hosting provider] and notified
          to our staff by email through [email provider]. Both process the data
          on our instructions only.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="How long we keep it">
        <p>
          Quote enquiries are kept for [retention period] so that we can honour
          quotes, handle repeat orders and meet our accounting obligations.
          Server logs are kept for [log retention period].
        </p>
      </LegalSection>

      <LegalSection id="your-rights" title="Your rights">
        <p>
          You can ask us for a copy of the information we hold about you, ask us
          to correct it, or ask us to delete it. You can also object to how we
          use it, or ask us to restrict that use. Write to{" "}
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a> and we will respond
          within [response period].
        </p>
        <p>
          If you are unhappy with how we have handled your information you can
          complain to [relevant supervisory authority].
        </p>
      </LegalSection>

      <LegalSection id="transfers" title="Where your information is held">
        <p>
          We operate from {SITE.address}, and information you send us is stored
          on servers located in [server location]. If you contact us from
          outside that country, your information will be transferred there.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="Changes to this policy">
        <p>
          We update this page when what we do with information changes. The date
          at the top shows when it last changed.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="Contact us">
        <p>
          Questions about this policy should go to{" "}
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a>, or see the{" "}
          <Link href="/contact">contact page</Link> for other ways to reach us.
        </p>
      </LegalSection>
    </main>
  );
}
