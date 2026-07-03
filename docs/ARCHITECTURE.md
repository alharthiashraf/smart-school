# 🏫 Smart School Platform 2.0

# Architecture Documentation

الإصدار: 2.0

آخر تحديث: 2026

---

# Vision

منصة المدرسة الذكية ليست مجرد نظام مدرسي.

إنها منصة تعليمية متكاملة تعتمد على:

- الذكاء الاصطناعي
- تعدد المدارس Multi School
- إدارة الصلاحيات
- الجودة والاعتماد
- التحليلات
- التقارير الذكية
- الأتمتة
- سهولة التطوير

---

# Core Principles

يعتمد المشروع على المبادئ التالية:

✅ Separation of Concerns

كل طبقة لها مسؤولية واحدة فقط.

---

✅ Reusable Components

أي عنصر يتم بناؤه مرة واحدة فقط.

ثم يستخدم في جميع الصفحات.

---

✅ DRY

Don't Repeat Yourself

ممنوع تكرار الكود.

---

✅ Enterprise Architecture

تم تصميم المشروع ليخدم آلاف المدارس.

---

✅ AI First

الذكاء الاصطناعي جزء أساسي من النظام.

وليس إضافة لاحقة.

---

# Project Structure

```

app/
components/
config/
constants/
contexts/
core/
docs/
hooks/
lib/
mappers/
middleware/
providers/
services/
templates/
types/
utils/
validators/
public/

```

---

# Layers

يعتمد المشروع على عدة طبقات.

---

## 1 App Layer

تمثل صفحات Next.js

مثال

```

app/students

app/teachers

app/attendance

```

هذه الطبقة لا تحتوي منطق أعمال.

بل تقوم بعرض البيانات فقط.

---

## 2 Templates Layer

تمثل قوالب الصفحات.

مثل

```

CRUDTemplate

DashboardTemplate

AIPageTemplate

AnalysisTemplate

ReportTemplate

```

أي صفحة جديدة يجب أن تعتمد على Template.

---

## 3 Components Layer

واجهة المستخدم.

تشمل

Buttons

Cards

Tables

Dialogs

Forms

Layout

Feedback

Charts

AI Components

---

## 4 Hooks Layer

مسؤولة عن

تحميل البيانات

الإدارة المحلية للحالة

التصفية

البحث

الإحصاءات

مثال

```

useStudents()

```

---

## 5 Services Layer

الطبقة الوحيدة المسموح لها بالتعامل مع Supabase.

مثال

```

StudentsService

```

---

## 6 Mappers

تحويل بيانات قاعدة البيانات

إلى Models داخل النظام.

---

## 7 Validators

التحقق من صحة البيانات.

قبل الحفظ.

---

## 8 AI Layer

تشمل

Evidence AI

Grades AI

Attendance AI

Behavior AI

Dashboard AI

Report AI

Quality AI

---

## 9 Analytics Layer

تحويل البيانات

إلى مؤشرات ورسوم وتحليلات.

---

## 10 Core

محركات النظام.

مثل

AI Engine

Workflow Engine

Quality Engine

Permission Engine

Export Engine

Report Engine

---

# Data Flow

```

Supabase

↓

Service

↓

Mapper

↓

Hook

↓

Template

↓

Component

↓

User

```

---

# Reverse Flow

```

User

↓

Component

↓

Hook

↓

Validator

↓

Service

↓

Supabase

```

---

# AI Flow

```

Raw Data

↓

Analytics

↓

AI Engine

↓

Recommendations

↓

Executive Summary

↓

User Interface

```

---

# Folder Responsibilities

app

عرض الصفحات فقط.

---

components

واجهة المستخدم.

---

services

الوصول للبيانات.

---

hooks

منطق React.

---

templates

قوالب الصفحات.

---

validators

التحقق من الإدخال.

---

mappers

تحويل البيانات.

---

constants

الثوابت.

---

config

إعدادات النظام.

---

core

محركات النظام.

---

lib

الخدمات المشتركة.

---

# School Context

كل البيانات تعتمد على

School ID

ولا يجوز تحميل بيانات مدرسة أخرى.

---

# Permissions

يعتمد المشروع على

Role Based Access Control

RBAC

---

كل صفحة

تحدد

Permission

وليس Role

---

# Export Engine

جميع الصفحات

تستخدم

Excel

PDF

Print

ولا يسمح بتكرار كود التصدير.

---

# AI Engine

أي تحليل داخل المشروع

يمر عبر

AI Engine

ولا يكتب داخل الصفحة.

---

# UI Rules

كل الصفحات تستخدم

PageHeader

PageToolbar

Section

StatCard

DataTable

ولا يسمح بإنشاء تصميم جديد خارج Design System.

---

# Colors

Primary

#15445a

Secondary

#07a869

Accent

#0da9a6

Gold

#c1b489

---

# RTL

جميع الصفحات

RTL

ولا يسمح باستخدام LTR.

---

# Responsive

كل صفحة

Desktop

Tablet

Mobile

---

# Security

لا يسمح

باستدعاء Supabase

داخل الصفحات.

---

لا يسمح

بكتابة SQL داخل Components.

---

لا يسمح

بتكرار الاستعلامات.

---

# Future Architecture

يشمل مستقبلاً

Notifications

Calendar

Workflow

Tasks

Meetings

Approvals

API

Plugins

Marketplace

Mobile App

AI Agents

---

# Smart School Philosophy

المنصة ليست مجموعة صفحات.

بل Framework تعليمي متكامل.

أي ميزة جديدة

يجب أن تمر بجميع الطبقات السابقة.

ولا يسمح بإضافة اختصارات تؤثر على جودة المشروع.