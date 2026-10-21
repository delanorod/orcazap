import { createClient } from "@/lib/supabase/server";

export default async function ClientesPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <ul>
      {clients?.map((c) => (
        <li key={c.id}>{c.name}</li>
      ))}
    </ul>
  );
}