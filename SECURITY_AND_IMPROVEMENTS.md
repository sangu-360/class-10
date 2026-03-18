# Security, Privacy, and Anti-Malpractice Analysis

This document outlines the current limitations of the **CodeInsight AI** platform and provides a roadmap for enhancing security, privacy, and cheating prevention.

---

## 🚩 Current Issues & Vulnerabilities

1.  **Plain-Text Passwords**: Currently, passwords for students and faculty are stored as plain text in the database. This is a critical security risk. If the database is compromised, all user accounts are exposed.
2.  **Client-Side Grading**: The grading logic (MCQ and Coding) happens in the browser before sending the result to the database. A tech-savvy student could intercept the network request or modify the local state to submit a perfect score.
3.  **Weak Admin Access**: The "PIN" system is a shared secret. If one person leaks the PIN, the entire administrative interface is exposed.
4.  **No Environment Lockdown**: Students can freely switch tabs, use Google, or open AI tools (like ChatGPT) in another window without the system noticing.
5.  **Clipboard Freedom**: Students can copy code from external sources and paste it directly into the IDE.
6.  **Static Question Sets**: Every student receives the same questions in the same order, making it easy to share answers in real-time.

---

## 🛠️ Recommended Additions

### 1. Authentication & Privacy
*   **Supabase Auth Integration**: Move away from custom `password` fields. Use Supabase's built-in Authentication (GoTrue) which handles hashing, salting, and JWT-based session management.
*   **Encrypted Data**: Sensitive student information (like USN or contact details) should be encrypted at rest.
*   **Audit Logs**: Implement a "System Log" that records every administrative action (who registered whom, who changed a password, etc.).

### 2. Proctored Exam Environment
*   **Tab-Switch Detection**: Use the `visibilitychange` API to detect when a student leaves the exam tab. Automatically flag or disqualify the attempt after a certain number of warnings.
*   **Full-Screen Enforcement**: Require the exam to be taken in full-screen mode. Detect when the user exits full-screen.
*   **Disable Right-Click & Shortcuts**: Prevent `Ctrl+C`, `Ctrl+V`, and right-click menus within the `TestInterface`.

### 3. Malpractice Prevention (Anti-Cheating)
*   **Question Shuffling**: Randomize the order of questions and the order of options within MCQs for every student.
*   **Code Similarity Engine**: After the test, run a script to compare the code submissions of all students. High similarity scores (e.g., >80%) should be flagged for manual review.
*   **Time-Windowed Questions**: Set a maximum time per question to prevent students from spending the entire exam time researching a single difficult problem.

---

## 🚀 Suggestions for Better Code Exams

### 1. Beyond the PIN: Multi-Factor Admin
Instead of a static PIN, use **Role-Based Access Control (RBAC)** linked to official institutional emails. Admins should be verified via a one-time link sent to their email or a hardware security key.

### 2. Secure Grading Pipeline
Move the grading logic to a **Server-Side Function** (e.g., Supabase Edge Functions).
*   The client sends the *answers*.
*   The server calculates the *score*.
*   The server writes the *result* to a read-only table for the student.

### 3. Dynamic Coding Challenges
Instead of static prompts, use a "Parameter Generator."
*   **Example**: "Write a function to find the sum of an array."
*   **Dynamic**: The system provides a unique set of test cases (hidden from the student) that the code must pass.

### 4. Browser Lockdown (SEB)
For high-stakes exams, recommend the use of **Safe Exam Browser (SEB)**. It turns the computer into a secure workstation, preventing access to any other websites or applications during the test.

---

## 🛡️ Privacy First
*   **Data Minimization**: Only collect the data absolutely necessary for the exam.
*   **Right to be Forgotten**: Allow students to request the deletion of their data after graduation or a specific period.
*   **Transparent Logging**: Inform students exactly what is being tracked (e.g., "We are monitoring tab switches for integrity purposes").

---
*Prepared for Atria Institute of Technology - Academic Assessment Portal*
