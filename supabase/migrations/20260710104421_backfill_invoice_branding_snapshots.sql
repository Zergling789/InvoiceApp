-- Freeze the current branding for invoices finalized before branding snapshots existed.
update public.invoices as invoice
set branding_snapshot = jsonb_build_object(
  'companyName', settings.company_name,
  'address', settings.address,
  'taxId', settings.tax_id,
  'iban', settings.iban,
  'bic', settings.bic,
  'bankName', settings.bank_name,
  'footerText', settings.footer_text,
  'logoUrl', settings.logo_url,
  'primaryColor', settings.primary_color,
  'templateId', case when settings.template_id = 'default' then 'classic' else settings.template_id end,
  'locale', settings.locale,
  'currency', settings.currency
)
from public.user_settings as settings
where invoice.user_id = settings.user_id
  and invoice.branding_snapshot is null
  and (invoice.finalized_at is not null or invoice.status <> 'DRAFT');
