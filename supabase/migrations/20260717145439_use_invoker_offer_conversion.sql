alter function public.convert_offer_to_invoice(uuid) security invoker;

revoke all on function public.convert_offer_to_invoice(uuid) from public, anon;
grant execute on function public.convert_offer_to_invoice(uuid) to authenticated;
