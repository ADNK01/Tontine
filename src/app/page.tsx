import Link from "next/link";
import {
  Users,
  Banknote,
  PiggyBank,
  Calculator,
  BarChart3,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Users,
    title: "Member Management",
    description:
      "Track all tontine members, their contributions, and participation history in one place.",
  },
  {
    icon: Banknote,
    title: "Loan Tracking",
    description:
      "Manage loan requests, approvals, disbursements, and repayment schedules effortlessly.",
  },
  {
    icon: PiggyBank,
    title: "Savings Management",
    description:
      "Monitor individual and group savings with detailed contribution records and balances.",
  },
  {
    icon: Calculator,
    title: "Accounting",
    description:
      "Full double-entry bookkeeping with automated journal entries and financial statements.",
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    description:
      "Generate comprehensive reports on contributions, loans, balances, and group performance.",
  },
  {
    icon: Shield,
    title: "Security & Audit",
    description:
      "Role-based access control with complete audit trails for every transaction.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">
              T
            </div>
            <span className="text-xl font-bold text-gray-900">TSK</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="outline" size="lg">
                Login
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                Register
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900">
          TSK Tontine Management
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
          The modern platform for managing your tontine, savings group, or
          cooperative. Track members, loans, savings, and finances with
          confidence.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/register">
            <Button size="lg" className="h-11 px-8 bg-blue-600 hover:bg-blue-700 text-base">
              Get Started
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg" className="h-11 px-8 text-base">
              Sign In
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <feature.icon className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 py-8 text-center text-sm text-gray-500">
          TSK Tontine Management. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
