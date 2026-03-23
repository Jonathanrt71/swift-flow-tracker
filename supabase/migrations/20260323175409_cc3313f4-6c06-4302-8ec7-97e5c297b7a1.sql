ALTER TABLE competency_milestones_acgme DROP CONSTRAINT competency_milestones_acgme_level_check;
ALTER TABLE competency_milestones_acgme ADD CONSTRAINT competency_milestones_acgme_level_check CHECK (level >= 0 AND level <= 5);

INSERT INTO competency_milestones_acgme (subcategory_id, level, description)
SELECT id, 0, 'Does not meet level 1'
FROM competency_subcategories_acgme
WHERE id NOT IN (
  SELECT subcategory_id FROM competency_milestones_acgme WHERE level = 0
);