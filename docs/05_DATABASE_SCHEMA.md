# Database Schema
# Smart School Platform 2.0

---

# Architecture

Platform Type:
Multi School SaaS

Supported Schools:
- Government
- Private
- International

Security Model:
- school_id isolation
- Role Based Access Control (RBAC)
- Row Level Security (RLS)
- Audit Logging

---

# Core System

## schools

Purpose:
Store schools.

Columns:
- id
- school_code
- school_name
- school_type
- education_system
- logo_url
- phone
- email
- city
- country
- is_active
- created_at

---

## academic_years

Purpose:
Academic years.

Columns:
- id
- school_id
- name
- start_date
- end_date
- is_active

---

## semesters

Purpose:
School semesters.

Columns:
- id
- school_id
- academic_year_id
- name
- start_date
- end_date
- is_active

---

## school_settings

Purpose:
School configuration.

Columns:
- id
- school_id
- settings_json
- updated_at

---

# Security & Access

## user_profiles

Purpose:
System users.

Columns:
- id
- auth_user_id
- full_name
- email
- phone
- avatar_url
- is_active
- created_at

---

## roles

Columns:
- id
- role_key
- role_name

Examples:
- super_admin
- school_admin
- vice_principal
- teacher
- student
- parent

---

## permissions

Columns:
- id
- permission_key
- description

---

## role_permissions

Columns:
- id
- role_id
- permission_id

---

## user_roles

Columns:
- id
- user_id
- school_id
- role_id

---

## user_permissions

Columns:
- id
- user_id
- permission_id

---

## audit_logs

Columns:
- id
- school_id
- user_id
- action
- table_name
- record_id
- created_at

---

# Academic Structure

## stages

Examples:
- Kindergarten
- Elementary
- Middle
- Secondary

Columns:
- id
- school_id
- name

---

## grades

Columns:
- id
- school_id
- stage_id
- name

---

## classrooms

Columns:
- id
- school_id
- grade_id
- classroom_name

---

## subjects

Columns:
- id
- school_id
- subject_code
- subject_name

---

## teacher_subjects

Columns:
- id
- school_id
- teacher_id
- subject_id

---

## teacher_schedule

Columns:
- id
- school_id
- teacher_id
- subject_id
- classroom_id
- day_of_week
- period_number

---

# Students

## students

Columns:
- id
- school_id
- student_number
- national_id
- full_name
- gender
- birth_date
- stage_id
- grade_id
- classroom_id
- status
- created_at

---

## student_enrollments

Columns:
- id
- school_id
- student_id
- academic_year_id
- classroom_id

---

## student_guardians

Columns:
- id
- school_id
- student_id
- guardian_name
- guardian_phone
- guardian_email
- relationship

---

## student_documents

Columns:
- id
- school_id
- student_id
- file_name
- file_url

---

## student_timeline

Columns:
- id
- school_id
- student_id
- event_type
- event_title
- event_description
- created_at

---

# Teachers

## teachers

Columns:
- id
- school_id
- employee_number
- full_name
- national_id
- specialization
- hire_date
- status

---

## teacher_portfolio

Columns:
- id
- school_id
- teacher_id

---

## teacher_files

Columns:
- id
- school_id
- teacher_id
- file_name
- file_url

---

## teacher_certificates

Columns:
- id
- school_id
- teacher_id
- certificate_name
- issue_date

---

## teacher_performance

Columns:
- id
- school_id
- teacher_id
- score
- notes

---

# Attendance

## attendance_sessions

Columns:
- id
- school_id
- classroom_id
- attendance_date

---

## attendance_records

Columns:
- id
- school_id
- session_id
- student_id
- status

Status:
- present
- absent
- late
- excused

---

# Grades

## grade_categories

Examples:
- homework
- participation
- quiz
- midterm
- final

---

## grade_items

Columns:
- id
- school_id
- category_id
- subject_id
- title
- max_score

---

## student_grades

Columns:
- id
- school_id
- student_id
- grade_item_id
- score

---

# Behavior & Guidance

## behavior_records

## student_referrals

## guidance_cases

## guidance_interventions

---

# Health

## health_records

## health_visits

---

# Activities

## activities

## activity_programs

## activity_teams

## activity_participants

## activity_competitions

---

# Assessment Center

## central_exams

## exam_questions

## exam_results

---

# Measurement & Evaluation

## nafis_results

## qudrat_results

## tahsili_results

---

# Digital Lesson Preparation

## lesson_preparations

## lesson_templates

## lesson_resources

---

# AI Module

## ai_conversations

## ai_prompts

## ai_recommendations

---

# Communication

## notifications

## announcements

---

# Reporting

## reports

## saved_reports

---

# Mandatory Rules

1. Every business table must contain school_id.
2. Every table must support RLS.
3. Every critical action must be logged.
4. No school can access another school's data.
5. Permissions control access, not roles alone.