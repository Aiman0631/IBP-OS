# LeadFlow AI Dashboard

Ready-to-deploy Sales / Lead CRM dashboard inspired by the supplied Daily Read layout, redesigned for lead management, AI lead qualification, and WhatsApp conversations.

## Included

- Dashboard KPIs and lead pipeline
- Lead manager with search and status filters
- AI Lead Copilot for qualification, next-step suggestions, and WhatsApp reply drafts
- WhatsApp-style inbox tied to the same lead/message database
- Supabase SQL schema
- Netlify Functions for AI and WhatsApp webhook
- Demo mode when Supabase/AI credentials are not configured

## Deploy to Netlify

Build command: `npm run build`
Publish directory: `dist`
Functions directory: `netlify/functions`

## Supabase

Run `supabase/schema.sql` in Supabase SQL Editor, then configure:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Server-side variables for Netlify Functions:

- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`

Do not commit `.env` or secret tokens.

## WhatsApp

The architecture uses the official WhatsApp Cloud API webhook. Incoming messages are stored in Supabase and linked to leads using the phone number. The dashboard reads the same data for the inbox and lead profile.
