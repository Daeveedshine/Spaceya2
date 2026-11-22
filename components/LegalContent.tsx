import React from 'react';
import { LEGAL } from '../lib/legalConfig';

const H: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-sm font-black uppercase tracking-widest mt-8 mb-2 text-black dark:text-white">{children}</h3>
);
const P: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 mb-3">{children}</p>
);
const L: React.FC<{ items: React.ReactNode[] }> = ({ items }) => (
  <ul className="list-disc pl-5 space-y-1.5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 mb-3">
    {items.map((i, k) => <li key={k}>{i}</li>)}
  </ul>
);

const Draft: React.FC = () => (
  <div className="mb-6 p-4 rounded-2xl border border-amber-400/50 bg-amber-50 dark:bg-amber-500/10 text-[11px] font-bold text-amber-800 dark:text-amber-300">
    DRAFT: this document must be reviewed by a qualified Nigerian lawyer, and the placeholders in square brackets completed, before it is relied on.
  </div>
);

export const Terms: React.FC = () => (
  <div>
    <Draft />
    <P>Effective {LEGAL.effectiveDate} · Version {LEGAL.version}</P>
    <P>These Terms of Service ("Terms") govern your use of the {LEGAL.brandName} platform (the "Platform"), operated by {LEGAL.businessName} ("we", "us"). By creating an account or using the Platform you agree to these Terms and to our Privacy Policy. If you do not agree, do not use the Platform.</P>

    <H>1. What the Platform is</H>
    <P>{LEGAL.brandName} is a software tool that helps property agents, tenants and administrators manage listings, tenancy applications, maintenance requests, agreements and payments. We are a technology provider. We are not a landlord, estate agent, tenant, guarantor or party to any tenancy or lease concluded between users, and we do not own, inspect or verify the properties listed.</P>

    <H>2. Eligibility and accounts</H>
    <L items={[
      'You must be at least 18 and legally able to enter a binding contract.',
      'You must provide accurate information and keep your login details confidential. You are responsible for all activity under your account.',
      'Agent and Tenant accounts can be created by self-registration. Administrator accounts are created by us only.',
      'You must tell us promptly if you suspect unauthorised use of your account.',
    ]} />

    <H>3. Agents</H>
    <L items={[
      'You confirm that you are authorised to list, let or manage every property you add, and that listing details are accurate.',
      'You are responsible for complying with all laws applicable to your activity, including tenancy, agency, consumer-protection and data-protection laws.',
      'You are the controller of any applicant information you collect through your application form and must handle it lawfully, only for screening and managing the tenancy.',
      'Platform fees, if any, are shown before you pay them.',
    ]} />

    <H>4. Tenants and applicants</H>
    <L items={[
      'Information and documents you submit (including identity documents) must be genuine and your own. Submitting false or forged documents is a breach of these Terms and may be reported to the authorities.',
      'Submitting an application does not guarantee acceptance. Approval decisions are made by the agent, not by us.',
      'Any tenancy agreement is between you and the agent or landlord. Read it before signing.',
    ]} />

    <H>5. Payments and wallet</H>
    <L items={[
      'Card and bank payments are processed by Paystack, a third-party payment processor. We do not store your full card details.',
      'Wallet balances are records of funds credited through verified payments. A wallet is not a bank account and does not earn interest.',
      'Payments are credited only after server-side verification with the payment processor. Delays or failures at the processor or your bank are outside our control.',
      'Fees, refunds and withdrawals are subject to the rules displayed in the Platform and to the payment processor’s terms. We may delay or refuse a transaction we reasonably suspect to be fraudulent or unlawful, and may request identity verification.',
      'You are responsible for any taxes that apply to your own income.',
    ]} />

    <H>6. Acceptable use</H>
    <P>You must not: submit false information; impersonate anyone; attempt to access other users’ data or the Platform’s systems without permission; probe, scrape, overload or reverse-engineer the Platform; upload malware or unlawful content; use the Platform for money laundering, fraud or any unlawful purpose; or harass other users.</P>

    <H>7. Your content</H>
    <P>You keep ownership of the content you submit. You give us a limited licence to store, process and display it solely to operate the Platform for you and the users you choose to share it with. You confirm you have the right to submit it.</P>

    <H>8. Disputes between users</H>
    <P>Disputes about rent, deposits, property condition, maintenance or tenancy terms are between the users involved. We have no obligation to resolve them, although we may, at our discretion, help by providing relevant records where the law allows.</P>

    <H>9. Availability and changes</H>
    <P>We aim to keep the Platform available but do not promise uninterrupted or error-free service. We may change, suspend or discontinue features, and may update these Terms. If a change is material we will ask you to accept the new version. Continued use after notice means you accept it.</P>

    <H>10. Suspension and termination</H>
    <P>We may suspend or close an account that breaches these Terms or that we reasonably believe is used unlawfully. You may stop using the Platform and request account deletion at any time (see the Privacy Policy). Provisions that by nature should survive termination will survive.</P>

    <H>11. Disclaimers and limitation of liability</H>
    <P>The Platform is provided "as is" and "as available". To the fullest extent permitted by law, we do not warrant the accuracy of user-submitted information, listings or screening outcomes, and we are not liable for the acts or omissions of agents, landlords or tenants. To the fullest extent permitted by law, our total liability to you for any claim relating to the Platform is limited to the greater of the fees you paid us in the 12 months before the claim or ₦50,000, and we are not liable for indirect or consequential loss, loss of profit or loss of data. Nothing in these Terms excludes liability that cannot lawfully be excluded, including for fraud or for death or personal injury caused by negligence.</P>

    <H>12. Indemnity</H>
    <P>You agree to indemnify us against claims, losses and costs arising from your breach of these Terms, your content, or your unlawful use of the Platform, to the extent permitted by law.</P>

    <H>13. Governing law and disputes</H>
    <P>These Terms are governed by the laws of {LEGAL.jurisdiction}. We encourage you to contact us first at {LEGAL.contactEmail} so we can try to resolve any concern informally. Unresolved disputes are subject to the courts of {LEGAL.governingCity}, unless mandatory law gives you another right.</P>

    <H>14. Contact</H>
    <P>{LEGAL.businessName}. Email: {LEGAL.contactEmail}.</P>
  </div>
);

