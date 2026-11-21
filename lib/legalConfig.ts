// ---------------------------------------------------------------------------
// EDIT THESE VALUES before launch. They are injected into the Terms, Privacy
// Policy and Cookie Policy. The legal text is a DRAFT: have a Nigerian lawyer
// review it before relying on it.
// ---------------------------------------------------------------------------
export const LEGAL = {
  businessName: '[YOUR BUSINESS NAME]',
  brandName: 'SPACEYA',
  contactEmail: '[YOUR CONTACT EMAIL]',
  dpoEmail: '[YOUR PRIVACY / DPO EMAIL]',
  address: '[YOUR REGISTERED BUSINESS ADDRESS], Nigeria',
  jurisdiction: 'the Federal Republic of Nigeria',
  governingCity: '[CITY, e.g. Lagos]',
  effectiveDate: '22 November 2026',
  // Bump this whenever the Terms or Privacy Policy change materially.
  // Users will be asked to accept the new version on next login.
  version: '2026-11-22',
};

export type LegalDoc = 'terms' | 'privacy' | 'cookies';
