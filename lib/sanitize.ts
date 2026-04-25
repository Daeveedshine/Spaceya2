export const sanitizeString = (input: string | undefined | null, maxLength: number = 255): string => {
  if (!input) return '';
  // Remove potentially dangerous characters like < > to prevent XSS
  let sanitized = input.replace(/[<>]/g, '').trim();
  
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  return sanitized;
};

export const sanitizeObject = (obj: any, keyName?: string): any => {
  if (obj === null || typeof obj !== 'object') {
    if (typeof obj === 'string') {
        const isLongField = keyName && (
            keyName.toLowerCase().includes('url') || 
            keyName.toLowerCase().includes('image') ||
            keyName.toLowerCase().includes('photo') ||
            keyName === 'id' ||
            keyName === 'description' ||
            keyName === 'aiRecommendation' ||
            keyName === 'aiAssessment' ||
            keyName === 'issue' || 
            keyName === 'reasonForRelocating' ||
            keyName === 'currentHomeAddress'
        );
        // Base64 Images can be very long (e.g. 5MB = ~7M chars). 
        // We set 10MB limit (10000000) for "long" fields, else 500 chars.
        return sanitizeString(obj, isLongField ? 10000000 : 500);
    }
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, keyName));
  }
  
  const sanitizedObj: any = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitizedObj[key] = sanitizeObject(value, key);
  }
  return sanitizedObj;
};

// Validate an email address
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 150;
};

// Validate phone number (basic)
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[0-9+\-\s()]{7,30}$/;
  return phoneRegex.test(phone) && phone.length <= 30;
};
