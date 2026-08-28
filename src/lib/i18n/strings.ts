import type { TruthCode } from '@/lib/domain/types'

export type Language = 'en' | 'hi'

export const HEADLINE_HI: Record<TruthCode, string> = {
  NOT_PICKED_UP: 'EPFO ने अभी तक आपका क्लेम खोला ही नहीं है',
  IN_REVIEW: 'आपका क्लेम जाँच में है',
  APPROVED_AWAITING_MONEY: 'मंज़ूरी मिल गई, पर पैसा अभी नहीं भेजा गया',
  DEBITED_NOT_CREDITED: 'EPFO ने पैसा काट लिया है, पर आपके बैंक में नहीं भेजा',
  CREDITED: 'आपका पैसा आपके बैंक में पहुँच गया है',
  REJECTED: 'आपका क्लेम रद्द कर दिया गया',
  REGRESSED: 'EPFO के सिस्टम में आपका क्लेम पीछे चला गया',
}

export const HEADLINE_EN: Record<TruthCode, string> = {
  NOT_PICKED_UP: 'EPFO has not even opened your claim yet',
  IN_REVIEW: 'Your claim is under review',
  APPROVED_AWAITING_MONEY: 'Approved, but money has not been sent yet',
  DEBITED_NOT_CREDITED: 'EPFO debited money, but it has not reached your bank',
  CREDITED: 'Your money has reached your bank account',
  REJECTED: 'Your claim was rejected',
  REGRESSED: 'Your claim regressed in EPFO system',
}

/**
 * Helper to fetch localized headline based on active language key
 */
export function getLocalizedHeadline(code: TruthCode, lang: Language = 'hi'): string {
  if (lang === 'hi') {
    return HEADLINE_HI[code] ?? HEADLINE_EN[code] ?? code
  }
  return HEADLINE_EN[code] ?? code
}