import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default function CadastroPage() {
  async function cadastrar(formData: FormData) {
    "use server";

    const email = formData.get("email") as string;
    const senha = formData.get("senha") as string;

    const supabase = await createClient();

    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
    });

    if (error) {
      console.error(error);
      return;
    }

    redirect("/clientes");
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <form
        action={cadastrar}
        className="w-full max-w-md space-y-4 rounded-lg border p-6"
      >
        <h1 className="text-2xl font-bold">Criar conta</h1>

        <div>
          <label htmlFor="email">E-mail</label>

          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded border p-2"
          />
        </div>

        <div>
          <label htmlFor="senha">Senha</label>

          <input
            id="senha"
            name="senha"
            type="password"
            required
            minLength={6}
            className="w-full rounded border p-2"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded bg-blue-600 p-2 text-white"
        >
          Criar conta
        </button>
      </form>
    </main>
  );
}