export const Privacy: React.FC = () => (
  <div>
    <Draft />
    <P>Effective {LEGAL.effectiveDate} · Version {LEGAL.version}</P>
    <P>This Privacy Policy explains how {LEGAL.businessName} ("we", "us") collects and uses personal data through the {LEGAL.brandName} platform, in line with the Nigeria Data Protection Act 2023 (NDPA). We are the data controller for account and platform data. Agents who collect applicant information through their forms are also responsible for how they use that information.</P>

    <H>1. Data we collect</H>
    <L items={[
      <><b>Account data:</b> name, email address, phone number, role, profile photo, password (stored by our authentication provider, never readable by us).</>,
      <><b>Tenancy application data:</b> date of birth, gender, marital status, occupation, household size, current address, reason for relocating, current landlord details, identity document type and number (for example NIN), a photo of your ID, a passport photograph, signature and any custom answers requested by the agent.</>,
      <><b>Property and tenancy data:</b> listings, agreements, rent dates, maintenance tickets and notifications.</>,
      <><b>Payment data:</b> wallet balance, transaction records, payment references and bank account details you add for withdrawals. Card details are entered with Paystack and are not stored by us.</>,
      <><b>Technical data:</b> device and browser type, login timestamps, and consent records (version accepted and time).</>,
    ]} />
    <P>Identity-document and photo data is among the most sensitive we hold. We ask only for what the agent’s screening needs.</P>

    <H>2. Why we use it and our lawful basis</H>
    <L items={[
      'To create and run your account and provide the Platform (performance of a contract).',
      'To let an agent screen your application and manage a tenancy you apply for (your consent and performance of a contract).',
      'To process payments, prevent fraud and meet financial-crime obligations (contract, legal obligation, legitimate interests).',
      'To send service notifications such as application updates and payment receipts (contract, legitimate interests).',
      'To keep the Platform secure and to resolve disputes (legitimate interests).',
      'Optional analytics, only if you allow them in the cookie settings (consent).',
    ]} />
    <P>Where we rely on consent you can withdraw it at any time, which does not affect earlier processing.</P>

    <H>3. Who can see your data</H>
    <L items={[
      <><b>The agent you apply to</b> can see your application and documents. Other agents and other tenants cannot.</>,
      <><b>Platform administrators</b> can access data where needed to operate, secure and support the Platform.</>,
      <><b>Service providers</b> acting on our instructions: Google Firebase (authentication and database), Vercel (hosting), and Paystack (payments). They may process data outside Nigeria; where this happens we rely on appropriate safeguards required by the NDPA.</>,
      <><b>Authorities</b> where the law requires or a valid legal request is made.</>,
    ]} />
    <P>We do not sell personal data.</P>

    <H>4. How long we keep it</H>
    <P>We keep data only as long as needed for the purposes above. Application records are kept while the application or tenancy is active and for a limited period afterwards for dispute and legal purposes; financial records are kept for the period required by Nigerian law. When data is no longer needed we delete or anonymise it. [Lawyer to confirm exact retention periods.]</P>

    <H>5. Your rights</H>
    <P>Subject to the NDPA you may ask to: access your data, receive a copy, correct inaccurate data, delete data, restrict or object to processing, withdraw consent, and not be subject to solely automated decisions with significant effects. Use "Privacy & Data" in your Profile to download your data or request deletion or correction, or email {LEGAL.contactEmail}. We aim to respond within 30 days. Some data (for example financial records) may need to be kept for legal reasons. You may also complain to the Nigeria Data Protection Commission (NDPC).</P>

    <H>6. Security</H>
    <P>We use access controls, encrypted connections, server-side verification of payments, and role-based database rules. No system is perfectly secure. If a personal data breach occurs that is likely to risk your rights and freedoms, we will notify the NDPC within the period required by law and tell affected users without undue delay.</P>

    <H>7. Children</H>
    <P>The Platform is for adults. We do not knowingly collect data from anyone under 18. If you believe a minor has registered, contact us and we will delete the account.</P>

    <H>8. Cookies and local storage</H>
    <P>See our Cookie Policy.</P>

    <H>9. Changes</H>
    <P>We may update this policy. If a change is material we will ask you to review and accept it.</P>

    <H>10. Contact</H>
    <P>{LEGAL.businessName}. Privacy contact: {LEGAL.contactEmail}.</P>
  </div>
);

export const Cookies: React.FC = () => (
  <div>
    <Draft />
    <P>Effective {LEGAL.effectiveDate} · Version {LEGAL.version}</P>
    <P>{LEGAL.brandName} uses cookies and similar browser storage (such as localStorage). This page explains what each is for. You can change your choice at any time using "Cookie settings" in the footer or sidebar.</P>

    <H>Strictly necessary (always on)</H>
    <L items={[
      'Sign-in and session tokens set by Firebase Authentication, needed to keep you logged in and protect your account.',
      'A local copy of your app data (so the app works smoothly) and your cookie choice itself.',
      'Security and load-balancing features of our hosting provider.',
    ]} />
    <P>These cannot be switched off because the Platform will not work without them.</P>

    <H>Preferences (optional)</H>
    <P>Remember settings such as light or dark mode.</P>

    <H>Analytics (optional, off by default)</H>
    <P>If we add usage analytics, it will load only after you choose to allow it. We do not use advertising cookies.</P>

    <H>Third parties</H>
    <P>Paystack’s payment window, Google sign-in and Firebase may set their own cookies when you use them. Please see their policies.</P>

    <H>Managing cookies</H>
    <P>You can also clear or block cookies in your browser settings, but signing in may stop working.</P>
  </div>
);
