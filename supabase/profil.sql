-- =====================================================================================
--  POKÉCLASH — PROFILS DE DRESSEUR EN LIGNE (à ajouter une seule fois)
--  Supabase → SQL Editor → New query → colle TOUT ce fichier → Run.  (Relançable sans risque.)
--  Le profil (avatar, titre, badges et cartes favoris, statistiques) est stocké dans profiles.card ;
--  tous les joueurs connectés peuvent le lire, seul son propriétaire peut le modifier.
-- =====================================================================================
alter table public.profiles add column if not exists card jsonb;

create or replace function public.set_profile(p_card jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_card is null or jsonb_typeof(p_card) <> 'object' then raise exception 'bad_card'; end if;
  if length(p_card::text) > 6000 then raise exception 'too_big'; end if;
  update public.profiles set card = p_card where id = public.me();
end $$;

revoke execute on function public.set_profile(jsonb) from public, anon;
grant execute on function public.set_profile(jsonb) to authenticated;
