# bloodbank-pro
BloodBank Pro — Integrated Medical-Grade Blood Banking, Inventory Logistics, and Self-Service Portal

Here is a structured project description sheet that you can submit to your instructor for approval. It highlights the medical-grade rules and modern architecture of the system:

---

# Project Proposal: BloodBank Pro

## 1. Project Title
**BloodBank Pro** — Integrated Medical-Grade Blood Banking, Inventory Logistics, and Self-Service Portal

## 2. Project Overview
**BloodBank Pro** is a decoupled web application designed to automate clinical blood banking, laboratory testing queues, and inter-facility inventory distribution. It acts as both a **public self-service portal** (for donors to schedule donation slots and patients/recipients to request transfusions) and an **internal clinical management console** (for doctors, technologists, and administrators to test, crossmatch, and safely issue blood units).

---

## 3. Core Features by Module

### Module 1: Public Landing Page & Self-Service Portals
* **Network Directory**: A public landing page displaying an active directory of donation and transfusion centers.
* **Donor Portal**: Enables citizens to register, inspect their eligibility status (90-day cooldown check), view past donation history, and schedule donation slots at clinic locations.
* **Patient/Recipient Portal**: Allows patients or physicians to submit direct blood transfusion requests and monitor their status (e.g. Cleared, Transfused).

### Module 2: Authentication & Multi-Tenant Scoping
* **Multi-Facility Scoping**: Users (administrators, technologists, nurses) are bound to a specific facility scope, and database operations automatically filter by their active location.
* **Lockout Controls**: Implements security controls that lock accounts after 3 failed login attempts to prevent brute-force attacks.

### Module 3: Donor Management & Clinical Intake
* **Intake Eligibility Engine**: Validates donor vitals (weight, hemoglobin, temperature, and blood pressure) against safe clinical ranges.
* **Duplication Prevention**: Prevents double-logging of donors by validating unique National IDs or emails.

### Module 4: Laboratory Collection & Testing Queue
* **TTI Screening & Permanent Exclusions**: Collected blood units are quarantined. Technologists record ABO confirmation and screen for Transfusion-Transmitted Infections (TTI: HIV, Syphilis, Hep B, Hep C). 
* **Auto-Exclusion**: If a unit is TTI-reactive (positive), it is automatically flagged for disposal (`Discarded`), and the donor's record is permanently set to ineligible.

### Module 5: Smart Inventory & Logistics State-Machine
* **Auto-Aging Expiry Controls**: Enforces default shelf-lives (RBC: 35 days, Platelets: 5 days, FFP: 365 days) and triggers warning alerts (under 7 days remaining) to prevent the issue of expired components.
* **Transfer Logistics state-machine**: Facilitates shipment orders between hospitals (`Requested` $\rightarrow$ `Dispatched` $\rightarrow$ `InTransit` $\rightarrow$ `Received`/`Rejected`).

### Module 6: Cross-Matching & Bedside Transfusions
* **ABO Compatibility Matrix**: Restricts reservation listings to immunologically compatible blood units based on the patient's ABO/Rh group.
* **Dual-Nurse Bedside Sign-off**: Bedside transfusion starter panel requiring co-signing verification from two nurses verifying wristband matches before blood is transfused.
* **Adverse Reaction Registry**: Logs patient post-transfusion vitals and tracks reactions (Rigors, Bronchospasm, etc.) to trigger hemovigilance alarms.

### Module 7: Clinical Console KPI Cockpit
* Real-time metrics counters (donors registered, available units, active alerts).
* Dynamic blood group stock capacity indicators.
* Collected donations monthly trends.
* Hemovigilance investigation console allowing Medical Directors to review and resolve adverse events.

---

## 4. Technical Stack

* **Frontend (Single Page Application)**:
  - **React (Vite)**: Component-driven UI and high-performance compilation.
  - **TypeScript**: Static typing to eliminate runtime schema errors.
  - **React Query (TanStack)**: Server-state synchronization, query caching, and async mutation handlers.
  - **React Hook Form & Zod**: Client-side validation schemas.
  - **Tailwind CSS**: Light-mode responsive layout styling.

* **Backend (REST API)**:
  - **ASP.NET Core Web API (.NET 10)**: High-performance, stateless REST controller endpoints.
  - **ASP.NET Core Identity**: Password hashing, lockout counters, and user session creation.
  - **JWT (JSON Web Token)**: State-free token authentication embedding user facility scopes.
  - **FluentValidation**: Server-side request schema verification pipeline.
  - **Entity Framework Core (EF Core)**: Object-Relational Mapper (ORM) querying PostgreSQL database objects.

* **Database & DevOps**:
  - **PostgreSQL**: Medical-grade relational database.
  - **Docker**: For running PostgreSQL database container services locally.
