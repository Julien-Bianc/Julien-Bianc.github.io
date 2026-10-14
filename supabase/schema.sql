-- =====================================================================================
--  ARÈNE DES CRÉATURES — BASE DE DONNÉES EN LIGNE (Supabase)
--  Comptes (pseudo + mot de passe), sauvegarde en ligne, amis, défis, échanges d'objets.
--
--  Installation : Supabase → SQL Editor → New query → colle TOUT ce fichier → Run.
--  Tu peux le relancer sans risque (il ne supprime rien).
--
--  Sécurité : les joueurs ne peuvent rien écrire directement dans les tables ;
--  tout passe par les fonctions ci-dessous (security definer) qui vérifient qui appelle.
-- =====================================================================================

-- ---------------------------------------------------------------- TABLES
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  pseudo      text not null,
  wins        int  not null default 0,
  losses      int  not null default 0,
  created_at  timestamptz not null default now(),
  constraint pseudo_format check (pseudo ~ '^[A-Za-z0-9_-]{3,16}$')
);
create unique index if not exists profiles_pseudo_lower on public.profiles (lower(pseudo));

-- sauvegarde complète du jeu (le même objet que localStorage « arene.save.v1 »)
create table if not exists public.saves (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  data        jsonb,
  rev         int  not null default 0,              -- numéro de version : évite d'écraser une sauvegarde plus récente
  updated_at  timestamptz not null default now()
);

