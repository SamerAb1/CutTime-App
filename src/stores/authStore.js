import { makeAutoObservable, runInAction } from "mobx";
import { supabase } from "../supabase-client";

class AuthStore {
  user = null; // Supabase Auth user
  profile = null; // Row from public.users
  loading = true;

  constructor() {
    makeAutoObservable(this);
    this.bootstrap();
  }

  async bootstrap() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    runInAction(() => {
      this.user = session?.user ?? null;
      this.loading = false;
    });
    if (this.user) await this.refreshProfile();

    supabase.auth.onAuthStateChange(async (_evt, session2) => {
      runInAction(() => (this.user = session2?.user ?? null));
      if (session2?.user) await this.refreshProfile();
      else runInAction(() => (this.profile = null));
    });
  }

  get isLoggedIn() {
    return !!this.user;
  }
  get isBarber() {
    return this.profile?.role === "barber";
  }

  async refreshProfile() {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("user_id", this.user.id)
      .maybeSingle();
    runInAction(() => (this.profile = data ?? null));
  }

  async signUp({ name, email, phone, password }) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    const uid = data.user?.id;
    if (!uid) return;

    // Insert profile as 'customer'
    const { error: e2 } = await supabase.from("users").insert({
      user_id: uid,
      name,
      email,
      phone,
      role: "customer",
    });
    if (e2) throw e2;
    await this.refreshProfile();
  }

  async signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  }

  async signOut() {
    await supabase.auth.signOut();
  }
}

export const authStore = new AuthStore();
