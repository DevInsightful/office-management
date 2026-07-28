import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { seedIfEmpty } from "@/lib/seed";
import { LoginScreen, MissingConfigScreen } from "@/app/ui";

type SearchParams = Promise<{ error?: string }>;

export const dynamic = "force-dynamic";

const errorMap: Record<string, string> = {
  invalid_credentials: "Invalid email or password.",
  missing_credentials: "Email and password are required.",
  missing_user_fields: "Complete all required user fields.",
  invalid_role: "That role is not allowed.",
  invalid_finance_entry: "Finance entry is incomplete or invalid.",
  invalid_task: "Task details are incomplete.",
  invalid_task_status: "Task status update is invalid.",
  invalid_salary_record: "Salary record is incomplete.",
  forbidden: "You are not allowed to perform that action.",
  task_not_found: "Task not found.",
};

export default async function Home({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  if (!process.env.DATABASE_URL) {
    return <MissingConfigScreen />;
  }

  await seedIfEmpty();

  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  const params = searchParams ? await searchParams : undefined;
  const error = params?.error ? errorMap[params.error] ?? "Something went wrong." : null;

  return <LoginScreen error={error} />;
}
