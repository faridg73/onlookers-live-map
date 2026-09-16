import { Link } from "@tanstack/react-router";

/** Shared heading + body wrapper used by the legal pages and the popups. */
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-lg tracking-tight text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

/**
 * Terms of Service copy, rendered both on /terms and inside the sign-up popup so
 * people can read it without leaving the form.
 */
export function TermsBody() {
  return (
    <>
      <p className="text-sm leading-relaxed text-muted-foreground">
        By downloading, installing, accessing, or signing into Onlooker (the &ldquo;Platform&rdquo;),
        you (&ldquo;User&rdquo;, &ldquo;Creator&rdquo;, or &ldquo;Participant&rdquo;) unconditionally
        accept and agree to be bound by these Terms of Service. If you do not agree, you must
        immediately uninstall the app and cease all use.
      </p>

      <Section title="Platform Role as Passive Host">
        <p>
          Onlooker operates exclusively as a peer-to-peer software platform and technological
          intermediary that connects individuals posting media requests (&ldquo;Posters&rdquo;) with
          individuals fulfilling requests (&ldquo;Fulfillers&rdquo;). Onlooker is not a publisher,
          employer, agent, or security supervisor of its users, exercises no control over physical
          field activities, and disclaims all liability arising from real-world interactions.
        </p>
      </Section>

      <Section title="User Conduct, Legality &amp; Compliance Mandates">
        <p>
          <strong className="text-foreground">Strict adherence to law.</strong> Users must comply
          with all applicable local, state, federal, and international laws, statutes, ordinances,
          and regulations while using the Platform or fulfilling bounties.
        </p>
        <p>
          <strong className="text-foreground">Public spaces &amp; expectation of privacy.</strong>{" "}
          Users are strictly prohibited from capturing, recording, or streaming video in areas where
          a reasonable expectation of privacy exists under applicable law (such as private
          residences, bathrooms, locker rooms, or restricted corporate interiors). All recordings
          must take place strictly within lawful public thoroughfares or areas with open public
          access.
        </p>
        <p>
          <strong className="text-foreground">Prohibition of trespassing &amp; encroachment.</strong>{" "}
          Users shall not trespass onto private property, break through physical or digital security
          barriers, or enter restricted zones without explicit, verifiable authorization.
        </p>
        <p>
          <strong className="text-foreground">
            Credentials &amp; authorization for specialized bounties.
          </strong>{" "}
          If a bounty or request involves restricted premises, private commercial spaces, or matters
          requiring official standing, the user warrants that they possess all necessary licenses,
          permits, legal credentials, and proper authorization before attempting fulfillment. Users
          must never impersonate law enforcement officers, government officials, or authorized
          security personnel.
        </p>
        <p>
          <strong className="text-foreground">Prohibition of harassment &amp; illegal acts.</strong>{" "}
          Users agree not to use Onlooker to stalk, harass, intimidate, threaten, or record
          individuals in a manner that violates personal rights, privacy torts, or anti-harassment
          statutes.
        </p>
      </Section>

      <Section title="User-Generated Content (UGC) License">
        <p>
          <strong className="text-foreground">You keep ownership.</strong> Users retain full
          ownership of the photos, videos, audio, text, and other materials they create and upload
          (&ldquo;User-Generated Content&rdquo; or &ldquo;UGC&rdquo;).
        </p>
        <p>
          <strong className="text-foreground">License you grant us.</strong> By uploading UGC you
          grant Onlooker a worldwide, non-exclusive, royalty-free, transferable and sublicensable
          license to host, store, reproduce, modify (for formatting, thumbnails, and compression),
          publicly display, publicly perform, stream, and distribute that UGC in connection with
          operating, providing, improving, and promoting the Platform. This license ends for a piece
          of UGC when you delete it, except where it has already been delivered to a requester as
          part of a completed bounty, shared by you with others, or retained as required by law.
        </p>
        <p>
          <strong className="text-foreground">Your warranty.</strong> You represent and warrant that
          you own or control all rights to your UGC, that it does not infringe any third
          party&rsquo;s copyright, trademark, privacy, publicity, or other rights, and that you have
          obtained any consents required by law for anyone identifiably depicted.
        </p>
        <p>
          <strong className="text-foreground">Zero-tolerance moderation &amp; content removal.</strong>{" "}
          Onlooker reserves the right, but assumes no obligation, to review, moderate, flag, suspend,
          or permanently delete any bounty, user profile, or uploaded video that violates these
          terms, depicts illegal acts, or exposes the Platform to legal risk, without prior notice
          or compensation.
        </p>
      </Section>

      <Section title="Prohibited Content and Conduct">
        <p>
          <strong className="text-foreground">The following are strictly prohibited</strong> and
          result in immediate content removal and possible permanent account termination:
        </p>
        <p>
          (a) any content that is unlawful, or that depicts, promotes, or facilitates illegal
          activity; (b) content involving minors in any sexual, exploitative, or dangerous context;
          (c) violence, gore, torture, or content glorifying harm to people or animals; (d) hate
          speech or content targeting individuals or groups based on race, ethnicity, religion,
          gender, sexual orientation, disability, or similar protected characteristics; (e)
          harassment, stalking, doxxing, threats, or intimidation of any person; (f) non-consensual
          intimate imagery or recording of any person in a state of undress or where they have a
          reasonable expectation of privacy; (g) fraud, scams, impersonation, or deceptive
          practices, including impersonating law enforcement or officials; (h) spam, malware,
          phishing, or attempts to compromise the Platform or other users&apos; accounts; (i)
          infringement of intellectual-property rights, including recording or restreaming
          ticketed, paywalled, or broadcast events; (j) content that endangers public safety,
          including interference with emergency services.
        </p>
        <p>
          We may report suspected illegal content to law enforcement and preserve related records
          for that purpose.
        </p>
      </Section>

      <Section title="Copyright and DMCA Takedown Policy">
        <p>
          <strong className="text-foreground">Reporting infringement.</strong> If you believe
          content on Onlooker infringes your copyright, send a written notice containing: (1) your
          physical or electronic signature; (2) identification of the copyrighted work claimed to be
          infringed; (3) identification of the infringing material and its location on the Platform
          (a link or the bounty/video reference); (4) your name, address, telephone number, and
          email; (5) a statement that you have a good-faith belief the use is not authorized by the
          copyright owner, its agent, or the law; and (6) a statement, under penalty of perjury,
          that the information in your notice is accurate and that you are the copyright owner or
          authorized to act on their behalf.
        </p>
        <p>
          <strong className="text-foreground">Our response.</strong> Upon receipt of a valid notice
          under 17 U.S.C. &sect;512, we will remove or disable access to the identified material,
          notify the user who posted it, and provide them an opportunity to submit a
          counter-notification. Where a valid counter-notification is received, we may restore the
          material unless the complainant files a court action within the statutory period.
        </p>
        <p>
          <strong className="text-foreground">Repeat infringers.</strong> Accounts of users who
          repeatedly infringe copyright will be terminated.
        </p>
      </Section>

      <Section title="Assumption of Risk, Liability Waiver &amp; Indemnification">
        <p>
          <strong className="text-foreground">Explicit assumption of risk.</strong> Participation in
          crowdsourced media recording and bounty hunting carries inherent physical, legal, and
          financial hazards, including but not limited to physical confrontation, accidents,
          property damage, civil citations, and criminal arrest. Users voluntarily and knowingly
          assume all such risks.
        </p>
        <p>
          <strong className="text-foreground">Full release of liability.</strong> To the maximum
          extent permitted by law, Onlooker, its creators, founders, officers, employees, and
          partners shall not be held liable for any direct, indirect, incidental, special,
          consequential, or punitive damages, including personal injury, property loss, legal fees,
          or financial penalties, arising out of or in connection with app usage or field activities.
        </p>
        <p>
          <strong className="text-foreground">Mandatory indemnification.</strong> You agree to
          defend, indemnify, and hold harmless Onlooker and its affiliates from and against any
          claims, liabilities, damages, judgments, awards, losses, costs, or expenses (including
          reasonable attorneys&rsquo; fees) resulting from your violation of these terms,
          infringement of third-party rights, or any unlawful actions taken while using the
          Platform.
        </p>
      </Section>

      <Section title="User-Generated Content and Real-World Platform Utility">
        <p>
          <strong className="text-foreground">Physical-Capture Restriction.</strong> Onlooker LLC
          is strictly a platform designed to crowdsource real-time, real-world visual logistics of
          physical locations (e.g., foot-traffic density, entry-line lengths, parking availability,
          and stadium seat configurations). You agree that you will only fulfill requests and post
          content captured through your device&apos;s physical, outward-facing camera lens looking at
          physical space.
        </p>
        <p>
          <strong className="text-foreground">
            Prohibition on Digital Screen Captures and Third-Party Platforms.
          </strong>{" "}
          You are explicitly prohibited from recording, streaming, snapshotting, uploading, or
          transmitting any content that captures digital displays, software user interfaces, or
          mobile applications owned by third parties. This includes, but is not limited to,
          ticketing platforms, digital ticket barcodes, QR codes, live broadcast feeds, or
          proprietary streaming interfaces (such as Ticketmaster, StubHub, Live Nation, or
          equivalent services).
        </p>
        <p>
          <strong className="text-foreground">Indemnification &amp; Liability for Breach.</strong>{" "}
          Onlooker LLC employs automated keyword filters and technical restrictions to block digital
          application recordings. Circumvention of these safeguards constitutes a material breach of
          these Terms. You agree to indemnify, defend, and hold harmless Onlooker LLC, its
          parents, subsidiaries, and affiliates from any claims, liabilities, losses, damages,
          costs, or expenses (including reasonable attorneys&apos; fees) arising out of or related to
          your distribution of unauthorized third-party digital property or copyrighted material on
          the platform.
        </p>
      </Section>
    </>
  );
}