create table if not exists public.friendships (
  id          bigint generated always as identity primary key,
  requester   uuid not null references public.profiles(id) on delete cascade,
  addressee   uuid not null references public.profiles(id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at  timestamptz not null default now(),
  constraint friend_not_self check (requester <> addressee)
);
create unique index if not exists friendships_pair on public.friendships (least(requester, addressee), greatest(requester, addressee));

create table if not exists public.challenges (
  id          uuid primary key default gen_random_uuid(),
  from_id     uuid not null references public.profiles(id) on delete cascade,
  to_id       uuid not null references public.profiles(id) on delete cascade,
  size        int  not null default 3 check (size in (3, 6)),
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled', 'done')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists challenges_to on public.challenges (to_id, status);
create index if not exists challenges_from on public.challenges (from_id, status);

create table if not exists public.matches (
  id            bigint generated always as identity primary key,
  challenge_id  uuid references public.challenges(id) on delete set null,
  winner        uuid references public.profiles(id) on delete set null,
  loser         uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

create table if not exists public.trades (
  id          uuid primary key default gen_random_uuid(),
  from_id     uuid not null references public.profiles(id) on delete cascade,
  to_id       uuid not null references public.profiles(id) on delete cascade,
  give        jsonb not null default '{}'::jsonb,   -- ce que from_id DONNE    { "idObjet": quantité }
  take        jsonb not null default '{}'::jsonb,   -- ce que from_id DEMANDE  { "idObjet": quantité }
  note        text,
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled', 'failed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists trades_to on public.trades (to_id, status);
create index if not exists trades_from on public.trades (from_id, status);

-- ---------------------------------------------------------------- SÉCURITÉ (RLS) : lecture seulement de ce qui te concerne
alter table public.profiles    enable row level security;
alter table public.saves       enable row level security;
alter table public.friendships enable row level security;
alter table public.challenges  enable row level security;
alter table public.matches     enable row level security;
alter table public.trades      enable row level security;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using (true);
drop policy if exists saves_read on public.saves;
create policy saves_read on public.saves for select to authenticated using (user_id = auth.uid());
drop policy if exists friendships_read on public.friendships;
create policy friendships_read on public.friendships for select to authenticated using (auth.uid() in (requester, addressee));
drop policy if exists challenges_read on public.challenges;
create policy challenges_read on public.challenges for select to authenticated using (auth.uid() in (from_id, to_id));
drop policy if exists matches_read on public.matches;
create policy matches_read on public.matches for select to authenticated using (auth.uid() in (winner, loser));
drop policy if exists trades_read on public.trades;
create policy trades_read on public.trades for select to authenticated using (auth.uid() in (from_id, to_id));

-- ---------------------------------------------------------------- CRÉATION DU PROFIL à l'inscription
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, pseudo) values (new.id, coalesce(new.raw_user_meta_data->>'pseudo', 'joueur' || substr(replace(new.id::text, '-', ''), 1, 8)));
  insert into public.saves (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- OUTILS
create or replace function public.me() returns uuid language plpgsql stable as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  return auth.uid();
end $$;

create or replace function public.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.friendships f where f.status = 'accepted'
                and least(f.requester, f.addressee) = least(a, b) and greatest(f.requester, f.addressee) = greatest(a, b));
$$;

-- liste d'objets valide pour un échange : { "id": quantité 1..99 }, 12 lignes max, pas de tickets / balls du Safari
create or replace function public.valid_items(j jsonb) returns boolean language plpgsql immutable as $$
declare k text; v jsonb; n int := 0;
begin
  if j is null or jsonb_typeof(j) <> 'object' then return false; end if;
  for k, v in select * from jsonb_each(j) loop
    n := n + 1;
    if n > 12 or length(k) < 2 or length(k) > 60 or k like 'ticket:%' or k like 'ball:%' then return false; end if;
    if jsonb_typeof(v) <> 'number' or (v::text)::numeric <> floor((v::text)::numeric) or (v::text)::int < 1 or (v::text)::int > 99 then return false; end if;
  end loop;
  return true;
end $$;

-- la sauvegarde `d` contient-elle au moins les objets de `items` ?
create or replace function public.inv_has(d jsonb, items jsonb) returns boolean language plpgsql immutable as $$
declare k text; v text;
begin
  for k, v in select * from jsonb_each_text(items) loop
    if coalesce((d->'inv'->>k)::int, 0) < v::int then return false; end if;
  end loop;
  return true;
end $$;

-- retire `minus` puis ajoute `plus` dans l'inventaire de la sauvegarde `d`
create or replace function public.inv_apply(d jsonb, minus jsonb, plus jsonb) returns jsonb language plpgsql immutable as $$
declare k text; v text; inv jsonb;
begin
  d := coalesce(d, '{}'::jsonb);
  inv := coalesce(d->'inv', '{}'::jsonb);
  for k, v in select * from jsonb_each_text(minus) loop
    inv := jsonb_set(inv, array[k], to_jsonb(coalesce((inv->>k)::int, 0) - v::int));
  end loop;
  for k, v in select * from jsonb_each_text(plus) loop
    inv := jsonb_set(inv, array[k], to_jsonb(coalesce((inv->>k)::int, 0) + v::int));
  end loop;
  return jsonb_set(d, '{inv}', inv);
end $$;

-- ---------------------------------------------------------------- COMPTE
create or replace function public.pseudo_available(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select p ~ '^[A-Za-z0-9_-]{3,16}$' and not exists(select 1 from public.profiles where lower(pseudo) = lower(p));
$$;

-- enregistre la sauvegarde si personne ne l'a modifiée entre-temps (sinon renvoie la version du serveur)
create or replace function public.push_save(p_data jsonb, p_rev int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public.me(); r public.saves%rowtype;
begin
  if p_data is null or jsonb_typeof(p_data) <> 'object' or octet_length(p_data::text) > 400000 then raise exception 'save_invalid'; end if;
  select * into r from public.saves where user_id = u for update;
  if not found then
    insert into public.saves (user_id, data, rev) values (u, p_data, 1);
    return jsonb_build_object('ok', true, 'rev', 1);
  end if;
  if r.rev <> p_rev then return jsonb_build_object('ok', false, 'rev', r.rev, 'data', r.data); end if;
  update public.saves set data = p_data, rev = r.rev + 1, updated_at = now() where user_id = u;
  return jsonb_build_object('ok', true, 'rev', r.rev + 1);
end $$;

-- ---------------------------------------------------------------- AMIS
create or replace function public.send_friend_request(p_pseudo text) returns text
language plpgsql security definer set search_path = public as $$
declare u uuid := public.me(); o uuid; f public.friendships%rowtype;
begin
  select id into o from public.profiles where lower(pseudo) = lower(trim(p_pseudo));
  if o is null then return 'notfound'; end if;
  if o = u then return 'self'; end if;
  select * into f from public.friendships where least(requester, addressee) = least(u, o) and greatest(requester, addressee) = greatest(u, o);
  if found then
    if f.status = 'accepted' then return 'already'; end if;
    if f.requester = o then update public.friendships set status = 'accepted' where id = f.id; return 'accepted'; end if;   -- il t'avait déjà demandé
    return 'pending';
  end if;
  if (select count(*) from public.friendships where requester = u and status = 'pending') >= 30 then return 'limit'; end if;
  insert into public.friendships (requester, addressee) values (u, o);
  return 'sent';
end $$;

create or replace function public.respond_friend(p_id bigint, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
declare u uuid := public.me();
begin
  if p_accept then update public.friendships set status = 'accepted' where id = p_id and addressee = u and status = 'pending';
  else delete from public.friendships where id = p_id and addressee = u and status = 'pending'; end if;
end $$;

-- retire un ami OU annule une demande envoyée
create or replace function public.remove_friend(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare u uuid := public.me();
begin
  delete from public.friendships where id = p_id and u in (requester, addressee);
end $$;

create or replace function public.my_friends()
returns table (fid bigint, other uuid, pseudo text, status text, incoming boolean, wins int, losses int)
language sql stable security definer set search_path = public as $$
  select f.id, p.id, p.pseudo, f.status, f.addressee = auth.uid(), p.wins, p.losses
  from public.friendships f
  join public.profiles p on p.id = case when f.requester = auth.uid() then f.addressee else f.requester end
  where auth.uid() in (f.requester, f.addressee)
  order by f.status, lower(p.pseudo);
$$;

-- ---------------------------------------------------------------- DÉFIS (combats en ligne)
create or replace function public.create_challenge(p_to uuid, p_size int) returns uuid
language plpgsql security definer set search_path = public as $$
declare u uuid := public.me(); c uuid;
begin
  if not public.are_friends(u, p_to) then raise exception 'not_friends'; end if;
  if p_size not in (3, 6) then raise exception 'bad_size'; end if;
  update public.challenges set status = 'cancelled', updated_at = now() where from_id = u and status = 'pending';
  insert into public.challenges (from_id, to_id, size) values (u, p_to, p_size) returning id into c;
  return c;
end $$;

create or replace function public.respond_challenge(p_id uuid, p_accept boolean) returns text
language plpgsql security definer set search_path = public as $$
declare u uuid := public.me(); c public.challenges%rowtype;
begin
  select * into c from public.challenges where id = p_id and to_id = u for update;
  if not found then return 'notfound'; end if;
  if c.status <> 'pending' then return c.status; end if;
  if c.created_at < now() - interval '2 minutes' then update public.challenges set status = 'cancelled', updated_at = now() where id = p_id; return 'expired'; end if;
  update public.challenges set status = case when p_accept then 'accepted' else 'declined' end, updated_at = now() where id = p_id;
  return case when p_accept then 'accepted' else 'declined' end;
end $$;

create or replace function public.cancel_challenge(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare u uuid := public.me();
begin
  update public.challenges set status = 'cancelled', updated_at = now() where id = p_id and u in (from_id, to_id) and status in ('pending', 'accepted');
end $$;

-- le PERDANT déclare sa défaite (on ne peut que donner la victoire à l'autre) ; les revanches sur le même défi comptent aussi
create or replace function public.report_defeat(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare u uuid := public.me(); c public.challenges%rowtype; w uuid;
begin
  select * into c from public.challenges where id = p_id and u in (from_id, to_id);
  if not found or c.status not in ('accepted', 'done') then return; end if;
  if exists(select 1 from public.matches where challenge_id = p_id and created_at > now() - interval '15 seconds') then return; end if;
  w := case when c.from_id = u then c.to_id else c.from_id end;
  insert into public.matches (challenge_id, winner, loser) values (p_id, w, u);
  update public.profiles set wins = wins + 1 where id = w;
  update public.profiles set losses = losses + 1 where id = u;
  update public.challenges set status = 'done', updated_at = now() where id = p_id;
end $$;

-- ---------------------------------------------------------------- ÉCHANGES
-- inventaire échangeable d'un ami (pour choisir ce qu'on lui demande)
create or replace function public.friend_inventory(p_friend uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare u uuid := public.me();
begin
  if not public.are_friends(u, p_friend) then raise exception 'not_friends'; end if;
  return coalesce((select data->'inv' from public.saves where user_id = p_friend), '{}'::jsonb);
end $$;

create or replace function public.create_trade(p_to uuid, p_give jsonb, p_take jsonb, p_note text) returns uuid
language plpgsql security definer set search_path = public as $$
declare u uuid := public.me(); t uuid; d jsonb;
begin
  if not public.are_friends(u, p_to) then raise exception 'not_friends'; end if;
  if not public.valid_items(p_give) or not public.valid_items(p_take) then raise exception 'bad_items'; end if;
  if p_give = '{}'::jsonb and p_take = '{}'::jsonb then raise exception 'empty_trade'; end if;
  select data into d from public.saves where user_id = u;
  if not public.inv_has(d, p_give) then raise exception 'missing_items'; end if;
  if (select count(*) from public.trades where from_id = u and status = 'pending') >= 10 then raise exception 'too_many_trades'; end if;
  insert into public.trades (from_id, to_id, give, take, note) values (u, p_to, p_give, p_take, left(p_note, 120)) returning id into t;
  return t;
end $$;

-- accepter / refuser un échange reçu. L'échange se fait d'un seul coup dans les deux sauvegardes (ou pas du tout).
create or replace function public.respond_trade(p_id uuid, p_accept boolean) returns text
language plpgsql security definer set search_path = public as $$
declare u uuid := public.me(); t public.trades%rowtype; sf public.saves%rowtype; st public.saves%rowtype;
begin
  select * into t from public.trades where id = p_id and to_id = u for update;
  if not found then return 'notfound'; end if;
  if t.status <> 'pending' then return t.status; end if;
  if not p_accept then update public.trades set status = 'declined', updated_at = now() where id = p_id; return 'declined'; end if;
  if not public.are_friends(t.from_id, t.to_id) then update public.trades set status = 'failed', updated_at = now() where id = p_id; return 'failed:not_friends'; end if;
  -- verrouille les 2 sauvegardes toujours dans le même ordre (pas d'interblocage)
  perform 1 from public.saves where user_id in (t.from_id, t.to_id) order by user_id for update;
  select * into sf from public.saves where user_id = t.from_id;
  select * into st from public.saves where user_id = t.to_id;
  if not public.inv_has(sf.data, t.give) then update public.trades set status = 'failed', updated_at = now() where id = p_id; return 'failed:sender_missing'; end if;
  if not public.inv_has(st.data, t.take) then return 'failed:you_missing'; end if;     -- reste en attente : tu peux réessayer
  update public.saves set data = public.inv_apply(sf.data, t.give, t.take), rev = rev + 1, updated_at = now() where user_id = t.from_id;
  update public.saves set data = public.inv_apply(st.data, t.take, t.give), rev = rev + 1, updated_at = now() where user_id = t.to_id;
  update public.trades set status = 'accepted', updated_at = now() where id = p_id;
  return 'accepted';
end $$;

create or replace function public.cancel_trade(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare u uuid := public.me();
begin
  update public.trades set status = 'cancelled', updated_at = now() where id = p_id and from_id = u and status = 'pending';
end $$;

-- ---------------------------------------------------------------- DROITS : fonctions réservées aux joueurs connectés
do $$
declare f text;
begin
  foreach f in array array['push_save(jsonb,integer)', 'send_friend_request(text)', 'respond_friend(bigint,boolean)', 'remove_friend(bigint)', 'my_friends()',
    'create_challenge(uuid,integer)', 'respond_challenge(uuid,boolean)', 'cancel_challenge(uuid)', 'report_defeat(uuid)',
    'friend_inventory(uuid)', 'create_trade(uuid,jsonb,jsonb,text)', 'respond_trade(uuid,boolean)', 'cancel_trade(uuid)', 'are_friends(uuid,uuid)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
grant execute on function public.pseudo_available(text) to anon, authenticated;

-- ---------------------------------------------------------------- TEMPS RÉEL : notifications de défis, d'échanges et de demandes d'ami
do $$
declare t text;
begin
  foreach t in array array['challenges', 'trades', 'friendships'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
