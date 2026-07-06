"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useMember } from "@/lib/use-member";
import type { Achievement, Reward } from "@/lib/types";

export default function AdminRewardsPage() {
  const { member: operator, loading } = useMember();
  const router = useRouter();

  const [rewards, setRewards] = useState<Reward[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  const [rewardForm, setRewardForm] = useState({ name: "", cost: 10, stock: 10 });
  const [rewardImage, setRewardImage] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [rewardError, setRewardError] = useState<string | null>(null);
  const [achievementForm, setAchievementForm] = useState({ name: "", threshold: 10 });

  useEffect(() => {
    if (!loading && (!operator || operator.role !== "admin")) {
      router.push("/me");
    }
  }, [loading, operator, router]);

  async function loadAll() {
    const [{ data: r }, { data: a }] = await Promise.all([
      supabase.from("rewards").select("*").order("cost", { ascending: true }),
      supabase
        .from("achievements")
        .select("*")
        .order("threshold", { ascending: true }),
    ]);
    setRewards(r ?? []);
    setAchievements(a ?? []);
  }

  useEffect(() => {
    if (operator?.role === "admin") loadAll();
  }, [operator]);

  async function addReward(e: React.FormEvent) {
    e.preventDefault();
    setRewardError(null);

    let image_url: string | null = null;

    if (rewardImage) {
      setUploadingImage(true);
      const path = `${Date.now()}-${rewardImage.name}`;
      const { error: uploadError } = await supabase.storage
        .from("reward-images")
        .upload(path, rewardImage);
      setUploadingImage(false);

      if (uploadError) {
        setRewardError(uploadError.message);
        return;
      }

      image_url = supabase.storage.from("reward-images").getPublicUrl(path)
        .data.publicUrl;
    }

    const { error } = await supabase
      .from("rewards")
      .insert({ ...rewardForm, image_url });

    if (error) {
      setRewardError(error.message);
      return;
    }

    setRewardForm({ name: "", cost: 10, stock: 10 });
    setRewardImage(null);
    loadAll();
  }

  async function deleteReward(id: string) {
    await supabase.from("rewards").delete().eq("id", id);
    loadAll();
  }

  async function addAchievement(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from("achievements").insert(achievementForm);
    setAchievementForm({ name: "", threshold: 10 });
    loadAll();
  }

  async function deleteAchievement(id: string) {
    await supabase.from("achievements").delete().eq("id", id);
    loadAll();
  }

  if (loading || !operator) {
    return <p className="text-center text-foreground/60">Loading...</p>;
  }

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Manage Rewards</h2>
        <form onSubmit={addReward} className="flex flex-col gap-2 border border-border rounded-xl p-4">
          <input
            required
            placeholder="Reward name"
            value={rewardForm.name}
            onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
            className="border border-border rounded-xl px-3 py-2 bg-background"
          />
          <div className="flex gap-2">
            <label className="flex-1 min-w-0 text-sm text-foreground/60">
              Cost (points)
              <input
                type="number"
                value={rewardForm.cost}
                onChange={(e) => setRewardForm({ ...rewardForm, cost: Number(e.target.value) })}
                className="mt-1 w-full border border-border rounded-xl px-3 py-2 bg-background"
              />
            </label>
            <label className="flex-1 min-w-0 text-sm text-foreground/60">
              Stock
              <input
                type="number"
                value={rewardForm.stock}
                onChange={(e) => setRewardForm({ ...rewardForm, stock: Number(e.target.value) })}
                className="mt-1 w-full border border-border rounded-xl px-3 py-2 bg-background"
              />
            </label>
          </div>
          <label className="text-sm text-foreground/60">
            Image (optional)
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setRewardImage(e.target.files?.[0] ?? null)}
              className="mt-1 w-full border border-border rounded-xl px-3 py-2 bg-background text-sm"
            />
          </label>
          <button
            disabled={uploadingImage}
            className="bg-accent text-white rounded-xl py-2 font-medium disabled:opacity-50"
          >
            {uploadingImage ? "Uploading image..." : "Add Reward"}
          </button>
          {rewardError && <p className="text-sm text-red-600">{rewardError}</p>}
        </form>
        <ul className="flex flex-col gap-2">
          {rewards.map((r) => (
            <li key={r.id} className="border border-border rounded-xl px-4 py-3 flex items-center gap-3 justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {r.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.image_url}
                    alt={r.name}
                    className="w-12 h-12 rounded-lg object-cover border border-border shrink-0"
                  />
                )}
                <span className="truncate">{r.name} · {r.cost} pts · Stock {r.stock}</span>
              </div>
              <button onClick={() => deleteReward(r.id)} className="text-sm text-red-600 shrink-0">Delete</button>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Manage Achievements</h2>
        <form onSubmit={addAchievement} className="flex flex-col gap-2 border border-border rounded-xl p-4">
          <input
            required
            placeholder="Achievement name"
            value={achievementForm.name}
            onChange={(e) => setAchievementForm({ ...achievementForm, name: e.target.value })}
            className="border border-border rounded-xl px-3 py-2 bg-background"
          />
          <label className="text-sm text-foreground/60">
            Points required to unlock
            <input
              type="number"
              value={achievementForm.threshold}
              onChange={(e) =>
                setAchievementForm({ ...achievementForm, threshold: Number(e.target.value) })
              }
              className="mt-1 w-full border border-border rounded-xl px-3 py-2 bg-background"
            />
          </label>
          <button className="bg-accent text-white rounded-xl py-2 font-medium">Add Achievement</button>
        </form>
        <ul className="flex flex-col gap-2">
          {achievements.map((a) => (
            <li key={a.id} className="border border-border rounded-xl px-4 py-3 flex items-center justify-between">
              <span>{a.name} · Needs {a.threshold} pts</span>
              <button onClick={() => deleteAchievement(a.id)} className="text-sm text-red-600">Delete</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
