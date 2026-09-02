insert into products (id, name, brand, category) values
  ('00000000-0000-0000-0000-000000000001', 'Arroz Branco 5kg', 'Tio Joao', 'Mercearia'),
  ('00000000-0000-0000-0000-000000000002', 'Feijao Carioca 1kg', 'Camil', 'Mercearia'),
  ('00000000-0000-0000-0000-000000000003', 'Leite Integral 1L', 'Italac', 'Laticinios'),
  ('00000000-0000-0000-0000-000000000004', 'Cafe Torrado 500g', 'Melitta', 'Mercearia'),
  ('00000000-0000-0000-0000-000000000005', 'Oleo de Soja 900ml', 'Liza', 'Mercearia'),
  ('00000000-0000-0000-0000-000000000006', 'Acucar Refinado 1kg', 'Uniao', 'Mercearia'),
  ('00000000-0000-0000-0000-000000000007', 'Frango Congelado 1kg', 'Sadia', 'Açougue'),
  ('00000000-0000-0000-0000-000000000008', 'Banana Prata 1kg', null, 'Hortifruti'),
  ('00000000-0000-0000-0000-000000000009', 'Sabao em Po 1kg', 'Omo', 'Limpeza'),
  ('00000000-0000-0000-0000-000000000010', 'Papel Higienico 12un', 'Neve', 'Higiene')
on conflict (id) do nothing;

insert into supermarkets (id, name, address, latitude, longitude) values
  ('10000000-0000-0000-0000-000000000001', 'Mercado Bom Preco - Centro', 'Rua das Flores, 100', -23.55052, -46.63331),
  ('10000000-0000-0000-0000-000000000002', 'SuperEconomia - Vila Nova', 'Avenida Brasil, 500', -23.56100, -46.65600),
  ('10000000-0000-0000-0000-000000000003', 'Atacadao Zona Sul', 'Rua Sul, 250', -23.58000, -46.62000)
on conflict (id) do nothing;

insert into prices (id, product_id, supermarket_id, price, source)
select
  ('20000000-0000-0000-0000-' || lpad((row_number() over ())::text, 12, '0'))::uuid,
  p.id,
  s.id,
  round((8 + random() * 12)::numeric, 2),
  'encarte'
from products p cross join supermarkets s
on conflict (id) do nothing;
