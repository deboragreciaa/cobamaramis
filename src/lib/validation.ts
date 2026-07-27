/**
 * Validates if a booking status can be locked.
 * Status 'CONFIRMED' is only allowed if the submission stage is at least 5.
 */
export function validateBookingLock(bookingType: string, submissionStage: number): boolean {
  if (bookingType === 'CONFIRMED' && submissionStage < 5) {
    return false;
  }
  return true;
}
