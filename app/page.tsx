import Link from "next/link";

export default function Home() {
  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold">Inventory Management</h1>
      <Link className="underline" href="/products">
        Go to Product Master
      </Link>
    </main>
  );
}
