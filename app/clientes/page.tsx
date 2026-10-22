import { createClient } from "@/lib/supabase/server";
import { criarCliente } from "./actions";

export default async function ClientesPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  // O <form action> espera uma função que não retorne valor,
  // por isso esta função intermediária
  async function enviar(formData: FormData) {
    "use server";
    await criarCliente(formData);
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Clientes</h1>

      <form action={enviar} className="flex flex-wrap gap-2">
        <input name="name" placeholder="Nome" required
               className="rounded border p-2" />
        <input name="phone" placeholder="Telefone"
               className="rounded border p-2" />
        <input name="email" type="email" placeholder="E-mail"
               className="rounded border p-2" />
        <button className="rounded bg-black px-4 py-2 text-white">
          Adicionar
        </button>
        
      </form>

      <ul className="space-y-1">
        {clients?.length === 0 && <li>Nenhum cliente ainda.</li>}
        {clients?.map((c) => (
          <li key={c.id}>{c.name}</li>
        ))}
      </ul>
     

    </main>
  );
}