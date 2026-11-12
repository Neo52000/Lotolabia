-- LotoLab IA — Migration 0006 : gains par rang et second tirage
-- Colonnes optionnelles alimentées par le collecteur (CSV officiel) :
--   prizes      {"1": {"winners": 0, "amount": 15000000}, ..., "9": {...}}
--   second_draw {"numbers": [18,30,34,35,44], "promotion": null,
--                "prizes": {"1": {"winners": 1, "amount": 133947}, ..., "4": {...}}}
-- jackpot_euros (existant) reçoit le gain du rang 1.
-- À appliquer AVANT de déployer le collecteur étendu (INSERT sur colonnes inconnues = erreur 400).
-- RLS inchangée : la lecture publique de draws couvre les nouvelles colonnes.

alter table public.draws
  add column if not exists prizes jsonb,
  add column if not exists second_draw jsonb;

alter table public.draws
  drop constraint if exists draws_prizes_is_object,
  drop constraint if exists draws_second_draw_is_object;

alter table public.draws
  add constraint draws_prizes_is_object
    check (prizes is null or jsonb_typeof(prizes) = 'object'),
  add constraint draws_second_draw_is_object
    check (second_draw is null or jsonb_typeof(second_draw) = 'object');
