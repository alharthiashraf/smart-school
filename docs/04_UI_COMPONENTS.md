# 🎨 Smart School Platform 2.0

# UI Components Guide

الإصدار: 2.0

---

# الهدف

جميع صفحات المنصة يجب أن تعتمد على مكتبة مكونات موحدة.

يمنع إنشاء عناصر جديدة إذا كان يوجد Component يؤدي نفس المهمة.

---

# Design Principles

تعتمد الواجهة على:

- البساطة
- الوضوح
- إعادة الاستخدام
- الأداء
- التناسق
- هوية وزارة التعليم السعودية

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

Blue

#3d7eb9

Background

#f8fafc

---

# Buttons

المجلد

components/ui/buttons

---

## PrimaryButton

الاستخدام

الإجراء الرئيسي

مثل

حفظ

إنشاء

رفع

تحليل

---

## SecondaryButton

الاستخدام

الإجراءات الثانوية

مثل

إلغاء

رجوع

تحديث

---

## IconButton

الاستخدام

الأزرار الصغيرة

مثل

حذف

تعديل

عرض

طباعة

---

# Cards

المجلد

components/ui/cards

---

## StatCard

لعرض

الإحصاءات

مثل

عدد الطلاب

عدد المعلمين

عدد الشواهد

---

## MetricCard

لعرض

النسب

مثل

95%

87%

---

## SummaryCard

لعرض

الملخصات

---

## AIInsightCard

لعرض

نتائج الذكاء الاصطناعي

التوصيات

التحليلات

المخاطر

---

# Tables

المجلد

components/ui/tables

---

## DataTable

يعرض

البيانات

ولا يكتب جدول HTML جديد داخل الصفحات.

---

## TableToolbar

يحتوي

Search

Refresh

Export

Print

Add

Filters

---

## Pagination

يعرض

التنقل بين الصفحات.

---

# Forms

المجلد

components/ui/forms

---

## SearchBar

بحث

---

## FilterBar

تصفية

---

## FormSection

تقسيم النماذج

---

# Dialogs

المجلد

components/ui/dialogs

---

## ConfirmDialog

تأكيد

---

## DeleteDialog

تأكيد الحذف

---

## DetailsDialog

عرض التفاصيل

---

# Feedback

المجلد

components/ui/feedback

---

## LoadingSkeleton

أثناء التحميل

---

## EmptyState

عند عدم وجود بيانات

---

## ErrorState

عند حدوث خطأ

---

## SuccessBanner

عند نجاح العملية

---

# Layout

المجلد

components/ui/layout

---

## PageHeader

عنوان الصفحة

---

## PageToolbar

الأزرار الرئيسية

---

## Section

تقسيم الصفحة

---

# Charts

المجلد

components/ui/charts

---

تستخدم

Recharts

فقط

---

# AI Components

المجلد

components/ui/ai

---

تعرض

التوصيات

التحليلات

المخاطر

مؤشرات الجودة

---

# Icons

تستخدم

Lucide React

فقط.

---

# Responsive

كل Component

يجب أن يعمل على

Desktop

Tablet

Mobile

---

# RTL

كل Component

يدعم

RTL

افتراضياً.

---

# Accessibility

كل Button

يحتوي

aria-label

عند الحاجة.

---

# Typography

العنوان

Bold

الوصف

Regular

القيمة

ExtraBold

---

# Border Radius

تستخدم

rounded-2xl

أو

rounded-3xl

ولا يستخدم

rounded-sm

---

# Shadows

shadow-sm

shadow-md

حسب الحاجة.

---

# Spacing

يعتمد المشروع على

Tailwind Spacing

ولا تستخدم

Margin

عشوائياً.

---

# Reuse Rules

إذا احتاجت صفحتان

نفس البطاقات

يجب استخدام

StatCard

ولا يتم نسخ الكود.

---

إذا احتاجت صفحتان

جدولاً

يستخدم

DataTable

---

إذا احتاجت صفحتان

Header

يستخدم

PageHeader

---

# UI Philosophy

لا يتم تصميم الصفحة من الصفر.

بل يتم تركيبها من

UI Components

مثل قطع LEGO.

---

# Example

Students Page

↓

PageHeader

↓

StatCards

↓

TableToolbar

↓

DataTable

↓

Pagination

↓

Dialogs

↓

SuccessBanner

---

# Final Rule

أي Component جديد

يجب أن يكون

Reusable

وقابلاً للاستخدام

في ثلاث صفحات على الأقل.

إذا كان خاصاً بصفحة واحدة

فيوضع داخل مجلد تلك الصفحة

ولا يضاف إلى

UI Library.