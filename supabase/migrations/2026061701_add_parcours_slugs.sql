-- Add stable route slugs for MAXCLASS parcours pages.
-- The existing course module schema is id-driven; /parcours routes need slugs.

ALTER TABLE courses ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE course_units ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS slug TEXT;

UPDATE courses
SET slug = 'course-' || id::text
WHERE slug IS NULL OR slug = '';

UPDATE course_units
SET slug = 'unit-' || unit_number::text
WHERE slug IS NULL OR slug = '';

UPDATE course_lessons
SET slug = 'lesson-' || lesson_number::text
WHERE slug IS NULL OR slug = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_courses_slug_unique
ON courses(slug)
WHERE slug IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_course_units_course_slug_unique
ON course_units(course_id, slug)
WHERE slug IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_course_lessons_unit_slug_unique
ON course_lessons(unit_id, slug)
WHERE slug IS NOT NULL;
