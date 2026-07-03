# Roles & Permissions
# منصة المدرسة الذكية 2.0

---

# فلسفة النظام

يعتمد النظام على:

1. Role (الدور)
2. Permission (الصلاحية)

ولا يتم الاعتماد على الدور فقط.

يمكن لأي مستخدم امتلاك أكثر من دور.
ويمكن تخصيص صلاحيات إضافية أو سحب صلاحيات منه.

---

# Roles

## System Roles

### super_admin

صلاحية كاملة على جميع المدارس والمنصة.

---

## School Roles

### school_owner

مالك المدرسة.

### school_admin

مدير المدرسة.

### vice_principal

وكيل المدرسة.

### administrative_staff

الإداري.

---

## Support Roles

### student_counselor

المرشد الطلابي.

### health_supervisor

الموجه الصحي.

### activity_leader

رائد النشاط.

---

## Academic Roles

### teacher

المعلم.

### homeroom_teacher

رائد الفصل.

---

## End User Roles

### student

الطالب.

### parent

ولي الأمر.

---

# System Modules

students
teachers
attendance
grades
schedule
behavior
referrals
guidance
health
activities
assessments
reports
analytics
notifications
users
settings

---

# Students Permissions

students.view
students.create
students.update
students.delete
students.export
students.import

---

# Teachers Permissions

teachers.view
teachers.create
teachers.update
teachers.delete
teachers.export
teachers.import

---

# Attendance Permissions

attendance.view
attendance.take
attendance.edit
attendance.close
attendance.export

---

# Grades Permissions

grades.view
grades.create
grades.update
grades.delete
grades.approve
grades.export
grades.analyze

---

# Schedule Permissions

schedule.view
schedule.create
schedule.update
schedule.delete

---

# Behavior Permissions

behavior.view
behavior.create
behavior.update
behavior.delete
behavior.export

---

# Referrals Permissions

referrals.view
referrals.create
referrals.update
referrals.close
referrals.export

---

# Guidance Permissions

guidance.view
guidance.create
guidance.update
guidance.close
guidance.export

---

# Health Permissions

health.view
health.create
health.update
health.close
health.export

---

# Activities Permissions

activities.view
activities.create
activities.update
activities.delete
activities.export

---

# Assessments Permissions

assessments.view
assessments.create
assessments.update
assessments.delete
assessments.publish
assessments.export

---

# Reports Permissions

reports.view
reports.export

---

# Analytics Permissions

analytics.view
analytics.export

---

# Notifications Permissions

notifications.view
notifications.create
notifications.send

---

# Users Permissions

users.view
users.create
users.update
users.delete
users.roles.manage

---

# Settings Permissions

settings.view
settings.update
settings.manage

---

# Security Rules

- كل البيانات مرتبطة بـ school_id
- جميع العمليات تسجل في audit_logs
- لا يمكن الوصول للبيانات بدون صلاحية
- يتم تطبيق RLS على جميع الجداول
- المدرسة لا ترى بيانات مدرسة أخرى

---

# Future Expansion

- AI Assistant Permissions
- Mobile App Permissions
- External Integrations Permissions
- API Access Permissions