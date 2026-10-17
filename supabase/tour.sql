-- =====================================================================================
--  POKÉCLASH — CLASSEMENT DE LA TOUR DE COMBAT (à ajouter une seule fois)
--  Supabase → SQL Editor → New query → colle TOUT ce fichier → Run.
--  Tu peux le relancer sans risque (il ne supprime rien).
-- =====================================================================================
create table if not exists public.tower_scores (
  user_id     uuid primary key references public.profiles(id) on delete cascade,
  best        int  not null default 0,
  team        text,
  updated_at  timestamptz not null default now()
);
alter table public.tower_scores enable row level security;
drop policy if exists tower_read on public.tower_scores;
create policy tower_read on public.tower_scores for select to authenticated using (true);

-- enregistre ton meilleur étage (garde toujours le plus haut)
create or replace function public.submit_tower(p_floor int, p_team text) returns int
language plpgsql security definer set search_path = public as $$
declare u uuid := public.me(); b int;
begin
  if p_floor < 0 or p_floor > 2000 then raise exception 'bad_floor'; end if;
  insert into public.tower_scores (user_id, best, team) values (u, p_floor, left(coalesce(p_team, ''), 200))
  on conflict (user_id) do update
    set team = case when excluded.best > public.tower_scores.best then excluded.team else public.tower_scores.team end,
        best = greatest(public.tower_scores.best, excluded.best),
        updated_at = case when excluded.best > public.tower_scores.best then now() else public.tower_scores.updated_at end
  returning best into b;
  return b;
end $$;

-- les meilleurs joueurs
create or replace function public.tower_top(p_limit int default 30) returns table (pseudo text, best int, team text)
language sql stable security definer set search_path = public as $$
  select p.pseudo, t.best, t.team from public.tower_scores t join public.profiles p on p.id = t.user_id
  where t.best > 0 order by t.best desc, t.updated_at asc limit least(greatest(coalesce(p_limit, 30), 1), 100);
$$;

revoke execute on function public.submit_tower(int, text) from public, anon;
grant execute on function public.submit_tower(int, text) to authenticated;
revoke execute on function public.tower_top(int) from public, anon;
grant execute on function public.tower_top(int) to authenticated;
