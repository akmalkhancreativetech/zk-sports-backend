import type { Metadata } from "next";
import Link from "next/link";

import { LegalSection } from "@/components/site/legal-section";
import { SectionHeading } from "@/components/site/section-heading";
import { SITE } from "@/lib/site";

/**
 * Terms of service.
 *
 * Written for how this business actually works: made-to-order manufacturing
 * with no online checkout, where an enquiry is not an order and the price on a
 * product page is indicative. The clauses that matter here are the ones a
 * generic template omits — artwork rights, production tolerances, and the fact
 * that bespoke goods cannot simply be sent back.
 *
 * Square-bracketed text is a placeholder that must be completed before launch.
 * It is deliberately visible rather than invented, so an unreviewed document
 * cannot quietly look finished. This is a draft and is not legal advice.
 */

export const metadata: Metadata = {
  title: "Terms of service",
  description: `The terms on which ${SITE.name} quotes for and manufactures custom teamwear.`,
  alternates: { canonical: "/terms" },
};

/** Fixed, not `new Date()`: a document that redates itself every day is a lie. */
const LAST_UPDATED = "[date]";

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionHeading
        id="terms-heading"
        level={1}
        title="Terms of service"
        lead={`The terms on which ${SITE.name} quotes for, manufactures and supplies custom teamwear.`}
        meta={`Last updated ${LAST_UPDATED}`}
      />

      <LegalSection id="about" title="These terms">
        <p>
          This website is operated by [full legal company name], [registered
          address] (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By using this site or
          asking us for a quote you accept these terms. If you are agreeing on
          behalf of a club, school or company, you confirm you are authorised to
          do so.
        </p>
      </LegalSection>

      <LegalSection id="quotes" title="Quotations and orders">
        <p>
          <strong>An enquiry is not an order.</strong> Sending the form on this
          site tells us what you are interested in; it does not commit either of
          us to anything and does not reserve production capacity.
        </p>
        <p>
          We reply with a written quotation. A quotation is valid for [validity
          period] and a contract is formed only when you accept it in writing
          and we confirm acceptance. We may decline an enquiry.
        </p>
        <p>
          Minimum order quantities apply and are shown on each product. Orders
          below the minimum can sometimes be accommodated, but only if we agree
          it in the quotation.
        </p>
      </LegalSection>

      <LegalSection id="prices" title="Prices">
        <p>
          <strong>Prices on this website are indicative.</strong> A figure shown
          as &ldquo;from&rdquo; is a starting point for a typical specification
          and quantity. It is not an offer, and the price that applies is the
          one in your quotation.
        </p>
        <p>
          Unless the quotation says otherwise, prices are in [currency] and
          exclude taxes, duties, shipping and any customs charges in the
          destination country. Those are your responsibility as the importer.
        </p>
        <p>Payment terms are [payment terms].</p>
      </LegalSection>

      <LegalSection id="artwork" title="Artwork and intellectual property">
        <p>
          <strong>You are responsible for what you ask us to reproduce.</strong>{" "}
          By sending us a crest, logo, sponsor mark, player name or any other
          artwork, you confirm you own it or have permission to use it, and you
          agree to cover any claim brought against us because you did not.
        </p>
        <p>
          We will not knowingly reproduce a third party&rsquo;s trade mark
          without evidence of permission, and we may refuse or stop an order
          where we believe rights are being infringed.
        </p>
        <p>
          Patterns, technical drawings and digitised embroidery files we create
          remain ours unless the quotation says otherwise. We may show finished
          work in our portfolio and on social media; tell us in writing if you
          would rather we did not.
        </p>
      </LegalSection>

      <LegalSection id="tolerances" title="Production tolerances">
        <p>
          These are manufactured goods, and small variation is normal rather
          than a fault:
        </p>
        <p>
          <strong>Colour.</strong> Printed and dyed colour varies slightly
          between production runs and between fabrics, and screens do not show
          colour accurately. Where an exact match matters, ask for a physical
          sample before production and we will match to that.
        </p>
        <p>
          <strong>Measurements.</strong> Finished garments are within
          [tolerance] of the size chart supplied with your quotation.
        </p>
        <p>
          <strong>Quantity.</strong> We aim to deliver the exact quantity
          ordered and will tell you before production if a tolerance applies to
          your order.
        </p>
      </LegalSection>

      <LegalSection id="approval" title="Samples and approval">
        <p>
          Before cutting we send a mockup, and a physical sample where the
          quotation includes one, for you to approve. Production starts from the
          version you approve.
        </p>
        <p>
          Please check spelling, numbers, sizes and colours carefully at that
          point: once approved, an error in the approved artwork is not
          something we can absorb.
        </p>
      </LegalSection>

      <LegalSection id="lead-times" title="Lead times and delivery">
        <p>
          Lead times are estimates that run from artwork approval and, where
          applicable, receipt of your deposit — not from the date of enquiry.
          Delays caused by late approval, changes or supply of materials move
          the date accordingly.
        </p>
        <p>
          Risk in the goods passes to you on [delivery term]. We are not liable
          for delays caused by carriers, customs or anything outside our
          reasonable control.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="Changes and cancellation">
        <p>
          Tell us as early as you can if something needs to change. Before
          production we will usually accommodate it; after production has
          started a change may not be possible, and you may be charged for work
          already done and materials already committed.
        </p>
        <p>
          <strong>
            Custom-made goods cannot be cancelled once production has started.
          </strong>{" "}
          Items made to your specification — your colours, your crest, your
          names and numbers — cannot be resold to anyone else.
        </p>
      </LegalSection>

      <LegalSection id="faults" title="Faults and returns">
        <p>
          Please inspect goods on arrival and tell us about any shortage, damage
          or defect within [inspection period] of delivery, with photographs
          where you can.
        </p>
        <p>
          Where goods are genuinely faulty or do not match the approved sample,
          we will remake or refund the affected items. This does not cover
          ordinary wear, damage after delivery, incorrect care, or the variation
          described under production tolerances above.
        </p>
        <p>Nothing here affects rights you have by law that cannot be excluded.</p>
      </LegalSection>

      <LegalSection id="liability" title="Liability">
        <p>
          We do not exclude liability for death or personal injury caused by our
          negligence, for fraud, or for anything else that cannot lawfully be
          excluded.
        </p>
        <p>
          Subject to that, our total liability in connection with an order is
          limited to [liability cap], and we are not liable for loss of profit,
          loss of business or any indirect loss.
        </p>
      </LegalSection>

      <LegalSection id="website" title="Using this website">
        <p>
          The text, photography and design on this site belong to us. You may
          not copy or reuse them commercially without permission. Product
          photography shows previous work and represents the style of garment
          rather than the exact item you will receive.
        </p>
        <p>
          We try to keep the site accurate and available, but we do not
          guarantee either.
        </p>
      </LegalSection>

      <LegalSection id="law" title="Governing law">
        <p>
          These terms are governed by the laws of [jurisdiction], and the courts
          of [jurisdiction] have exclusive jurisdiction over any dispute.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="Contact us">
        <p>
          Questions about these terms should go to{" "}
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a>. See the{" "}
          <Link href="/contact">contact page</Link> for other ways to reach us,
          and the <Link href="/privacy">privacy policy</Link> for how we handle
          personal information.
        </p>
      </LegalSection>
    </main>
  );
}
