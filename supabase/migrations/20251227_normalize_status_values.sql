update offers
set status = upper(status)
where status is not null;

update invoices
set status = upper(status)
where status is not null;
