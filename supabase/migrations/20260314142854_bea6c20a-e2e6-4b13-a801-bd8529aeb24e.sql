
CREATE OR REPLACE FUNCTION public.check_subtask_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  depth int := 0;
  current_parent uuid := NEW.parent_id;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    -- Calculate depth by walking up the parent chain
    WHILE current_parent IS NOT NULL LOOP
      depth := depth + 1;
      SELECT parent_id INTO current_parent FROM public.tasks WHERE id = current_parent;
    END LOOP;

    -- Max 3 levels of nesting (depth 1, 2, or 3)
    IF depth > 3 THEN
      RAISE EXCEPTION 'Maximum of 3 levels of nesting allowed';
    END IF;

    -- Max 10 subtasks per parent
    IF (SELECT COUNT(*) FROM public.tasks WHERE parent_id = NEW.parent_id AND id != NEW.id) >= 10 THEN
      RAISE EXCEPTION 'Maximum of 10 subtasks per parent task reached';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
