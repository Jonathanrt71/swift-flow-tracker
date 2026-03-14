
-- Tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  parent_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Milestones table
CREATE TABLE public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enforce max 3 subtasks per task via trigger
CREATE OR REPLACE FUNCTION public.check_subtask_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only check if this is a subtask
  IF NEW.parent_id IS NOT NULL THEN
    -- No nested subtasks (parent must be a root task)
    IF EXISTS (SELECT 1 FROM public.tasks WHERE id = NEW.parent_id AND parent_id IS NOT NULL) THEN
      RAISE EXCEPTION 'Subtasks cannot have subtasks (max one level of nesting)';
    END IF;
    -- Max 3 subtasks per parent
    IF (SELECT COUNT(*) FROM public.tasks WHERE parent_id = NEW.parent_id AND id != NEW.id) >= 3 THEN
      RAISE EXCEPTION 'Maximum of 3 subtasks per task reached';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_subtask_limit
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.check_subtask_limit();

-- Enforce max 10 milestones per task via trigger
CREATE OR REPLACE FUNCTION public.check_milestone_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.milestones WHERE task_id = NEW.task_id AND id != NEW.id) >= 10 THEN
    RAISE EXCEPTION 'Maximum of 10 milestones per task reached';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_milestone_limit
  BEFORE INSERT OR UPDATE ON public.milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.check_milestone_limit();

-- Updated_at trigger for tasks
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- RLS for tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view all tasks (team workspace)
CREATE POLICY "Authenticated users can view all tasks"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (true);

-- Users can create tasks
CREATE POLICY "Authenticated users can create tasks"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Creators, assignees, and admins can update
CREATE POLICY "Creators and assignees can update tasks"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() 
    OR assigned_to = auth.uid() 
    OR public.has_role(auth.uid(), 'admin')
  );

-- Creators and admins can delete
CREATE POLICY "Creators and admins can delete tasks"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() 
    OR public.has_role(auth.uid(), 'admin')
  );

-- RLS for milestones
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

-- View milestones if you can view the task
CREATE POLICY "Authenticated users can view milestones"
  ON public.milestones FOR SELECT
  TO authenticated
  USING (true);

-- Insert milestones for tasks you own/are assigned to/admin
CREATE POLICY "Task owners can manage milestones"
  ON public.milestones FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id
      AND (t.created_by = auth.uid() OR t.assigned_to = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Task owners can update milestones"
  ON public.milestones FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id
      AND (t.created_by = auth.uid() OR t.assigned_to = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Task owners can delete milestones"
  ON public.milestones FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id
      AND (t.created_by = auth.uid() OR t.assigned_to = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );
