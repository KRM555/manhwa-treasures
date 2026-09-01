CREATE TABLE public.user_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_name TEXT NOT NULL,
  extracted_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_history TO authenticated;
GRANT ALL ON public.user_history TO service_role;

ALTER TABLE public.user_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own history" ON public.user_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can add to their own history" ON public.user_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own history" ON public.user_history FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_history;