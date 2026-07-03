# 🏫 Smart School Platform 2.0

# Development Guide

الإصدار: 2.0

آخر تحديث: 2026

---

# مقدمة

هذا الدليل هو المرجع الرسمي لتطوير منصة المدرسة الذكية.

أي صفحة أو خدمة أو مكون جديد يجب أن يلتزم بهذا الدليل.

الهدف هو:

- توحيد طريقة التطوير.
- منع تكرار الأكواد.
- تسهيل الصيانة.
- ضمان جودة الكود.
- تسهيل عمل الذكاء الاصطناعي على المشروع.

---

# Philosophy

المشروع يعتمد على:

Framework First

وليس

Pages First

أي أننا نبني النظام أولاً

ثم الصفحات.

---

# مراحل بناء أي ميزة

أي ميزة جديدة تمر بالمراحل التالية:

Requirement

↓

Types

↓

Validator

↓

Mapper

↓

Service

↓

Hook

↓

AI

↓

Analytics

↓

Template

↓

Page

↓

Testing

---

# إنشاء صفحة جديدة

مثال

Students

يجب إنشاء الملفات التالية:

types/student.ts

↓

validators/student.validator.ts

↓

mappers/student.mapper.ts

↓

services/students.service.ts

↓

hooks/useStudents.ts

↓

lib/analytics/studentAnalytics.ts

↓

lib/ai/studentAI.ts

↓

app/students/page.tsx

---

# App Folder

داخل app

لا يكتب

Business Logic

بل:

- استدعاء Hook
- استدعاء Template
- تمرير البيانات

فقط.

---

# Components

كل Component

يجب أن يكون:

Reusable

ولا يحتوي استعلامات قاعدة بيانات.

---

# Services

أي استعلام Supabase

يكتب داخل

Service

فقط.

مثال:

StudentsService

TeachersService

AttendanceService

ولا يسمح باستدعاء Supabase داخل الصفحة.

---

# Hooks

أي حالة React

تكتب داخل Hook.

مثال:

useStudents()

ويكون مسؤولاً عن:

تحميل البيانات

التحديث

الحذف

التصفية

البحث

الإحصاءات

---

# Validators

أي عملية حفظ

تمر أولاً

على Validator.

إذا فشل التحقق

لا يتم الحفظ.

---

# Mappers

أي بيانات قادمة من Supabase

تمر على Mapper.

ولا تستخدم البيانات الخام داخل الواجهة.

---

# AI

أي تحليل

يجب أن يعتمد على

AI Engine.

ولا يسمح بكتابة منطق AI داخل الصفحة.

---

# Analytics

أي رسم بياني

يعتمد على

Analytics Layer.

---

# Templates

أي صفحة

يجب أن تعتمد على أحد القوالب التالية:

CRUDTemplate

DashboardTemplate

AnalysisTemplate

AIPageTemplate

ReportTemplate

ولا يسمح ببناء صفحة جديدة من الصفر إلا لسبب واضح.

---

# UI Components

يستخدم المشروع فقط المكونات الموجودة داخل:

components/ui

ولا يسمح بإنشاء Button جديد إذا كان PrimaryButton موجوداً.

---

# أسماء الملفات

المكونات:

PascalCase

مثال

StudentCard.tsx

---

Hooks

camelCase

مثال

useStudents.ts

---

Services

camelCase

students.service.ts

---

Validators

student.validator.ts

---

Mappers

student.mapper.ts

---

Analytics

studentAnalytics.ts

---

AI

studentAI.ts

---

# Naming

لا تستخدم أسماء عامة مثل:

data

list

temp

obj

بل استخدم:

students

attendanceRecords

qualityEvidence

teacherPerformance

---

# Imports

رتبها دائماً:

React

↓

Next

↓

Third Party

↓

Components

↓

Hooks

↓

Services

↓

Utils

↓

Types

↓

Styles

---

# Folder Rule

أي ملف

يعرف مكانه من أول مرة.

ولا يجوز إنشاء ملفات عشوائية.

---

# Quality

أي كود جديد

يجب أن يحقق:

Reusable

Readable

Scalable

Maintainable

Typed

---

# Error Handling

كل Service

يعيد

data

error

ولا يرمي Exceptions إلا في الحالات الحرجة.

---

# Loading

أي صفحة

تحتوي على:

LoadingSkeleton

---

# Empty State

إذا لم توجد بيانات

تعرض

EmptyState

---

# Error State

أي خطأ

يعرض

ErrorState

---

# Search

أي جدول

يحتوي على:

Search

Filter

Pagination

---

# Export

أي جدول

يدعم:

Excel

PDF

Print

ولا يستخدم CSV إلا إذا طلب المستخدم ذلك.

---

# Responsive

كل صفحة

تعمل على:

Desktop

Tablet

Mobile

---

# Performance

استخدم:

useMemo

useCallback

عند الحاجة.

ولا تستخدمها بدون سبب.

---

# Security

لا تحفظ

Secrets

داخل المشروع.

جميع المفاتيح

داخل

.env.local

---

# Supabase

أي عملية

Insert

Update

Delete

تمر عبر Services.

---

# Roles

أي صفحة

تحدد

Permission

وليس Role مباشرة.

---

# AI Rules

أي توصية

توضح أنها توصية

وليست قراراً إلزامياً.

---

# Documentation

أي Feature جديدة

يجب تحديث:

Architecture

Development Guide

UI Components

إذا أثرت عليها.

---

# Final Goal

أن تصبح منصة المدرسة الذكية

Framework تعليمياً

قابلاً للتوسع

وقابلاً للصيانة

ويستطيع أي مطور أو نموذج ذكاء اصطناعي فهمه خلال دقائق.