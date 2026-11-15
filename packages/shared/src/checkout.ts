import { z } from 'zod';
import { parsePhoneNumberFromString } from 'libphonenumber-js/min';

export {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
} from 'libphonenumber-js/min';
export type { CountryCode } from 'libphonenumber-js';

export const IDENTITY_TYPES = ['KTP', 'SIM', 'PASSPORT', 'STUDENT_CARD'] as const;
export const IDENTITY_LABELS = {
  KTP: 'KTP',
  SIM: 'SIM',
  PASSPORT: 'Paspor',
  STUDENT_CARD: 'Kartu Pelajar',
};

export function checkoutToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => parts.find((entry) => entry.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function ageOnDate(birthDate: string, today = checkoutToday()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const date = new Date(`${birthDate}T00:00:00Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== birthDate ||
    birthDate > today ||
    birthDate < '1900-01-01'
  )
    return null;
  let age = Number(today.slice(0, 4)) - Number(birthDate.slice(0, 4));
  if (today.slice(5) < birthDate.slice(5)) age -= 1;
  return age;
}

export const checkoutPhoneSchema = z
  .string()
  .trim()
  .min(1, 'Nomor HP wajib diisi')
  .max(30)
  .transform(
    (value) =>
      parsePhoneNumberFromString(value, { defaultCountry: 'ID', extract: false })?.number ?? value,
  )
  .refine(
    (value) => Boolean(parsePhoneNumberFromString(value)?.isPossible()),
    'Nomor HP tidak valid untuk kode negara yang dipilih',
  );

const name = z.string().trim().min(2, 'Nama lengkap minimal 2 karakter').max(120);
const email = z.string().trim().toLowerCase().max(254).email('Format email tidak valid');
const identityType = z.enum(IDENTITY_TYPES, {
  errorMap: () => ({ message: 'Pilih tipe identitas' }),
});
const identityNumber = z
  .string()
  .trim()
  .min(3, 'Nomor identitas minimal 3 karakter')
  .max(50, 'Nomor identitas maksimal 50 karakter')
  .regex(
    /^[A-Za-z0-9 ./-]+$/,
    'Nomor identitas hanya boleh huruf, angka, spasi, titik, garis miring atau tanda hubung',
  );

export const checkoutPersonSchema = z.object({
  name,
  email,
  phone: checkoutPhoneSchema,
  identityType,
  identityNumber,
});
export const ticketHolderSchema = checkoutPersonSchema
  .extend({
    ticketTypeId: z.string().min(1),
    position: z.number().int().min(0).max(49),
    gender: z.enum(['MALE', 'FEMALE'], { errorMap: () => ({ message: 'Pilih jenis kelamin' }) }),
    birthDate: z.string().refine((value) => ageOnDate(value) !== null, 'Tanggal lahir tidak valid'),
  })
  .superRefine((person, ctx) => {
    const age = ageOnDate(person.birthDate);
    if (
      age !== null &&
      age < 17 &&
      (person.identityType === 'KTP' || person.identityType === 'SIM')
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['identityType'],
        message: 'Pemegang tiket di bawah 17 tahun hanya dapat memakai Kartu Pelajar atau Paspor',
      });
    }
  });

export const orderCustomerSchema = z.object({
  buyerName: name,
  buyerEmail: email,
  buyerPhone: checkoutPhoneSchema,
  buyerIdentityType: identityType,
  buyerIdentityNumber: identityNumber,
  attendees: z.array(ticketHolderSchema).min(1, 'Isi data pemegang tiket').max(500),
});

export type CheckoutPerson = z.infer<typeof checkoutPersonSchema>;
export type TicketHolder = z.infer<typeof ticketHolderSchema>;
export interface CheckoutDetails {
  buyer: CheckoutPerson;
  attendees: TicketHolder[];
}
