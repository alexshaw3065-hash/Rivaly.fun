-- MLS and international Friendlies are listed in TxLINE's fixtures (it has
-- odds for them) but our subscription gets no scores for them at all:
-- probed 2026-09-25, 0 of 31 MLS and 0 of 26 Friendlies fixtures had a
-- single score record, past or upcoming, while every Premier League and
-- NFL fixture did. A room on one of those matches can never settle.
--
-- Paused rather than deleted: enabled=false stops the fixture sync, and
-- scores_available=false takes them out of every match list and out of
-- room creation. To bring one back once coverage is confirmed:
--   update public.tracked_competitions set enabled = true, scores_available = true
--   where provider = 'txline' and competition_id = 33;  -- or 430
update public.tracked_competitions
set enabled = false, scores_available = false
where provider = 'txline' and competition_id in (33, 430);
