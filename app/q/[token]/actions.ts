"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function responder(token: string, action: "accepted" | "rejected") {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("respond_public_quote", {
    p_token: token,
    p_action: action,
  });
  if (error) return { error: error.message };

  revalidatePath(`/q/${token}`);
  return { result: data as string };
}