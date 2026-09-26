# Job Work & Manufacturing Workflow Management System

A web-based **Job Work and Manufacturing Workflow Management System** designed to digitize and streamline the process of receiving parts, managing job-work operations, tracking stock, and maintaining outward/inward records.

The system replaces manual Excel-based tracking with a centralized application for managing companies, parts, job-work entries, stock, and operational summaries.

---

## 🚀 Features

- 🔐 **User Authentication**
  - Login system with role-based access
  - Admin and operator users

- 🏢 **Company Management**
  - Add, edit, and delete companies
  - Maintain customer and supplier information

- ⚙️ **Part Management**
  - Manage part numbers and model numbers
  - Define and manage sub-parts
  - Associate parts with specific job-work requirements

- 📦 **Job Work Entry Management**
  - Record inward and outward transactions
  - Track challan numbers, dates, quantities, and bills
  - Record correct quantities and fault quantities
  - Track manufacturing/job-work status

- 📊 **Stock Management**
  - Monitor available stock
  - Track inward and outward quantities
  - Maintain part-wise stock information

- 📈 **Dashboard & Reports**
  - Overview of job-work activities
  - Part and company-wise summaries
  - Quick access to important operational information

- 🔎 **Search & Lookup**
  - Search parts using part numbers
  - Model-based lookup
  - Company and transaction filtering

- 💾 **Database Integration**
  - Persistent data storage
  - Structured database management using Supabase

---

## 🛠️ Tech Stack

### Frontend
- React
- TypeScript
- Vite
- CSS

### Backend / Database
- Supabase
- PostgreSQL

### Development Tools
- Node.js
- npm
- Git & GitHub

---

## 🏗️ System Workflow

```text
Company
   │
   ▼
Parts & Models
   │
   ▼
Inward Entry
   │
   ▼
Job Work / Manufacturing Process
   │
   ▼
Quality & Fault Recording
   │
   ▼
Outward Entry
   │
   ▼
Stock & Summary
