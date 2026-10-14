import { z } from 'zod';
import { env } from '../config/env';
import { isLanguageSupported, SUPPORTED_LANGUAGES } from '../config/languages';

const supportedList = SUPPORTED_LANGUAGES.map((l) => l.id).join(', ');

export const createSnippetSchema = z.object({
  language: z
    .string({ required_error: 'Language is required' })
    .trim()
    .toLowerCase()
    .refine((lang) => isLanguageSupported(lang), {
      message: `Unsupported language. Supported: ${supportedList}`
    }),
  code: z
    .string({ required_error: 'Code is required' })
    .min(1, 'Code cannot be empty')
    .refine((val) => Buffer.byteLength(val, 'utf8') <= env.MAX_CODE_SIZE_BYTES, {
      message: `Code size exceeds maximum limit of ${env.MAX_CODE_SIZE_BYTES / 1024} KB`
    }),
  stdin: z
    .string()
    .optional()
    .default('')
    .refine((val) => Buffer.byteLength(val || '', 'utf8') <= env.MAX_CODE_SIZE_BYTES, {
      message: `Stdin size exceeds maximum limit of ${env.MAX_CODE_SIZE_BYTES / 1024} KB`
    })
});

export type CreateSnippetInput = z.infer<typeof createSnippetSchema>;
