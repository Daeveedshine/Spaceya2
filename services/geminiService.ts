
/**
 * AI Service Integration Disabled
 * This service previously handled Gemini API calls for maintenance analysis and tenant screening.
 * Features have been disabled as per configuration.
 */

export const analyzeMaintenanceRequest = async (issueDescription: string) => {
  // AI Feature Disabled
  return {
    priority: "MEDIUM",
    assessment: "",
  };
};

export const screenTenantApplication = async (appData: any, propertyRent: number) => {
  // AI Feature Disabled
  return { riskScore: 0, recommendation: "" };
};

export const summarizeAgreement = async (agreementDetails: string) => {
  // AI Feature Disabled
  return "";
};
