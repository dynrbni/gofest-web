import type { CheckoutPerson, TicketHolder } from '@gofest/shared';

export type PersonDraft = Omit<CheckoutPerson, 'identityType'> & {
  identityType: CheckoutPerson['identityType'] | '';
};
export type HolderDraft = PersonDraft & { gender: TicketHolder['gender'] | ''; birthDate: string };
export const emptyPerson: PersonDraft = {
  name: '',
  email: '',
  phone: '',
  identityType: '',
  identityNumber: '',
};
export const emptyHolder: HolderDraft = { ...emptyPerson, gender: '', birthDate: '' };