/**
 * Privacy Policy copy. `linkToTerms` is off inside the popup so a reader never
 * gets pulled out of the sign-up form mid-sentence.
 */
export function PrivacyBody({ linkToTerms = true }: { linkToTerms?: boolean }) {
  const termsRef = linkToTerms ? (
    <Link to="/terms" className="font-semibold text-foreground underline underline-offset-4">
      Terms of Service
    </Link>
  ) : (
    <span className="font-semibold text-foreground">Terms of Service</span>
  );

  return (
    <>
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        Last updated: September 2026
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        This Privacy Policy explains what Onlooker (&ldquo;we&rdquo;, &ldquo;us&rdquo;) collects when
        you use the Onlooker app and website, why we collect it, who it is shared with, and the
        control you have over it. Onlooker is a peer-to-peer platform where people post paid
        requests for live photos and video and other people fulfil them. Using the app means you
        accept this policy and our {termsRef}.
      </p>

      <Section title="1. Account information we collect">
        <p>
          When you create an account we collect your email address, an encrypted authentication
          credential (password hash) or a Google sign-in identifier, your chosen display name, and
          an optional profile photo. We also store your account creation date, sign-in timestamps
          and the device/browser type used, for security and fraud prevention.
        </p>
        <p>
          If you earn or spend money on the platform we store wallet balances, bounty amounts, boost
          contributions, payout requests and transaction history. Card details are never stored by
          Onlooker; card payments are processed by our payment provider under its own privacy terms.
        </p>
        <p>
          Onlooker is not intended for children under 13 (or the minimum age in your country) and we
          do not knowingly collect data from them.
        </p>
      </Section>

      <Section title="2. Real-time GPS and location data">
        <p>
          <strong className="text-foreground">What we collect.</strong> With your permission, the app
          reads your device&rsquo;s precise location (GPS) to show the map centred on you, to list
          nearby bounty requests by distance, to place the pin for a request you post, and to verify
          that a fulfiller is physically at the requested location when they submit media
          (geofence check).
        </p>
        <p>
          <strong className="text-foreground">When we collect it.</strong> Location is read only
          while the app is open and in use. Onlooker does not track your location in the background
          and does not build a continuous movement history of you.
        </p>
        <p>
          <strong className="text-foreground">What is shared.</strong> The location attached to a
          request or an uploaded capture is visible to the other party in that transaction and can
          appear as an approximate area or place name in the public feed. Your live position is
          never shown to other users.
        </p>
        <p>
          <strong className="text-foreground">Your control.</strong> You may refuse or revoke the
          location permission at any time in your device settings. The app remains usable, but map
          centring, distance sorting and geofence-verified submissions will not work.
        </p>
      </Section>

      <Section title="3. Camera, microphone and uploaded bounty videos">
        <p>
          Fulfilling a bounty requires camera access, and video capture requires microphone access.
          Media is captured only when you actively start a capture; the app does not record silently
          or in the background.
        </p>
        <p>
          Photos and videos you submit are uploaded to our secure cloud storage together with the
          request they belong to, your user ID, the capture time, an auto-generated thumbnail image
          and the associated bounty amount. Media files are stored in a private bucket and are
          served only through short-lived signed links to people entitled to view them, or to anyone
          you deliberately send a share link to.
        </p>
        <p>
          You keep ownership of your media. You grant us the licence described in the Terms of
          Service purely so we can store, process and display it inside the platform. We may review
          content reported as unlawful or unsafe and remove it.
        </p>
      </Section>

      <Section title="4. How we use your data">
        <p>
          We use the data above to operate accounts and sign-in, match requests with nearby
          fulfillers, verify that captures were taken at the right place, process bounties, boosts
          and payouts, calculate ratings and the Top Reporters ranking, provide customer support,
          detect abuse and fraud, and meet our legal obligations. We do not sell your personal data,
          and we do not use your location or media for advertising or third-party profiling.
        </p>
      </Section>

      <Section title="5. Who we share data with">
        <p>
          We share only what is necessary with service providers that run the platform on our
          behalf: our cloud database, authentication and storage provider; our payment processor for
          top-ups and payouts; and error/analytics tooling that receives technical diagnostics. These
          providers are bound to use the data only to deliver their service to us.
        </p>
        <p>
          We may disclose data where legally required by valid legal process, or where necessary to
          protect the rights, safety or property of users or the public. If Onlooker is acquired or
          merged, account data may transfer to the successor entity under this policy.
        </p>
      </Section>

      <Section title="6. Retention">
        <p>
          Account and transaction records are kept for as long as your account exists and afterwards
          only as required for tax, accounting, dispute or legal purposes. Bounty media is retained
          indefinitely so you and the requester can replay past captures, unless you delete it. Once
          deleted, a video, its thumbnail and its database record are removed from active storage and
          purged from backups on our normal backup cycle.
        </p>
      </Section>

      <Section title="7. Security">
        <p>
          Data is transmitted over encrypted HTTPS connections and stored with encryption at rest.
          Access rules at the database level restrict every record to the users entitled to it, and
          media is kept in a private bucket reachable only via expiring signed links. No system can
          be guaranteed perfectly secure, so please use a strong, unique password.
        </p>
      </Section>

      <Section title="8. Your rights and choices">
        <p>
          You can view and edit your name and profile photo, delete individual bounty videos, and
          delete your entire account from your profile settings. Deleting your account removes your
          profile, uploaded media and location records associated with you, other than records we
          must retain by law.
        </p>
        <p>
          Depending on where you live (for example under the GDPR or the CCPA/CPRA) you may also
          request a copy of your data, ask us to correct or erase it, object to or restrict certain
          processing, and lodge a complaint with your local data protection authority. We do not
          sell or share personal information as those laws define the terms. Contact us to exercise
          any of these rights.
        </p>
      </Section>

      <Section title="8A. California privacy rights (CCPA/CPRA)">
        <p>
          If you are a California resident, the California Consumer Privacy Act (as amended by the
          CPRA) gives you the rights below, which you can exercise free of charge:
        </p>
        <p>
          <strong className="text-foreground">Right to know.</strong> You may request the categories
          and specific pieces of personal information we have collected about you, the sources, the
          purposes, and the categories of third parties it is disclosed to. In the preceding 12
          months we have collected: identifiers (name, email, user ID); internet or other electronic
          network activity (sign-in timestamps, device/browser data); precise geolocation data
          (while the app is in use); audio/visual information (the bounty media you upload); and
          commercial information (wallet and transaction history).
        </p>
        <p>
          <strong className="text-foreground">Right to delete and correct.</strong> You may request
          deletion of your personal information, or correction of inaccurate information, subject to
          legal exceptions (for example transaction records we must keep for tax and accounting).
        </p>
        <p>
          <strong className="text-foreground">Right to opt out of sale or sharing.</strong> We do
          not sell your personal information for money and we do not share it for cross-context
          behavioral advertising, so there is nothing to opt out of. If this ever changes, a
          &ldquo;Do Not Sell or Share My Personal Information&rdquo; control will be provided.
        </p>
        <p>
          <strong className="text-foreground">Right to limit sensitive data and to
          non-discrimination.</strong> Precise geolocation is a sensitive category and is used only
          to provide the service you request; we do not use or disclose it for other purposes. We
          will never discriminate against you for exercising any CCPA right. You may also designate
          an authorized agent to make a request on your behalf; we will verify the request as the
          law requires.
        </p>
      </Section>

      <Section title="9. Permissions summary for app stores">
        <p>
          <strong className="text-foreground">Location (precise, while in use)</strong>, map
          centring, nearby request distances, pin placement, geofence verification of captures.
        </p>
        <p>
          <strong className="text-foreground">Camera</strong>, capturing the photo or video that
          fulfils a bounty request.
        </p>
        <p>
          <strong className="text-foreground">Microphone</strong>, recording audio as part of a
          bounty video.
        </p>
        <p>
          <strong className="text-foreground">Photos / storage</strong>, saving or selecting a
          profile photo where you choose to.
        </p>
        <p>
          Each permission is requested at the moment it is needed and can be declined or later
          revoked in your device settings.
        </p>
      </Section>

      <Section title="10. Changes and contact">
        <p>
          We will update this policy when our practices change and will revise the date at the top.
          Material changes will be announced in the app. Questions or privacy requests can be sent to
          our support address listed on the app store listing.
        </p>
      </Section>
    </>
  );
}
