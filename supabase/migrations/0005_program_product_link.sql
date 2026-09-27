create index if not exists programs_product_key_idx
  on public.programs(product_key)
  where product_key is not null;

comment on column public.programs.product_key is
  'Opaque identifier linking this program to the platform product catalog; no separate product table exists in this application schema.';
