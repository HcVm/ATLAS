I will implement the presentation letter generation feature for CRM clients.

### **Plan:**

1.  **Create Generator Library (`lib/presentation-letter-generator.ts`)**
    *   Create a new file based on `cci-letter-generator.ts`.
    *   Implement `generatePresentationLetter` function.
    *   Define `PresentationLetterData` interface.
    *   Implement specific HTML templates for **ARM**, **AGLE**, and **GALUR** using the exact text and structure provided by the user.
    *   Handle dynamic data insertion (Client Name, RUC, Address, Date).
    *   Use the provided letterhead URLs.
    *   Implement logic to determine the correct template based on the logged-in user's company or selected company.

2.  **Update Client Card (`components/sales/client-card.tsx`)**
    *   Add a new action button (icon: `FileText` or similar) to the client card footer.
    *   Expose an `onGenerateLetter` prop to handle the click event.

3.  **Integrate in CRM Page (`app/(dashboard)/sales/crm/page.tsx`)**
    *   Implement the `handleGenerateLetter` function.
    *   This function will:
        *   Identify the current company context (ARM, AGLE, GALUR).
        *   Prepare the client data.
        *   Call `generatePresentationLetter`.
        *   Handle any errors (toast notifications).
    *   Pass the handler to the `ClientCard` components.

### **Technical Details:**
*   **Company Detection**: Will rely on the existing logic used in `cci-letter-generator` (checking `user.company_id` or `selectedCompanyId` for admins).
*   **Letter Numbering**: Will generate a default format (e.g., `[PREFIX]-[YEAR]-[MONTH]`) or a simple sequential simulation since no database sequence was specified.
*   **Date Formatting**: "Lima, [Día] de [Mes] del [Año]".
