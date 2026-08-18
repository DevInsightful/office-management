import { updateOwnProfileAction } from "@/app/actions";
import { PendingSubmitButton } from "@/app/pending-controls";
import { Field, PageIntro, Panel, inputClass, primaryButton } from "@/app/ui";
import { requireUser } from "@/lib/auth";
import { ensureDb, sql } from "@/lib/db";

type ProfileRow = {
  full_name: string;
  email: string;
  role: "super_admin" | "admin" | "employee";
  joined_on: string;
  salary: string;
  personal_email: string | null;
  bank_account_no: string | null;
  bank_iban: string | null;
  bank_name: string | null;
  account_title: string | null;
  profile_details_updated_at: string | null;
};

function formatUpdatedOn(value: string | null) {
  if (!value) {
    return "Not updated yet.";
  }

  return new Intl.DateTimeFormat("en-PK", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

export default async function ProfilePage() {
  const user = await requireUser();
  await ensureDb();

  const rows = await sql<ProfileRow[]>`
    select
      full_name,
      email,
      role,
      joined_on::text,
      salary::text,
      personal_email,
      bank_account_no,
      bank_iban,
      bank_name,
      account_title,
      profile_details_updated_at::text
    from users
    where id = ${user.id}
    limit 1
  `;

  const profile = rows[0];

  return (
    <div className="space-y-4">
      <PageIntro
        eyebrow="Profile"
        title={user.role === "employee" ? "Your profile" : "My profile"}
        description="Primary details are locked. You can update your optional personal email and bank account details here."
      />

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.25fr]">
        <Panel title="Primary details" subtitle="These details come from the main employee record and cannot be edited here.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name">
              <input value={profile.full_name} readOnly className={`${inputClass} bg-slate-50 text-slate-500`} />
            </Field>
            <Field label="Work email">
              <input value={profile.email} readOnly className={`${inputClass} bg-slate-50 text-slate-500`} />
            </Field>
            <Field label="Role">
              <input value={profile.role.replace("_", " ")} readOnly className={`${inputClass} bg-slate-50 capitalize text-slate-500`} />
            </Field>
            <Field label="Joined on">
              <input value={profile.joined_on} readOnly className={`${inputClass} bg-slate-50 text-slate-500`} />
            </Field>
            <Field label="Salary">
              <input value={profile.salary} readOnly className={`${inputClass} bg-slate-50 text-slate-500`} />
            </Field>
          </div>
        </Panel>

        <Panel title="Editable details" subtitle="Only secondary details can be changed from this page.">
          <form action={updateOwnProfileAction} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Personal email (optional)">
                <input
                  name="personalEmail"
                  type="email"
                  defaultValue={profile.personal_email ?? ""}
                  placeholder="name@example.com"
                  className={inputClass}
                />
              </Field>
              <Field label="Account title">
                <input
                  name="accountTitle"
                  defaultValue={profile.account_title ?? ""}
                  placeholder="Account holder name"
                  className={inputClass}
                />
              </Field>
              <Field label="Account no">
                <input
                  name="bankAccountNo"
                  defaultValue={profile.bank_account_no ?? ""}
                  placeholder="Enter account number"
                  className={inputClass}
                />
              </Field>
              <Field label="IBAN">
                <input
                  name="bankIban"
                  defaultValue={profile.bank_iban ?? ""}
                  placeholder="Enter IBAN"
                  className={inputClass}
                />
              </Field>
              <Field label="Bank name">
                <input
                  name="bankName"
                  defaultValue={profile.bank_name ?? ""}
                  placeholder="Enter bank name"
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Updated on: {formatUpdatedOn(profile.profile_details_updated_at)}
            </div>

            <PendingSubmitButton
              idleLabel="Save profile details"
              pendingLabel="Saving..."
              className={`${primaryButton} gap-3 sm:w-auto sm:px-6`}
              pendingClassName="cursor-not-allowed bg-slate-700 hover:bg-slate-700 sm:w-auto sm:px-6"
            />
          </form>
        </Panel>
      </section>
    </div>
  );
}
