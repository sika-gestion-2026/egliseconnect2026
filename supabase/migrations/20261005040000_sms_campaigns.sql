-- ============================================================================
-- Campagnes SMS : table d'historique et journal d'envoi.
--
-- L'écran « Centre de Communication » affichait des statistiques codées en dur
-- (1 248 SMS envoyés, 99,8 % de délivrance) et une audience calculée au hasard
-- (10 % d'absents, 25 % par département). Un pasteur pouvait croire avoir
-- prévenu ses fidèles alors que rien n'était parti.
--
-- Ces tables permettent d'exiger un envoi réel via un fournisseur,
-- et d'afficher des chiffres issus des envois réellement effectués.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sms_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 1000),
  target_type TEXT NOT NULL DEFAULT 'all'
    CHECK (target_type IN ('all', 'absentees', 'dept', 'quartier')),
  target_value TEXT,
  audience_size INTEGER NOT NULL DEFAULT 0 CHECK (audience_size >= 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sending', 'completed', 'failed', 'cancelled')),
  provider TEXT,
  provider_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sms_campaigns_church_created_idx
  ON public.sms_campaigns (church_id, created_at DESC);

-- Journal par destinataire, pour le suivi de délivrance.
CREATE TABLE IF NOT EXISTS public.sms_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.sms_campaigns(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'rejected')),
  error_message TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT sms_campaign_recipients_unique UNIQUE (campaign_id, phone)
);

CREATE INDEX IF NOT EXISTS sms_campaign_recipients_campaign_idx
  ON public.sms_campaign_recipients (campaign_id);

-- --- RLS ------------------------------------------------------------------
ALTER TABLE public.sms_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_campaign_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sms_campaigns_read ON public.sms_campaigns;
DROP POLICY IF EXISTS sms_campaigns_write ON public.sms_campaigns;
DROP POLICY IF EXISTS sms_campaign_recipients_read ON public.sms_campaign_recipients;
DROP POLICY IF EXISTS sms_campaign_recipients_write ON public.sms_campaign_recipients;

-- Seuls les rôles d'encadrement voient et gèrent les campagnes de leur église.
CREATE POLICY sms_campaigns_read ON public.sms_campaigns
  FOR SELECT
  USING (
    church_id = (
      SELECT up.church_id FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('super_admin', 'church_admin', 'moderator')
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  );

CREATE POLICY sms_campaigns_write ON public.sms_campaigns
  FOR ALL
  USING (
    church_id = (
      SELECT up.church_id FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('super_admin', 'church_admin', 'moderator')
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  )
  WITH CHECK (
    church_id = (
      SELECT up.church_id FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('super_admin', 'church_admin', 'moderator')
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  );

CREATE POLICY sms_campaign_recipients_read ON public.sms_campaign_recipients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.sms_campaigns c
      JOIN public.user_profiles up ON up.church_id = c.church_id
      WHERE c.id = sms_campaign_recipients.campaign_id
        AND up.id = auth.uid()
        AND up.role IN ('super_admin', 'church_admin', 'moderator')
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  );

CREATE POLICY sms_campaign_recipients_write ON public.sms_campaign_recipients
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.sms_campaigns c
      JOIN public.user_profiles up ON up.church_id = c.church_id
      WHERE c.id = sms_campaign_recipients.campaign_id
        AND up.id = auth.uid()
        AND up.role IN ('super_admin', 'church_admin', 'moderator')
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.sms_campaigns c
      JOIN public.user_profiles up ON up.church_id = c.church_id
      WHERE c.id = sms_campaign_recipients.campaign_id
        AND up.id = auth.uid()
        AND up.role IN ('super_admin', 'church_admin', 'moderator')
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  );