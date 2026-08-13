import {
  addFacebookPageAction,
  createFacebookIdAction,
  deleteFacebookPageAction,
  importFacebookIdsCsvAction,
  updateFacebookIdAction,
  updateFacebookPageAction,
} from "@/app/actions";
import { AssignFacebookIdForm, FacebookIdsClient, FacebookIdsCsvFileField, StatusTagsForm } from "@/app/dashboard/client-tables";
import { PendingSubmitButton } from "@/app/pending-controls";
import { ActionLink, Field, ModalFrame, PageIntro, inputClass, primaryButton, secondaryButton } from "@/app/ui";
import { requireUser } from "@/lib/auth";
import { consumeImportResult, getFacebookIdsData } from "@/lib/facebook-ids";

const IMPORT_ERROR_MESSAGES: Record<string, string> = {
  missing_file: "Please choose a CSV or Excel file to import.",
  empty_file: "That file has no rows to import.",
  invalid_headers: "Could not find the expected headers. Make sure the file has: Email *, Facebook Password *, Email/Gmail Password.",
  unreadable_file: "Could not read that file. Make sure it is a valid .csv or .xlsx file.",
};

function describeImportError(code: string) {
  return IMPORT_ERROR_MESSAGES[code] ?? code;
}

export default async function FacebookIdsPage({
  searchParams,
}: {
  searchParams?: Promise<{ modal?: string; facebookId?: string; importResult?: string; error?: string }>;
}) {
  const user = await requireUser();
  const isAdmin = user.role !== "employee";
  const data = await getFacebookIdsData(user);
  const params = searchParams ? await searchParams : undefined;
  const modal = params?.modal;
  const selectedId = Number(params?.facebookId ?? 0);
  const selectedRecord = data.records.find((record) => record.id === selectedId) ?? null;
  const importResult = params?.importResult ? await consumeImportResult(params.importResult) : null;

  return (
    <>
      <PageIntro
        eyebrow="Facebook IDs"
        title={isAdmin ? "Facebook ID management" : "My Facebook IDs"}
        description={
          isAdmin
            ? "Manage the Facebook ID pool, assign accounts to employees, and track linked pages."
            : "Facebook IDs and pages currently assigned to you."
        }
        action={
          isAdmin ? (
            <div className="flex flex-wrap items-center gap-3">
              <ActionLink href="/dashboard/facebook-ids?modal=import-csv" label="Import CSV" />
              <ActionLink href="/dashboard/facebook-ids?modal=new-id" label="Add ID" />
            </div>
          ) : undefined
        }
      />

      {importResult && (
        <div className="min-w-0 overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <h2 className="text-lg font-semibold text-slate-950">Import summary</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <SummaryStat label="Total rows" value={importResult.totalRows} />
            <SummaryStat label="Imported" value={importResult.successCount} tone="text-emerald-700" />
            <SummaryStat label="Duplicates" value={importResult.duplicateCount} tone="text-amber-700" />
            <SummaryStat label="Invalid" value={importResult.invalidCount} tone="text-rose-700" />
          </div>
          {(importResult.failedRows.length > 0 || importResult.duplicateRows.length > 0) && (
            <div className="mt-4">
              <a
                href={`/api/facebook-ids/failed-rows?ref=${params?.importResult}`}
                className="inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
              >
                Download failed / duplicate rows
              </a>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-slate-500">
                    <tr>
                      <th className="pb-2 pr-4 font-medium">Row</th>
                      <th className="pb-2 pr-4 font-medium">Email</th>
                      <th className="pb-2 pr-4 font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[...importResult.failedRows, ...importResult.duplicateRows]
                      .sort((left, right) => left.row - right.row)
                      .map((row, index) => (
                        <tr key={`${row.row}-${index}`}>
                          <td className="py-2 pr-4 text-slate-600">{row.row}</td>
                          <td className="py-2 pr-4 text-slate-600">{row.email || "-"}</td>
                          <td className="py-2 pr-4 text-slate-600">{row.reason}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <FacebookIdsClient
        records={data.records}
        employees={data.employees}
        isAdmin={isAdmin}
        canManagePages={user.canManagePages}
      />

      {modal === "new-id" && isAdmin && (
        <ModalFrame
          title="Add Facebook ID"
          subtitle="Create a new Facebook ID record. It starts unassigned with no pages."
          closeHref="/dashboard/facebook-ids"
        >
          <form action={createFacebookIdAction} className="space-y-3">
            <Field label="Email">
              <input name="email" type="email" required placeholder="example@gmail.com" className={inputClass} />
            </Field>
            <Field label="Facebook Password">
              <input name="facebookPassword" placeholder="Facebook password" className={inputClass} />
            </Field>
            <Field label="Email/Gmail Password (optional)">
              <input name="emailPassword" placeholder="Email or Gmail password" className={inputClass} />
            </Field>
            <p className="text-xs text-slate-500">At least one of Facebook Password or Email/Gmail Password is required.</p>
            {params?.error && <p className="text-xs font-medium text-rose-600">{params.error}</p>}
            <PendingSubmitButton
              idleLabel="Save Facebook ID"
              pendingLabel="Saving..."
              className={`${primaryButton} gap-3`}
              pendingClassName="cursor-not-allowed bg-slate-700 hover:bg-slate-700"
            />
          </form>
        </ModalFrame>
      )}

      {modal === "edit-id" && isAdmin && selectedRecord && (
        <ModalFrame
          title={`Edit ${selectedRecord.email}`}
          subtitle="Update credentials for this Facebook ID."
          closeHref="/dashboard/facebook-ids"
        >
          <form action={updateFacebookIdAction} className="space-y-3">
            <input type="hidden" name="facebookIdId" value={selectedRecord.id} />
            <Field label="Email">
              <input name="email" type="email" required defaultValue={selectedRecord.email} className={inputClass} />
            </Field>
            <Field label="Facebook Password">
              <input name="facebookPassword" defaultValue={selectedRecord.facebookPassword ?? ""} className={inputClass} />
            </Field>
            <Field label="Email/Gmail Password (optional)">
              <input name="emailPassword" defaultValue={selectedRecord.emailPassword ?? ""} className={inputClass} />
            </Field>
            {params?.error && <p className="text-xs font-medium text-rose-600">{params.error}</p>}
            <PendingSubmitButton
              idleLabel="Update Facebook ID"
              pendingLabel="Updating..."
              className={`${primaryButton} gap-3`}
              pendingClassName="cursor-not-allowed bg-slate-700 hover:bg-slate-700"
            />
          </form>
        </ModalFrame>
      )}

      {modal === "assign" && isAdmin && selectedRecord && (
        <ModalFrame
          title={`Assign ${selectedRecord.email}`}
          subtitle="Choose which employee this Facebook ID should belong to."
          closeHref="/dashboard/facebook-ids"
        >
          <AssignFacebookIdForm
            facebookIdId={selectedRecord.id}
            employees={data.employees}
            currentAssigneeId={selectedRecord.assignedTo}
          />
        </ModalFrame>
      )}

      {modal === "status" && isAdmin && selectedRecord && (
        <ModalFrame
          title={`ID Status for ${selectedRecord.email}`}
          subtitle="Tag this Facebook ID with one or more status labels."
          closeHref="/dashboard/facebook-ids"
        >
          <StatusTagsForm facebookIdId={selectedRecord.id} currentStatus={selectedRecord.status} />
        </ModalFrame>
      )}

      {modal === "pages" && selectedRecord && (
        <ModalFrame
          title={`Pages for ${selectedRecord.email}`}
          subtitle="Facebook Pages linked to this Facebook ID."
          closeHref="/dashboard/facebook-ids"
        >
          {(() => {
            const canEditPages = isAdmin || user.canManagePages;

            return (
              <div className="space-y-4">
                {(selectedRecord.pages ?? []).length === 0 && (
                  <p className="text-sm text-slate-500">No pages added yet.</p>
                )}

                {(selectedRecord.pages ?? []).map((page) =>
                  canEditPages ? (
                    <div key={page.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <form action={updateFacebookPageAction} className="space-y-2">
                        <input type="hidden" name="facebookIdId" value={selectedRecord.id} />
                        <input type="hidden" name="pageId" value={page.id} />
                        <Field label="Page name">
                          <input name="name" defaultValue={page.name} required className={inputClass} />
                        </Field>
                        <Field label="Page password">
                          <input name="password" defaultValue={page.password} required className={inputClass} />
                        </Field>
                        <div className="flex flex-wrap gap-2">
                          <PendingSubmitButton
                            idleLabel="Save"
                            pendingLabel="Saving..."
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                            pendingClassName="cursor-not-allowed bg-slate-100 text-slate-500 hover:bg-slate-100"
                          />
                        </div>
                      </form>
                      <form action={deleteFacebookPageAction} className="mt-2">
                        <input type="hidden" name="facebookIdId" value={selectedRecord.id} />
                        <input type="hidden" name="pageId" value={page.id} />
                        <PendingSubmitButton
                          idleLabel="Remove page"
                          pendingLabel="Removing..."
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                          pendingClassName="cursor-not-allowed bg-rose-50 text-rose-400 hover:bg-rose-50"
                        />
                      </form>
                    </div>
                  ) : (
                    <div key={page.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">{page.name}</p>
                      <p className="mt-1 font-mono text-sm text-slate-600">{page.password}</p>
                    </div>
                  ),
                )}

                {canEditPages && (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-4">
                    <p className="mb-3 text-sm font-semibold text-slate-900">Add a page</p>
                    <form action={addFacebookPageAction} className="space-y-3">
                      <input type="hidden" name="facebookIdId" value={selectedRecord.id} />
                      <Field label="Page name">
                        <input name="name" required placeholder="ABC Furniture UK" className={inputClass} />
                      </Field>
                      <Field label="Page password">
                        <input name="password" required placeholder="Page password" className={inputClass} />
                      </Field>
                      {params?.error && <p className="text-xs font-medium text-rose-600">{params.error}</p>}
                      <PendingSubmitButton
                        idleLabel="Add page"
                        pendingLabel="Adding..."
                        className={`${secondaryButton} gap-3`}
                        pendingClassName="cursor-not-allowed bg-slate-100 text-slate-500 hover:bg-slate-100"
                      />
                    </form>
                  </div>
                )}
              </div>
            );
          })()}
        </ModalFrame>
      )}

      {modal === "import-csv" && isAdmin && (
        <ModalFrame
          title="Import Facebook IDs"
          subtitle="Upload a CSV or Excel (.xlsx) file of Facebook IDs. Each row needs an email and at least one password."
          closeHref="/dashboard/facebook-ids"
          widthClassName="max-w-3xl"
        >
          <div className="space-y-4">
            <a
              href="/api/facebook-ids/template"
              className="inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
            >
              Download CSV template
            </a>
            <form action={importFacebookIdsCsvAction} className="space-y-3" encType="multipart/form-data">
              <FacebookIdsCsvFileField existingEmails={data.records.map((record) => record.email)} />
              {params?.error && <p className="text-xs font-medium text-rose-600">{describeImportError(params.error)}</p>}
              <PendingSubmitButton
                idleLabel="Import CSV"
                pendingLabel="Importing..."
                className={`${primaryButton} gap-3`}
                pendingClassName="cursor-not-allowed bg-slate-700 hover:bg-slate-700"
              />
            </form>
          </div>
        </ModalFrame>
      )}
    </>
  );
}

function SummaryStat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${tone ?? "text-slate-950"}`}>{value}</p>
    </div>
  );
}
