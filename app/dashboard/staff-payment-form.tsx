"use client";

import { useState } from "react";

import { PendingSubmitButton } from "@/app/pending-controls";
import { Field, inputClass, primaryButton, textareaClass } from "@/app/ui";

type RecipientOption = {
  id: number;
  fullName: string;
  role: "admin" | "employee";
  primaryEmail: string;
  secondaryEmail: string;
  accountTitle: string;
  bankAccountNo: string;
  bankIban: string;
  bankName: string;
};

export function StaffPaymentForm({
  recipients,
  today,
  action,
}: {
  recipients: RecipientOption[];
  today: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [selectedRecipientId, setSelectedRecipientId] = useState(String(recipients[0]?.id ?? ""));
  const [primaryEmail, setPrimaryEmail] = useState(recipients[0]?.primaryEmail ?? "");
  const [secondaryEmail, setSecondaryEmail] = useState(recipients[0]?.secondaryEmail ?? "");
  const [accountTitle, setAccountTitle] = useState(recipients[0]?.accountTitle ?? "");
  const [bankAccountNo, setBankAccountNo] = useState(recipients[0]?.bankAccountNo ?? "");
  const [bankIban, setBankIban] = useState(recipients[0]?.bankIban ?? "");
  const [bankName, setBankName] = useState(recipients[0]?.bankName ?? "");

  function handleRecipientChange(nextRecipientId: string) {
    setSelectedRecipientId(nextRecipientId);

    const recipient = recipients.find((item) => String(item.id) === nextRecipientId);

    setPrimaryEmail(recipient?.primaryEmail ?? "");
    setSecondaryEmail(recipient?.secondaryEmail ?? "");
    setAccountTitle(recipient?.accountTitle ?? "");
    setBankAccountNo(recipient?.bankAccountNo ?? "");
    setBankIban(recipient?.bankIban ?? "");
    setBankName(recipient?.bankName ?? "");
  }

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Recipient">
          <select
            name="recipientUserId"
            value={selectedRecipientId}
            onChange={(event) => handleRecipientChange(event.target.value)}
            className={inputClass}
          >
            {recipients.map((recipient) => (
              <option key={recipient.id} value={recipient.id}>
                {recipient.fullName} ({recipient.role})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Amount paid">
          <input name="amountPaid" type="number" min="0.01" step="0.01" placeholder="25000" className={inputClass} />
        </Field>
        <Field label="Date paid">
          <input name="paidOn" type="date" defaultValue={today} className={inputClass} />
        </Field>
        <Field label="Primary email">
          <input
            name="primaryEmail"
            type="email"
            value={primaryEmail}
            onChange={(event) => setPrimaryEmail(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Secondary email">
          <input
            name="secondaryEmail"
            type="email"
            value={secondaryEmail}
            onChange={(event) => setSecondaryEmail(event.target.value)}
            placeholder="Optional"
            className={inputClass}
          />
        </Field>
        <Field label="Account title">
          <input
            name="accountTitle"
            value={accountTitle}
            onChange={(event) => setAccountTitle(event.target.value)}
            placeholder="Account holder"
            className={inputClass}
          />
        </Field>
        <Field label="Bank account no">
          <input
            name="bankAccountNo"
            value={bankAccountNo}
            onChange={(event) => setBankAccountNo(event.target.value)}
            placeholder="Account number"
            className={inputClass}
          />
        </Field>
        <Field label="IBAN">
          <input
            name="bankIban"
            value={bankIban}
            onChange={(event) => setBankIban(event.target.value)}
            placeholder="PK..."
            className={inputClass}
          />
        </Field>
        <Field label="Bank name">
          <input
            name="bankName"
            value={bankName}
            onChange={(event) => setBankName(event.target.value)}
            placeholder="Bank name"
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Purpose">
        <textarea
          name="purpose"
          rows={3}
          placeholder="Optional payment purpose or note"
          className={textareaClass}
        />
      </Field>

      <PendingSubmitButton
        idleLabel="Add payment record"
        pendingLabel="Saving payment..."
        className={`${primaryButton} gap-3`}
        pendingClassName="cursor-not-allowed bg-slate-700 hover:bg-slate-700"
      />
    </form>
  );
}
