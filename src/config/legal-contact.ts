/**
 * Koreki Legal Contact Configuration ⚖️
 * Use this file to centralize your contact information for Imprint and Privacy Policy.
 */
/**
 * Koreki Legal Contact Configuration ⚖️
 * Use environment variables to keep your personal data out of the public repository.
 */
export const LEGAL_CONFIG = {
    // Personal / Company Info
    controller: {
        name: process.env.NEXT_PUBLIC_LEGAL_NAME || "[Name des Verantwortlichen]",
        address: process.env.NEXT_PUBLIC_LEGAL_ADDRESS || "[Straße, Hausnummer, PLZ, Ort]",
        country: "Deutschland",
    },
    
    // Contact details
    contact: {
        email: process.env.NEXT_PUBLIC_LEGAL_EMAIL || "support@example.com",
    },
    
    // Registration details (optional)
    registration: {
        court: process.env.NEXT_PUBLIC_LEGAL_REG_COURT || "",
        number: process.env.NEXT_PUBLIC_LEGAL_REG_NUMBER || "", 
        taxId: process.env.NEXT_PUBLIC_LEGAL_TAX_ID || "", 
    },
    
    // External links
    links: {
        disputeResolution: "https://ec.europa.eu/consumers/odr/",
    }
};
