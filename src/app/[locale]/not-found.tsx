import { Link } from "@/i18n/navigation";

export default function NotFound() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="p-6 md:p-10 flex flex-col gap-1 text-center">
        <h2>Page Not Found</h2>
        <p>Could not find requested page</p>
        <Link href="/dashboard">Return to Dashboard</Link>
      </div>
    </div>
  );
}
